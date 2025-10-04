# Deployment Architecture

## Purpose
Defines the deployment architecture, containerization strategy, and infrastructure configuration for the Pliers multi-service application.

## Classification
- **Domain:** Core Concept
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** Established

## Overview

The Pliers deployment architecture is designed for flexibility, supporting development, staging, and production environments through containerization. The system can be deployed as a single Docker Compose stack for simplicity or as individual services for scalability.

## Deployment Models

### Model 1: Single-Host Docker Compose (Development/Small Scale)

Best for development, testing, and small-scale deployments.

```yaml
# Full stack deployment on single host
services:
  - PostgreSQL (primary database)
  - Redis (caching and sessions)
  - Core API Service
  - AI Service
  - Web Frontend (served via nginx)
  - Reverse Proxy (Traefik/nginx)
```

**Advantages:**
- Simple deployment with single command
- Easy local development
- Minimal infrastructure requirements
- Good for teams up to 50 users

**Limitations:**
- Single point of failure
- Limited scalability
- No high availability

### Model 2: Multi-Container Orchestration (Production)

For production deployments with Kubernetes or Docker Swarm.

```yaml
# Distributed deployment across multiple nodes
clusters:
  - Database cluster (PostgreSQL with replicas)
  - Application cluster (multiple API instances)
  - AI service cluster (GPU-enabled nodes)
  - Static asset CDN (Web frontend)
  - Load balancer cluster
```

**Advantages:**
- High availability
- Horizontal scalability
- Zero-downtime deployments
- Geographic distribution

**Requirements:**
- Container orchestration platform
- Multiple servers/nodes
- Load balancing infrastructure

### Model 3: Serverless/Edge (Future)

Leveraging edge computing and serverless platforms.

- Core API on serverless functions
- AI Service on specialized AI platforms
- Web frontend on CDN edge
- Database as managed service

## Container Architecture

### Base Images

```dockerfile
# base.Dockerfile - Shared base image
FROM node:18-alpine AS base

# Install common dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-client

# Setup pnpm
RUN npm install -g pnpm@8

WORKDIR /app

# Copy package files
COPY pnpm-workspace.yaml .
COPY package.json .
COPY pnpm-lock.yaml .

# Install dependencies
RUN pnpm install --frozen-lockfile --prod
```

### Core API Service Container

```dockerfile
# infrastructure/docker/api.Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Copy workspace files
COPY pnpm-workspace.yaml .
COPY package.json .
COPY pnpm-lock.yaml .

# Copy source files
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies and build
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @pliers/api build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy built application
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

# Environment
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### AI Service Container

```dockerfile
# infrastructure/docker/ai-service.Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Copy workspace files
COPY pnpm-workspace.yaml .
COPY package.json .
COPY pnpm-lock.yaml .

# Copy source files
COPY packages ./packages
COPY apps/ai-service ./apps/ai-service

# Install and build
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @pliers/ai-service build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install Python for AI libraries
RUN apk add --no-cache python3 py3-pip

# Copy built application
COPY --from=builder /app/apps/ai-service/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/ai-service/package.json .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

ENV NODE_ENV=production
ENV PORT=3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

### Web Frontend Container

```dockerfile
# infrastructure/docker/web.Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Copy workspace files
COPY pnpm-workspace.yaml .
COPY package.json .
COPY pnpm-lock.yaml .

# Copy source files
COPY packages ./packages
COPY apps/web ./apps/web

# Install and build
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @pliers/web build

# Production stage - nginx
FROM nginx:alpine AS production

# Copy built static files
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy nginx configuration
COPY infrastructure/nginx/default.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

## Docker Compose Configuration

### Full Stack Composition

```yaml
# infrastructure/docker-compose.yml
version: '3.8'

