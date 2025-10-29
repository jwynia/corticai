# Semantic Maintenance

**Status**: Architectural Pattern
**Domain**: Knowledge Management, System Health
**Related**: [[write-time-enrichment]], [[attention-gravity-problem]], [[semantic-pipeline-stages]]

---

## Overview

Knowledge graphs decay without continuous maintenance. Semantic maintenance uses automated monitoring to detect staleness, contradictions, drift, and gaps - keeping the context network healthy and relevant.

::principle{id="continuous-health" importance="high"}
**Principle**: Knowledge graphs are living systems that require continuous care

**Without Maintenance**:
- Links break (code moves, files rename)
- Meaning drifts (context changes, topics evolve)
- Contradictions emerge (decisions conflict, requirements change)
- Redundancy grows (multiple docs say same thing)
- Gaps form (new concepts undefined, old concepts stale)

**With Maintenance**:
- Proactive staleness detection
- Automatic conflict resolution suggestions
- Relationship health monitoring
- Gap identification and filling
::

---

## Staleness Detection

::pattern{name="code-reference-rot" severity="high" frequency="daily"}
**Pattern**: Documents reference code locations that no longer exist

**Detection**:
```typescript
async function detectCodeReferenceRot(): Promise<StaleReference[]> {
  const staleRefs = []

  // Find all documents with code references
  const docs = await storage
    .where({ hasCodeReferences: true })
    .load()

  for (const doc of docs) {
    const refs = extractCodeReferences(doc.content)

    for (const ref of refs) {
      const exists = await fileSystem.exists(ref.path)
      const lineExists = exists && await checkLineRange(ref.path, ref.lines)

      if (!exists || !lineExists) {
        staleRefs.push({
          document: doc.id,
          reference: ref,
          issue: !exists ? 'file-not-found' : 'line-out-of-range',
          severity: 'high',
          suggestedAction: 'update-or-remove'
        })
      }
    }
  }

  return staleRefs
}
```

**Frequency**: Daily check
**Auto-fix**: Low-risk cases (update line numbers if code just moved)
**Human review**: High-risk cases (file deleted, meaning may have changed)
::

::pattern{name="semantic-drift" severity="medium" frequency="weekly"}
**Pattern**: Document meaning diverges from its linked neighbors

**Detection**:
```typescript
async function detectSemanticDrift(): Promise<DriftIssue[]> {
  const issues = []

  const linkedDocs = await findDocumentsWithManyLinks()

  for (const doc of linkedDocs) {
    const linkedContent = await loadLinkedDocuments(doc)
    const coherence = await measureSemanticCoherence(doc, linkedContent)

    if (coherence < 0.6) {
      issues.push({
        document: doc.id,
        driftScore: 1 - coherence,
        reason: 'Document topic has diverged from linked neighbors',
        linkedDocs: linkedContent.map(d => d.id),
        suggestedAction: 'review-links-or-update-content'
      })
    }
  }

  return issues
}
```
::

::pattern{name="orphan-detection" severity="low" frequency="weekly"}
**Pattern**: Semantically similar documents that aren't linked

**Detection**:
```typescript
async function findSemanticOrphans(): Promise<OrphanIssue[]> {
  const orphans = []

  const allDocs = await storage.loadAll()

  for (const doc of allDocs) {
    if (doc.incomingLinks.length === 0 && doc.outgoingLinks.length < 2) {
      // Potential orphan - check if similar docs exist
      const similar = await findSemanticallyRelated(doc, { threshold: 0.8 })

      if (similar.length > 3) {
        orphans.push({
          document: doc.id,
          shouldLinkTo: similar,
          reason: 'High semantic similarity but no explicit connections',
          suggestedAction: 'add-relationships'
        })
      }
    }
  }

  return orphans
}
```
::

---

## Contradiction Detection

::pattern{name="conflicting-claims" severity="high" frequency="on-write"}
**Pattern**: New document makes claims that conflict with existing knowledge

