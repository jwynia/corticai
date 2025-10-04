# Discoveries Index

## Purpose
Central index for all discovery records - learnings, solutions, and insights gained during development.

## Recent Discoveries
- [2025-09-23: Technical Research Findings](./records/2025-09-23-technical-research.md) - PostgreSQL patterns, Hono architecture, Event sourcing, Multi-tenant RLS
- [2025-01-22: npm workspace protocol issue](./records/2025-01-22-npm-workspace.md) - npm doesn't support workspace:* syntax

## Categories

### Build & Tooling
- [npm workspace protocol issue](./records/2025-01-22-npm-workspace.md)

### Docker & Infrastructure
- *No discoveries yet*

### Architecture Decisions
- [Technical Research Findings](./records/2025-09-23-technical-research.md) - Event sourcing patterns, CQRS, Saga implementation

### Performance Optimizations
- [CQRS Read Model Strategies](./records/2025-09-23-technical-research.md#performance-optimizations-for-cqrs) - 10x-1000x performance gains

### Security Patterns
- [Multi-tenant RLS Implementation](./records/2025-09-23-technical-research.md#multi-tenant-row-level-security-patterns) - PostgreSQL row-level security

## How to Add a Discovery

When you discover something important:
1. Create a file in `./records/YYYY-MM-DD-[topic].md`
2. Follow the template in `.claude/commands/write-discovery.md`
3. Update this index with a link to your discovery
4. Link from relevant task files

## Search Keywords
npm, workspace, monorepo, docker, typescript, turborepo, postgresql, jsonb, event-sourcing,
cqrs, saga, row-level-security, multi-tenant, hono, plugin-architecture, validation

---
*Last Updated: 2025-09-23*