services:
  # Database
  postgres:
    image: postgres:15-alpine
    container_name: pliers-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME:-pliers}
      POSTGRES_USER: ${DB_USER:-pliers}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF8"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infrastructure/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "${DB_PORT:-5432}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-pliers}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Cache
  redis:
    image: redis:7-alpine
    container_name: pliers-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "${REDIS_PORT:-6379}:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Core API Service
  api:
    build:
      context: .
      dockerfile: ./infrastructure/docker/api.Dockerfile
      args:
        NODE_ENV: ${NODE_ENV:-production}
    container_name: pliers-api
    restart: unless-stopped
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      PORT: 3000
      DATABASE_URL: postgresql://${DB_USER:-pliers}:${DB_PASSWORD}@postgres:5432/${DB_NAME:-pliers}
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGINS: ${CORS_ORIGINS:-http://localhost:3002}
    ports:
      - "${API_PORT:-3000}:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # AI Service
  ai-service:
    build:
      context: .
      dockerfile: ./infrastructure/docker/ai-service.Dockerfile
      args:
        NODE_ENV: ${NODE_ENV:-production}
    container_name: pliers-ai-service
    restart: unless-stopped
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      PORT: 3001
      API_URL: http://api:3000
      REDIS_URL: redis://redis:6379
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      MODEL_CACHE_TTL: ${MODEL_CACHE_TTL:-3600}
    ports:
      - "${AI_PORT:-3001}:3001"
    depends_on:
      api:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  # Web Frontend
  web:
    build:
      context: .
      dockerfile: ./infrastructure/docker/web.Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL:-http://localhost:3000}
        VITE_AI_URL: ${VITE_AI_URL:-http://localhost:3001}
        VITE_WS_URL: ${VITE_WS_URL:-ws://localhost:3000}
    container_name: pliers-web
    restart: unless-stopped
    ports:
      - "${WEB_PORT:-3002}:80"
    depends_on:
      - api
      - ai-service
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Reverse Proxy (Optional - for production-like setup)
  traefik:
    image: traefik:v3.0
    container_name: pliers-proxy
    restart: unless-stopped
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080" # Traefik dashboard
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./infrastructure/traefik/traefik.yml:/etc/traefik/traefik.yml
      - ./infrastructure/traefik/certs:/certs
    labels:
      - "traefik.enable=true"

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  default:
    name: pliers-network
    driver: bridge
```

## Environment Configuration

### Environment Variables

```bash
# .env.example
# Database
DB_NAME=pliers
DB_USER=pliers
DB_PASSWORD=secure_password_here
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379
REDIS_PORT=6379

# API Service
API_PORT=3000
JWT_SECRET=your_jwt_secret_here
CORS_ORIGINS=http://localhost:3002

# AI Service
AI_PORT=3001
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
MODEL_CACHE_TTL=3600

# Web Frontend
WEB_PORT=3002
VITE_API_URL=http://localhost:3000
VITE_AI_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3000

# General
NODE_ENV=production
LOG_LEVEL=info
```

### Configuration Management

```typescript
// Centralized configuration
interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';

  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
    poolSize: number;
  };

  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };

  services: {
    api: {
      port: number;
      replicas: number;
      resources: {
        cpu: string;
        memory: string;
      };
    };
    ai: {
      port: number;
      replicas: number;
      resources: {
        cpu: string;
        memory: string;
        gpu?: string;
      };
    };
    web: {
      port: number;
      cdn?: string;
    };
  };

  monitoring: {
    enabled: boolean;
    prometheus?: string;
    grafana?: string;
    loki?: string;
  };
}
```

## Deployment Scripts

### Deployment Commands

```bash
#!/bin/bash
# infrastructure/scripts/deploy.sh

set -e

# Function to deploy based on environment
deploy() {
  ENV=$1

  case $ENV in
    dev)
      echo "Deploying development environment..."
      docker-compose -f docker-compose.yml up -d
      ;;

    staging)
      echo "Deploying staging environment..."
      docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d
      ;;

    production)
      echo "Deploying production environment..."
      docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
      ;;

    *)
      echo "Unknown environment: $ENV"
      echo "Usage: ./deploy.sh [dev|staging|production]"
      exit 1
      ;;
  esac
}

# Health check function
health_check() {
  echo "Checking service health..."

  # Check API
  curl -f http://localhost:3000/health || exit 1

  # Check AI Service
  curl -f http://localhost:3001/health || exit 1

  # Check Web
  curl -f http://localhost:3002 || exit 1

  echo "All services healthy!"
}

