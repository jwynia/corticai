# Database Migration Strategy

## Overview

This document outlines the database migration strategy for Pliers v3, including migration from the legacy v2 SQL Server database, versioning approach, deployment procedures, and rollback strategies.

## Migration Framework

### Tool Selection: Drizzle ORM

We use Drizzle ORM for database migrations because it provides:
- Type-safe SQL schema definitions
- Automatic migration generation
- Version control friendly migration files
- Rollback support
- Zero dependencies
- Excellent PostgreSQL support

### Migration File Structure

```
/src/database/
├── schema/              # Drizzle schema definitions
│   ├── organizations.ts
│   ├── users.ts
│   ├── forms.ts
│   ├── submissions.ts
│   ├── workflows.ts
│   └── index.ts
├── migrations/          # Generated SQL migrations
│   ├── 0001_initial_schema.sql
│   ├── 0002_add_events_table.sql
│   ├── 0003_add_plugins_system.sql
│   └── meta/
│       └── _journal.json
├── seeds/              # Seed data scripts
│   ├── development.ts
│   ├── test.ts
│   └── demo.ts
└── drizzle.config.ts   # Drizzle configuration
```

## Version Control Strategy

### Semantic Versioning for Migrations

Each migration follows the pattern: `NNNN_descriptive_name.sql`

- **NNNN**: Sequential number (0001, 0002, etc.)
- **descriptive_name**: Clear description of the change

### Migration Categories

1. **Schema Migrations**: Structural changes
2. **Data Migrations**: Data transformation
3. **Index Migrations**: Performance optimizations
4. **Constraint Migrations**: Business rule changes

## Initial Schema Creation

### Phase 1: Core Tables

```sql
-- 0001_initial_schema.sql
BEGIN;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending', 'deleted');
CREATE TYPE form_status AS ENUM ('draft', 'published', 'deprecated', 'archived');
CREATE TYPE submission_status AS ENUM ('draft', 'submitted', 'processing', 'approved', 'rejected', 'completed', 'archived');

-- Create organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    email VARCHAR(255) NOT NULL,
    auth_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT unique_email_per_org UNIQUE(organization_id, email)
);

-- Create update_updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;
```

### Phase 2: Form System Tables

```sql
-- 0002_form_system.sql
BEGIN;

CREATE TABLE forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    status form_status DEFAULT 'draft',
    definition JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT unique_form_slug_per_org UNIQUE(organization_id, slug, version)
);

CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    form_id UUID NOT NULL REFERENCES forms(id),
    submission_number VARCHAR(50) NOT NULL,
    status submission_status DEFAULT 'draft',
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT unique_submission_number UNIQUE(organization_id, submission_number)
);

-- Add triggers
CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add indexes
CREATE INDEX idx_forms_organization ON forms(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_submissions_form ON submissions(form_id);
CREATE INDEX idx_submissions_status ON submissions(status) WHERE deleted_at IS NULL;

COMMIT;
```

## Data Migration from v2

### Migration Strategy Overview

1. **Assessment Phase**: Analyze v2 data structure and volume
2. **Mapping Phase**: Create field mappings between v2 and v3
3. **Transformation Phase**: Convert normalized v2 data to v3 JSONB
4. **Validation Phase**: Verify data integrity
5. **Cutover Phase**: Final sync and switch

### v2 to v3 Mapping

#### Organizations Migration

```sql
-- Map v2 tenants to v3 organizations
INSERT INTO organizations (id, slug, name, settings, created_at)
SELECT
    Id as id,
    LOWER(REPLACE(Name, ' ', '-')) as slug,
    Name as name,
    jsonb_build_object(
        'legacy_id', Id,
        'migrated_from', 'v2',
        'migration_date', now()
    ) as settings,
    CreatedOn as created_at
FROM v2_database.dbo.Organization;
```

#### Forms Migration

