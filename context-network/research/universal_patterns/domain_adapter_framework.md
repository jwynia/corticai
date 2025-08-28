# Domain Adapter Framework Research

## Purpose
This document researches how to design a flexible adapter system that allows CorticAI's universal engine to work effectively with any domain while maintaining simplicity and avoiding over-engineering.

## Classification
- **Domain:** Research/Universal Patterns
- **Stability:** Dynamic
- **Abstraction:** Architectural
- **Confidence:** Evolving

## Design Principles

### Core Philosophy

1. **Universal Engine, Domain Adapters**
   - Engine knows nothing about specific domains
   - Adapters translate domain concepts to universal primitives
   - New domains don't require engine changes

2. **Progressive Enhancement**
   - Basic functionality with zero configuration
   - Incremental improvements with simple adapters
   - Full power with comprehensive adapters

3. **Learn, Don't Prescribe**
   - Adapters can learn from usage
   - Patterns discovered, not predefined
   - Community wisdom accumulates

## Adapter Architecture

### Minimal Adapter Interface

```typescript
interface DomainAdapter {
  // Required: Identify the domain
  domain: {
    id: string           // 'software', 'novel', 'legal', etc.
    name: string         // Human-readable name
    description: string  // What this domain covers
    version: string      // Adapter version
  }
  
  // Required: Extract entities from content
  extract(content: string, metadata: FileMetadata): Entity[]
  
  // Optional: Everything else
  enhance?: AdapterEnhancements
}

interface AdapterEnhancements {
  // Relationship detection
  detectRelationships?: (entities: Entity[]) => Relationship[]
  
  // Custom parsing for specific formats
  parsers?: Map<FileExtension, Parser>
  
  // Domain-specific operations
  operations?: DomainOperation[]
  
  // Suggested views/lenses
  lenses?: LensDefinition[]
  
  // Learning from usage
  learn?: (feedback: UserFeedback) => void
}
```

### Progressive Complexity Levels

#### Level 0: No Adapter (Universal Fallback)
```typescript
class UniversalFallbackAdapter {
  extract(content: string, metadata: FileMetadata): Entity[] {
    return [{
      type: 'document',
      name: metadata.filename,
      content: content,
      sections: extractSections(content),  // Headers, paragraphs
      references: extractReferences(content) // URLs, file paths
    }]
  }
}
```
Works for any text file, provides basic structure.

#### Level 1: Simple Pattern Adapter
```typescript
class SimpleNovelAdapter implements DomainAdapter {
  domain = { id: 'novel', name: 'Novel Writing' }
  
  extract(content: string): Entity[] {
    const entities = []
    
    // Simple pattern matching
    const characters = content.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g)
    characters?.forEach(name => {
      entities.push({ type: 'character', name })
    })
    
    // Chapter detection
    const chapters = content.split(/^Chapter \d+/mi)
    chapters.forEach((ch, i) => {
      entities.push({ type: 'chapter', number: i, content: ch })
    })
    
    return entities
  }
}
```

#### Level 2: Structured Adapter
```typescript
class StructuredLegalAdapter implements DomainAdapter {
  domain = { id: 'legal', name: 'Legal Documents' }
  
  private patterns = {
    clause: /^\d+\.\d+\.?\s+[A-Z]/,
    party: /(".*?")|(\b[A-Z][\w\s]+(?:Inc|LLC|Corp)\b)/,
    date: /\b\d{1,2}\/\d{1,2}\/\d{4}\b/,
    reference: /Section \d+\.\d+|Exhibit [A-Z]/
  }
  
  extract(content: string): Entity[] {
    const entities = []
    const lines = content.split('\n')
    
    lines.forEach(line => {
      if (this.patterns.clause.test(line)) {
        entities.push({ type: 'clause', text: line })
      }
      // ... more pattern matching
    })
    
    return entities
  }
  
  enhance = {
    detectRelationships: (entities) => {
      // Find cross-references between clauses
      return this.findCrossReferences(entities)
    }
  }
}
```

