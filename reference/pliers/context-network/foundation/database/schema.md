# Core Database Schema Design

## Overview

The Pliers v3 database schema is designed as a hybrid model combining normalized relational tables for core entities with PostgreSQL's JSONB capabilities for flexible, schema-less data storage. This approach balances the benefits of traditional RDBMS constraints and relationships with the flexibility needed for dynamic form definitions and submissions.

## Design Principles

### 1. Hybrid Storage Model
- **Normalized tables** for core entities (users, organizations, forms)
- **JSONB columns** for flexible schemas (form definitions, submission data)
- **Event sourcing** for complete audit trail and history
- **Soft deletes** for data recovery and compliance

### 2. Multi-Tenancy Architecture
- Organization-based isolation
- Row-level security (RLS) policies
- Tenant-aware indexing strategies
- Resource quotas and limits

### 3. Performance Optimization
- Strategic use of indexes (B-tree, GIN, BRIN)
- Table partitioning for large datasets
- Materialized views for analytics
- Connection pooling and query optimization

### 4. Data Integrity
- Foreign key constraints for relationships
- CHECK constraints for data validation
- Unique constraints for business rules
- Trigger-based validation for complex logic

## Core Tables

### Organizations Table

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    description TEXT,

    -- Settings and configuration
    settings JSONB DEFAULT '{}',
    features JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{}',

    -- Subscription and billing
    plan_id UUID,
    subscription_status VARCHAR(50) DEFAULT 'trial',
    subscription_expires_at TIMESTAMPTZ,

    -- Contact information
    primary_contact_id UUID,
    billing_email VARCHAR(255),
    support_email VARCHAR(255),

    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[],

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,

    CONSTRAINT organization_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);
```

**JSONB Structure for `settings`:**
```json
{
  "branding": {
    "logo_url": "https://...",
    "primary_color": "#000000",
    "secondary_color": "#ffffff"
  },
  "security": {
    "mfa_required": true,
    "password_policy": {
      "min_length": 12,
      "require_special": true
    },
    "session_timeout_minutes": 30
  },
  "notifications": {
    "email_enabled": true,
    "webhook_url": "https://..."
  }
}
```

### Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Authentication
    email VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    auth_data JSONB DEFAULT '{}',

    -- Profile
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    display_name VARCHAR(255),
    avatar_url TEXT,
    profile JSONB DEFAULT '{}',

    -- Status and roles
    status VARCHAR(50) DEFAULT 'active',
    roles TEXT[],
    permissions JSONB DEFAULT '{}',

    -- Preferences
    preferences JSONB DEFAULT '{}',
    timezone VARCHAR(100) DEFAULT 'UTC',
    locale VARCHAR(10) DEFAULT 'en-US',

    -- Security
    last_login_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_settings JSONB DEFAULT '{}',

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,

    CONSTRAINT unique_email_per_org UNIQUE(organization_id, email),
    CONSTRAINT unique_username_per_org UNIQUE(organization_id, username)
);
```

### Forms Table

```sql
CREATE TABLE forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Identification
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',

    -- Status and visibility
    status VARCHAR(50) DEFAULT 'draft',
    visibility VARCHAR(50) DEFAULT 'private',

    -- Form definition (complete structure)
    definition JSONB NOT NULL,

    -- Configuration
    settings JSONB DEFAULT '{}',
    permissions JSONB DEFAULT '{}',

    -- Categorization
    category VARCHAR(255),
    tags TEXT[],

    -- Versioning
    parent_id UUID REFERENCES forms(id),
    is_latest BOOLEAN DEFAULT true,
    published_at TIMESTAMPTZ,
    deprecated_at TIMESTAMPTZ,

    -- Usage tracking
    submission_count INTEGER DEFAULT 0,
    last_submission_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    published_by UUID REFERENCES users(id),

    CONSTRAINT unique_form_slug_per_org UNIQUE(organization_id, slug, version),
    CONSTRAINT valid_form_status CHECK (status IN ('draft', 'published', 'deprecated', 'archived')),
    CONSTRAINT valid_semver CHECK (version ~ '^\d+\.\d+\.\d+$')
);
```

