# Attention Mechanisms Research

## Purpose
This document researches how attention mechanisms from cognitive science can inform the design of context focusing and information filtering in CorticAI.

## Classification
- **Domain:** Research/Cognitive Models
- **Stability:** Dynamic
- **Abstraction:** Conceptual
- **Confidence:** Evolving

## Cognitive Science Background

### Human Attention Systems

**Selective Attention:**
- Focuses on relevant stimuli
- Filters out noise
- Limited capacity
- Task-dependent

**Divided Attention:**
- Monitors multiple streams
- Switches based on importance
- Performance degradation with overload

**Sustained Attention:**
- Maintains focus over time
- Vigilance for important events
- Fatigue and attention drift

## Application to Context Systems

### Attention-Based Information Filtering

```typescript
interface AttentionSystem {
  // What to focus on
  focus: {
    primary: Entity[]  // Main focus items
    peripheral: Entity[]  // Background awareness
    ignored: Entity[]  // Filtered out
  }
  
  // How focus changes
  switching: {
    triggers: Trigger[]  // What causes focus change
    momentum: number  // Resistance to switching
    history: FocusHistory[]  // Previous focuses
  }
  
  // Relevance scoring
  salience: {
    taskRelevance: (entity, task) => number
    recency: (entity) => number
    importance: (entity) => number
    surprise: (entity, context) => number
  }
  
  // Attention budget
  capacity: {
    maxPrimary: number  // How many things in focus
    maxPeripheral: number  // Background monitoring
    degradation: (load) => performance
  }
}
```

### Task-Specific Attention Profiles

#### Debugging Profile
```typescript
{
  focus: {
    primary: [
      'error_locations',
      'recent_changes',
      'stack_traces',
      'related_tests'
    ],
    peripheral: [
      'dependencies',
      'similar_issues',
      'documentation'
    ]
  },
  salience: {
    weights: {
      errorProximity: 0.4,
      changeRecency: 0.3,
      executionPath: 0.2,
      historicalIssues: 0.1
    }
  }
}
```

#### Feature Development Profile
```typescript
{
  focus: {
    primary: [
      'requirements',
      'related_code',
      'patterns',
      'tests'
    ],
    peripheral: [
      'documentation',
      'similar_features',
      'dependencies'
    ]
  },
  salience: {
    weights: {
      requirementRelevance: 0.3,
      codeRelationship: 0.3,
      patternMatch: 0.2,
      testCoverage: 0.2
    }
  }
}
```

## Research Findings

### Effective Attention Strategies

#### 1. Spotlight Model
- Narrow, intense focus on specific area
- Gradual fade at periphery
- Moveable based on task needs

```typescript
function spotlightAttention(center: Entity, radius: number) {
  return entities.map(entity => ({
    entity,
    attention: gaussian(distance(center, entity), radius)
  }))
}
```

#### 2. Feature Integration
- Parallel processing of features
- Serial attention for binding
- Pop-out effects for anomalies

```typescript
function featureIntegration(entities: Entity[]) {
  // Parallel feature extraction
  const features = entities.map(extractFeatures)
  
  // Serial binding with attention
  const bound = features.filter(f => 
    meetsAttentionThreshold(f)
  ).map(bindFeatures)
  
  return bound
}
```

#### 3. Inhibition of Return
- Prevent getting stuck on same info
- Force exploration of new areas
- Track what's been examined

```typescript
class AttentionInhibition {
  examined = new Set<EntityId>()
  
  getNext(candidates: Entity[]) {
    return candidates
      .filter(c => !this.examined.has(c.id))
      .sort(by salience)
      .first()
  }
  
  markExamined(entity: Entity) {
    this.examined.add(entity.id)
    setTimeout(() => 
      this.examined.delete(entity.id),
      INHIBITION_DURATION
    )
  }
}
```

### Attention Guidance Mechanisms

#### Bottom-Up (Stimulus-Driven)
- Automatic capture by salient features
- Errors, warnings, changes
- Unexpected patterns

#### Top-Down (Goal-Driven)
- Task-based filtering
- User preferences
- Learned patterns

#### Hybrid Approach
```typescript
function hybridAttention(
  stimuli: Entity[],
  task: Task,
  preferences: Preferences
) {
  const bottomUp = stimuli
    .map(s => ({
      entity: s,
      salience: calculateSalience(s)
    }))
    
  const topDown = stimuli
    .map(s => ({
      entity: s,
      relevance: taskRelevance(s, task)
    }))
    
  return combine(bottomUp, topDown, preferences)
}
```

## Implementation Recommendations

### Phase 1: Basic Filtering
- Simple keyword-based focus
- File-type filtering
- Recency-based attention
- Manual focus control

### Phase 2: Task-Aware Attention
- Detect current task type
- Apply task-specific profiles
- Dynamic radius adjustment
- Attention history tracking

### Phase 3: Learned Attention
- Learn from user behavior
- Predict attention needs
- Personalized profiles
- Cross-task transfer

### Phase 4: Collaborative Attention
- Share attention patterns
- Team-based profiles
- Attention handoff
- Collective focus

## Attention Failure Modes

### Information Overload
- Too many items demand attention
- Everything seems important
- Paralysis or random selection

**Mitigation:**
- Strict attention budget
- Forced prioritization
- Progressive disclosure

### Tunnel Vision
- Too narrow focus
- Missing important periphery
- Stuck on single aspect

**Mitigation:**
- Minimum peripheral awareness
- Periodic attention shifts
- Exploration encouragement

### Attention Drift
- Gradual shift from task
- Following interesting tangents
- Lost original purpose

**Mitigation:**
- Task anchoring
- Drift detection
- Gentle redirection

## Open Questions

1. How to balance exploration vs exploitation?
2. What's the optimal attention window size?
3. How to handle attention conflicts?
4. Should attention be shareable between agents?
5. How to measure attention effectiveness?

## Success Metrics

- **Task Completion Time**: Faster with good attention
- **Error Detection Rate**: Finding issues quickly
- **Relevant Information Recall**: Finding what matters
- **Cognitive Load**: Reduced mental effort
- **User Satisfaction**: Feeling supported, not overwhelmed

## Relationships
- **Parent Nodes:** [research/index.md]
- **Related Nodes:** 
  - [multi_perspective_access.md] - complements - Different views need different attention
  - [architecture/corticai_architecture.md] - implements - Lens system
  - [user_studies/task_context_analysis.md] - informs - Task-based attention

## Navigation Guidance
- **Access Context:** Reference when designing lens activation
- **Common Next Steps:** Define attention profiles, test focusing
- **Related Tasks:** Lens implementation, progressive loading
- **Update Patterns:** Update with user behavior analysis

## Metadata
- **Created:** 2025-08-28
- **Last Updated:** 2025-08-28
- **Updated By:** Research Phase