# Monorepo Structure and Architecture

## Purpose
Defines the monorepo structure, workspace configuration, and development workflow for the multi-service Pliers architecture.

## Classification
- **Domain:** Core Concept
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** Established

## Overview

Pliers uses a monorepo structure to maintain all services, packages, and infrastructure in a single repository. This approach enables code sharing, consistent tooling, and simplified dependency management while maintaining clear service boundaries.

## Monorepo Benefits

1. **Code Sharing** - Shared packages for types, utilities, and clients
2. **Atomic Changes** - Cross-service changes in single commits
3. **Consistent Tooling** - Unified linting, testing, and build processes
4. **Simplified CI/CD** - Single pipeline for all services
5. **Better Refactoring** - Easier to refactor across service boundaries
6. **Single Source of Truth** - All code and documentation in one place

## Directory Structure

```
pliers/
├── apps/                           # Service applications
│   ├── api/                       # Core API Service
│   │   ├── src/
│   │   │   ├── index.ts          # Service entry point
│   │   │   ├── app.ts            # Hono app configuration
│   │   │   ├── routes/           # API route handlers
│   │   │   ├── services/         # Business logic
│   │   │   ├── repositories/     # Data access layer
│   │   │   ├── middleware/       # Custom middleware
│   │   │   └── utils/            # Service-specific utilities
│   │   ├── tests/
│   │   │   ├── unit/             # Unit tests
│   │   │   ├── integration/      # Integration tests
│   │   │   └── e2e/              # End-to-end tests
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── ai-service/                # AI Service (Mastra.ai + Hono)
│   │   ├── src/
│   │   │   ├── index.ts          # Service entry point
│   │   │   ├── app.ts            # Mastra + Hono setup
│   │   │   ├── agents/           # AI agent definitions
│   │   │   ├── protocols/        # A2A, MCP, AG-UI implementations
│   │   │   ├── workflows/        # AI workflow definitions
│   │   │   ├── handlers/         # Request handlers
│   │   │   └── utils/            # AI service utilities
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   └── web/                       # React Frontend
│       ├── src/
│       │   ├── index.tsx          # React entry point
│       │   ├── App.tsx            # Root component
│       │   ├── components/       # React components
│       │   ├── pages/            # Page components
│       │   ├── hooks/            # Custom React hooks
│       │   ├── services/         # API service clients
│       │   ├── store/            # State management
│       │   └── utils/            # Frontend utilities
│       ├── public/
│       ├── tests/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts        # Vite configuration
│       └── README.md
│
├── packages/                       # Shared packages
│   ├── shared/                    # Shared types and utilities
│   │   ├── src/
│   │   │   ├── types/            # TypeScript type definitions
│   │   │   ├── schemas/          # Zod schemas
│   │   │   ├── constants/        # Shared constants
│   │   │   └── utils/            # Shared utilities
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── api-client/                # TypeScript API client
│   │   ├── src/
│   │   │   ├── client.ts         # API client class
│   │   │   ├── endpoints/        # Endpoint definitions
│   │   │   └── types.ts          # Client-specific types
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ai-client/                 # AI service client
│   │   ├── src/
│   │   │   ├── client.ts         # AI client class
│   │   │   ├── protocols/        # Protocol clients
│   │   │   └── types.ts          # AI client types
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── config/                    # Shared configuration
│       ├── eslint/                # ESLint configurations
│       ├── prettier/              # Prettier configurations
│       ├── tsconfig/              # TypeScript configurations
│       └── jest/                  # Jest configurations
│
├── infrastructure/                 # Deployment and infrastructure
│   ├── docker/
│   │   ├── api.Dockerfile
│   │   ├── ai-service.Dockerfile
│   │   ├── web.Dockerfile
│   │   └── base.Dockerfile       # Shared base image
│   ├── kubernetes/                # K8s manifests (future)
│   ├── terraform/                 # Infrastructure as Code (future)
│   ├── scripts/                   # Deployment scripts
│   └── docker-compose.yml         # Full stack composition
│
├── context-network/               # Documentation
│   └── [...existing structure...]
│
├── .github/                       # GitHub configuration
│   ├── workflows/                # GitHub Actions
│   │   ├── ci.yml               # Continuous Integration
│   │   ├── cd.yml               # Continuous Deployment
│   │   └── pr.yml               # Pull Request checks
│   └── CODEOWNERS
│
├── tools/                         # Development tools
│   ├── generators/               # Code generators
│   └── scripts/                  # Development scripts
│
├── package.json                   # Root package.json
├── turbo.json                    # Turborepo configuration
├── pnpm-workspace.yaml           # PNPM workspace configuration
├── .nvmrc                        # Node version specification
├── .gitignore
├── README.md
└── LICENSE
```

