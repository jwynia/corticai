# Reference Network Test Plan

## Purpose
Detailed test specifications and scenarios for validating CorticAI against external reference context networks. This document provides the specific test cases, expected outcomes, and implementation details for the testing strategy.

## Classification
- **Domain:** Planning
- **Stability:** Dynamic
- **Abstraction:** Detailed
- **Confidence:** Established
- **Lifecycle Stage:** Planning
- **Audience:** Developers

## Test Configuration

### Reference Network Metadata

```typescript
// File: app/src/__tests__/fixtures/reference-networks.config.ts

export const REFERENCE_NETWORKS = {
  pliers: {
    name: 'Pliers',
    path: '/workspaces/corticai/reference/pliers',
    domain: 'technical',
    description: 'Enterprise forms/workflow management framework',
    adapter: 'universal',
    size: {
      estimatedFiles: 50,
      estimatedEntities: 200,
      features: ['planning', 'decisions', 'backlog', 'technical-debt']
    },
    expectedStructure: {
      hasDiscoveryMd: true,
      hasFoundation: true,
      hasPlanning: true,
      hasDecisions: true
    }
  },

  shareth: {
    name: 'Shareth',
    path: '/workspaces/corticai/reference/shareth',
    domain: 'social',
    description: 'Privacy-preserving community platform',
    adapter: 'universal',
    size: {
      estimatedFiles: 40,
      estimatedEntities: 150,
      features: ['planning', 'decisions', 'patterns', 'feature-roadmap']
    },
    expectedStructure: {
      hasDiscoveryMd: true,
      hasFoundation: true,
      hasPlanning: true,
      hasDecisions: true
    }
  },

  starshipGraveyard: {
    name: 'Starship Graveyard',
    path: '/workspaces/corticai/reference/starship-graveyard',
    domain: 'creative',
    description: 'Science fiction novel project',
    adapter: 'novel',
    size: {
      estimatedFiles: 60,
      estimatedEntities: 300,
      features: ['characters', 'worldbuilding', 'plot', 'revisions', 'permalinks']
    },
    expectedStructure: {
      hasIndexMd: true,
      hasDiscoveryMd: true,
      hasFoundation: true,
      hasElements: true,
      hasPlanning: true
    }
  },

  theWhereness: {
    name: 'The Whereness',
    path: '/workspaces/corticai/reference/the-whereness',
    domain: 'data',
    description: 'City guide content aggregation system',
    adapter: 'universal',
    size: {
      estimatedFiles: 30,
      estimatedEntities: 100,
      features: ['architecture', 'data', 'implementation', 'strategies']
    },
    expectedStructure: {
      hasDiscoveryMd: true,
      hasArchitecture: true,
      hasData: true,
      hasImplementation: true
    }
  },

  wisdomOfBoth: {
    name: 'Wisdom of Both',
    path: '/workspaces/corticai/reference/wisdom-of-both',
    domain: 'research',
    description: 'Paradox and cultural diversity research',
    adapter: 'universal',
    size: {
      estimatedFiles: 70,
      estimatedEntities: 350,
      features: ['research', 'tasks', 'progress', 'discoveries', 'archive']
    },
    expectedStructure: {
      hasIndexMd: true,
      hasDiscoveryMd: true,
      hasFoundation: true,
      hasResearch: true,
      hasDiscoveries: true
    }
  }
} as const;
```

## Phase 1: Foundation Tests

### Test Suite: Basic Loading
**File:** `app/src/__tests__/reference-networks-basic.test.ts`

#### Test 1.1: Network Directory Access
```typescript
describe('Reference Network Access', () => {
  Object.entries(REFERENCE_NETWORKS).forEach(([key, network]) => {
    it(`should access ${network.name} directory`, async () => {
      const exists = await fs.access(network.path)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);
    });

    it(`should find context-network subdirectory in ${network.name}`, async () => {
      const contextPath = path.join(network.path, 'context-network');
      const exists = await fs.access(contextPath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);
    });
  });
});
```

#### Test 1.2: Basic Entity Extraction
```typescript
describe('Basic Entity Extraction', () => {
  Object.entries(REFERENCE_NETWORKS).forEach(([key, network]) => {
    it(`should extract entities from ${network.name}`, async () => {
      const loader = new ReferenceNetworkLoader(network.path);
      const entities = await loader.loadAndExtract();

      expect(entities).toBeDefined();
      expect(entities.length).toBeGreaterThan(0);

      // Log for baseline establishment
      console.log(`${network.name}: ${entities.length} entities extracted`);
    });

    it(`should extract expected entity types from ${network.name}`, async () => {
      const loader = new ReferenceNetworkLoader(network.path);
      const entities = await loader.loadAndExtract();

      const types = new Set(entities.map(e => e.type));

      expect(types).toContain('document');
      expect(types).toContain('section');
      // Reference type might not be in all networks
    });
  });
});
```

