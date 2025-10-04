# Database Indexing Strategy

## Overview

This document defines the comprehensive indexing strategy for the Pliers v3 PostgreSQL database. The strategy balances query performance with write overhead, focusing on the most common access patterns while maintaining flexibility for ad-hoc queries through JSONB indexes.

## Index Types and Usage

### B-Tree Indexes (Default)
Used for equality and range queries on scalar values. Most efficient for:
- Primary keys and foreign keys
- Timestamp ranges
- Status fields with low cardinality
- Unique constraints

### GIN (Generalized Inverted Index)
Used for JSONB containment queries and full-text search:
- JSONB columns for flexible queries
- Array columns for membership tests
- Full-text search vectors

### GiST (Generalized Search Tree)
Used for geometric and specialized data:
- IP address ranges
- Geographic data (if added later)
- Exclusion constraints

### BRIN (Block Range Index)
Used for very large tables with natural ordering:
- Timestamp columns in partitioned tables
- Append-only tables like events and audit logs

### Hash Indexes
Used for simple equality comparisons:
- Large text fields where only equality matters
- Session IDs and tokens

## Primary Indexes

### Organizations Table

```sql
-- Primary key (automatically created)
CREATE UNIQUE INDEX idx_organizations_pkey ON organizations(id);

-- Business key
CREATE UNIQUE INDEX idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;

-- Search and filtering
CREATE INDEX idx_organizations_name ON organizations(name) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_plan ON organizations(plan_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_status ON organizations(subscription_status) WHERE deleted_at IS NULL;

-- JSONB indexes
CREATE INDEX idx_organizations_settings ON organizations USING gin(settings);
CREATE INDEX idx_organizations_features ON organizations USING gin(features);

-- Audit
CREATE INDEX idx_organizations_created_at ON organizations(created_at DESC);
CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at) WHERE deleted_at IS NOT NULL;
```

### Users Table

```sql
-- Primary key
CREATE UNIQUE INDEX idx_users_pkey ON users(id);

-- Foreign keys
CREATE INDEX idx_users_organization ON users(organization_id) WHERE deleted_at IS NULL;

-- Authentication
CREATE UNIQUE INDEX idx_users_email_org ON users(organization_id, lower(email)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_users_username_org ON users(organization_id, lower(username)) WHERE deleted_at IS NULL AND username IS NOT NULL;

-- Search
CREATE INDEX idx_users_name ON users(lower(first_name || ' ' || last_name)) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;

-- Roles and permissions
CREATE INDEX idx_users_roles ON users USING gin(roles) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_permissions ON users USING gin(permissions) WHERE deleted_at IS NULL;

-- Activity tracking
CREATE INDEX idx_users_last_login ON users(last_login_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_last_activity ON users(last_activity_at DESC) WHERE deleted_at IS NULL;

-- JSONB
CREATE INDEX idx_users_profile ON users USING gin(profile) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_metadata ON users USING gin(metadata) WHERE deleted_at IS NULL;
```

### Forms Table

```sql
-- Primary key
CREATE UNIQUE INDEX idx_forms_pkey ON forms(id);

-- Foreign keys
CREATE INDEX idx_forms_organization ON forms(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_forms_created_by ON forms(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_forms_parent ON forms(parent_id) WHERE parent_id IS NOT NULL;

-- Business keys
CREATE UNIQUE INDEX idx_forms_slug_version ON forms(organization_id, slug, version) WHERE deleted_at IS NULL;
CREATE INDEX idx_forms_slug_latest ON forms(organization_id, slug) WHERE is_latest = true AND deleted_at IS NULL;

-- Status and filtering
CREATE INDEX idx_forms_status ON forms(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_forms_visibility ON forms(visibility) WHERE deleted_at IS NULL;
CREATE INDEX idx_forms_category ON forms(category) WHERE deleted_at IS NULL AND category IS NOT NULL;

-- Tags
CREATE INDEX idx_forms_tags ON forms USING gin(tags) WHERE deleted_at IS NULL;

-- JSONB - Form definition queries
CREATE INDEX idx_forms_definition ON forms USING gin(definition);
CREATE INDEX idx_forms_definition_fields ON forms USING gin((definition->'fields'));
CREATE INDEX idx_forms_settings ON forms USING gin(settings);
CREATE INDEX idx_forms_permissions ON forms USING gin(permissions);

-- Usage tracking
CREATE INDEX idx_forms_submission_count ON forms(submission_count DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_forms_last_submission ON forms(last_submission_at DESC) WHERE deleted_at IS NULL;

-- Temporal
CREATE INDEX idx_forms_published_at ON forms(published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX idx_forms_created_at ON forms(created_at DESC);
```

