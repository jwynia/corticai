# Package Export Patterns

## Purpose
This document defines how CorticAI exports its APIs through the NPM package and how each integration point (MCP server, Mastra wrapper) imports from the core package.

## Classification
- **Domain:** Cross-Cutting
- **Stability:** Established
- **Abstraction:** Structural
- **Confidence:** Established

## Content

### Overview

CorticAI follows a **hub-and-spoke distribution model** where:

```
┌─────────────────────────────────────┐
│     CorticAI NPM Package (core)     │
│  • Storage adapters                 │
│  • Query system                      │
│  • Context agents                    │
│  • Context tools                     │
└────────────┬────────────────────────┘
             │
    ┌────────┴────────┬────────────┐
    │                 │            │
    ▼                 ▼            ▼
┌─────────┐  ┌─────────────┐  ┌──────────┐
│ Direct  │  │ MCP Server  │  │ Mastra   │
│ Library │  │  Wrapper    │  │ Wrapper  │
│ Usage   │  │             │  │          │
└─────────┘  └─────────────┘  └──────────┘
```

Each wrapper:
- Imports specific exports from the core NPM package
- Re-exports them in a wrapper-specific way
- Contains only adapter/integration logic, never core functionality

### Core NPM Package Structure

#### Main Entry Point
**File:** `app/src/index.ts`
**Export:** `npm install corticai`

```typescript
// Exports everything from all modules
export * from './storage/index.js'
export * from './query/index.js'
export * from './context/index.js'
export * from './mastra/index.js'
export * from './types/entity.js'
```

#### Storage Module
**File:** `app/src/storage/index.ts`
**Import:** `import { DuckDBStorageAdapter } from 'corticai/storage'`

Exports storage adapters:
- `MemoryStorageAdapter`
- `JSONStorageAdapter`
- `DuckDBStorageAdapter`
- `KuzuStorageAdapter`
- `CosmosDBStorageAdapter`

#### Query Module
**File:** `app/src/query/index.ts`
**Import:** `import { QueryBuilder } from 'corticai/query'`

Exports query interfaces:
- `QueryBuilder`
- `QueryExecutor`
- Type definitions

#### Context Module
**File:** `app/src/context/index.ts`
**Import:** `import { setupContextManagement } from 'corticai'` or `import { contextAgents } from 'corticai/context'`

**Sub-exports:**
- `import { contextAgents, contextTools } from 'corticai/context/agents'`
- `import { contextTools } from 'corticai/context/tools'`
- `import { createCorticaiMCPServer } from 'corticai/context/mcp'`

### Wrapper Integration Points

#### 1. MCP Server Wrapper

**Location:** `app/src/context/mcp/`

**Purpose:** Exposes CorticAI as an MCP server for Claude Desktop, Cursor, and other MCP clients

**Import Pattern:**
```typescript
// Imports from core context module
import { contextTools } from '../context/tools/index.js';
import { createContextManager, createQueryAssistant } from '../context/agents/index.js';

// Re-exports via MCP protocol
export function createCorticaiMCPServer(config: CorticaiMCPServerConfig): MCPServer {
  // Wrapper logic only - all real functionality comes from imports above
  const selectedTools = filterTools(contextTools, config.tools);
  return new MCPServer({
    tools: selectedTools,
    // ...
  });
}
```

**Dependency Flow:**
```
MCP Server → contextTools (imported from core)
           → contextAgents (imported from core)
```

**For Users:**
```bash
# Users run the MCP server
npm run mcp:server

# Which uses CorticAI exports internally
# The server is just an adapter, not a re-implementation
```

#### 2. Mastra Integration Wrapper

**Location:** `app/src/mastra/index.ts`

**Purpose:** Provides CorticAI agents and tools for Mastra workflows

**Import Pattern:**
```typescript
// Re-export context agents and tools from core
export {
  ContextManagerAgent,
  createContextManager,
  QueryAssistantAgent,
  createQueryAssistant,
  ContextObserverAgent,
  createContextObserver,
  contextAgents,
  createContextAgents,
} from '../context/agents/index.js';

export {
  contextTools,
  contextToolCategories,
  contextStoreTools,
  contextQueryTools,
} from '../context/tools/index.js';

// Optional: Wrapper function for pre-configured Mastra instance
export function createCorticaiMastra(options?: MastraConfig): Mastra {
  return new Mastra({
    agents: {
      contextManager: contextAgents.ContextManager(options),
      // ... other agents from core
    }
  });
}
```

**Dependency Flow:**
```
Mastra Wrapper → contextAgents (imported from core)
               → contextTools (imported from core)
```

**For Users:**
```typescript
import { contextAgents, contextTools } from 'corticai/mastra';

// Or use the factory
import { createCorticaiMastra } from 'corticai/mastra';
const mastra = createCorticaiMastra({ contextStorageType: 'duckdb' });
```