```sql
-- Convert v2 FormType to v3 forms with JSONB definition
WITH form_fields AS (
    SELECT
        ft.Id as form_type_id,
        jsonb_agg(
            jsonb_build_object(
                'id', f.Id,
                'name', f.Name,
                'label', f.DisplayName,
                'type', CASE ft.Name
                    WHEN 'TextBox' THEN 'text'
                    WHEN 'TextArea' THEN 'textarea'
                    WHEN 'DropDown' THEN 'select'
                    WHEN 'CheckBox' THEN 'checkbox'
                    ELSE 'text'
                END,
                'required', f.Required,
                'order', f.SortOrder,
                'settings', (
                    SELECT jsonb_object_agg(fs.Name, fs.StoredValue)
                    FROM v2_database.dbo.FieldSetting fs
                    WHERE fs.FieldId = f.Id
                ),
                'choices', (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'value', c.Id,
                            'label', c.DisplayName
                        )
                        ORDER BY fcm.SortOrder
                    )
                    FROM v2_database.dbo.Field_Choice_Map fcm
                    JOIN v2_database.dbo.Choice c ON fcm.ChoiceId = c.Id
                    WHERE fcm.FieldId = f.Id
                )
            )
            ORDER BY f.SortOrder
        ) as fields
    FROM v2_database.dbo.FormType ft
    JOIN v2_database.dbo.Field f ON f.FormTypeId = ft.Id
    JOIN v2_database.dbo.FieldType ft ON f.FieldTypeId = ft.Id
    GROUP BY ft.Id
)
INSERT INTO forms (id, organization_id, name, slug, definition, created_at)
SELECT
    ft.Id as id,
    '00000000-0000-0000-0000-000000000000'::uuid as organization_id, -- Map to correct org
    ft.DisplayName as name,
    LOWER(REPLACE(ft.Name, ' ', '-')) as slug,
    jsonb_build_object(
        'title', ft.DisplayName,
        'description', ft.ShortDescription,
        'fields', COALESCE(ff.fields, '[]'::jsonb),
        'legacy_id', ft.Id
    ) as definition,
    now() as created_at
FROM v2_database.dbo.FormType ft
LEFT JOIN form_fields ff ON ff.form_type_id = ft.Id;
```

#### Submissions Migration

```sql
-- Convert v2 FormSubmission and FormSubmissionMetaData to v3 submissions
WITH submission_data AS (
    SELECT
        fs.Id as submission_id,
        jsonb_object_agg(
            f.Name,
            COALESCE(
                fsmd.FreeFormEntry,
                c.DisplayName,
                fsmd.FreeFormEntry
            )
        ) as data
    FROM v2_database.dbo.FormSubmission fs
    JOIN v2_database.dbo.FormSubmissionMetaData fsmd ON fsmd.FormSubmissionId = fs.Id
    JOIN v2_database.dbo.Field f ON fsmd.FieldId = f.Id
    LEFT JOIN v2_database.dbo.Choice c ON fsmd.FieldChoiceMapId = c.Id
    GROUP BY fs.Id
)
INSERT INTO submissions (
    id,
    organization_id,
    form_id,
    submission_number,
    status,
    data,
    created_at,
    submitted_at
)
SELECT
    fs.Id as id,
    '00000000-0000-0000-0000-000000000000'::uuid as organization_id, -- Map to correct org
    fs.FormTypeId as form_id,
    fs.LookupCode as submission_number,
    CASE
        WHEN fss.Name = 'Draft' THEN 'draft'::submission_status
        WHEN fss.Name = 'Submitted' THEN 'submitted'::submission_status
        WHEN fss.Name = 'Approved' THEN 'approved'::submission_status
        WHEN fss.Name = 'Rejected' THEN 'rejected'::submission_status
        ELSE 'submitted'::submission_status
    END as status,
    COALESCE(sd.data, '{}'::jsonb) as data,
    fs.CreatedOn as created_at,
    fs.LastUpdatedOn as submitted_at
FROM v2_database.dbo.FormSubmission fs
JOIN v2_database.dbo.FormSubmissionStatus fss ON fs.FormSubmissionStatusId = fss.Id
LEFT JOIN submission_data sd ON sd.submission_id = fs.Id;
```

### Data Transformation Functions

```sql
-- Function to migrate a single organization
CREATE OR REPLACE FUNCTION migrate_organization(v2_org_id UUID)
RETURNS UUID AS $$
DECLARE
    new_org_id UUID;
BEGIN
    -- Insert organization
    INSERT INTO organizations (name, slug, settings, created_at)
    SELECT
        Name,
        LOWER(REPLACE(Name, ' ', '-')),
        jsonb_build_object('legacy_id', Id),
        CreatedOn
    FROM v2_database.dbo.Organization
    WHERE Id = v2_org_id
    RETURNING id INTO new_org_id;

    -- Migrate users
    PERFORM migrate_organization_users(v2_org_id, new_org_id);

    -- Migrate forms
    PERFORM migrate_organization_forms(v2_org_id, new_org_id);

    -- Migrate submissions
    PERFORM migrate_organization_submissions(v2_org_id, new_org_id);

    RETURN new_org_id;
END;
$$ LANGUAGE plpgsql;
```

## Migration Execution

### Pre-Migration Checklist