### Submissions Table

```sql
-- Primary key
CREATE UNIQUE INDEX idx_submissions_pkey ON submissions(id);

-- Foreign keys
CREATE INDEX idx_submissions_organization ON submissions(organization_id);
CREATE INDEX idx_submissions_form ON submissions(form_id);
CREATE INDEX idx_submissions_submitted_by ON submissions(submitted_by) WHERE submitted_by IS NOT NULL;
CREATE INDEX idx_submissions_assigned_to ON submissions(assigned_to) WHERE assigned_to IS NOT NULL;

-- Business key
CREATE UNIQUE INDEX idx_submissions_number ON submissions(organization_id, submission_number);

-- Status and workflow
CREATE INDEX idx_submissions_status ON submissions(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_submissions_workflow_state ON submissions(workflow_state) WHERE workflow_state IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_submissions_status_updated ON submissions(status, updated_at DESC) WHERE deleted_at IS NULL;

-- JSONB data queries
CREATE INDEX idx_submissions_data ON submissions USING gin(data);
-- Specific field queries (add based on common searches)
CREATE INDEX idx_submissions_data_email ON submissions((data->>'email')) WHERE deleted_at IS NULL;
CREATE INDEX idx_submissions_data_status ON submissions((data->>'status')) WHERE deleted_at IS NULL;

-- Validation
CREATE INDEX idx_submissions_valid ON submissions(is_valid) WHERE deleted_at IS NULL;
CREATE INDEX idx_submissions_validation_errors ON submissions USING gin(validation_errors) WHERE array_length(validation_errors, 1) > 0;

-- Temporal queries
CREATE INDEX idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at DESC) WHERE submitted_at IS NOT NULL;
CREATE INDEX idx_submissions_updated_at ON submissions(updated_at DESC);

-- Assignment
CREATE INDEX idx_submissions_assigned_team ON submissions(assigned_team) WHERE assigned_team IS NOT NULL AND deleted_at IS NULL;

-- Tags
CREATE INDEX idx_submissions_tags ON submissions USING gin(tags) WHERE deleted_at IS NULL;

-- Source tracking
CREATE INDEX idx_submissions_source ON submissions(source) WHERE deleted_at IS NULL;
CREATE INDEX idx_submissions_ip ON submissions(ip_address) WHERE ip_address IS NOT NULL;
```

### Workflows Table

```sql
-- Primary key
CREATE UNIQUE INDEX idx_workflows_pkey ON workflows(id);

-- Foreign keys
CREATE INDEX idx_workflows_organization ON workflows(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_workflows_created_by ON workflows(created_by) WHERE deleted_at IS NULL;

-- Business keys
CREATE UNIQUE INDEX idx_workflows_slug_version ON workflows(organization_id, slug, version) WHERE deleted_at IS NULL;

-- Status and type
CREATE INDEX idx_workflows_status ON workflows(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_workflows_active ON workflows(is_active) WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX idx_workflows_type ON workflows(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_workflows_trigger ON workflows(trigger_type) WHERE deleted_at IS NULL;

-- Associations
CREATE INDEX idx_workflows_form_ids ON workflows USING gin(form_ids) WHERE deleted_at IS NULL;

-- JSONB
CREATE INDEX idx_workflows_definition ON workflows USING gin(definition);
CREATE INDEX idx_workflows_trigger_config ON workflows USING gin(trigger_config);
CREATE INDEX idx_workflows_settings ON workflows USING gin(settings);

-- Usage
CREATE INDEX idx_workflows_last_execution ON workflows(last_execution_at DESC) WHERE deleted_at IS NULL;

-- Tags
CREATE INDEX idx_workflows_tags ON workflows USING gin(tags) WHERE deleted_at IS NULL;
```

### Workflow_Executions Table

```sql
-- Primary key
CREATE UNIQUE INDEX idx_workflow_executions_pkey ON workflow_executions(id);

-- Foreign keys
CREATE INDEX idx_workflow_executions_organization ON workflow_executions(organization_id);
CREATE INDEX idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_submission ON workflow_executions(submission_id) WHERE submission_id IS NOT NULL;
CREATE INDEX idx_workflow_executions_parent ON workflow_executions(parent_execution_id) WHERE parent_execution_id IS NOT NULL;
CREATE INDEX idx_workflow_executions_triggered_by ON workflow_executions(triggered_by) WHERE triggered_by IS NOT NULL;

-- State queries
CREATE INDEX idx_workflow_executions_state ON workflow_executions(current_state, status);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status) WHERE status != 'completed';

-- Temporal queries
CREATE INDEX idx_workflow_executions_started ON workflow_executions(started_at DESC);
CREATE INDEX idx_workflow_executions_running ON workflow_executions(started_at) WHERE status = 'running';

-- JSONB
CREATE INDEX idx_workflow_executions_context ON workflow_executions USING gin(context);
CREATE INDEX idx_workflow_executions_errors ON workflow_executions USING gin(error_details) WHERE status = 'failed';

-- Performance monitoring
CREATE INDEX idx_workflow_executions_duration ON workflow_executions(duration_ms DESC) WHERE duration_ms IS NOT NULL;
```

