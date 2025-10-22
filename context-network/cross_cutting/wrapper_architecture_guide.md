# Wrapper Architecture Guide

## Purpose
This document provides visual architecture diagrams and implementation guidelines for creating and maintaining wrapper integrations for CorticAI.

## Classification
- **Domain:** Cross-Cutting
- **Stability:** Semi-Stable
- **Abstraction:** Structural
- **Confidence:** Established

## Content

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         Users / Applications                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │  TypeScript    │  │  Claude Desktop  │  │  Mastra App     │  │
│  │  Project       │  │  / Cursor IDE    │  │  / Workflow     │  │
│  └────────┬───────┘  └────────┬─────────┘  └────────┬────────┘  │
│           │                   │                     │             │
└─────────┬─┴───────────────────┼─────────────────────┼────────────┘
          │                     │                     │
          │                     │                     │
    Direct NPM Import    MCP Protocol         Mastra Framework
          │                     │                     │
          │                     │                     │
┌─────────▼──────────┐  ┌──────▼─────────────┐  ┌────▼────────────┐
│  Direct Library    │  │  MCP Server Wrapper │  │ Mastra Wrapper  │
│  Usage             │  │ ───────────────────│  │ ──────────────── │
│                    │  │ • Adapter code     │  │ • Re-exports    │
│  import {          │  │ • Tool filtering   │  │ • Factory funcs │
│    QueryBuilder    │  │ • MCP protocol     │  │ • Mastra config │
│  } from            │  │                    │  │                 │
│    'corticai'      │  │ Imports from core: │  │ Imports from    │
│                    │  │ • contextTools     │  │ core:           │
│                    │  │ • contextAgents    │  │ • contextAgents │
│                    │  │                    │  │ • contextTools  │
└────────┬───────────┘  └──────┬─────────────┘  └────┬────────────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  CorticAI Core NPM  │
                    │  Package            │
                    ├─────────────────────┤
                    │ • Storage Layer     │
                    │ • Query System      │
                    │ • Context Agents    │
                    │ • Context Tools     │
                    │ • Type Definitions  │
                    └─────────────────────┘
```

### Wrapper Implementation Template

#### File Structure
```
app/src/[wrapper-name]/
├── index.ts              # Main export file
├── adapter.ts            # Protocol adaptation
├── config.ts             # Configuration types
├── index.test.ts         # Tests
└── README.md             # Wrapper-specific docs
```

#### Minimal Wrapper Pattern

```typescript
// app/src/[wrapper-name]/index.ts

/**
 * [Wrapper Name] Integration for CorticAI
 *
 * This module provides CorticAI agents and tools for use with [Integration Target].
 * It acts as a thin wrapper that imports from core CorticAI package.
 */

// Step 1: Import only from core
import { contextAgents, contextTools } from '../context/index.js';

// Step 2: Re-export core functionality (users can get it from wrapper)
export { contextAgents, contextTools } from '../context/index.js';

// Step 3: Export protocol-specific adapters
export function create[WrapperName]Server(config?: Config): Server {
  // Only adapter logic here - no business logic
  const adapted = adaptForProtocol(contextTools, config);
  return new ProtocolServer({
    ...adapted
  });
}

// Step 4: Export optional factory functions
export function create[WrapperName]Instance(options?: Options): Instance {
  return new Instance({
    agents: contextAgents.ContextManager(options),
    tools: contextTools
  });
}
```

### Dependency Flow

#### Correct Dependency Direction
```
MCP Server Wrapper
    ↓ (imports)
Core Context Module
    ├─ contextTools
    ├─ contextAgents
    └─ Types

Mastra Wrapper
    ↓ (imports)
Core Context Module
    ├─ contextTools
    ├─ contextAgents
    └─ Types

REST API Wrapper (future)
    ↓ (imports)
Core Context Module
    ├─ contextTools
    ├─ contextAgents
    └─ Types
```

**Key Principle:** Core NEVER depends on wrappers

#### Circular Dependency - ANTI-PATTERN
```
❌ WRONG:
Core ← Wrapper  (core tries to use wrapper)
 ↓
