# Shared Attribute Systems Research

## Purpose
This document researches shared attribute relationships - the "these things share something in common" connections that enable discovery, grouping, and pattern recognition across entities in any domain.

## Classification
- **Domain:** Research/Relationships
- **Stability:** Dynamic
- **Abstraction:** Conceptual
- **Confidence:** Evolving

## Core Concept: What Makes a Shared Attribute?

### Definition
A shared attribute exists when:
1. **Multiple entities have the same property** (explicit attribute)
2. **Multiple entities exhibit similar behavior** (behavioral attribute)
3. **Multiple entities appear in similar contexts** (contextual attribute)
4. **Multiple entities match a pattern** (derived attribute)

### Attributes vs Dependencies
```typescript
// Shared Attribute: These SHARE a property
[FileA, FileB, FileC] all use deprecated_api
[Ch3, Ch7, Ch12] all feature Sarah
[Clause2, Clause5, Clause8] all involve payment

// Dependency: This NEEDS that
FileA → deprecated_api  // Requires it
Ch12 → Ch3             // Depends on setup
Clause8 → Clause2      // References definition
```

## Types of Attributes

### 1. Intrinsic Attributes

**Identity Properties**
```typescript
interface IntrinsicAttribute {
  // What something IS
  type: 'function' | 'class' | 'module'
  genre: 'mystery' | 'romance' | 'thriller'  
  category: 'payment' | 'liability' | 'termination'
  domain: 'frontend' | 'backend' | 'database'
}
```

**Measurable Properties**
```typescript
interface MeasurableAttribute {
  // Quantifiable characteristics
  size: number        // Lines, words, bytes
  complexity: number  // Cyclomatic, readability
  sentiment: number   // Positive, negative, neutral
  risk: number       // High, medium, low
  date: Date         // Created, modified, due
}
```

### 2. Semantic Attributes

**Meaning-Based**
```typescript
interface SemanticAttribute {
  // What something MEANS
  purpose: string[]      // "authentication", "validation"
  theme: string[]        // "betrayal", "redemption"
  concern: string[]      // "security", "performance"
  topic: string[]        // "payment", "delivery"
}
```

**Tag-Based**
```typescript
interface TagAttribute {
  // Human-assigned meaning
  tags: Set<string>
  labels: Map<string, string>
  annotations: Annotation[]
  metadata: Record<string, any>
}
```

### 3. Behavioral Attributes

**Action-Based**
```typescript
interface BehavioralAttribute {
  // What something DOES
  operations: {
    reads: Resource[]
    writes: Resource[]
    calls: Function[]
    triggers: Event[]
  }
  
  // How it behaves
  patterns: {
    async: boolean
    stateful: boolean
    pure: boolean
    idempotent: boolean
  }
}
```

**Usage-Based**
```typescript
interface UsageAttribute {
  // How something is USED
  frequency: number
  lastAccessed: Date
  accessedBy: User[]
  contexts: Context[]
}
```

### 4. Contextual Attributes

**Location-Based**
```typescript
interface LocationAttribute {
  // WHERE something appears
  
  // Code
  package: string
  module: string
  layer: 'ui' | 'business' | 'data'
  
  // Novel
  setting: string
  chapter: number
  scene: string
  
  // Document
  section: string
  page: number
  paragraph: number
}
```

**Relational Context**
```typescript
interface RelationalAttribute {
  // What something is CONNECTED TO
  
  connectedTo: Node[]
  partOf: Container[]
  referencedBy: Node[]
  similarTo: Node[]
}
```

## Attribute Discovery Strategies

### Explicit Attribute Extraction

**Metadata Parsing**
```typescript
class MetadataExtractor {
  extractFromFile(file: File): Attribute[] {
    const attributes = []
    
    // File system attributes
    attributes.push({
      type: 'intrinsic',
      name: 'extension',
      value: getExtension(file.path)
    })
    
    // Front matter (YAML, TOML, etc.)
    if (file.frontMatter) {
      Object.entries(file.frontMatter).forEach(([key, value]) => {
        attributes.push({
          type: 'explicit',
          name: key,
          value: value
        })
      })
    }
    
    // Comments and annotations
    const annotations = extractAnnotations(file.content)
    annotations.forEach(ann => {
      attributes.push({
        type: 'annotation',
        name: ann.type,
        value: ann.value
      })
    })
    
    return attributes
  }
}
```

### Pattern-Based Discovery

**Content Pattern Matching**
```typescript
class PatternAttributeDetector {
  private patterns = {
    // Code patterns
    usesAPI: /import.*from ['"]@deprecated/,
    hasTests: /describe\(|test\(|it\(/,
    asyncCode: /async|await|Promise/,
    
    // Novel patterns
    hasViolence: /fight|battle|blood|wound/i,
    hasRomance: /kiss|love|embrace|heart/i,
    
    // Document patterns
    hasDeadline: /by \d{4}-\d{2}-\d{2}/,
    hasPenalty: /penalty|fine|damages/i
  }
  
  detect(content: string): Attribute[] {
    return Object.entries(this.patterns)
      .filter(([name, pattern]) => pattern.test(content))
      .map(([name]) => ({
        type: 'pattern',
        name: name,
        value: true,
        confidence: this.calculateConfidence(name, content)
      }))
  }
}
```