### Events Table (Partitioned)

```sql
-- Primary key (on each partition)
CREATE UNIQUE INDEX idx_events_pkey ON events(id);

-- Organization and time range queries
CREATE INDEX idx_events_org_timestamp ON events(organization_id, event_timestamp DESC);

-- Event type queries
CREATE INDEX idx_events_type_timestamp ON events(event_type, event_timestamp DESC);

-- Aggregate queries
CREATE INDEX idx_events_aggregate ON events(aggregate_type, aggregate_id, event_timestamp DESC);

-- Correlation tracking
CREATE INDEX idx_events_correlation ON events(correlation_id) WHERE correlation_id IS NOT NULL;

-- User activity
CREATE INDEX idx_events_user ON events(user_id, event_timestamp DESC) WHERE user_id IS NOT NULL;

-- JSONB queries
CREATE INDEX idx_events_payload ON events USING gin(payload);
CREATE INDEX idx_events_indexed_values ON events USING gin(indexed_values);

-- Unprocessed events
CREATE INDEX idx_events_unprocessed ON events(event_timestamp) WHERE processed_at IS NULL;

-- BRIN index for time-series queries (on partitions)
CREATE INDEX idx_events_timestamp_brin ON events USING brin(event_timestamp);
```

### Attachments Table

```sql
-- Primary key
CREATE UNIQUE INDEX idx_attachments_pkey ON attachments(id);

-- Foreign keys
CREATE INDEX idx_attachments_organization ON attachments(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_attachments_submission ON attachments(submission_id) WHERE submission_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_attachments_form ON attachments(form_id) WHERE form_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_attachments_user ON attachments(user_id) WHERE user_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_attachments_uploaded_by ON attachments(uploaded_by);

-- Storage queries
CREATE INDEX idx_attachments_storage_key ON attachments(storage_key) WHERE deleted_at IS NULL;
CREATE INDEX idx_attachments_checksum ON attachments(checksum) WHERE checksum IS NOT NULL;

-- Mime type filtering
CREATE INDEX idx_attachments_mime ON attachments(mime_type) WHERE deleted_at IS NULL;

-- Security scanning
CREATE INDEX idx_attachments_unscanned ON attachments(uploaded_at) WHERE virus_scanned = false AND deleted_at IS NULL;

-- Temporal
CREATE INDEX idx_attachments_uploaded ON attachments(uploaded_at DESC);

-- Size analysis
CREATE INDEX idx_attachments_size ON attachments(file_size_bytes DESC) WHERE deleted_at IS NULL;
```

### Audit_Logs Table

```sql
-- Primary key
CREATE UNIQUE INDEX idx_audit_logs_pkey ON audit_logs(id);

-- Organization and time
CREATE INDEX idx_audit_logs_org_time ON audit_logs(organization_id, created_at DESC);

-- Resource queries
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id, created_at DESC);

-- User activity
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- Action filtering
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);

-- Status
CREATE INDEX idx_audit_logs_status ON audit_logs(status) WHERE status != 'success';

-- IP tracking
CREATE INDEX idx_audit_logs_ip ON audit_logs(ip_address) WHERE ip_address IS NOT NULL;

-- JSONB change tracking
CREATE INDEX idx_audit_logs_changes ON audit_logs USING gin(diff);

-- BRIN for time-series
CREATE INDEX idx_audit_logs_created_brin ON audit_logs USING brin(created_at);
```

### Plugins Table

```sql
-- Primary key
CREATE UNIQUE INDEX idx_plugins_pkey ON plugins(id);

-- Organization
CREATE INDEX idx_plugins_organization ON plugins(organization_id) WHERE organization_id IS NOT NULL;

-- Unique slug
CREATE UNIQUE INDEX idx_plugins_slug ON plugins(slug);

-- Status and type
CREATE INDEX idx_plugins_status ON plugins(status) WHERE status = 'active';
CREATE INDEX idx_plugins_type ON plugins(type);
CREATE INDEX idx_plugins_system ON plugins(is_system) WHERE is_system = true;

-- JSONB
CREATE INDEX idx_plugins_manifest ON plugins USING gin(manifest);
CREATE INDEX idx_plugins_config ON plugins USING gin(config);
CREATE INDEX idx_plugins_permissions ON plugins USING gin(permissions);

-- Usage tracking
CREATE INDEX idx_plugins_last_execution ON plugins(last_execution_at DESC) WHERE status = 'active';
```