Wrapper ← Core  (wrapper tries to use core)
Result: Circular dependency - BROKEN
```

### State Management in Wrappers

#### Wrapper State
```
┌─────────────────────────────────────────┐
│         MCP Server Wrapper              │
├─────────────────────────────────────────┤
│ Stateless adapter that:                 │
│ • Routes requests to core               │
│ • Transforms protocol                   │
│ • Maintains connection state only       │
│                                         │
│ Does NOT maintain:                      │
│ • Context data (belongs in core)        │
│ • Agent state (belongs in core)         │
│ • Query logic (belongs in core)         │
└────────────┬────────────────────────────┘
             │
             │ delegates to
             ▼
┌─────────────────────────────────────────┐
│    Core Context Management              │
├─────────────────────────────────────────┤
│ Maintains all application state:        │
│ • Stored entities                       │
│ • Query results                         │
│ • Agent configurations                  │
│ • Tool state                            │
└─────────────────────────────────────────┘
```

### Testing Layers

```
┌────────────────────────────────────────────────────────┐
│              Integration Tests                         │
│  (Wrapper + Core working together)                    │
│  • Test complete flows through wrapper                │
│  • Verify protocol adaptation works                   │
│  • <10% of tests                                      │
└────────────────────────────────────────────────────────┘
                         ▲
                         │
┌────────────────────────────────────────────────────────┐
│              Core Unit Tests                           │
│  (Storage, Query, Agents, Tools)                      │
│  • Test all business logic                            │
│  • Test in complete isolation                         │
│  • Full coverage                                      │
│  • ~90% of tests                                      │
└────────────────────────────────────────────────────────┘
```

### Error Handling in Wrappers

#### Pattern: Wrapper Error Handling
```typescript
// Wrappers handle protocol-specific errors
export function create[Wrapper]Server(): Server {
  return {
    handleRequest: async (req) => {
      try {
        // Call core functionality
        const result = await contextTools.storeContext(req);

        // Adapt result for protocol
        return adaptResponse(result);
      } catch (error) {
        // Handle protocol-specific errors
        if (error instanceof ProtocolError) {
          return formatProtocolError(error);
        }

        // Re-throw core errors unchanged
        throw error;
      }
    }
  };
}
```

**Error Classification:**
- **Protocol Errors** (wrapper handles): Invalid request format, connection issues
- **Core Errors** (wrapper re-throws): Storage failures, validation errors, logic errors

### Adding a New Wrapper

#### Step-by-Step Process

1. **Verify core has what you need**
   ```
   ✓ Does core have the agents you need?
   ✓ Does core have the tools you need?
   ✓ Can core be configured for your use case?
   ```

2. **Create wrapper directory**
   ```bash
   mkdir app/src/integrations/[name]
   touch app/src/integrations/[name]/index.ts
   ```

3. **Implement using template**
   ```typescript
   // Import from core ONLY
   import { contextAgents, contextTools } from '../context/index.js';

   // Re-export for users
   export { contextAgents, contextTools };

   // Add wrapper-specific factory
   export function create[Name]() { /* ... */ }
   ```

4. **Add entry to package.json**
   ```json
   {
     "exports": {
       "./[name]": "./dist/integrations/[name]/index.js"
     }
   }
   ```

5. **Document in context network**
   - Add reference to this guide
   - Link from ADR-006
   - Include in cross_cutting/index.md

6. **Test**
   - Test wrapper adapter logic
   - Verify core imports work
   - Test end-to-end flow

### Maintenance Checklist

When maintaining a wrapper:

- [ ] Wrapper imports match current core exports
- [ ] No duplication of core logic
- [ ] Re-exports are correct and documented
- [ ] Error handling is appropriate
- [ ] Tests focus on adapter, not core logic
- [ ] Documentation shows import patterns clearly
- [ ] Version matches core version
- [ ] No circular dependencies exist

## Relationships
- **Parent Nodes:** [cross_cutting/index.md]
- **Child Nodes:** None
- **Related Nodes:**
  - [package_export_patterns.md] - details - Export structure and patterns
  - [decisions/adr_006_npm_centric_distribution.md] - implements - Distribution architecture

## Navigation Guidance
- **Access Context:** Reference when implementing a new wrapper or maintaining existing wrappers
- **Common Next Steps:** Review package_export_patterns.md for specific export details
- **Related Tasks:** New integration development, wrapper maintenance, architecture reviews
- **Update Patterns:** Update when wrapper patterns change or new best practices emerge

## Metadata
- **Created:** 2025-10-20
- **Last Updated:** 2025-10-20
- **Updated By:** Claude

## Change History
- 2025-10-20: Initial documentation of wrapper architecture patterns and implementation guidelines