```sql
-- 1. Verify source database connectivity
SELECT COUNT(*) FROM v2_database.dbo.FormSubmission;

-- 2. Check target database is empty
SELECT COUNT(*) FROM forms;
SELECT COUNT(*) FROM submissions;

-- 3. Create backup point
SELECT pg_create_restore_point('pre_v2_migration');

-- 4. Disable foreign key checks during migration
SET session_replication_role = 'replica';

-- 5. Run migration
SELECT migrate_all_organizations();

-- 6. Re-enable foreign key checks
SET session_replication_role = 'origin';

-- 7. Verify migration
SELECT verify_migration_integrity();
```

### Migration Validation

```sql
-- Validation queries
CREATE OR REPLACE FUNCTION verify_migration_integrity()
RETURNS TABLE (
    check_name TEXT,
    source_count BIGINT,
    target_count BIGINT,
    difference BIGINT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH checks AS (
        SELECT 'Organizations' as check_name,
               (SELECT COUNT(*) FROM v2_database.dbo.Organization) as source_count,
               (SELECT COUNT(*) FROM organizations) as target_count
        UNION ALL
        SELECT 'Forms',
               (SELECT COUNT(*) FROM v2_database.dbo.FormType),
               (SELECT COUNT(*) FROM forms)
        UNION ALL
        SELECT 'Submissions',
               (SELECT COUNT(*) FROM v2_database.dbo.FormSubmission),
               (SELECT COUNT(*) FROM submissions)
    )
    SELECT
        check_name,
        source_count,
        target_count,
        source_count - target_count as difference,
        CASE
            WHEN source_count = target_count THEN 'PASSED'
            WHEN target_count > source_count * 0.99 THEN 'WARNING'
            ELSE 'FAILED'
        END as status
    FROM checks;
END;
$$ LANGUAGE plpgsql;
```

## Rollback Strategy

### Rollback Procedures

```sql
-- 1. Create rollback function
CREATE OR REPLACE FUNCTION rollback_migration(migration_id TEXT)
RETURNS void AS $$
BEGIN
    -- Restore from backup point
    PERFORM pg_restore_from_point(migration_id);

    -- Or manual rollback
    DELETE FROM submissions WHERE metadata->>'migration_batch' = migration_id;
    DELETE FROM forms WHERE metadata->>'migration_batch' = migration_id;
    DELETE FROM users WHERE metadata->>'migration_batch' = migration_id;
    DELETE FROM organizations WHERE metadata->>'migration_batch' = migration_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Execute rollback
SELECT rollback_migration('v2_migration_2025_01_22');
```

## Performance Optimization

### Batch Processing

```sql
-- Process migrations in batches
CREATE OR REPLACE FUNCTION migrate_submissions_batch(
    batch_size INTEGER DEFAULT 1000
)
RETURNS void AS $$
DECLARE
    v_offset INTEGER := 0;
    v_count INTEGER;
BEGIN
    LOOP
        -- Get count for this batch
        SELECT COUNT(*) INTO v_count
        FROM v2_database.dbo.FormSubmission
        LIMIT batch_size OFFSET v_offset;

        EXIT WHEN v_count = 0;

        -- Process batch
        INSERT INTO submissions (...)
        SELECT ...
        FROM v2_database.dbo.FormSubmission
        ORDER BY CreatedOn
        LIMIT batch_size OFFSET v_offset;

        -- Update offset
        v_offset := v_offset + batch_size;

        -- Checkpoint
        CHECKPOINT;

        -- Log progress
        RAISE NOTICE 'Processed % submissions', v_offset;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### Parallel Processing

```sql
-- Use parallel workers for large migrations
SET max_parallel_workers_per_gather = 4;
SET parallel_setup_cost = 0;
SET parallel_tuple_cost = 0;

-- Create indexes after bulk insert
CREATE INDEX CONCURRENTLY idx_temp ON submissions(form_id);
```

## Migration Monitoring

### Progress Tracking

```sql
CREATE TABLE migration_progress (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    total_records BIGINT,
    processed_records BIGINT,
    failed_records BIGINT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(50),
    error_message TEXT
);

-- Update progress function
CREATE OR REPLACE FUNCTION update_migration_progress(
    p_migration_name VARCHAR(255),
    p_table_name VARCHAR(255),
    p_processed BIGINT
)
RETURNS void AS $$
BEGIN
    UPDATE migration_progress
    SET processed_records = p_processed,
        status = CASE
            WHEN p_processed >= total_records THEN 'completed'
            ELSE 'in_progress'
        END,
        completed_at = CASE
            WHEN p_processed >= total_records THEN now()
            ELSE NULL
        END
    WHERE migration_name = p_migration_name
    AND table_name = p_table_name;