**Detection Process**:
1. Extract claims from new document
2. Find documents on same topic
3. Compare claims semantically
4. Suggest resolution based on authority/recency/evidence

**Example**:
```markdown
# Document A (2025-09-15, lifecycle: current)
Decision: Use Kuzu for graph storage

# Document B (2025-10-13, lifecycle: current)
Decision: Use SurrealDB for graph storage

# Detected Contradiction:
- Both marked as "current"
- Same topic (graph storage)
- Conflicting recommendations
- Resolution: Mark A as "deprecated", superseded by B
```

**Auto-Resolution Criteria**:
- Clear temporal ordering (B newer than A)
- Higher lifecycle authority (both current → mark older as deprecated)
- Explicit supersession language ("replaces", "supersedes")
::

---

## Relationship Health

::pattern{name="relationship-weight-adjustment" frequency="continuous"}
**Pattern**: Adjust relationship importance based on usage

**Metrics**:
```typescript
interface RelationshipHealth {
  traversalCount: number        // How often followed
  lastTraversed: Date          // When last used
  originConfidence: number     // Initial confidence
  currentConfidence: number    // Adjusted confidence
  age: number                  // Days since created
}

function adjustRelationshipWeight(rel: Relationship): number {
  const health = getRelationshipHealth(rel)

  // Strengthen frequently-used relationships
  if (health.traversalCount > 100) {
    return Math.min(rel.weight + 0.1, 1.0)
  }

  // Weaken never-used old relationships
  if (health.traversalCount === 0 && health.age > 90) {
    return Math.max(rel.weight - 0.2, 0.1)
  }

  // Decay unused relationships over time
  const decayFactor = Math.exp(-health.age / 180)  // 180-day half-life
  return rel.weight * (0.7 + 0.3 * decayFactor)
}
```
::

---

## Gap Detection

::pattern{name="missing-documentation" severity="medium" frequency="weekly"}
**Pattern**: Code exists but no documentation

```typescript
async function detectDocumentationGaps(): Promise<Gap[]> {
  const gaps = []

  // Scan codebase for undocumented components
  const codeCoverage = await analyzeCodeCoverage()

  for (const component of codeCoverage.undocumented) {
    const importance = assessDocumentationNeed(component)

    gaps.push({
      type: 'missing-documentation',
      subject: component.path,
      severity: importance,
      reason: `Used by ${component.dependents.length} components but not documented`,
      suggestedAction: `Create documentation for ${component.name}`
    })
  }

  return gaps
}
```
::

::pattern{name="undefined-concepts" severity="medium" frequency="on-write"}
**Pattern**: Documents reference concepts that aren't defined

```typescript
async function detectUndefinedConcepts(doc: Document): Promise<Gap[]> {
  const gaps = []

  const referencedConcepts = await extractReferencedConcepts(doc)

  for (const concept of referencedConcepts) {
    const definition = await findConceptDefinition(concept)

    if (!definition) {
      gaps.push({
        type: 'undefined-concept',
        subject: concept,
        referencedIn: doc.id,
        severity: 'medium',
        suggestedAction: `Define concept: ${concept}`
      })
    }
  }

  return gaps
}
```
::

---

## Maintenance Schedule

::implementation{component="maintenance-scheduler"}

**Daily Tasks** (fast checks):
```typescript
async function dailyMaintenance() {
  await checkCodeReferenceRot()
  await detectNewContradictions()
  await updateRelationshipWeights()

  // Generate daily health report
  await generateHealthReport({
    brokenLinks: brokenLinksCount,
    newContradictions: contradictionsCount,
    relationshipsAdjusted: adjustedCount
  })
}
```

**Weekly Tasks** (deeper analysis):
```typescript
async function weeklyMaintenance() {
  const report = await semanticMaintenanceService.detectStaleness()
  await suggestCleanupActions(report)
  await findSemanticOrphans()
  await detectUndefinedConcepts()

  // Generate weekly maintenance suggestions
  await generateMaintenanceSuggestions(report)
}
```