### API_Keys Table

```sql
-- Primary key
CREATE UNIQUE INDEX idx_api_keys_pkey ON api_keys(id);

-- Organization
CREATE INDEX idx_api_keys_organization ON api_keys(organization_id) WHERE revoked_at IS NULL;

-- Key lookup (hash)
CREATE UNIQUE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_prefix ON api_keys(prefix);

-- Expiration
CREATE INDEX idx_api_keys_expires ON api_keys(expires_at) WHERE expires_at IS NOT NULL AND revoked_at IS NULL;

-- Usage tracking
CREATE INDEX idx_api_keys_last_used ON api_keys(last_used_at DESC) WHERE revoked_at IS NULL;

-- Scopes
CREATE INDEX idx_api_keys_scopes ON api_keys USING gin(scopes);
```

### Webhooks Table

```sql
-- Primary key
CREATE UNIQUE INDEX idx_webhooks_pkey ON webhooks(id);

-- Organization
CREATE INDEX idx_webhooks_organization ON webhooks(organization_id);

-- Active webhooks
CREATE INDEX idx_webhooks_active ON webhooks(organization_id, events) WHERE is_active = true;

-- Events
CREATE INDEX idx_webhooks_events ON webhooks USING gin(events) WHERE is_active = true;

-- Failure tracking
CREATE INDEX idx_webhooks_failures ON webhooks(failure_count DESC) WHERE failure_count > 0;
```

### Notifications Table

```sql
-- Primary key
CREATE UNIQUE INDEX idx_notifications_pkey ON notifications(id);

-- User notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;

-- Organization
CREATE INDEX idx_notifications_organization ON notifications(organization_id);

-- Type and priority
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_priority ON notifications(user_id, priority, created_at DESC) WHERE read_at IS NULL;

-- Expiration
CREATE INDEX idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL AND read_at IS NULL;
```

## Specialized Indexes

### Full-Text Search Indexes

```sql
-- Add text search columns
ALTER TABLE forms ADD COLUMN search_vector tsvector;
ALTER TABLE submissions ADD COLUMN search_vector tsvector;

-- Create indexes
CREATE INDEX idx_forms_search ON forms USING gin(search_vector);
CREATE INDEX idx_submissions_search ON submissions USING gin(search_vector);

-- Update triggers for search vectors
CREATE OR REPLACE FUNCTION update_forms_search_vector() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.definition->>'title', '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.definition->>'description', '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_forms_search
    BEFORE INSERT OR UPDATE ON forms
    FOR EACH ROW EXECUTE FUNCTION update_forms_search_vector();
```

### Partial Indexes for Common Queries

```sql
-- Active submissions requiring action
CREATE INDEX idx_submissions_pending_action
    ON submissions(assigned_to, status, created_at DESC)
    WHERE status IN ('submitted', 'processing') AND deleted_at IS NULL;

-- Forms by usage (hot forms)
CREATE INDEX idx_forms_hot
    ON forms(organization_id, submission_count DESC)
    WHERE status = 'published' AND is_latest = true AND deleted_at IS NULL;

-- Recent failed workflows
CREATE INDEX idx_workflow_executions_recent_failures
    ON workflow_executions(workflow_id, completed_at DESC)
    WHERE status = 'failed' AND completed_at > CURRENT_DATE - INTERVAL '7 days';

-- Unprocessed events
CREATE INDEX idx_events_pending
    ON events(event_type, event_timestamp)
    WHERE processed_at IS NULL;
```

### Composite Indexes for Complex Queries

```sql
-- User activity dashboard
CREATE INDEX idx_users_activity_dashboard
    ON users(organization_id, last_activity_at DESC, status)
    WHERE deleted_at IS NULL;

-- Form analytics
CREATE INDEX idx_forms_analytics
    ON forms(organization_id, status, category, created_at DESC)
    WHERE deleted_at IS NULL;

-- Submission workflow
CREATE INDEX idx_submissions_workflow
    ON submissions(organization_id, form_id, status, created_at DESC)
    WHERE deleted_at IS NULL;

-- Event analytics
CREATE INDEX idx_events_analytics
    ON events(organization_id, aggregate_type, event_type, event_timestamp DESC);
```

## Index Maintenance

### Monitoring Index Usage