#### Test 1.3: Structure Validation
```typescript
describe('Network Structure Validation', () => {
  it('should validate Pliers structure', async () => {
    const validator = new NetworkStructureValidator(REFERENCE_NETWORKS.pliers);
    const result = await validator.validate();

    expect(result.hasDiscoveryMd).toBe(true);
    expect(result.hasFoundation).toBe(true);
    expect(result.hasPlanning).toBe(true);
  });

  it('should validate Starship Graveyard structure', async () => {
    const validator = new NetworkStructureValidator(REFERENCE_NETWORKS.starshipGraveyard);
    const result = await validator.validate();

    expect(result.hasIndexMd).toBe(true);
    expect(result.hasElements).toBe(true);
  });

  // Similar for other networks...
});
```

## Phase 2: Core Operation Tests

### Test Suite: Entity Extraction
**File:** `app/src/__tests__/reference-networks-extraction.test.ts`

#### Test 2.1: Document Entity Extraction
```typescript
describe('Document Entity Extraction', () => {
  it('should extract planning documents from Pliers', async () => {
    const adapter = new UniversalFallbackAdapter();
    const planningPath = path.join(
      REFERENCE_NETWORKS.pliers.path,
      'context-network/planning'
    );

    const documents = await extractDocumentsFromDirectory(planningPath, adapter);

    expect(documents.length).toBeGreaterThan(0);
    expect(documents.every(d => d.type === 'document')).toBe(true);
    expect(documents.every(d => d.metadata?.filename)).toBe(true);
  });

  it('should extract character documents from Starship Graveyard', async () => {
    const adapter = new NovelAdapter();
    const charactersPath = path.join(
      REFERENCE_NETWORKS.starshipGraveyard.path,
      'context-network/elements/characters'
    );

    const entities = await extractDocumentsFromDirectory(charactersPath, adapter);

    // Novel adapter should extract character-specific entities
    const characterEntities = entities.filter(e =>
      e.metadata?.entityType === 'character'
    );

    expect(characterEntities.length).toBeGreaterThan(0);
  });
});
```

#### Test 2.2: Section Hierarchy Extraction
```typescript
describe('Section Hierarchy Extraction', () => {
  it('should extract nested sections from Wisdom of Both research', async () => {
    const adapter = new UniversalFallbackAdapter();
    const researchDoc = path.join(
      REFERENCE_NETWORKS.wisdomOfBoth.path,
      'context-network/research/additional-paradox-patterns/overview.md'
    );

    const content = await fs.readFile(researchDoc, 'utf-8');
    const entities = adapter.extract(content, {
      path: researchDoc,
      filename: 'overview.md',
      extension: '.md',
      size: content.length
    });

    const sections = entities.filter(e => e.type === 'section');

    expect(sections.length).toBeGreaterThan(0);
    // Should have hierarchy levels
    const levels = new Set(sections.map(s => s.metadata?.level));
    expect(levels.size).toBeGreaterThan(1); // Multiple heading levels
  });
});
```

#### Test 2.3: Metadata Accuracy
```typescript
describe('Metadata Extraction Accuracy', () => {
  it('should extract accurate line numbers', async () => {
    const adapter = new UniversalFallbackAdapter();
    const testDoc = path.join(
      REFERENCE_NETWORKS.shareth.path,
      'context-network/foundation/project_definition.md'
    );

    const content = await fs.readFile(testDoc, 'utf-8');
    const entities = adapter.extract(content, {
      path: testDoc,
      filename: 'project_definition.md',
      extension: '.md',
      size: content.length
    });

    entities.forEach(entity => {
      if (entity.metadata?.lineNumbers) {
        const [start, end] = entity.metadata.lineNumbers;
        expect(start).toBeGreaterThan(0);
        expect(end).toBeGreaterThanOrEqual(start);

        // Verify content matches
        const lines = content.split('\n');
        const extractedContent = lines.slice(start - 1, end).join('\n');
        expect(extractedContent).toContain(entity.content.substring(0, 50));
      }
    });
  });
});
```

### Test Suite: Relationship Detection
**File:** `app/src/__tests__/reference-networks-relationships.test.ts`