**Monthly Tasks** (comprehensive review):
```typescript
async function monthlyMaintenance() {
  await detectRedundancy()
  await detectGaps()
  await recomputeSemanticClusters()
  await optimizeRelationshipGraph()
  await validateLifecycleStates()

  // Generate monthly health report
  await generateComprehensiveHealthReport()
}
```
::

---

## Continuity Cortex Integration

::implementation{component="continuity-cortex"}
The Continuity Cortex monitors file operations and triggers maintenance

**On Write**:
```typescript
async function onDocumentWrite(doc: Document) {
  // Detect supersession patterns
  const supersession = await detectSupersession(doc)
  if (supersession) {
    await suggestLifecycleUpdates(supersession.affectedDocs)
  }

  // Detect contradictions
  const contradictions = await detectContradictions(doc)
  if (contradictions.length > 0) {
    await notifyConflicts(contradictions)
  }

  // Check for new gaps
  const gaps = await detectUndefinedConcepts(doc)
  if (gaps.length > 0) {
    await suggestGapFilling(gaps)
  }
}
```

**Background Process**:
```typescript
async function continuousEnrichment() {
  // Re-enrich old documents with new patterns
  const unenriched = await findUnenrichedDocuments()

  for (const doc of unenriched) {
    const relationships = await inferImplicitRelationships(doc)
    const lifecycle = await detectLifecycle(doc)
    const structure = await extractSemanticBlocks(doc)

    await updateDocument(doc.id, {
      relationships,
      lifecycle,
      structure,
      enrichedAt: Date.now()
    })
  }
}
```
::

---

## Auto-Fix vs Manual Review

::decision{id="maintenance-automation-boundaries" status="architectural-principle"}
**Decision**: Automate low-risk fixes, flag high-risk issues for human review

**Auto-Fix Criteria**:
- High confidence (>0.95)
- Low risk (easily reversible)
- Clear resolution path
- Examples: line number updates, orphan linking, relationship weight adjustments

**Manual Review Criteria**:
- Medium/low confidence (<0.95)
- High risk (affects meaning)
- Ambiguous resolution
- Examples: contradictions, lifecycle changes, content deletion

**Implementation**:
```typescript
async function applyMaintenanceSuggestion(suggestion: MaintenanceSuggestion) {
  if (suggestion.confidence > 0.95 && suggestion.risk === 'low') {
    await autoFix(suggestion)
    await logAutoFix(suggestion)
  } else {
    await flagForReview(suggestion)
    await notifyMaintainers(suggestion)
  }
}
```
::

---

## Health Metrics

::monitoring{component="health-dashboard"}
**Key Metrics**:

1. **Link Health**: % of links that resolve correctly
2. **Semantic Coherence**: Average coherence of linked documents
3. **Contradiction Rate**: Contradictions per 100 documents
4. **Orphan Rate**: % of documents with <2 links
5. **Staleness Score**: Weighted average of staleness indicators
6. **Gap Coverage**: % of concepts with definitions
7. **Lifecycle Accuracy**: % of documents with correct lifecycle state

**Health Score Formula**:
```typescript
function computeHealthScore(metrics: HealthMetrics): number {
  return (
    metrics.linkHealth * 0.25 +
    metrics.semanticCoherence * 0.20 +
    (1 - metrics.contradictionRate) * 0.20 +
    (1 - metrics.orphanRate) * 0.15 +
    (1 - metrics.stalenessScore) * 0.10 +
    metrics.gapCoverage * 0.05 +
    metrics.lifecycleAccuracy * 0.05
  )
}
```

**Target**: Health score > 0.85
::

---

## Related Documents

- [[write-time-enrichment]] - Initial semantic enrichment during ingestion
- [[attention-gravity-problem]] - Why maintenance matters for navigation
- [[semantic-pipeline-stages]] - Where maintenance fits in the pipeline
- [[projection-based-compression]] - Maintaining projection consistency

---

*Document created: 2025-10-28*
*Last updated: 2025-10-28*
*Lifecycle: current*
