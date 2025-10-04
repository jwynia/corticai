# Discovery: Project Structure for Database Implementation

## Project Layout
**Found**: Monorepo structure at `/workspaces/pliers`
**Summary**: Multi-app architecture with separate api, web, and ai-service apps
**Significance**: Database code should go in `apps/api/src/db/` for the API service

## Application Structure
```
/workspaces/pliers/
├── apps/
│   ├── api/          # Main API service (database code here)
│   │   ├── src/
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── web/          # Frontend application
│   └── ai-service/   # AI service
├── context-network/  # Project documentation and planning
├── data/            # Docker volume mount for PostgreSQL
├── backups/         # Docker volume mount for backups
├── docker-compose.dev.yml
├── .env.example
└── .env.local       # Configured with correct database credentials
```

## Database Implementation Location
Based on the structure, database code should be organized as:
```
apps/api/src/
├── db/
│   ├── schema/      # Drizzle schema definitions
│   │   ├── organizations.ts
│   │   ├── users.ts
│   │   ├── forms.ts
│   │   ├── submissions.ts
│   │   ├── workflows.ts
│   │   └── events.ts
│   ├── migrations/  # Database migrations
│   ├── seed/        # Seed data scripts
│   ├── client.ts    # Database connection
│   └── index.ts     # Exports
├── services/        # Business logic
├── routes/          # API endpoints
└── index.ts         # Main entry point
```

## Environment Configuration
- **.env.local**: Already configured with:
  - `DB_HOST=host.docker.internal`
  - `DB_PASSWORD=pliers-version3-2025!` (updated)
  - Connection pool settings
- **Connection String**:
  ```
  postgresql://pliers_user:pliers-version3-2025!@host.docker.internal:5432/pliers_dev
  ```

## Next Steps for IMPL-001
1. Install Drizzle ORM and PostgreSQL client in `apps/api`
2. Create database connection module at `apps/api/src/db/client.ts`
3. Define schemas in `apps/api/src/db/schema/`
4. Set up migrations in `apps/api/src/db/migrations/`
5. Create seed data scripts in `apps/api/src/db/seed/`

## Related Documents
- [[2025-09-23-database-infrastructure]] - PostgreSQL container details
- [[IMPL-001]] - Database setup task
- [[DOC-003-1]] - Core database schema design

---
*Discovered: 2025-09-23*
*Context: Preparing database implementation structure*