#### 3. Direct Library Usage

**For Users:** The most common usage pattern

```typescript
import { setupContextManagement } from 'corticai';

// Create context management system
const context = setupContextManagement({
  storageType: 'duckdb',
  duckdb: { database: './context.db' }
});

// Use directly - no wrapper needed
await context.store({
  type: 'decision',
  content: 'Use TypeScript for type safety'
});
```

### Export Hierarchy

```
corticai (NPM package)
├── ./                          Main entry - full re-export
├── ./storage                   Storage adapters
├── ./query                      Query system
├── ./context                    Context management
│   ├── ./context/agents         Context agents
│   ├── ./context/tools          Context tools
│   └── ./context/mcp            MCP server (for internal use)
├── ./mastra                     Mastra wrapper (re-exports agents/tools)
└── ./types                      Type definitions
```

### Wrapper Export Rules

**Rule 1: Never Duplicate Core Logic**
- Wrappers MUST import from core, not re-implement
- If you're tempted to duplicate, the logic belongs in core

**Rule 2: Re-export, Don't Transform**
- Wrappers typically re-export core functionality unchanged
- Transformation logic is part of core (agents, tools)
- Wrappers only adapt the interface for their protocol (MCP, Mastra, etc.)

**Rule 3: Wrapper-Specific Code is Minimal**
- MCP server: Protocol adaptation and tool filtering
- Mastra: Instance factory and agent configuration
- Each wrapper should be <200 lines of non-test code

**Rule 4: Clear Dependency Direction**
- Wrappers depend on core
- Core never depends on wrappers
- Circular dependencies are always a red flag

### Import Patterns

#### ✅ Correct: Core Import in Wrapper
```typescript
// src/context/mcp/server.ts
import { contextTools } from '../context/tools/index.js';
// Wrapper adapts contextTools for MCP protocol
```

#### ❌ Incorrect: Duplicating Core Logic
```typescript
// DON'T DO THIS
import { contextTools } from '../context/tools/index.js';
export const mcpTools = Object.keys(contextTools).reduce(...); // duplicates logic
```

#### ✅ Correct: Re-export from Wrapper
```typescript
// src/mastra/index.ts
export { contextAgents } from '../context/agents/index.js';
// Users can now: import { contextAgents } from 'corticai/mastra'
```

#### ❌ Incorrect: Wrapper Creates Its Own Version
```typescript
// DON'T DO THIS
export function createContextManager() { /* re-implementation */ }
```

### Adding New Integration Points

When adding a new integration point (e.g., REST API, GraphQL, etc.):

1. **Create wrapper directory**: `app/src/integrations/[name]/`

2. **Import from core only**:
   ```typescript
   import { contextTools, contextAgents } from '../context/index.js';
   ```

3. **Adapt for protocol**:
   ```typescript
   export function create[Name]Server() {
     // Only protocol-specific adaptation
     // All business logic from imports above
   }
   ```

4. **Update package.json exports** (if creating new entry point):
   ```json
   {
     "exports": {
       ".": "./dist/index.js",
       "./[name]": "./dist/integrations/[name]/index.js"
     }
   }
   ```

5. **Document in context network** with a new cross-cutting pattern

### Testing Strategy

**Core Tests** (`app/src/*/` test files):
- Unit tests for all logic
- Test storage, query, agents, tools directly
- Full coverage of business logic

**Wrapper Tests** (`app/src/[wrapper]/` test files):
- Test adapter logic only
- Test that wrapper correctly uses core imports
- Test protocol-specific adaptation
- DON'T test core functionality (already tested in core tests)

### Version Management

**Version Updates:**
- Core NPM package version: Updated when any core logic changes
- Wrappers: Version follows core version (always match)
- No independent versioning for wrappers

**Compatibility:**
- MCP server v1.0.0 uses CorticAI v1.0.0
- Mastra wrapper v1.0.0 uses CorticAI v1.0.0
- Always keep versions synchronized

## Relationships
- **Parent Nodes:** [cross_cutting/index.md]
- **Child Nodes:** None
- **Related Nodes:**
  - [decisions/adr_006_npm_centric_distribution.md] - implements - Distribution architecture decision
  - [foundation/structure.md] - defines - Project structure enabling this pattern

## Navigation Guidance
- **Access Context:** Reference when adding new integration points or reviewing wrapper implementations
- **Common Next Steps:** Use as a template when creating new wrappers
- **Related Tasks:** Package publishing, new integration development, API refactoring
- **Update Patterns:** Update when adding new export points or changing export structure

## Metadata
- **Created:** 2025-10-20
- **Last Updated:** 2025-10-20
- **Updated By:** Claude

## Change History
- 2025-10-20: Initial documentation of NPM package export patterns and wrapper integration points
