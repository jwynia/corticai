# Multi-Perspective Access Research

## Purpose
This document researches how to provide multiple organizational views of the same information, moving beyond the single-hierarchy limitation of file systems to index-like access patterns.

## Classification
- **Domain:** Research/Problem Validation
- **Stability:** Dynamic
- **Abstraction:** Detailed
- **Confidence:** Evolving

## Problem Statement

File systems force a "table of contents" organization where each file exists in exactly one location. However, understanding requires "index-like" access where the same content can be accessed from multiple perspectives.

Example: A payment processing function is simultaneously:
- Part of the payment flow (business logic view)
- A security-sensitive component (security view)
- A performance bottleneck (performance view)
- An integration point with Stripe (integration view)
- A source of customer issues (support view)

Current tools force users to maintain these multiple views mentally, leading to missed connections and incomplete understanding.

## Research Questions

1. **View Definition**: How do we identify and define useful perspectives?
2. **Automatic Organization**: Can views be generated vs manually maintained?
3. **View Switching**: How do users navigate between perspectives?
4. **Information Emphasis**: What gets highlighted in each view?

## Existing Solutions Analysis

### IDE Perspectives

**Eclipse/IntelliJ Perspectives:**
- Predefined workspace layouts
- Tool window arrangements
- Task-specific configurations

*Limitations:* Static, manual switching, no content reorganization

### Knowledge Graphs

**Obsidian/Roam Research:**
- Bidirectional links
- Graph visualization
- Tag-based organization

*Limitations:* Manual linking, no automatic perspectives

### Faceted Search

**E-commerce/Library Systems:**
- Multiple filter dimensions
- Dynamic categorization
- Drill-down navigation

*Limitations:* Search-focused, not browsing

## Proposed Approach

### Dynamic Lens System

```typescript
interface ContextLens {
  id: string
  name: string  // "Security Review", "Performance Analysis"
  
  // What triggers this lens
  activation: {
    keywords: string[]  // "security", "auth", "vulnerability"
    tasks: TaskType[]  // debugging, feature, refactor
    patterns: Pattern[]  // File patterns, code patterns
    manual: boolean  // User can manually activate
  }
  
  // What information to emphasize
  emphasis: {
    // Nodes to highlight
    nodes: {
      filter: NodeFilter  // Which nodes to include
      scoring: ScoringFunction  // Relevance scoring
      grouping: GroupingStrategy  // How to organize
    }
    
    // Edges to highlight
    edges: {
      types: EdgeType[]  // Which relationships matter
      weight: WeightFunction  // Importance of connections
      paths: PathStrategy  // Which paths to show
    }
    
    // Metadata to surface
    metadata: {
      properties: string[]  // Which properties to show
      derived: DerivedProperty[]  // Calculated properties
      temporal: TemporalFilter  // Time-based filtering
    }
  }
  
  // How to present information
  presentation: {
    layout: LayoutAlgorithm  // Spatial organization
    hierarchy: HierarchyBuilder  // Tree structure
    visualization: VisualizationType  // Graph, tree, list
    density: InformationDensity  // How much to show
  }
}
```

### Perspective Examples

#### Security Lens
```typescript
{
  emphasis: {
    nodes: {
      filter: node => 
        node.hasTag('security') ||
        node.references('auth') ||
        node.containsPattern(/password|token|credential/),
      scoring: node => 
        node.riskLevel * node.exposureLevel
    },
    edges: {
      types: ['calls', 'exposes', 'validates'],
      weight: edge => 
        edge.crossesTrustBoundary ? 10 : 1
    }
  }
}
```

#### Performance Lens
```typescript
{
  emphasis: {
    nodes: {
      filter: node => 
        node.metrics.executionTime > threshold ||
        node.hasTag('bottleneck') ||
        node.inHotPath,
      scoring: node => 
        node.metrics.executionTime * node.metrics.callFrequency
    },
    edges: {
      types: ['calls', 'blocks', 'depends'],
      weight: edge => 
        edge.latency + edge.frequency
    }
  }
}
```