**JSONB Structure for `definition`:**
```json
{
  "title": "Employee Onboarding Form",
  "description": "Complete employee information for onboarding",
  "fields": [
    {
      "id": "field_001",
      "type": "text",
      "name": "firstName",
      "label": "First Name",
      "required": true,
      "validation": {
        "minLength": 2,
        "maxLength": 50,
        "pattern": "^[a-zA-Z]+$"
      },
      "conditional": {
        "show": true,
        "when": []
      },
      "ui": {
        "placeholder": "Enter first name",
        "helpText": "Legal first name",
        "width": "half"
      }
    }
  ],
  "sections": [],
  "pages": [],
  "logic": [],
  "calculations": [],
  "integrations": []
}
```

### Submissions Table

```sql
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    form_id UUID NOT NULL REFERENCES forms(id),

    -- Identification
    submission_number VARCHAR(50) NOT NULL,
    external_id VARCHAR(255),

    -- Status tracking
    status VARCHAR(50) DEFAULT 'draft',
    workflow_state VARCHAR(50),

    -- Submission data (flat key-value pairs)
    data JSONB NOT NULL DEFAULT '{}',

    -- Files and attachments
    attachments JSONB DEFAULT '[]',
    attachment_count INTEGER DEFAULT 0,

    -- Validation and processing
    validation_state JSONB DEFAULT '{}',
    validation_errors JSONB DEFAULT '[]',
    is_valid BOOLEAN DEFAULT false,

    -- Assignment and ownership
    submitted_by UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    assigned_team VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    -- Source and context
    source VARCHAR(50) DEFAULT 'web',
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[],

    -- Audit
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id),

    CONSTRAINT unique_submission_number UNIQUE(organization_id, submission_number),
    CONSTRAINT valid_submission_status CHECK (status IN ('draft', 'submitted', 'processing', 'approved', 'rejected', 'completed', 'archived'))
);
```

### Workflows Table

```sql
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Identification
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',

    -- Type and trigger
    type VARCHAR(50) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL,
    trigger_config JSONB DEFAULT '{}',

    -- Status
    status VARCHAR(50) DEFAULT 'draft',
    is_active BOOLEAN DEFAULT false,

    -- Workflow definition (state machine)
    definition JSONB NOT NULL,

    -- Configuration
    settings JSONB DEFAULT '{}',
    timeout_seconds INTEGER,
    retry_config JSONB DEFAULT '{}',

    -- Associations
    form_ids UUID[],

    -- Usage tracking
    execution_count INTEGER DEFAULT 0,
    last_execution_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[],

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),

    CONSTRAINT unique_workflow_slug UNIQUE(organization_id, slug, version),
    CONSTRAINT valid_workflow_status CHECK (status IN ('draft', 'published', 'deprecated', 'archived')),
    CONSTRAINT valid_trigger_type CHECK (trigger_type IN ('manual', 'form_submission', 'event', 'schedule', 'webhook'))
);
```

### Workflow_Executions Table

```sql
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    workflow_id UUID NOT NULL REFERENCES workflows(id),

    -- Optional associations
    submission_id UUID REFERENCES submissions(id),
    parent_execution_id UUID REFERENCES workflow_executions(id),

    -- State management
    current_state VARCHAR(255) NOT NULL,
    previous_state VARCHAR(255),
    state_history JSONB DEFAULT '[]',

    -- Context and variables
    context JSONB DEFAULT '{}',
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'running',
    error_message TEXT,
    error_details JSONB,

    -- Performance
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,

    -- Execution details
    triggered_by UUID REFERENCES users(id),
    trigger_source VARCHAR(50),

    -- Metadata
    metadata JSONB DEFAULT '{}',

    CONSTRAINT valid_execution_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'))
);
```