```sql
-- View index usage statistics
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    CASE
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'RARELY_USED'
        WHEN idx_scan < 1000 THEN 'OCCASIONALLY_USED'
        ELSE 'FREQUENTLY_USED'
    END as usage_category
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Index Bloat Detection

```sql
-- Detect index bloat
CREATE OR REPLACE VIEW index_bloat AS
WITH btree_index_atts AS (
    SELECT
        nspname,
        indexclass.relname as index_name,
        indexclass.reltuples,
        indexclass.relpages,
        tableclass.relname as tablename,
        (indexrelid::regclass)::text as index_name_full
    FROM pg_index
    JOIN pg_class AS indexclass ON pg_index.indexrelid = indexclass.oid
    JOIN pg_class AS tableclass ON pg_index.indrelid = tableclass.oid
    JOIN pg_namespace ON indexclass.relnamespace = pg_namespace.oid
    WHERE indexclass.relam = (SELECT oid FROM pg_am WHERE amname = 'btree')
)
SELECT
    nspname as schema_name,
    tablename,
    index_name,
    pg_size_pretty(pg_relation_size(index_name_full::regclass)) as index_size,
    ROUND(100 * (1 - (reltuples / GREATEST(relpages, 1)::float) / 1000), 2) as bloat_percentage
FROM btree_index_atts
WHERE relpages > 100
ORDER BY bloat_percentage DESC;
```

### Automatic Index Maintenance

```sql
-- Schedule regular REINDEX for heavily used tables
CREATE OR REPLACE FUNCTION maintain_indexes() RETURNS void AS $$
BEGIN
    -- Reindex tables with high write volume
    REINDEX TABLE CONCURRENTLY submissions;
    REINDEX TABLE CONCURRENTLY events;
    REINDEX TABLE CONCURRENTLY audit_logs;

    -- Update statistics
    ANALYZE submissions;
    ANALYZE events;
    ANALYZE audit_logs;
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron
SELECT cron.schedule('index-maintenance', '0 3 * * 0', 'SELECT maintain_indexes()');
```

## Performance Guidelines

### Index Creation Best Practices

1. **Create indexes CONCURRENTLY** in production to avoid blocking
   ```sql
   CREATE INDEX CONCURRENTLY idx_name ON table(column);
   ```

2. **Use partial indexes** for filtered queries
   ```sql
   CREATE INDEX idx_active_users ON users(email) WHERE status = 'active' AND deleted_at IS NULL;
   ```

3. **Consider index-only scans** by including all needed columns
   ```sql
   CREATE INDEX idx_covering ON submissions(form_id) INCLUDE (status, created_at);
   ```

4. **Use expression indexes** for computed values
   ```sql
   CREATE INDEX idx_email_lower ON users(lower(email));
   ```

### Query Optimization Tips

1. **JSONB Queries**
   - Use GIN indexes with specific operators (`@>`, `?`, `?&`, `?|`)
   - Create indexes on frequently accessed paths
   - Consider jsonb_path_ops for smaller indexes

2. **Time-Range Queries**
   - Use BRIN indexes for append-only tables
   - Partition large tables by time
   - Create composite indexes with time as trailing column

3. **Multi-Column Indexes**
   - Order columns by selectivity (most selective first)
   - Consider query patterns when ordering
   - Limit to 3-4 columns maximum

4. **Index Hints**
   ```sql
   -- Force index usage if needed
   SET enable_seqscan = off;
   -- Query here
   SET enable_seqscan = on;
   ```

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Index Hit Ratio**
   ```sql
   SELECT
       sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit + idx_blks_read), 0) as index_hit_ratio
   FROM pg_statio_user_indexes;
   ```

2. **Unused Indexes**
   ```sql
   SELECT
       schemaname, tablename, indexname
   FROM pg_stat_user_indexes
   WHERE idx_scan = 0
   AND indexrelid NOT IN (SELECT conindid FROM pg_constraint);
   ```

3. **Missing Indexes** (from pg_stat_user_tables)
   ```sql
   SELECT
       schemaname, tablename,
       seq_scan, seq_tup_read,
       ROUND(seq_tup_read::numeric / NULLIF(seq_scan, 0)) as avg_rows_per_seq_scan
   FROM pg_stat_user_tables
   WHERE seq_scan > 1000
   ORDER BY seq_tup_read DESC;
   ```

### Alert Thresholds

- Index bloat > 30%: Schedule REINDEX
- Unused indexes after 30 days: Consider dropping
- Sequential scans > 10000/day on large tables: Create index
- Index size > table size: Investigate and optimize
- Query time > 1 second: Analyze execution plan