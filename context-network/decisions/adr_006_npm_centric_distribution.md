# ADR-006: NPM-Centric Distribution Architecture

## Purpose
This document records the architectural decision to structure CorticAI as an NPM package at its core, with lightweight wrapper integrations for specialized consumption patterns (MCP server, Mastra framework).

## Classification
- **Domain:** Architecture
- **Stability:** Established
- **Abstraction:** Structural
- **Confidence:** Established

## Content

### Context

CorticAI is a complex context management system with multiple integration points:

1. **Integration Patterns**: The system needs to be consumed in several ways:
   - As a direct library in TypeScript/JavaScript projects
   - As an MCP server integrated with Claude Desktop, Cursor, or other MCP clients
   - As Mastra framework agents and tools within AI workflows
   - As a standalone service or component in larger systems

2. **Duplication Risk**: Without clear architecture, integration logic could be duplicated across:
   - MCP server implementation
   - Mastra framework wrappers
   - Direct library usage documentation
   - Example applications

3. **Maintenance Burden**: Each duplicate creates:
   - Risk of divergence and inconsistency
   - Increased test coverage requirements
   - Multiple places to update when core functionality changes
   - Confusion about which is the "source of truth"

4. **Product Requirements**:
   - Easy for developers to use in any context
   - Clear update path when CorticAI changes
   - Minimal wrapper code to maintain
   - Single testing surface for core functionality

### Decision

CorticAI adopts a **layered distribution architecture** where:

1. **Core Layer (NPM Package)**
   - All business logic, storage adapters, query systems, and agents live here
   - Published to npm as `corticai` package
   - Fully tested and documented
   - Single source of truth for all functionality

2. **Wrapper Layer (Thin Adapters)**
   - MCP Server: Thin wrapper that imports from core and exposes contextTools via MCP protocol
   - Mastra Integration: Thin export layer that re-exports context agents and tools for Mastra consumption
   - Each wrapper imports and delegates to core NPM package

3. **Distribution**
   - Core exports defined in package.json `exports` field with clear entry points
   - Each wrapper clearly documented as importing from specific entry point
   - No duplication of core logic in any wrapper

### Status
Accepted

### Consequences

**Positive consequences:**
- **Single Source of Truth**: All functionality defined and tested once in core
- **Reduced Duplication**: Wrappers are minimal adapters, not re-implementations
- **Easier Maintenance**: Changes to core automatically propagate to all integration points
- **Clear Dependency Direction**: Wrappers always depend on core, never vice versa
- **Better Testing**: Core functionality tested thoroughly; wrappers only test adapter logic
- **Clear for Consumers**: Users understand they're using the same package regardless of integration method
- **Easier Version Management**: Single package version instead of coordinating multiple versions

**Negative consequences:**
- **Coupling**: Wrappers tightly coupled to core API (intentional and acceptable)
- **Cannot Optimize Wrappers Independently**: Wrapper-specific optimizations require core changes
- **Wrapper Updates Requires Core Release**: Changes to wrapper behavior may require core package update

**Risks introduced:**
- Breaking changes in core NPM package affect all wrappers
- Wrappers must stay aligned with core package version
- Integration point changes require updating both wrapper and core simultaneously

**Trade-offs made:**
- Wrapper independence for code simplicity and maintainability
- Separate package versions for guaranteed compatibility
- Wrapper flexibility for clear, predictable architecture

### Alternatives Considered

#### Alternative 1: Duplicate Core Logic
Each integration point (MCP server, Mastra wrapper, CLI tool) implements its own storage, query, and agent logic independently.

**Pros:**
- Each integration can optimize independently
- No coupling between integration points
- Can update integrations without affecting others
- Easier to phase out old integrations

**Cons:**
- Massive code duplication
- Sync nightmares when core logic needs updates
- Multiple places to fix bugs
- Multiple places to test the same logic
- Divergent behavior between integration points
- Significantly higher maintenance burden

#### Alternative 2: Monolithic Package with All Wrappers
Single npm package that includes MCP server, Mastra integration, CLI tools, all in one.

**Pros:**
- Single dependency for users wanting everything
- Guaranteed version alignment

**Cons:**
- Bloated for users who only want core functionality
- Users must install Mastra/MCP dependencies even if not needed
- Mixing concerns in single package makes it harder to test
- Users cannot upgrade core separately from wrappers
- Package size and dependency footprint much larger

#### Alternative 3: Multiple Independent Packages
Separate npm packages: `corticai-core`, `corticai-mcp`, `corticai-mastra`, each implementing full functionality.

**Pros:**
- Maximum flexibility for users to install only what they need
- Independent version management

**Cons:**
- Triplicates all core logic
- Nightmare to keep in sync
- Multiple packages to maintain and release
- Clear source of truth is lost
- Users confused about which to use
- High coordination overhead

### Implementation Notes

1. **NPM Package Structure**
   - Main entry: `./dist/index.js` - exports core + everything
   - Sub-entries: `./storage`, `./query`, `./context`, `./context/tools`, `./context/agents`, `./context/mcp`
   - Each sub-entry enables selective imports: `import { QueryBuilder } from 'corticai/query'`

2. **MCP Server Wrapper**
   - Located at `app/src/context/mcp/`
   - Imports `contextTools` and `contextAgents` from core
   - Exposes them via MCP protocol using `@mastra/mcp`
   - No business logic, only adapter code

3. **Mastra Integration Wrapper**
   - Located at `app/src/mastra/`
   - Currently contains example weather workflow/agent - TO BE REFACTORED
   - Should export context agents and tools from core
   - Can include example workflows but must not duplicate core logic

4. **Export Pattern Documentation**
   - Document in README how each wrapper imports from core
   - Show clear dependency arrows: MCP → Core, Mastra → Core
   - Provide examples for each consumption pattern

5. **Testing Strategy**
   - Unit tests: Test core logic in isolation
   - Integration tests: Test each wrapper's adaptation layer
   - No tests for wrapper's re-exports of core functionality (already tested in core)

### Migration Path

For existing code that may have scattered logic:

1. Identify all storage, query, or agent logic
2. Ensure it exists in core NPM package
3. Remove duplicates from wrappers
4. Have wrappers import from core
5. Document the dependency flow

## Relationships
- **Parent Nodes:** [architecture/system_architecture.md]
- **Child Nodes:** None
- **Related Nodes:**
  - [cross_cutting/package_export_patterns.md] - implements - How to structure exports
  - [cross_cutting/wrapper_architecture_guide.md] - guides - How to build wrapper integrations
  - [architecture/distribution_model.md] - details - Full distribution strategy

## Navigation Guidance
- **Access Context:** Reference when designing new integrations or making decisions about where logic belongs
- **Common Next Steps:** Review package export patterns and wrapper architecture guides
- **Related Tasks:** Mastra refactoring, MCP server maintenance, new integration points
- **Update Patterns:** Revisit if new integration points are added or if distribution model changes

## Metadata
- **Decision Number:** ADR-006
- **Created:** 2025-10-20
- **Last Updated:** 2025-10-20
- **Updated By:** Claude
- **Deciders:** CorticAI Architecture Team

## Change History
- 2025-10-20: Initial documentation of NPM-centric distribution architecture decision