# Main execution
deploy $1
sleep 10
health_check
```

### Database Migration

```bash
#!/bin/bash
# infrastructure/scripts/migrate.sh

set -e

# Run database migrations
echo "Running database migrations..."

# Connect to API container and run migrations
docker exec pliers-api npm run migrate:up

echo "Migrations completed successfully!"
```

## Scaling Strategy

### Horizontal Scaling

```yaml
# docker-compose.scale.yml
services:
  api:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  ai-service:
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Load Balancing

```nginx
# infrastructure/nginx/load-balancer.conf
upstream api_servers {
    least_conn;
    server api1:3000;
    server api2:3000;
    server api3:3000;
}

upstream ai_servers {
    least_conn;
    server ai1:3001;
    server ai2:3001;
}

server {
    listen 80;

    location /api/ {
        proxy_pass http://api_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ai/ {
        proxy_pass http://ai_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring and Logging

### Monitoring Stack

```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./infrastructure/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana_data:/var/lib/grafana
      - ./infrastructure/grafana/dashboards:/etc/grafana/provisioning/dashboards
    ports:
      - "3003:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}

  loki:
    image: grafana/loki:latest
    volumes:
      - ./infrastructure/loki/loki-config.yml:/etc/loki/local-config.yaml
      - loki_data:/loki
    ports:
      - "3100:3100"

volumes:
  prometheus_data:
  grafana_data:
  loki_data:
```

## Security Considerations

### Network Security

```yaml
# Network isolation
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
  database:
    driver: bridge
    internal: true

services:
  web:
    networks:
      - frontend

  api:
    networks:
      - frontend
      - backend
      - database

  postgres:
    networks:
      - database
```

### Secret Management

```yaml
# Docker secrets (Swarm mode)
secrets:
  db_password:
    external: true
  jwt_secret:
    external: true
  openai_key:
    external: true

services:
  api:
    secrets:
      - db_password
      - jwt_secret

  ai-service:
    secrets:
      - openai_key
```

## Backup and Recovery

### Database Backup

```bash
#!/bin/bash
# infrastructure/scripts/backup.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Backup PostgreSQL
docker exec pliers-postgres pg_dump -U pliers pliers > \
  ${BACKUP_DIR}/pliers_db_${TIMESTAMP}.sql

# Backup Redis
docker exec pliers-redis redis-cli BGSAVE

# Compress backups
tar -czf ${BACKUP_DIR}/pliers_backup_${TIMESTAMP}.tar.gz \
  ${BACKUP_DIR}/pliers_db_${TIMESTAMP}.sql

echo "Backup completed: pliers_backup_${TIMESTAMP}.tar.gz"
```

## Production Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] SSL certificates obtained
- [ ] Database migrations tested
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Load testing completed

### Deployment
- [ ] Build all Docker images
- [ ] Push images to registry
- [ ] Deploy database first
- [ ] Run migrations
- [ ] Deploy services
- [ ] Verify health checks
- [ ] Test critical paths

### Post-Deployment
- [ ] Monitor metrics
- [ ] Check error logs
- [ ] Verify backups
- [ ] Update documentation
- [ ] Notify stakeholders

## Relationships
- **Parent Nodes:** [elements/architecture/modern_design.md] - implements - Part of architecture
- **Child Nodes:** None
- **Related Nodes:**
  - [elements/architecture/monorepo_structure.md] - deploys - Monorepo applications
  - [infrastructure/docker-compose.yml] - configures - Deployment configuration
  - [decisions/deployment_strategy.md] - justifies - Deployment decisions

## Navigation Guidance
- **Access Context**: Reference when deploying services or configuring infrastructure
- **Common Next Steps**: Execute deployment scripts or configure monitoring
- **Related Tasks**: Infrastructure setup, deployment automation, monitoring configuration
- **Update Patterns**: Update when deployment requirements change or new services added

## Metadata
- **Created:** 2025-09-20
- **Last Updated:** 2025-09-20
- **Updated By:** Claude/Architecture Planning

## Change History
- 2025-09-20: Initial deployment architecture documentation with Docker Compose and containerization strategy