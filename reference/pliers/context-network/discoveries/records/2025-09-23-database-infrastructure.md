# Discovery: Existing PostgreSQL Infrastructure

## PostgreSQL Development Setup
**Found**: `/workspaces/pliers/docker-compose.dev.yml`
**Summary**: PostgreSQL 15 with pgvector is already configured and running
**Significance**: No need to create new database container; focus on schema and ORM setup

## Connection Details from Container
**Found**: Container-to-container networking configuration
**Summary**: Database accessible at `host.docker.internal:5432` from this development container
**Significance**: Must use host.docker.internal instead of localhost for connections

## Database Configuration
- **Container Name**: pliers-postgres-dev
- **Image**: pgvector/pgvector:pg15 (includes vector extension support)
- **Database**: pliers_dev
- **User**: pliers_user
- **Password**: pliers-version3-2025!
- **Port**: 5432 (exposed to host)
- **Network**: pliers-network

## Volume Mounts
- **Data Directory**: `./data/postgres` (gitignored, persistent)
- **Backups Directory**: `./backups` (gitignored, for backup storage)
- **Init Scripts**: `./scripts/init` (commented out, available for initial SQL)

## Health Check Configuration
```yaml
test: ["CMD-SHELL", "pg_isready -U pliers_user -d pliers_dev"]
interval: 10s
timeout: 5s
retries: 5
```

## Connection String for Development
```
postgresql://pliers_user:pliers-version3-2025!@host.docker.internal:5432/pliers_dev
```

## Implementation Impact
1. **Skip container setup** - Already handled by docker-compose.dev.yml
2. **Focus on Drizzle ORM** - Connection configuration and schema setup
3. **Use existing volumes** - Data and backups already configured
4. **pgvector available** - Can implement vector search features if needed

## Related Tasks
- **IMPL-001**: Updated to reflect existing infrastructure
- **Next steps**: Configure Drizzle ORM to connect to existing database

## See Also
- [[IMPL-001]] - Database Setup and Core Schema Implementation
- [[DOC-003-1]] - Core Database Schema Design
- [[docker-compose.dev.yml]] - PostgreSQL container configuration

---
*Discovered: 2025-09-23*
*Context: Preparing for IMPL-001 implementation*