END;
$$ LANGUAGE plpgsql;
```

### Error Handling

```sql
CREATE TABLE migration_errors (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL,
    record_id VARCHAR(255),
    error_message TEXT,
    error_detail JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Error logging function
CREATE OR REPLACE FUNCTION log_migration_error(
    p_migration_name VARCHAR(255),
    p_record_id VARCHAR(255),
    p_error_message TEXT,
    p_error_detail JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO migration_errors (
        migration_name,
        record_id,
        error_message,
        error_detail
    ) VALUES (
        p_migration_name,
        p_record_id,
        p_error_message,
        p_error_detail
    );
END;
$$ LANGUAGE plpgsql;
```

## Post-Migration Tasks

### Data Verification

```sql
-- 1. Check data integrity
SELECT verify_migration_integrity();

-- 2. Verify JSONB structure
SELECT
    COUNT(*) as invalid_forms
FROM forms
WHERE NOT (definition ? 'fields' AND definition ? 'title');

-- 3. Check for orphaned records
SELECT COUNT(*) as orphaned_submissions
FROM submissions s
LEFT JOIN forms f ON s.form_id = f.id
WHERE f.id IS NULL;

-- 4. Validate foreign keys
ALTER TABLE submissions VALIDATE CONSTRAINT submissions_form_id_fkey;
```

### Performance Tuning

```sql
-- 1. Update statistics
ANALYZE organizations;
ANALYZE users;
ANALYZE forms;
ANALYZE submissions;

-- 2. Create missing indexes
SELECT create_all_indexes();

-- 3. Set up partitioning
SELECT setup_event_partitioning();

-- 4. Configure autovacuum
ALTER TABLE submissions SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE events SET (autovacuum_vacuum_scale_factor = 0.05);
```

### Cleanup

```sql
-- 1. Drop temporary tables
DROP TABLE IF EXISTS temp_migration_map;
DROP TABLE IF EXISTS temp_field_map;

-- 2. Remove migration columns
ALTER TABLE organizations DROP COLUMN IF EXISTS legacy_id;
ALTER TABLE forms DROP COLUMN IF EXISTS legacy_id;

-- 3. Reset sequences
SELECT setval('submission_number_seq', (SELECT MAX(id) FROM submissions));

-- 4. Clear migration logs older than 30 days
DELETE FROM migration_progress WHERE completed_at < now() - INTERVAL '30 days';
DELETE FROM migration_errors WHERE created_at < now() - INTERVAL '30 days';
```

## Continuous Migration

### Zero-Downtime Migrations

```sql
-- 1. Add new column without default
ALTER TABLE users ADD COLUMN new_field VARCHAR(255);

-- 2. Backfill in batches
UPDATE users SET new_field = 'default_value'
WHERE new_field IS NULL
AND id IN (
    SELECT id FROM users
    WHERE new_field IS NULL
    LIMIT 1000
);

-- 3. Add constraint after backfill
ALTER TABLE users ALTER COLUMN new_field SET NOT NULL;
```

### Blue-Green Deployment

```sql
-- 1. Create new version of table
CREATE TABLE submissions_v2 (LIKE submissions INCLUDING ALL);

-- 2. Sync data
INSERT INTO submissions_v2 SELECT * FROM submissions;

-- 3. Keep in sync with triggers
CREATE TRIGGER sync_submissions_v2
    AFTER INSERT OR UPDATE OR DELETE ON submissions
    FOR EACH ROW EXECUTE FUNCTION sync_to_v2();

-- 4. Switch with view
BEGIN;
ALTER TABLE submissions RENAME TO submissions_v1;
ALTER TABLE submissions_v2 RENAME TO submissions;
COMMIT;
```

## Migration Best Practices

### Do's
- ✅ Always test migrations in staging first
- ✅ Create backups before major migrations
- ✅ Use transactions for atomic changes
- ✅ Monitor migration progress
- ✅ Document all custom transformations
- ✅ Validate data after migration
- ✅ Keep migration scripts idempotent

### Don'ts
- ❌ Don't modify migration files after deployment
- ❌ Don't skip migration numbers
- ❌ Don't perform large updates without batching
- ❌ Don't ignore foreign key constraints
- ❌ Don't forget to update indexes
- ❌ Don't migrate without a rollback plan

## Migration Commands

### CLI Commands

```bash
# Generate new migration
npm run db:generate

# Run pending migrations
npm run db:migrate

# Rollback last migration
npm run db:rollback

# Reset database
npm run db:reset

# Seed database
npm run db:seed

# Migration status
npm run db:status
```

### Drizzle Configuration

```typescript
// drizzle.config.ts
export default {
  schema: './src/database/schema/index.ts',
  out: './src/database/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
}