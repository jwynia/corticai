# Reference Network Testing Strategy

## Purpose
Define a comprehensive testing and validation strategy for CorticAI using external reference context networks. This strategy ensures CorticAI can handle diverse domain contexts without the self-referential complexity of testing with its own context network.

## Classification
- **Domain:** Planning
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** Established
- **Lifecycle Stage:** Planning
- **Audience:** Developers, Architects

## Strategic Context

### The Problem
Testing CorticAI with its own context network creates a meta-challenge:
- Self-referential complexity makes it hard to distinguish bugs from documentation issues
- Fresh agents have difficulty navigating self-hosting context
- Changes to the system affect the test data itself
- Hard to validate cross-domain capabilities

### The Solution
Use **external reference context networks** representing different domains:
- `pliers` - Enterprise forms/workflow framework (AI-enhanced, technical)
- `shareth` - Privacy-preserving community platform (social, security-focused)
- `starship-graveyard` - Sci-fi novel project (creative writing, narrative)
- `the-whereness` - City guide content aggregation (data synthesis, local knowledge)
- `wisdom-of-both` - Paradox/cultural research (academic research, analysis)

These provide:
- **Domain diversity** - Technical, social, creative, data, research
- **Scale variance** - Different sizes and complexities
- **Structure differences** - Various organizational patterns
- **Non-self-referential** - Clean separation between system and test data
- **Real-world validity** - Actual context networks from real projects

## Test Dimensions

### 1. Domain Coverage
**Objective:** Validate CorticAI works across fundamentally different knowledge domains

**Test Networks:**
- **Technical** (pliers, the-whereness) - Code, architecture, APIs
- **Social** (shareth) - Community, governance, privacy
- **Creative** (starship-graveyard) - Characters, plot, worldbuilding
- **Research** (wisdom-of-both) - Analysis, findings, patterns

**Success Criteria:**
- Entity extraction works for all domains
- Relationships detected appropriately per domain
- Queries return relevant results across domains
- Adapters handle domain-specific constructs

### 2. Network Characteristics
**Objective:** Ensure CorticAI scales and adapts to different network structures

**Characteristics to Test:**
- **Size** - File count, total content, entity density
- **Depth** - Navigation hierarchy levels
- **Breadth** - Siblings per parent node
- **Density** - Cross-references per document
- **Organization** - Flat vs. hierarchical structures

**Measurements:**
- Load time vs. network size
- Query performance vs. entity count
- Memory usage vs. content volume
- Relationship detection accuracy vs. density

### 3. Operations Coverage
**Objective:** Validate all CorticAI operations against real context networks

**Core Operations:**
1. **Entity Extraction**
   - Documents, sections, references
   - Domain-specific entities
   - Metadata extraction
   - Line number tracking

2. **Relationship Detection**
   - Parent-child (hierarchy)
   - References (cross-links)
   - Dependencies (imports, requires)
   - Domain-specific relationships

3. **Query Performance**
   - Natural language queries
   - Structured queries (attribute-based)
   - Cross-network search
   - Similarity queries

4. **Navigation Validation**
   - Hierarchy traversal
   - Orphaned node detection
   - Navigation link validation
   - Index completeness

5. **Analysis & Insights**
   - Pattern discovery
   - Coverage analysis
   - Relationship mapping
   - Health metrics

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal:** Establish testing infrastructure and baseline measurements

**Deliverables:**
1. **Reference Network Configuration**
   - Metadata for each network (size, domain, features)
   - Expected entity counts (baseline)
   - Test scenario definitions
   - File: `app/src/__tests__/fixtures/reference-networks.config.ts`

2. **Basic Loading Tests**
   - Load each reference network
   - Extract entities using UniversalFallbackAdapter
   - Validate entity types and counts
   - File: `app/src/__tests__/reference-networks-basic.test.ts`

3. **Test Utilities**
   - Network loader helpers
   - Assertion utilities
   - Performance measurement helpers
   - File: `app/src/__tests__/utils/reference-network-utils.ts`

**Success Criteria:**
- All 5 networks load successfully
- Entity extraction completes without errors
- Baseline metrics established

### Phase 2: Core Testing (Week 3-4)
**Goal:** Comprehensive validation of all core operations

**Deliverables:**
1. **Entity Extraction Tests**
   - Per-network entity validation
   - Domain-specific entity tests
   - Metadata accuracy tests
   - File: `app/src/__tests__/reference-networks-extraction.test.ts`

2. **Relationship Detection Tests**
   - Navigation structure validation
   - Cross-reference detection
   - Orphaned node detection
   - File: `app/src/__tests__/reference-networks-relationships.test.ts`

3. **Query Operation Tests**
   - Natural language queries per network
   - Attribute-based queries
   - Cross-network search
   - File: `app/src/__tests__/reference-networks-queries.test.ts`

4. **Domain Adapter Tests**
   - UniversalFallbackAdapter validation
   - NovelAdapter with starship-graveyard
   - CodebaseAdapter (if available)
   - File: `app/src/adapters/__tests__/adapter-integration.test.ts`

**Success Criteria:**
- 100+ tests covering all operations
- All networks pass all operation tests
- Domain-specific features work correctly

### Phase 3: Advanced Features (Week 5-6)
**Goal:** Performance, scalability, and advanced analysis

**Deliverables:**
1. **Performance Benchmarking**
   - Ingestion time per network
   - Query latency measurements
   - Memory usage profiling
   - Scaling characteristics
   - File: `app/src/__tests__/reference-networks-performance.test.ts`

2. **Cross-Network Operations**
   - Multi-network queries
   - Cross-domain similarity
   - Comparative analysis
   - File: `app/src/__tests__/reference-networks-cross.test.ts`