### Events Table (Event Sourcing)

```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Event identification
    event_type VARCHAR(255) NOT NULL,
    event_version VARCHAR(10) NOT NULL DEFAULT '1.0',
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Aggregate information
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    aggregate_version INTEGER,

    -- Event data
    payload JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',

    -- Causation and correlation
    correlation_id UUID,
    causation_id UUID,

    -- Source
    user_id UUID REFERENCES users(id),
    session_id UUID,
    ip_address INET,
    user_agent TEXT,

    -- Processing
    processed_at TIMESTAMPTZ,
    processing_errors JSONB,

    -- Indexing helpers
    indexed_values JSONB DEFAULT '{}',

    CONSTRAINT valid_aggregate_type CHECK (aggregate_type IN ('form', 'submission', 'workflow', 'user', 'organization'))
) PARTITION BY RANGE (event_timestamp);

-- Create monthly partitions
CREATE TABLE events_2025_01 PARTITION OF events
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### Attachments Table

```sql
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Associations (at least one required)
    submission_id UUID REFERENCES submissions(id),
    form_id UUID REFERENCES forms(id),
    user_id UUID REFERENCES users(id),

    -- File information
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,

    -- Storage
    storage_provider VARCHAR(50) DEFAULT 's3',
    storage_key TEXT NOT NULL,
    storage_bucket VARCHAR(255),
    cdn_url TEXT,

    -- Security
    checksum VARCHAR(64),
    encryption_key_id VARCHAR(255),
    access_control VARCHAR(50) DEFAULT 'private',

    -- Scanning and validation
    virus_scanned BOOLEAN DEFAULT false,
    virus_scan_result JSONB,
    content_validated BOOLEAN DEFAULT false,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    exif_data JSONB,

    -- Audit
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id),

    CONSTRAINT valid_mime_type CHECK (mime_type ~ '^[a-z]+/[a-z0-9\.\-\+]+$'),
    CONSTRAINT require_association CHECK (submission_id IS NOT NULL OR form_id IS NOT NULL OR user_id IS NOT NULL)
);
```

### Plugins Table

```sql
CREATE TABLE plugins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),

    -- Identification
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    version VARCHAR(20) NOT NULL,

    -- Type and status
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'inactive',
    is_system BOOLEAN DEFAULT false,

    -- Configuration
    manifest JSONB NOT NULL,
    config JSONB DEFAULT '{}',
    permissions JSONB DEFAULT '{}',

    -- Installation
    installed_at TIMESTAMPTZ,
    installed_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ,

    -- Usage
    execution_count INTEGER DEFAULT 0,
    last_execution_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    CONSTRAINT valid_plugin_type CHECK (type IN ('field', 'action', 'integration', 'validation', 'transformation')),
    CONSTRAINT valid_plugin_status CHECK (status IN ('active', 'inactive', 'error', 'updating'))
);
```

### Audit_Logs Table

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Action details
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    resource_name VARCHAR(255),

    -- Changes
    old_values JSONB,
    new_values JSONB,
    diff JSONB,

    -- Context
    user_id UUID REFERENCES users(id),
    session_id UUID,
    ip_address INET,
    user_agent TEXT,

    -- Result
    status VARCHAR(20) NOT NULL,
    error_message TEXT,

    -- Timing
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    duration_ms INTEGER,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    CONSTRAINT valid_audit_status CHECK (status IN ('success', 'failure', 'partial'))
);
```

## Relationship Tables

### Role_Assignments Table

```sql
CREATE TABLE role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(100) NOT NULL,
    scope_type VARCHAR(50),
    scope_id UUID,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id),

    CONSTRAINT unique_role_assignment UNIQUE(user_id, role, scope_type, scope_id),
    CONSTRAINT valid_scope_type CHECK (scope_type IN ('organization', 'form', 'workflow', 'team'))
);
```

### Team_Members Table