#### Test 2.4: Navigation Relationships
```typescript
describe('Navigation Relationship Detection', () => {
  it('should detect parent-child relationships in Pliers planning', async () => {
    const loader = new ReferenceNetworkLoader(REFERENCE_NETWORKS.pliers.path);
    const entities = await loader.loadAndExtract();

    const indexEntity = entities.find(e =>
      e.name?.includes('Planning Index') ||
      e.metadata?.filename === 'index.md'
    );

    expect(indexEntity).toBeDefined();
    expect(indexEntity?.relationships?.length).toBeGreaterThan(0);

    // Should have references to child planning documents
    const childRefs = indexEntity?.relationships?.filter(r =>
      r.type === 'references'
    );
    expect(childRefs?.length).toBeGreaterThan(0);
  });
});
```

#### Test 2.5: Cross-Reference Detection
```typescript
describe('Cross-Reference Detection', () => {
  it('should detect cross-references in The Whereness architecture', async () => {
    const loader = new ReferenceNetworkLoader(REFERENCE_NETWORKS.theWhereness.path);
    const entities = await loader.loadAndExtract();

    const references = entities.filter(e => e.type === 'reference');

    expect(references.length).toBeGreaterThan(0);

    // References should have targets
    references.forEach(ref => {
      expect(ref.relationships).toBeDefined();
      expect(ref.relationships?.length).toBeGreaterThan(0);
    });
  });
});
```

#### Test 2.6: Orphaned Node Detection
```typescript
describe('Orphaned Node Detection', () => {
  it('should detect orphaned nodes in all networks', async () => {
    for (const [key, network] of Object.entries(REFERENCE_NETWORKS)) {
      const loader = new ReferenceNetworkLoader(network.path);
      const entities = await loader.loadAndExtract();

      const analyzer = new OrphanedNodeAnalyzer(entities);
      const orphaned = analyzer.findOrphaned();

      // Log orphaned nodes for each network
      console.log(`${network.name}: ${orphaned.length} orphaned nodes`);

      // Starship Graveyard is most mature, should have few orphans
      if (key === 'starshipGraveyard') {
        expect(orphaned.length).toBeLessThan(5);
      }
    }
  });
});
```

### Test Suite: Query Operations
**File:** `app/src/__tests__/reference-networks-queries.test.ts`

#### Test 2.7: Natural Language Queries
```typescript
describe('Natural Language Queries', () => {
  const testQueries = {
    pliers: [
      'What is the project definition?',
      'Find architecture decisions',
      'List all planning documents'
    ],
    shareth: [
      'What are the privacy principles?',
      'Find feature roadmap items',
      'List security patterns'
    ],
    starshipGraveyard: [
      'Who are the main characters?',
      'What is the plot structure?',
      'Find worldbuilding details'
    ],
    theWhereness: [
      'What is the system architecture?',
      'Find data pipeline components',
      'List implementation strategies'
    ],
    wisdomOfBoth: [
      'What paradox patterns were found?',
      'List research findings',
      'Find cultural diversity insights'
    ]
  };

  Object.entries(testQueries).forEach(([networkKey, queries]) => {
    const network = REFERENCE_NETWORKS[networkKey as keyof typeof REFERENCE_NETWORKS];

    describe(`${network.name} queries`, () => {
      queries.forEach(query => {
        it(`should answer: "${query}"`, async () => {
          const loader = new ReferenceNetworkLoader(network.path);
          const entities = await loader.loadAndExtract();

          const queryEngine = new QueryEngine(entities);
          const results = await queryEngine.query(query);

          expect(results).toBeDefined();
          expect(results.length).toBeGreaterThan(0);

          // Results should be relevant (basic relevance check)
          const keywords = extractKeywords(query);
          const hasRelevantResults = results.some(r =>
            keywords.some(k =>
              r.content.toLowerCase().includes(k.toLowerCase())
            )
          );
          expect(hasRelevantResults).toBe(true);
        });
      });
    });
  });
});
```

#### Test 2.8: Attribute-Based Queries
```typescript
describe('Attribute-Based Queries', () => {
  it('should query by entity type in Pliers', async () => {
    const loader = new ReferenceNetworkLoader(REFERENCE_NETWORKS.pliers.path);
    const entities = await loader.loadAndExtract();

    const queryBuilder = new QueryBuilder();
    const query = queryBuilder
      .where('type', '=', 'section')
      .build();

    const executor = new QueryExecutor(entities);
    const results = await executor.execute(query);

    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.type === 'section')).toBe(true);
  });

  it('should query by metadata filename pattern', async () => {
    const loader = new ReferenceNetworkLoader(REFERENCE_NETWORKS.shareth.path);
    const entities = await loader.loadAndExtract();

    const queryBuilder = new QueryBuilder();
    const query = queryBuilder
      .where('metadata.filename', 'LIKE', '%roadmap%')
      .build();

    const executor = new QueryExecutor(entities);
    const results = await executor.execute(query);

    expect(results.length).toBeGreaterThan(0);
    results.forEach(r => {
      expect(r.metadata?.filename?.toLowerCase()).toContain('roadmap');
    });
  });
});
```

