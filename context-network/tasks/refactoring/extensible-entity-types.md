# Make Entity Types Extensible

**Created**: 2025-10-01
**Priority**: Low
**Effort**: Medium (30-60 minutes)
**Type**: API Design / Extensibility

## Original Recommendation

From code review of `entity.ts:15`:

Entity types are hardcoded as union, preventing extensibility:

```typescript
type: 'document' | 'section' | 'paragraph' | 'reference' | 'container' | 'list' | 'list-item';
```

## Problems

1. **No extensibility**: Can't add custom entity types without modifying core file
2. **Domain limitations**: Different domains may need domain-specific entity types
3. **Maintenance burden**: Every new type requires core type modification
4. **Tight coupling**: Adapter implementations coupled to core type definitions

## Why Deferred

- Requires careful API design to maintain type safety
- Need to consider backward compatibility
- Medium risk - affects all domain adapters
- Should validate use cases first

## Design Considerations

### Trade-off: Type Safety vs. Extensibility

**Current (Type Safe but Rigid)**:
```typescript
type: 'document' | 'section' | ...
// ✅ Type checking catches typos
// ❌ Can't extend without modifying core
```

**Fully Extensible (Flexible but Unsafe)**:
```typescript
type: string
// ✅ Any adapter can add types
// ❌ No type checking, typos not caught
```

**Hybrid Approach (Recommended)**:
```typescript
type: EntityType | string // Allows extension while preserving hints

// Or use branded types:
type EntityType =
  | 'document' | 'section' | ... // Core types
  | (string & {})                // Allows any string while preserving autocomplete
```

## Proposed Solution

```typescript
/**
 * Core entity types that exist across all domains
 */
export type CoreEntityType =
  | 'document'
  | 'section'
  | 'paragraph'
  | 'reference'
  | 'container'
  | 'list'
  | 'list-item'

/**
 * Entity type can be core type or custom domain-specific type
 */
export type EntityType = CoreEntityType | string

export interface Entity {
  id: string
  type: EntityType  // Now extensible
  name: string
  // ... rest of interface
}
```

## Acceptance Criteria

- [ ] Refactor entity type to be extensible
- [ ] Maintain autocomplete for core types
- [ ] Update all adapters to use new type definition
- [ ] Add documentation on creating custom entity types
- [ ] Ensure backward compatibility with existing code
- [ ] Add example of custom entity type in documentation
- [ ] Update tests to verify custom types work

## Files to Modify

- `src/types/entity.ts` - Core type definition
- All domain adapters that create entities
- Related test files

## Migration Strategy

1. Add new `EntityType` export alongside existing types
2. Update `Entity` interface to use `EntityType`
3. Verify all existing code compiles
4. Update documentation
5. Add examples of custom types

## Benefits

- Adapters can define domain-specific entity types
- Core types still provide autocomplete and validation
- Enables future domain expansion without core changes
- Better separation of concerns

## Dependencies

- TypeScript type system understanding
- Review of all domain adapters

## Related

- [[type-system-design]] - Type system architecture
- [[domain-adapters]] - Domain adapter patterns
- [[api-extensibility]] - Extensibility guidelines