## Workspace Configuration

### Turborepo Configuration

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "type-check": {
      "dependsOn": ["^build"]
    }
  },
  "globalEnv": [
    "NODE_ENV",
    "DATABASE_URL",
    "OPENAI_API_KEY"
  ]
}
```

### PNPM Workspace Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'tools/*'
```

### Root Package.json

```json
{
  "name": "pliers",
  "version": "3.0.0",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "clean": "turbo run clean",
    "docker:build": "docker-compose build",
    "docker:up": "docker-compose up",
    "docker:down": "docker-compose down"
  },
  "devDependencies": {
    "turbo": "latest",
    "@pliers/config": "workspace:*",
    "prettier": "^3.0.0",
    "eslint": "^8.0.0",
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  },
  "packageManager": "pnpm@8.0.0"
}
```

## Service Dependencies

### Dependency Graph

```mermaid
graph TD
    web[Web App] --> api-client[API Client]
    web --> ai-client[AI Client]
    api-client --> shared[Shared Package]
    ai-client --> shared
    api[API Service] --> shared
    ai-service[AI Service] --> shared
    api --> db[PostgreSQL]
    ai-service --> api-client
```

### Package Dependencies

```json
// apps/api/package.json
{
  "name": "@pliers/api",
  "dependencies": {
    "@pliers/shared": "workspace:*",
    "hono": "^4.0.0",
    "@hono/node-server": "^1.0.0",
    "@hono/zod-validator": "^0.2.0",
    "postgres": "^3.0.0",
    "kysely": "^0.26.0"
  }
}

// apps/ai-service/package.json
{
  "name": "@pliers/ai-service",
  "dependencies": {
    "@pliers/shared": "workspace:*",
    "@pliers/api-client": "workspace:*",
    "@mastra/core": "^1.0.0",
    "hono": "^4.0.0",
    "openai": "^4.0.0"
  }
}

// apps/web/package.json
{
  "name": "@pliers/web",
  "dependencies": {
    "@pliers/shared": "workspace:*",
    "@pliers/api-client": "workspace:*",
    "@pliers/ai-client": "workspace:*",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@tanstack/react-query": "^5.0.0"
  }
}
```

## Development Workflow

### Local Development

```bash
# Install dependencies
pnpm install

# Start all services in development mode
pnpm dev

# Start specific service
pnpm dev --filter=@pliers/api

# Run tests
pnpm test

# Build all services
pnpm build

# Type checking
pnpm type-check
```

### Service-Specific Commands

```bash
# API Service
cd apps/api
pnpm dev           # Start development server
pnpm test          # Run tests
pnpm build         # Build for production

# AI Service
cd apps/ai-service
pnpm dev           # Start AI service
pnpm test:agents   # Test AI agents

# Web App
cd apps/web
pnpm dev           # Start Vite dev server
pnpm build         # Build static assets
pnpm preview       # Preview production build
```

## Code Sharing Strategy

### Shared Types

```typescript
// packages/shared/src/types/form.ts
export interface FormDefinition {
  id: string;
  name: string;
  version: number;
  fields: FieldDefinition[];
  // ... shared type definition
}

// Used in all services
import { FormDefinition } from '@pliers/shared';
```