3. **Instrumentation & Metrics**
   - Metrics collection system
   - Performance tracking
   - Quality metrics
   - File: `app/src/metrics/ContextNetworkMetrics.ts`

**Success Criteria:**
- Sub-second query times for all networks
- Linear scaling with network size
- Comprehensive metrics available

### Phase 4: Documentation & Examples (Week 7-8)
**Goal:** Make testing approach reproducible and educational

**Deliverables:**
1. **Example Scripts**
   - Load and query each network
   - Cross-network search demos
   - Navigation validation examples
   - File: `app/src/examples/ReferenceNetworkExamples.ts`

2. **Testing Guide**
   - How to add new reference networks
   - Writing domain-specific tests
   - Performance testing methodology
   - File: `docs/testing/reference-network-testing-guide.md`

3. **Test Coverage Report**
   - What's tested and what's not
   - Domain coverage matrix
   - Gap analysis
   - File: Generated during test runs

**Success Criteria:**
- Examples run successfully
- Documentation complete
- >90% test coverage achieved

## Test Infrastructure

### Directory Structure
```
app/src/
├── __tests__/
│   ├── fixtures/
│   │   └── reference-networks.config.ts
│   ├── utils/
│   │   └── reference-network-utils.ts
│   ├── reference-networks-basic.test.ts
│   ├── reference-networks-extraction.test.ts
│   ├── reference-networks-relationships.test.ts
│   ├── reference-networks-queries.test.ts
│   ├── reference-networks-performance.test.ts
│   └── reference-networks-cross.test.ts
├── adapters/
│   └── __tests__/
│       └── adapter-integration.test.ts
├── examples/
│   └── ReferenceNetworkExamples.ts
└── metrics/
    └── ContextNetworkMetrics.ts
```

### Test Data Organization
```typescript
// Reference network metadata
interface ReferenceNetwork {
  name: string;
  path: string;
  domain: 'technical' | 'social' | 'creative' | 'data' | 'research';
  size: {
    files: number;
    totalLines: number;
    estimatedEntities: number;
  };
  features: string[];
  adapter: 'universal' | 'novel' | 'codebase';
}
```

## Success Metrics

### Quantitative Metrics
- **Test Coverage:** >90% of core operations
- **Network Coverage:** 100% (all 5 networks tested)
- **Domain Coverage:** 100% (all 5 domains represented)
- **Performance:** <1s query time per network
- **Reliability:** 100% test pass rate

### Qualitative Metrics
- **Domain Versatility:** Successfully handles all 5 domains
- **Scalability:** Linear performance scaling
- **Accuracy:** Correct entity/relationship detection
- **Robustness:** Handles malformed data gracefully
- **Usability:** Clear examples and documentation

## Risk Mitigation

### Risk: Reference Networks Change Over Time
**Mitigation:**
- Copy reference networks to specific test versions
- Version control test data
- Document expected baselines
- Re-baseline on intentional updates only

### Risk: Domain-Specific Features Break
**Mitigation:**
- Test each domain independently
- Isolate domain-specific code in adapters
- Maintain fallback to universal adapter
- Add regression tests for domain features

### Risk: Performance Degrades
**Mitigation:**
- Continuous performance benchmarking
- Performance budgets per operation
- Alert on regression beyond threshold
- Profile before and after changes

### Risk: Test Maintenance Burden
**Mitigation:**
- Shared test utilities
- Data-driven test generation
- Automated baseline updates
- Clear documentation

## Integration with Existing Testing

### Relationship to Self-Hosting Tests
- **Self-hosting tests:** Validate meta-capability (CorticAI managing itself)
- **Reference network tests:** Validate cross-domain capability
- **Both needed:** Different validation purposes

### Test Execution Strategy
```bash
# Quick smoke test (basic loading)
npm test -- reference-networks-basic

# Full test suite (all operations)
npm test -- reference-networks

# Performance benchmarks (slower)
npm test -- reference-networks-performance

# All tests including examples
npm test && npm run test:examples
```

## Future Enhancements

### Post-Implementation Opportunities
1. **Automated Network Discovery** - Auto-detect and test new reference networks
2. **Differential Testing** - Compare before/after behavior on changes
3. **Mutation Testing** - Verify tests actually catch issues
4. **Fuzz Testing** - Generate malformed networks to test robustness
5. **Visual Test Reports** - Dashboard showing network health metrics

### Additional Reference Networks
Consider adding:
- **Documentation site** - Large technical docs (MkDocs, Docusaurus)
- **Research paper collection** - Academic citations and notes
- **Project management** - Tasks, sprints, retrospectives
- **Knowledge base** - FAQ, troubleshooting, guides

## Relationships
- **Parent Nodes:**
  - [planning/index.md] - Main planning hub
  - [processes/testing_strategy.md] - Overall testing approach
- **Child Nodes:**
  - [reference-network-test-plan.md] - Detailed test specifications
- **Related Nodes:**
  - [research/validation-methodology.md] - Validation principles
  - [architecture/adapter-system.md] - Domain adapter architecture
  - [decisions/adr_NNN_reference-testing.md] - Decision to use reference networks

## Navigation Guidance
- **Access Context:** Planning comprehensive testing with real-world data
- **Common Next Steps:** Review detailed test plan, implement Phase 1
- **Related Tasks:** Test implementation, performance benchmarking, documentation
- **Update Patterns:** Updated after each phase completion

## Metadata
- **Created:** 2025-10-04
- **Last Updated:** 2025-10-04
- **Updated By:** Planning Agent
- **Status:** Ready for implementation

## Change History
- 2025-10-04: Initial strategy document created with 4-phase plan