```sql
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    team_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    removed_at TIMESTAMPTZ,

    CONSTRAINT unique_team_member UNIQUE(team_id, user_id),
    CONSTRAINT valid_team_role CHECK (role IN ('owner', 'admin', 'member', 'viewer'))
);
```

### Form_Collaborators Table

```sql
CREATE TABLE form_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES forms(id),
    user_id UUID NOT NULL REFERENCES users(id),
    permission_level VARCHAR(50) NOT NULL,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    can_publish BOOLEAN DEFAULT false,
    can_view_submissions BOOLEAN DEFAULT true,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    granted_by UUID REFERENCES users(id),
    revoked_at TIMESTAMPTZ,

    CONSTRAINT unique_form_collaborator UNIQUE(form_id, user_id)
);
```

## Supporting Tables

### API_Keys Table

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    prefix VARCHAR(20) NOT NULL,
    scopes TEXT[],
    rate_limit_per_minute INTEGER DEFAULT 60,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id),

    CONSTRAINT valid_key_prefix CHECK (prefix ~ '^pk_[a-z]+_')
);
```

### Webhooks Table

```sql
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL,
    headers JSONB DEFAULT '{}',
    secret_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    retry_config JSONB DEFAULT '{}',
    failure_count INTEGER DEFAULT 0,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES users(id),

    CONSTRAINT valid_webhook_url CHECK (url ~ '^https?://')
);
```

### Notifications Table

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'normal',
    read_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    action_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,

    CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);
```

## System Tables

### Database_Migrations Table

```sql
CREATE TABLE database_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    execution_time_ms INTEGER,
    checksum VARCHAR(64),
    applied_by VARCHAR(255) DEFAULT current_user
);
```

### System_Settings Table

```sql
CREATE TABLE system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(100),
    is_sensitive BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by VARCHAR(255)
);
```

## Data Types and Domains

```sql
-- Custom domains for consistent data types
CREATE DOMAIN email AS VARCHAR(255) CHECK (VALUE ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
CREATE DOMAIN url AS TEXT CHECK (VALUE ~ '^https?://');
CREATE DOMAIN semver AS VARCHAR(20) CHECK (VALUE ~ '^\d+\.\d+\.\d+(-[a-z0-9]+)?$');
CREATE DOMAIN slug AS VARCHAR(255) CHECK (VALUE ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
```

## Enum Types

```sql
-- Create ENUM types for consistent values
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending', 'deleted');
CREATE TYPE form_status AS ENUM ('draft', 'published', 'deprecated', 'archived');
CREATE TYPE submission_status AS ENUM ('draft', 'submitted', 'processing', 'approved', 'rejected', 'completed', 'archived');
CREATE TYPE workflow_status AS ENUM ('draft', 'published', 'deprecated', 'archived');
CREATE TYPE execution_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled', 'timeout');
CREATE TYPE trigger_type AS ENUM ('manual', 'form_submission', 'event', 'schedule', 'webhook');
```

## Notes

### Multi-Tenancy Strategy
- All tables include `organization_id` for tenant isolation
- Row-level security (RLS) policies enforce access control
- Separate connection pools per tenant for large deployments
- Consider schema-per-tenant for enterprise customers

### JSONB Schema Validation
- Use CHECK constraints with JSON Schema validation functions
- Create TypeScript types from JSON schemas
- Validate JSONB data at application level before insert/update
- Consider pg_jsonschema extension for database-level validation

### Performance Considerations
- Partition large tables (events, submissions) by time or organization
- Use materialized views for complex analytics queries
- Implement connection pooling with PgBouncer
- Consider read replicas for reporting workloads

### Security Measures
- Enable row-level security on all tenant tables
- Encrypt sensitive JSONB fields at application level
- Use column-level encryption for PII data
- Implement audit logging for all data modifications
- Regular security scans and penetration testing

### Backup and Recovery
- Continuous archiving with WAL-E or WAL-G
- Point-in-time recovery capability
- Regular backup testing and validation
- Separate backup retention for compliance data