### Shared Schemas

```typescript
// packages/shared/src/schemas/form.ts
import { z } from 'zod';

export const FormDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  version: z.number(),
  // ... shared schema
});

// Used for validation across services
import { FormDefinitionSchema } from '@pliers/shared';
```

### API Client

```typescript
// packages/api-client/src/client.ts
export class PliersAPIClient {
  constructor(private baseUrl: string) {}

  async getForms(): Promise<FormDefinition[]> {
    // ... implementation
  }

  async createForm(form: FormDefinition): Promise<FormDefinition> {
    // ... implementation
  }
}

// Used in web app and AI service
import { PliersAPIClient } from '@pliers/api-client';
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm type-check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

## Deployment Strategy

### Docker Compose for Full Stack

```yaml
# infrastructure/docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: pliers
      POSTGRES_USER: pliers
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    build:
      context: .
      dockerfile: ./infrastructure/docker/api.Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://pliers:${DB_PASSWORD}@postgres:5432/pliers
    ports:
      - "3000:3000"
    depends_on:
      - postgres

  ai-service:
    build:
      context: .
      dockerfile: ./infrastructure/docker/ai-service.Dockerfile
    environment:
      NODE_ENV: production
      API_URL: http://api:3000
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    ports:
      - "3001:3001"
    depends_on:
      - api

  web:
    build:
      context: .
      dockerfile: ./infrastructure/docker/web.Dockerfile
    environment:
      VITE_API_URL: http://localhost:3000
      VITE_AI_URL: http://localhost:3001
    ports:
      - "3002:80"
    depends_on:
      - api
      - ai-service

volumes:
  postgres_data:
```

## Migration Path to Microservices

While starting as a monorepo, the architecture supports future service separation:

### Phase 1: Monorepo (Current)
- All services in single repository
- Shared development and deployment
- Simplified initial development

### Phase 2: Service Extraction (Future)
- Extract services to separate repositories
- Maintain shared packages as NPM packages
- Independent deployment pipelines

### Phase 3: Full Microservices (Future)
- Complete service independence
- Service mesh for communication
- Individual scaling and deployment

## Best Practices

### Code Organization
1. **Clear Boundaries** - Services don't import from each other directly
2. **Shared Through Packages** - All sharing via packages directory
3. **Type Safety** - Shared types ensure consistency
4. **Independent Testing** - Each service has own test suite

### Development Practices
1. **Atomic Commits** - Changes across services in single commits
2. **Feature Branches** - Develop features across all affected services
3. **Consistent Tooling** - Same linting, formatting across all code
4. **Documentation** - Each service has own README and API docs

### Performance Optimization
1. **Turborepo Caching** - Leverages build caching for speed
2. **Selective Builds** - Only rebuild changed services
3. **Parallel Execution** - Run tasks in parallel where possible
4. **Docker Layer Caching** - Optimize Dockerfiles for caching

## Relationships
- **Parent Nodes:** [elements/architecture/modern_design.md] - implements - Part of overall architecture
- **Child Nodes:** None
- **Related Nodes:**
  - [decisions/monorepo_strategy.md] - justifies - Monorepo approach rationale
  - [elements/architecture/service_boundaries.md] - defines - Service separation
  - [planning/phase2_task_backlog.md] - affects - Implementation tasks

## Navigation Guidance
- **Access Context**: Reference when setting up development environment or understanding project structure
- **Common Next Steps**: Review service-specific documentation or development workflow
- **Related Tasks**: Environment setup, service development, deployment configuration
- **Update Patterns**: Update when structure changes or new services are added

## Metadata
- **Created:** 2025-09-20
- **Last Updated:** 2025-09-20
- **Updated By:** Claude/Architecture Planning

## Change History
- 2025-09-20: Initial monorepo structure documentation with complete workspace configuration