#### Level 3: Intelligent Adapter
```typescript
class IntelligentResearchAdapter implements DomainAdapter {
  domain = { id: 'research', name: 'Academic Research' }
  
  private nlpProcessor = new NLPEngine()
  private citationParser = new CitationParser()
  
  extract(content: string, metadata: FileMetadata): Entity[] {
    // Use NLP for entity extraction
    const entities = this.nlpProcessor.extractEntities(content)
    
    // Add domain-specific intelligence
    if (metadata.filename.endsWith('.bib')) {
      return this.citationParser.parse(content)
    }
    
    // Detect paper sections
    const sections = this.detectAcademicSections(content)
    
    // Extract hypotheses, methods, results
    const findings = this.extractResearchElements(sections)
    
    return [...entities, ...sections, ...findings]
  }
  
  enhance = {
    detectRelationships: (entities) => {
      const relationships = []
      
      // Citation relationships
      relationships.push(...this.extractCitations(entities))
      
      // Author collaboration networks
      relationships.push(...this.findCollaborations(entities))
      
      // Concept relationships
      relationships.push(...this.linkConcepts(entities))
      
      return relationships
    },
    
    lenses: [
      {
        id: 'literature-review',
        name: 'Literature Review',
        focus: ['citation', 'paper', 'author'],
        layout: 'citation-network'
      },
      {
        id: 'methodology',
        name: 'Methodology Comparison',
        focus: ['method', 'dataset', 'metric'],
        layout: 'comparison-table'
      }
    ],
    
    learn: (feedback) => {
      // Adjust entity extraction based on corrections
      this.nlpProcessor.updateModel(feedback)
    }
  }
}
```

## Adapter Discovery & Loading

### Automatic Domain Detection

```typescript
class DomainDetector {
  private indicators = new Map<string, DomainIndicator[]>()
  
  detectDomain(files: FileInfo[]): DomainProbability[] {
    const scores = new Map<string, number>()
    
    files.forEach(file => {
      // Check file extensions
      if (file.path.match(/\.(ts|js|py|java)$/)) {
        scores.set('software', (scores.get('software') ?? 0) + 1)
      }
      
      // Check file paths
      if (file.path.includes('chapter') || file.path.includes('scene')) {
        scores.set('novel', (scores.get('novel') ?? 0) + 1)
      }
      
      // Check content patterns
      if (file.preview?.includes('WHEREAS') || file.preview?.includes('Section')) {
        scores.set('legal', (scores.get('legal') ?? 0) + 1)
      }
    })
    
    return Array.from(scores.entries())
      .map(([domain, score]) => ({
        domain,
        probability: score / files.length
      }))
      .sort((a, b) => b.probability - a.probability)
  }
}
```

### Adapter Registry

```typescript
class AdapterRegistry {
  private adapters = new Map<string, DomainAdapter>()
  private communityAdapters = new RemoteRegistry()
  
  // Built-in adapters
  constructor() {
    this.register(new SoftwareAdapter())
    this.register(new NovelAdapter())
    this.register(new LegalAdapter())
    this.register(new ResearchAdapter())
  }
  
  // Load community adapters
  async loadCommunityAdapter(domain: string) {
    const adapter = await this.communityAdapters.fetch(domain)
    if (adapter) {
      this.register(adapter)
    }
  }
  
  // Find best adapter for content
  selectAdapter(files: FileInfo[]): DomainAdapter {
    const detected = new DomainDetector().detectDomain(files)
    
    // Try detected domains in order
    for (const { domain } of detected) {
      if (this.adapters.has(domain)) {
        return this.adapters.get(domain)!
      }
    }
    
    // Fall back to universal adapter
    return new UniversalAdapter()
  }
}
```

## Multi-Domain Projects

### Handling Projects with Multiple Domains

```typescript
class MultiDomainAdapter {
  private adapters: DomainAdapter[] = []
  private routing: FileRouter
  
  constructor(project: ProjectInfo) {
    // Detect all domains in project
    const domains = this.detectDomains(project)
    
    // Load adapter for each domain
    domains.forEach(domain => {
      this.adapters.push(this.loadAdapter(domain))
    })
    
    // Build routing rules
    this.routing = this.buildRouter(project)
  }
  
  extract(file: FileInfo): Entity[] {
    // Route to appropriate adapter
    const adapter = this.routing.route(file)
    const entities = adapter.extract(file.content, file.metadata)
    
    // Tag entities with domain
    return entities.map(e => ({
      ...e,
      domain: adapter.domain.id
    }))
  }
  
  // Cross-domain relationships
  detectCrossDomainRelationships(entities: Entity[]): Relationship[] {
    const relationships = []
    
    // Software tests validate legal requirements
    const tests = entities.filter(e => e.domain === 'software' && e.type === 'test')
    const requirements = entities.filter(e => e.domain === 'legal' && e.type === 'requirement')
    
    tests.forEach(test => {
      const req = this.findRelatedRequirement(test, requirements)
      if (req) {
        relationships.push({
          source: test.id,
          target: req.id,
          type: 'validates',
          crossDomain: true
        })
      }
    })
    
    return relationships
  }
}
```