## Phase 3: Advanced Feature Tests

### Test Suite: Performance Benchmarks
**File:** `app/src/__tests__/reference-networks-performance.test.ts`

#### Test 3.1: Ingestion Performance
```typescript
describe('Ingestion Performance', () => {
  Object.entries(REFERENCE_NETWORKS).forEach(([key, network]) => {
    it(`should load ${network.name} within performance budget`, async () => {
      const startTime = performance.now();

      const loader = new ReferenceNetworkLoader(network.path);
      const entities = await loader.loadAndExtract();

      const duration = performance.now() - startTime;

      // Performance budget: <5s per network
      expect(duration).toBeLessThan(5000);

      console.log(`${network.name}: ${duration.toFixed(0)}ms for ${entities.length} entities`);
    });
  });
});
```

#### Test 3.2: Query Performance
```typescript
describe('Query Performance', () => {
  it('should execute queries in <1s on large network', async () => {
    // Wisdom of Both is largest network
    const loader = new ReferenceNetworkLoader(REFERENCE_NETWORKS.wisdomOfBoth.path);
    const entities = await loader.loadAndExtract();

    const queryEngine = new QueryEngine(entities);

    const queries = [
      'Find all research findings',
      'List paradox patterns',
      'Show task discoveries'
    ];

    for (const query of queries) {
      const startTime = performance.now();
      const results = await queryEngine.query(query);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(1000);
      console.log(`Query "${query}": ${duration.toFixed(0)}ms`);
    }
  });
});
```

#### Test 3.3: Memory Usage
```typescript
describe('Memory Usage', () => {
  it('should maintain reasonable memory footprint', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Load all networks sequentially
    const allEntities = [];
    for (const network of Object.values(REFERENCE_NETWORKS)) {
      const loader = new ReferenceNetworkLoader(network.path);
      const entities = await loader.loadAndExtract();
      allEntities.push(...entities);
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

    console.log(`Memory increase: ${memoryIncrease.toFixed(2)} MB`);
    console.log(`Total entities: ${allEntities.length}`);
    console.log(`Memory per entity: ${(memoryIncrease * 1024 / allEntities.length).toFixed(2)} KB`);

    // Should not exceed 500MB for all networks
    expect(memoryIncrease).toBeLessThan(500);
  });
});
```

### Test Suite: Cross-Network Operations
**File:** `app/src/__tests__/reference-networks-cross.test.ts`

#### Test 3.4: Multi-Network Search
```typescript
describe('Multi-Network Search', () => {
  it('should search across all networks simultaneously', async () => {
    const multiLoader = new MultiNetworkLoader(Object.values(REFERENCE_NETWORKS));
    const allEntities = await multiLoader.loadAll();

    const searchEngine = new SearchEngine(allEntities);
    const results = await searchEngine.search('architecture');

    // Should find results from multiple networks
    const networksInResults = new Set(
      results.map(r => r.metadata?.filename)
    );

    expect(networksInResults.size).toBeGreaterThan(1);
  });
});
```

#### Test 3.5: Cross-Domain Similarity
```typescript
describe('Cross-Domain Similarity', () => {
  it('should find similar concepts across domains', async () => {
    const multiLoader = new MultiNetworkLoader([
      REFERENCE_NETWORKS.pliers,
      REFERENCE_NETWORKS.shareth
    ]);
    const allEntities = await multiLoader.loadAll();

    const similarityEngine = new SimilarityEngine(allEntities);

    // Both networks should have "roadmap" concepts
    const pliersRoadmap = allEntities.find(e =>
      e.metadata?.filename?.includes('roadmap') &&
      e.content.includes('Pliers')
    );

    const similarDocs = await similarityEngine.findSimilar(
      pliersRoadmap!,
      { threshold: 0.5, limit: 5 }
    );

    // Should find Shareth roadmap as similar
    const hasCrossDomainMatch = similarDocs.some(d =>
      d.content.includes('Shareth')
    );

    expect(hasCrossDomainMatch).toBe(true);
  });
});
```

## Phase 4: Documentation Tests

### Example Scripts
**File:** `app/src/examples/ReferenceNetworkExamples.ts`

