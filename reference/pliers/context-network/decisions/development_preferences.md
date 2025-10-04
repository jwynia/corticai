# Development Preferences and Standards

## Status
Active

## Date
2025-01-22

## Purpose
Document team development preferences and standards that should be followed throughout the project.

## Docker Volume Configuration

### Decision
Use **relative path volumes** instead of named/virtual volumes in Docker configurations.

### Rationale
- **Version Control Flexibility**: Relative paths allow choosing whether to version data or exclude it via .gitignore
- **Data Safety**: Virtual volumes are easy to accidentally delete during container rebuilds
- **Visibility**: Data stored in relative paths is easily inspectable and manageable
- **Backup**: Easier to backup and restore when data is in the filesystem
- **Development**: Simpler to reset or modify data during development

### Implementation
```yaml
# Preferred: Relative path volumes
services:
  postgres:
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
      - ./backups:/backups

# Avoided: Named volumes
services:
  postgres:
    volumes:
      - postgres_data:/var/lib/postgresql/data  # Avoid this
```

### Directory Structure for Docker Data
```
project/
├── data/               # Docker volume data (gitignored)
│   ├── postgres/      # PostgreSQL data
│   ├── redis/         # Redis data (if used)
│   └── uploads/       # File uploads
├── backups/           # Database backups (gitignored)
└── docker-compose.yml
```

### .gitignore Configuration
```gitignore
# Docker volumes - data persists locally but not in repo
data/
backups/

# But we might want to track some initial data
!data/.gitkeep
!data/seed/
```

## DevContainer Workflow

### Decision
Maintain devcontainer as primary development environment with external service connections.

### Rationale
- **Consistency**: All developers use the same Node.js and TypeScript versions
- **Isolation**: DevContainer for app development, separate containers for services
- **Flexibility**: Can connect to local Docker PostgreSQL or network database
- **Simplicity**: No need to install Node.js locally

### PostgreSQL Connection Strategy
1. **Local Development**: Run PostgreSQL in Docker on host, connect from devcontainer
2. **Network Database**: Connect to PostgreSQL on network for shared development
3. **Production-like**: Use docker-compose for full stack testing

## Environment Configuration

### Decision
Use `.env.local` for local overrides, never commit sensitive data.

### File Hierarchy
1. `.env.example` - Template with all variables (committed)
2. `.env.local` - Local development overrides (gitignored)
3. `.env.test` - Test environment settings (committed, no secrets)
4. `.env` - Production (never committed)

## Development Scripts

### Standard npm Scripts
```json
{
  "scripts": {
    "dev": "Development with hot reload",
    "build": "Production build",
    "test": "Run tests",
    "db:up": "Start local PostgreSQL",
    "db:down": "Stop local PostgreSQL",
    "db:reset": "Reset database to clean state",
    "db:migrate": "Run migrations",
    "db:seed": "Seed development data"
  }
}
```

## Code Style Preferences

### TypeScript
- Strict mode always enabled
- Explicit return types for public functions
- Interfaces over types when possible
- Zod for runtime validation

### File Organization
- Feature-based organization over layer-based
- Colocate tests with source files
- Explicit imports (no barrel exports)

## Metadata
- **Created:** 2025-01-22
- **Updated:** 2025-01-22
- **Updated By:** Claude/Development Setup

## Change History
- 2025-01-22: Initial documentation of development preferences