### Statistical Analysis

**Topic Modeling**
```typescript
class TopicAttributeExtractor {
  private model: TopicModel
  
  extractTopics(documents: Document[]): AttributeSet {
    // Use LDA or similar
    const topics = this.model.fit(documents)
    
    return documents.map(doc => ({
      entity: doc.id,
      attributes: topics.getTopicsForDocument(doc).map(topic => ({
        type: 'topic',
        name: `topic_${topic.id}`,
        value: topic.weight,
        keywords: topic.topWords
      }))
    }))
  }
}
```

**Clustering**
```typescript
class ClusterAttributeDetector {
  findClusters(entities: Entity[]): Cluster[] {
    const features = entities.map(e => this.extractFeatures(e))
    const clusters = kMeans(features, k)
    
    return clusters.map((cluster, i) => ({
      id: `cluster_${i}`,
      members: cluster.members,
      attributes: this.describeCluster(cluster),
      centroid: cluster.centroid
    }))
  }
}
```

### Behavioral Analysis

**Usage Pattern Detection**
```typescript
class BehaviorAttributeAnalyzer {
  analyzeAccessPatterns(logs: AccessLog[]): Attribute[] {
    const patterns = []
    
    // Frequency-based
    const frequency = calculateFrequency(logs)
    patterns.push({
      type: 'usage',
      name: 'access_frequency',
      value: frequency,
      category: frequency > 100 ? 'hot' : 'cold'
    })
    
    // Temporal patterns
    const temporal = analyzeTemporalPattern(logs)
    patterns.push({
      type: 'temporal',
      name: 'access_pattern',
      value: temporal.pattern, // 'daily', 'weekly', 'sporadic'
      peakTimes: temporal.peaks
    })
    
    // User patterns
    const users = analyzeUsers(logs)
    patterns.push({
      type: 'social',
      name: 'user_groups',
      value: users.groups,
      primary: users.primaryGroup
    })
    
    return patterns
  }
}
```

## Attribute Indexing Systems

### Inverted Index

```typescript
class AttributeIndex {
  private index = new Map<AttributeKey, Set<EntityId>>()
  private entityAttributes = new Map<EntityId, Set<AttributeKey>>()
  
  addAttribute(entity: EntityId, attr: Attribute) {
    const key = this.makeKey(attr)
    
    // Update inverted index
    if (!this.index.has(key)) {
      this.index.set(key, new Set())
    }
    this.index.get(key)!.add(entity)
    
    // Update entity index
    if (!this.entityAttributes.has(entity)) {
      this.entityAttributes.set(entity, new Set())
    }
    this.entityAttributes.get(entity)!.add(key)
  }
  
  // Find entities with attribute
  findWithAttribute(attr: Attribute): EntityId[] {
    const key = this.makeKey(attr)
    return Array.from(this.index.get(key) || [])
  }
  
  // Find entities with ALL attributes
  findWithAllAttributes(attrs: Attribute[]): EntityId[] {
    const sets = attrs.map(a => this.index.get(this.makeKey(a)) || new Set())
    return Array.from(intersection(...sets))
  }
  
  // Find entities with ANY attributes
  findWithAnyAttribute(attrs: Attribute[]): EntityId[] {
    const sets = attrs.map(a => this.index.get(this.makeKey(a)) || new Set())
    return Array.from(union(...sets))
  }
}
```

### Faceted Search System

```typescript
class FacetedSearch {
  private facets = new Map<FacetName, FacetIndex>()
  
  // Build facets from entities
  buildFacets(entities: Entity[]) {
    entities.forEach(entity => {
      entity.attributes.forEach(attr => {
        if (!this.facets.has(attr.facet)) {
          this.facets.set(attr.facet, new FacetIndex())
        }
        this.facets.get(attr.facet)!.add(entity.id, attr.value)
      })
    })
  }
  
  // Multi-faceted search
  search(query: FacetQuery): SearchResult {
    let results = this.getAllEntities()
    
    // Apply each facet filter
    query.facets.forEach((values, facet) => {
      const facetIndex = this.facets.get(facet)
      results = results.filter(id => 
        facetIndex!.matches(id, values)
      )
    })
    
    // Calculate facet counts for remaining
    const facetCounts = this.calculateFacetCounts(results)
    
    return {
      entities: results,
      facets: facetCounts,
      total: results.length
    }
  }
}
```

## Similarity and Distance

### Attribute-Based Similarity