## Adapter Development Kit

### Making It Easy to Create Adapters

```typescript
// Simple DSL for adapter creation
class AdapterBuilder {
  private adapter: PartialAdapter = {}
  
  forDomain(id: string, name: string) {
    this.adapter.domain = { id, name }
    return this
  }
  
  withPattern(pattern: RegExp, entityType: string) {
    this.adapter.patterns = this.adapter.patterns ?? []
    this.adapter.patterns.push({ pattern, type: entityType })
    return this
  }
  
  withLens(lens: LensDefinition) {
    this.adapter.lenses = this.adapter.lenses ?? []
    this.adapter.lenses.push(lens)
    return this
  }
  
  build(): DomainAdapter {
    return new PatternBasedAdapter(this.adapter)
  }
}

// Usage
const gameAdapter = new AdapterBuilder()
  .forDomain('rpg', 'Role-Playing Games')
  .withPattern(/CR \d+/, 'challenge-rating')
  .withPattern(/\d+d\d+/, 'dice-roll')
  .withPattern(/^## .+/, 'location')
  .withLens({
    id: 'combat',
    name: 'Combat View',
    focus: ['monster', 'npc', 'challenge-rating']
  })
  .build()
```

### Adapter Templates

```yaml
# YAML-based adapter definition
domain:
  id: journalism
  name: Journalism & Investigation
  
patterns:
  - pattern: "Source: (.+)"
    type: source
    capture: name
    
  - pattern: "\\[VERIFIED\\]"
    type: fact
    property: verified
    
  - pattern: "Date: (\\d{4}-\\d{2}-\\d{2})"
    type: event
    capture: date

relationships:
  - from: source
    to: quote
    type: said
    when: "quote appears after source name"
    
  - from: fact
    to: source
    type: corroborated-by
    when: "source mentioned near fact"

lenses:
  - id: timeline
    name: Event Timeline
    focus: [event, date]
    sort: chronological
    
  - id: source-network
    name: Source Network
    focus: [source, quote]
    layout: network-graph
```

## Learning & Evolution

### How Adapters Improve Over Time

```typescript
class LearningAdapter implements DomainAdapter {
  private patterns: LearnedPattern[] = []
  private feedback: UserFeedback[] = []
  
  learn(feedback: UserFeedback) {
    this.feedback.push(feedback)
    
    // Learn from corrections
    if (feedback.type === 'correction') {
      this.adjustPattern(feedback.original, feedback.corrected)
    }
    
    // Learn from usage
    if (feedback.type === 'usage') {
      this.reinforcePattern(feedback.pattern)
    }
    
    // Discover new patterns
    if (this.feedback.length % 100 === 0) {
      this.mineNewPatterns()
    }
  }
  
  private mineNewPatterns() {
    // Analyze feedback for recurring patterns
    const candidates = this.findRecurringCorrections()
    
    // Test pattern effectiveness
    candidates.forEach(pattern => {
      const accuracy = this.testPattern(pattern)
      if (accuracy > 0.8) {
        this.patterns.push(pattern)
      }
    })
  }
}
```

## Success Criteria

### What Makes a Good Adapter System?

1. **Easy to Start**: Works with zero configuration
2. **Easy to Extend**: Simple adapters for simple needs
3. **Powerful When Needed**: Full capability available
4. **Learnable**: Improves with use
5. **Shareable**: Community can contribute
6. **Discoverable**: Auto-detects appropriate adapters
7. **Composable**: Multiple adapters can work together

## Open Questions

1. How much should adapters know about each other?
2. Should adapters be sandboxed for security?
3. How to handle adapter version conflicts?
4. Can adapters be generated from examples?
5. How to quality-control community adapters?

## Relationships
- **Parent Nodes:** [research/index.md]
- **Related Nodes:** 
  - [cross_domain_patterns.md] - informs - What adapters translate
  - [domain_discovery.md] - defines - Domains needing adapters
  - [architecture/corticai_architecture.md] - implements - Adapter system

## Navigation Guidance
- **Access Context:** Reference when designing adapter system
- **Common Next Steps:** Create adapter templates, build examples
- **Related Tasks:** API design, plugin architecture
- **Update Patterns:** Update with adapter implementation results

## Metadata
- **Created:** 2025-08-28
- **Last Updated:** 2025-08-28
- **Updated By:** Adapter Framework Research