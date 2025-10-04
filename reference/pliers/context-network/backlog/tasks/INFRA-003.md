# INFRA-003: Database Schema Foundation

## Overview
Create core database schema with migration system to establish the foundational data storage for the Pliers form engine.

## Status
- **Current Status:** completed
- **Priority:** high
- **Size:** medium
- **Epic:** [Infrastructure](../by-epic/infrastructure/index.md)
- **Sprint:** [Active Sprint](../../planning/sprints/active.md)
- **PR:** #23 (merged)
- **Completed:** 2025-09-27
- **Merged By:** jwynia

## Description
Enhance the existing database schema and migration system to provide a complete foundation for form definitions, submissions, and event storage. The project already has core tables implemented with Drizzle ORM - this task focuses on adding missing features, improving JSONB validation, and optimizing performance.

## Acceptance Criteria
- [ ] Existing Drizzle migration system enhanced and fully tested
- [ ] Core tables validated and enhanced as needed:
  - [ ] `forms` table (existing) with complete versioning support
  - [ ] `submissions` table (existing) with optimized JSONB data storage
  - [ ] `events` table (existing) enhanced for event sourcing foundation
- [ ] JSONB validation functions implemented with sub-millisecond performance
- [ ] Database indexes optimized for common query patterns (review and enhance existing)
- [ ] Database constraints and validation rules comprehensively tested
- [ ] Connection pooling configuration enhanced and performance tested
- [ ] Kysely dependency removed (project standardized on Drizzle ORM)

## Technical Specifications

### Migration System Enhancement
- Validate existing timestamp-based migration naming with Drizzle Kit
- Ensure migration rollback functionality is properly tested
- TypeScript-first approach with Drizzle ORM for type safety
- Add migration validation and verification utilities

### Core Schema Structure
```sql
-- Form definitions with versioning
CREATE TABLE form_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  definition JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('draft', 'active', 'archived')),
  UNIQUE(name, version)
);

-- Form submissions with optimized JSONB storage
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_definition_id UUID NOT NULL REFERENCES form_definitions(id),
  form_version INTEGER NOT NULL,
  data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Generated columns for common queries
  title TEXT GENERATED ALWAYS AS (data->>'title') STORED,
  priority INTEGER GENERATED ALWAYS AS ((data->>'priority')::INTEGER) STORED
);

-- Event store for event sourcing
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id UUID NOT NULL,
  aggregate_type TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  event_version INTEGER NOT NULL,
  correlation_id UUID,
  causation_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(aggregate_id, event_version)
);
```

### Index Strategy
- GIN indexes for JSONB queries on common fields
- B-tree indexes for timestamp and UUID lookups
- Partial indexes for status-based filtering
- Composite indexes for common query patterns

### Performance Requirements
- JSONB validation functions with sub-millisecond execution
- Connection pooling with appropriate pool size configuration
- Query optimization for form retrieval under 50ms
- Migration execution under 10 seconds for typical schemas

## Dependencies
- **Blocks:** FORM-001 (Zod Schema System), FORM-002 (Form Definition CRUD), EVENT-001 (Event Store)
- **Requires:** INFRA-001 (Development Environment Setup)
- **Related:** INFRA-002 (Testing Infrastructure Setup)

## Definition of Done
- [ ] Migration system runs successfully with `npm run migrate`
- [ ] All core tables created with proper constraints and relationships
- [ ] Database performance meets baseline requirements (queries <50ms)
- [ ] Migration rollback functionality tested and working
- [ ] Database seeding for development/testing implemented
- [ ] JSONB validation functions created and tested
- [ ] Connection pooling configured and performance tested
- [ ] Comprehensive test coverage for all database operations
- [ ] Documentation created for schema and migration processes

## Implementation Notes

### Technology Choices
- **Migration Tool:** Drizzle Kit for TypeScript-first database operations (existing)
- **Connection Pooling:** Enhanced pg-pool configuration with optimized pool size
- **JSONB Validation:** Custom PL/pgSQL functions with JSON Schema validation (new)
- **Index Strategy:** Review and optimize existing GIN indexes for JSONB, B-tree for traditional columns

### Development Workflow
1. Review and validate existing Drizzle migration configuration
2. Assess existing core tables and identify enhancement needs
3. Implement JSONB validation functions (new requirement)
4. Review and optimize existing indexes for performance
5. Enhance connection pooling configuration
6. Validate existing database seeding utilities
7. Write comprehensive tests for all database operations
8. Remove Kysely dependency and update documentation

### Testing Strategy
- Unit tests for migration scripts
- Integration tests with TestContainers (from INFRA-002)
- Performance tests for JSONB queries
- Migration rollback testing
- Database constraint validation testing

## Branch Naming
`infra/003-database-schema-foundation`

## Estimated Effort
**Medium (3-5 days)** - Requires database design expertise and performance optimization knowledge.

## Agent Requirements
- **Primary Skills:** PostgreSQL, database migration systems, JSONB optimization
- **Secondary Skills:** TypeScript, Kysely, connection pooling, performance testing
- **Experience Level:** Intermediate to Advanced database development

## Success Metrics
- [ ] All core tables support expected query patterns
- [ ] Database performance benchmarks meet requirements
- [ ] Migration system supports team development workflow
- [ ] JSONB queries optimized with proper indexing
- [ ] Zero data integrity issues in testing

## Risk Factors
- **Medium Risk:** JSONB query performance optimization
- **Low Risk:** Migration system configuration
- **Low Risk:** Connection pooling setup

## Related Documents
- [Technology Stack Decision](../../decisions/technology_stack.md)
- [Architecture Overview](../../elements/architecture/modern_design.md)
- [Form Engine Specification](../../elements/core-components/form_engine.md)

---
*Created: 2025-09-27*
*Last Updated: 2025-09-27*
*Groomed By: Claude/Task Grooming*