#### Example 4.1: Basic Loading
```typescript
export async function exampleBasicLoading() {
  console.log('=== Basic Reference Network Loading ===\n');

  for (const network of Object.values(REFERENCE_NETWORKS)) {
    console.log(`Loading ${network.name}...`);

    const loader = new ReferenceNetworkLoader(network.path);
    const entities = await loader.loadAndExtract();

    console.log(`  - ${entities.length} entities extracted`);
    console.log(`  - Domain: ${network.domain}`);
    console.log(`  - Adapter: ${network.adapter}\n`);
  }
}
```

#### Example 4.2: Orphaned Node Detection
```typescript
export async function exampleOrphanedNodeDetection() {
  console.log('=== Orphaned Node Detection ===\n');

  for (const network of Object.values(REFERENCE_NETWORKS)) {
    const loader = new ReferenceNetworkLoader(network.path);
    const entities = await loader.loadAndExtract();

    const analyzer = new OrphanedNodeAnalyzer(entities);
    const orphaned = analyzer.findOrphaned();

    console.log(`${network.name}:`);
    if (orphaned.length === 0) {
      console.log('  ✅ No orphaned nodes\n');
    } else {
      console.log(`  ⚠️  ${orphaned.length} orphaned nodes:`);
      orphaned.forEach(node => {
        console.log(`     - ${node.name}`);
      });
      console.log('');
    }
  }
}
```

## Test Utilities

### Shared Utilities
**File:** `app/src/__tests__/utils/reference-network-utils.ts`

```typescript
export class ReferenceNetworkLoader {
  constructor(private basePath: string) {}

  async loadAndExtract(): Promise<Entity[]> {
    const contextPath = path.join(this.basePath, 'context-network');
    const allEntities: Entity[] = [];

    // Recursively find all .md files
    const files = await this.findMarkdownFiles(contextPath);

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const adapter = this.selectAdapter(file);

      const entities = adapter.extract(content, {
        path: file,
        filename: path.basename(file),
        extension: '.md',
        size: content.length
      });

      allEntities.push(...entities);
    }

    return allEntities;
  }

  private async findMarkdownFiles(dir: string): Promise<string[]> {
    // Implementation...
  }

  private selectAdapter(filePath: string): DomainAdapter {
    // Select appropriate adapter based on file path
  }
}

export class NetworkStructureValidator {
  constructor(private network: ReferenceNetwork) {}

  async validate(): Promise<ValidationResult> {
    // Implementation...
  }
}

export class OrphanedNodeAnalyzer {
  constructor(private entities: Entity[]) {}

  findOrphaned(): Entity[] {
    const documents = this.entities.filter(e => e.type === 'document');
    const orphaned: Entity[] = [];

    for (const doc of documents) {
      const incomingRefs = this.entities.filter(e =>
        e.relationships?.some(r => r.target === doc.id)
      );

      const outgoingRefs = doc.relationships?.length || 0;

      // Node is orphaned if it has no incoming or outgoing references
      if (incomingRefs.length === 0 && outgoingRefs === 0) {
        orphaned.push(doc);
      }
    }

    return orphaned;
  }
}
```

## Success Criteria Summary

### Phase 1 Complete When:
- ✅ All 5 networks load successfully
- ✅ Basic entity extraction works
- ✅ Test infrastructure established
- ✅ Baseline metrics documented

### Phase 2 Complete When:
- ✅ 100+ tests passing
- ✅ All core operations validated
- ✅ Domain-specific features work
- ✅ All networks pass all tests

### Phase 3 Complete When:
- ✅ Performance within budgets
- ✅ Cross-network operations work
- ✅ Metrics collection functional
- ✅ Scalability validated

### Phase 4 Complete When:
- ✅ Examples run successfully
- ✅ Documentation complete
- ✅ >90% test coverage
- ✅ Testing guide published

## Relationships
- **Parent Nodes:**
  - [reference-network-testing-strategy.md] - Overall strategy
  - [planning/index.md] - Main planning hub
- **Related Nodes:**
  - [processes/testing_strategy.md] - General testing approach
  - [architecture/adapter-system.md] - Adapter architecture
  - [implementation/test-framework.md] - Test infrastructure

## Navigation Guidance
- **Access Context:** Implementing specific tests for reference networks
- **Common Next Steps:** Write test files, create utilities, run tests
- **Related Tasks:** Test implementation, debugging, documentation
- **Update Patterns:** Updated as tests are implemented and refined

## Metadata
- **Created:** 2025-10-04
- **Last Updated:** 2025-10-04
- **Updated By:** Planning Agent
- **Status:** Ready for implementation

## Change History
- 2025-10-04: Initial detailed test plan created with all phases specified