### View Generation Strategies

#### 1. Pattern-Based Generation
- Detect common patterns in codebase
- Generate views for each pattern
- Example: MVC → Model view, View view, Controller view

#### 2. Task-Based Generation
- Analyze user/agent tasks
- Create views for common tasks
- Example: "Debug payment flow" → Payment Debug view

#### 3. Query-Based Generation
- Learn from user queries
- Generate views for frequent searches
- Example: Frequent security searches → Security view

#### 4. Annotation-Based Generation
- Use code comments/tags
- Generate views from annotations
- Example: @security → Security view inclusion

## Research Findings

### Effective Patterns

**1. Progressive Disclosure**
- Start with high-level view
- Allow drilling down
- Maintain context while exploring
- Breadcrumb navigation

**2. Consistent Mental Models**
- Same information accessible from all views
- Relationships preserved across perspectives
- No information hidden, just de-emphasized
- Predictable organization

**3. Smooth Transitions**
- Animate between views
- Highlight what changed
- Preserve selection/focus
- Allow quick switching

### Ineffective Patterns

**1. Too Many Views**
- Cognitive overload
- Decision paralysis
- Maintenance burden
- Inconsistency

**2. Rigid Hierarchies**
- Still forces single organization
- Doesn't solve core problem
- Users create mental workarounds
- Miss cross-cutting concerns

**3. Automatic Reorganization**
- Breaks mental models
- Loses user's place
- Unpredictable behavior
- Trust erosion

## Prototype Testing

### Test Scenarios

1. **Task Completion Time**
   - Compare single hierarchy vs multi-perspective
   - Measure time to find relevant information
   - Track navigation patterns

2. **Comprehension Testing**
   - Test understanding of system relationships
   - Identify missed connections
   - Measure confidence levels

3. **View Effectiveness**
   - Which views get used most
   - View switching patterns
   - Abandoned vs completed tasks

### User Studies

**Developer Tasks:**
1. Debug a security issue
2. Optimize performance bottleneck
3. Understand new feature area
4. Review code for patterns

**Measurements:**
- Time to relevant information
- Completeness of understanding
- Confidence in changes
- Missed important connections

## Implementation Recommendations

### Phase 1: Core Perspectives
- Implement 3-5 essential views
- Business Logic, Security, Performance
- Manual switching only
- Learn usage patterns

### Phase 2: Smart Activation
- Context-aware view switching
- Task detection
- Keyword triggers
- User preference learning

### Phase 3: Custom Views
- User-defined perspectives
- Saved view configurations
- Shareable perspectives
- View composition

### Phase 4: Generative Views
- Automatic view generation
- Pattern-based creation
- Query-based optimization
- Cross-project learning

## Open Questions

1. How many perspectives are too many?
2. Should views be project-specific or universal?
3. How to handle information that doesn't fit any view?
4. Can views be composed or combined?
5. How to teach users about available views?

## Success Criteria

- **Reduced Search Time**: Finding information 50% faster
- **Improved Understanding**: Fewer missed relationships
- **Task Completion**: Higher success rate
- **User Satisfaction**: Preference over single hierarchy
- **Learning Curve**: Intuitive without training

## Relationships
- **Parent Nodes:** [research/index.md]
- **Related Nodes:** 
  - [foundation/problem_analysis.md] - addresses - Single Hierarchy Limitation
  - [architecture/corticai_architecture.md] - implements - Lens System
  - [user_studies/task_context_analysis.md] - informs - Task-based views

## Navigation Guidance
- **Access Context:** Reference when designing the lens system
- **Common Next Steps:** Define core perspectives, test prototypes
- **Related Tasks:** Implementing lens activation, view generation
- **Update Patterns:** Update with user study results

## Metadata
- **Created:** 2025-08-28
- **Last Updated:** 2025-08-28
- **Updated By:** Research Phase