```typescript
class AttributeSimilarity {
  // Jaccard similarity for binary attributes
  jaccard(a: Set<Attribute>, b: Set<Attribute>): number {
    const intersection = new Set([...a].filter(x => b.has(x)))
    const union = new Set([...a, ...b])
    return intersection.size / union.size
  }
  
  // Cosine similarity for weighted attributes
  cosine(a: AttributeVector, b: AttributeVector): number {
    const dotProduct = this.dot(a, b)
    const magnitudeA = Math.sqrt(this.dot(a, a))
    const magnitudeB = Math.sqrt(this.dot(b, b))
    return dotProduct / (magnitudeA * magnitudeB)
  }
  
  // Find similar entities
  findSimilar(entity: Entity, threshold: number): Entity[] {
    const entityAttrs = this.getAttributes(entity)
    
    return this.allEntities
      .map(other => ({
        entity: other,
        similarity: this.similarity(entityAttrs, this.getAttributes(other))
      }))
      .filter(s => s.similarity > threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .map(s => s.entity)
  }
}
```

## Cross-Domain Examples

### Code: API Usage Patterns
```typescript
const apiUsageAttributes = {
  // All files using deprecated API
  deprecated_api_users: [
    'UserService.ts',
    'AuthController.ts',
    'LegacyAdapter.ts'
  ],
  
  // All files with security implications
  security_sensitive: [
    'AuthController.ts',
    'PasswordHash.ts',
    'TokenValidator.ts'
  ],
  
  // Intersection: Deprecated AND security-sensitive
  critical_updates: [
    'AuthController.ts'  // Has both attributes
  ]
}
```

### Novel: Character and Theme Tracking
```typescript
const novelAttributes = {
  // All chapters with Sarah
  sarah_chapters: ['ch1', 'ch3', 'ch7', 'ch12'],
  
  // All chapters with violence
  violent_chapters: ['ch7', 'ch9', 'ch12'],
  
  // All chapters in Chicago
  chicago_chapters: ['ch1', 'ch3', 'ch8'],
  
  // Complex query: Sarah + Violence + Chicago
  sarah_violent_chicago: ['ch7']  // Intersection of all three
}
```

### Contract: Clause Categorization
```typescript
const contractAttributes = {
  // All payment-related clauses
  payment_clauses: ['2.1', '2.2', '5.3', '8.1'],
  
  // All clauses with deadlines
  deadline_clauses: ['2.1', '3.4', '5.3', '7.2'],
  
  // All clauses modified by amendments
  amended_clauses: ['2.1', '5.3', '9.1'],
  
  // Query: Payment clauses with deadlines that were amended
  critical_payment_deadlines: ['2.1', '5.3']
}
```

## Attribute-Based Lenses

### Dynamic Lens Creation

```typescript
class AttributeLensGenerator {
  generateLens(attributes: Attribute[]): Lens {
    return {
      name: this.generateName(attributes),
      
      // Include entities with these attributes
      include: (entity) => 
        attributes.every(attr => entity.hasAttribute(attr)),
      
      // Highlight based on attribute strength
      highlight: (entity) => {
        const strength = attributes
          .map(attr => entity.getAttributeStrength(attr))
          .reduce((a, b) => a + b, 0)
        return strength / attributes.length
      },
      
      // Group by attribute values
      grouping: this.createGrouping(attributes),
      
      // Sort by attribute relevance
      sorting: this.createSorting(attributes)
    }
  }
}
```

## Implementation Recommendations

### Phase 1: Explicit Attributes
- Tags and metadata
- File properties
- Simple pattern matching
- Manual categorization

### Phase 2: Derived Attributes
- Content analysis
- Statistical extraction
- Pattern discovery
- Behavioral tracking

### Phase 3: Smart Attributes
- Machine learning extraction
- Cross-entity inference
- Temporal evolution
- Predictive attributes

### Phase 4: Attribute Intelligence
- Automatic categorization
- Attribute relationship discovery
- Importance ranking
- Personalized attributes

## Open Questions

1. How many attributes before overwhelming users?
2. How to handle fuzzy/probabilistic attributes?
3. Should attributes be hierarchical?
4. How to merge similar attributes?
5. Can attributes be learned from user behavior?

## Success Metrics

- **Coverage**: Percentage of entities with attributes
- **Precision**: Accuracy of automatic attributes
- **Discoverability**: Ease of finding via attributes
- **Expressiveness**: Complex queries supported
- **Performance**: Speed of attribute queries

## Relationships
- **Parent Nodes:** [research/index.md]
- **Related Nodes:** 
  - [dependency_relationship_patterns.md] - complements - Other relationship type
  - [dense_network_organization.md] - enables - Rich interconnections
  - [hybrid_relationship_queries.md] - combines - With dependencies

## Navigation Guidance
- **Access Context:** Reference when implementing attribute systems
- **Common Next Steps:** Build attribute index, create faceted search
- **Related Tasks:** Entity categorization, similarity search, clustering
- **Update Patterns:** Update with new attribute types discovered

## Metadata
- **Created:** 2025-08-28
- **Last Updated:** 2025-08-28
- **Updated By:** Relationship Research