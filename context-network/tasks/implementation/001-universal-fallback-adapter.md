# Task: Build Universal Fallback Adapter

## Priority: HIGH - Foundation Task

## Context
The Universal Fallback Adapter is the foundation for all domain-specific adapters. It must extract basic entities from any text file without configuration, serving as the base implementation that other adapters can extend.

## Original Recommendation
From groomed backlog: "Create adapter that extracts entities from any text file without configuration"

## Why This Is Next
1. **Foundation for everything** - All other adapters build on this
2. **Academically validated** - Research confirms approach is sound (see external_validation.md)
3. **No dependencies** - Can start immediately
4. **Quick validation** - Proves core concept works
5. **Unblocks 3+ tasks** - Novel adapter, cross-domain experiments depend on this

## Acceptance Criteria
- [ ] Extracts document structure (headers, paragraphs, lists)
- [ ] Identifies file references and URLs
- [ ] Creates container/content relationships
- [ ] Works with .txt, .md, unknown extensions
- [ ] Returns valid Entity[] structure matching research patterns
- [ ] Comprehensive test coverage (>80%)
- [ ] Handles edge cases (empty files, binary files, large files)

## Technical Specifications

### Entity Interface (from research)
```typescript
interface Entity {
  id: string;
  type: 'document' | 'section' | 'paragraph' | 'reference' | 'container';
  name: string;
  content?: string;
  metadata?: {
    filename?: string;
    lineNumbers?: [number, number];
    format?: string;
  };
  relationships?: Relationship[];
}

interface Relationship {
  type: 'contains' | 'references' | 'part-of';
  target: string; // entity id
  metadata?: any;
}
```

### Implementation Approach
1. **Test-Driven Development Required**
   - Write comprehensive test suite first
   - Cover all entity types and relationships
   - Test edge cases and error conditions

2. **Pattern-Based Extraction**
   - Use regex for structure detection (validated approach)
   - Hierarchical parsing for nested structures
   - Progressive enhancement for different file types

3. **Files to Create**
   - `/app/src/adapters/UniversalFallbackAdapter.ts`
   - `/app/tests/adapters/universal.test.ts`
   - `/app/src/types/entity.ts` (shared types)

## Research Foundation
- [/context-network/research/universal_patterns/cross_domain_patterns.md]
- [/context-network/research/universal_patterns/external_validation.md]
- [/context-network/research/universal_patterns/domain_adapter_framework.md]

## Effort Estimate
- **Development**: 4-6 hours
- **Testing**: 2-3 hours (TDD, so interleaved)
- **Total**: 6-9 hours

## Dependencies
- ✅ Test infrastructure (Vitest) - COMPLETED
- ✅ TypeScript configuration - READY
- ✅ Research validation - COMPLETED

## Success Metrics
- Extracts entities from 5+ different file types
- Performance: < 100ms for files under 1MB
- Test coverage > 80%
- Zero runtime errors on edge cases

## Next Steps After Completion
1. Build Simple Novel Adapter (extends this)
2. Create Attribute Index (stores extracted entities)
3. Cross-domain pattern validation experiments

## Notes
- This is THE critical path item - everything depends on it
- Academic research strongly validates this approach
- Keep initial implementation simple, enhance later with neural methods