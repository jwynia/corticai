# Location Discovery Index

## Core System Implementations

### Progressive Loading System
- **File**: [progressive-loading.md](./progressive-loading.md)
- **What**: Memory-efficient context loading with 5-depth system
- **Key Locations**: `app/src/types/context.ts`, `app/src/query/QueryBuilder.ts`
- **Significance**: Enables 80% memory reduction for large knowledge graphs

### Lens System Architecture
- **File**: [lens-system.md](./lens-system.md)
- **What**: Context-aware query modification and filtering framework
- **Key Locations**: `app/src/context/lenses/ContextLens.ts`, `app/src/context/lenses/LensRegistry.ts`
- **Significance**: Provides composable query transformation and result filtering

### Novel Adapter Implementation
- **File**: [novel-adapter.md](./novel-adapter.md)
- **What**: Domain-specific adapter for narrative content analysis
- **Key Locations**: `app/src/adapters/NovelAdapter.ts`
- **Significance**: Proves domain adapter pattern scalability beyond code domains

## Legacy System Implementations

### Kuzu Storage System
- **File**: [kuzu-storage.md](./kuzu-storage.md)
- **What**: Graph database storage implementation
- **Significance**: Provides high-performance graph operations

### Test Infrastructure
- **File**: [test_infrastructure.md](./test_infrastructure.md)
- **What**: Testing framework and utilities
- **Significance**: Enables comprehensive test coverage validation

### Continuity Cortex
- **File**: [continuity-cortex.md](./continuity-cortex.md)
- **What**: Context continuity and session management
- **Significance**: Maintains context across interactions

## Navigation

- **Parent**: [../index.md](../index.md) - Main discoveries index
- **Related**:
  - [../../architecture/](../../architecture/) - System architecture documentation
  - [../../planning/](../../planning/) - Implementation planning
  - [../records/](../records/) - Discovery records by date