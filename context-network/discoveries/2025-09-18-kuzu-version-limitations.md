# Discovery: Kuzu 0.6.1 Version Limitations

## Classification
- **Domain**: Technical/Storage
- **Stability**: Established (version-specific)
- **Abstraction**: Implementation
- **Confidence**: Verified

## Discovery Context
- **Date**: 2025-09-18
- **Task**: Unblock Graph Operations
- **Impact**: Critical - Required complete query strategy change

## Key Findings

### 1. Variable-Length Path Limitations
**What We Expected**: Standard Neo4j Cypher syntax like `[*1..5]` would work
**What We Found**: Kuzu 0.6.1 doesn't support variable-length paths
**Location**: `/app/src/storage/adapters/KuzuSecureQueryBuilder.ts:80-92`

### 2. Reserved Keywords
**Issue**: Keywords like `start`, `end`, `from` are reserved in Kuzu
**Solution**: Use alternatives like `source`, `target`, `sourceNode`, `targetNode`
**Location**: `/app/src/storage/adapters/KuzuSecureQueryBuilder.ts:36`

### 3. Parameter Substitution Constraints
**Issue**: Cannot use parameters within relationship patterns (`[*1..$depth]` fails)
**Solution**: Must construct pattern strings directly with literal values
**Location**: `/app/src/storage/adapters/KuzuStorageAdapter.ts:653-659`

### 4. Array Parameters Not Supported
**Issue**: `WHERE r.type IN $edgeTypes` with array parameter fails
**Solution**: Generate literal OR conditions for multiple values
**Location**: `/app/src/storage/adapters/KuzuSecureQueryBuilder.ts:44-49`

## Workaround Strategy

We implemented a fallback approach using single-hop queries:
1. For traversal operations - single-hop with filtering
2. For path finding - direct connection checks
3. For connected nodes - one-level relationships only

## Version Upgrade Path

Kuzu 0.11.2+ supports:
- True variable-length paths
- Better parameter substitution
- More complete Cypher compatibility

## Critical Relationships
- **Affects**: [[kuzu-storage-adapter]] - Implementation constrained by version
- **Blocks**: [[phase-2-development]] - Until workarounds implemented
- **Requires**: [[query-fallback-strategy]] - For unsupported features

## Task Context
This discovery was critical for unblocking graph operations. Without understanding these limitations, we were getting persistent parser errors that seemed like syntax mistakes but were actually version limitations.

## References
- Kuzu 0.6.1 documentation (limited)
- Test output showing parser exceptions
- Implemented workarounds in KuzuSecureQueryBuilder