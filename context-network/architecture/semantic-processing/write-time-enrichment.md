# Write-Time Semantic Enrichment

**Status**: Architectural Pattern
**Domain**: Information Retrieval, Semantic Processing
**Related**: [[semantic-pipeline-stages]], [[projection-based-compression]], [[attention-gravity-problem]]

---

## Overview

Write-time enrichment performs expensive semantic work once during document ingestion, creating multiple access paths and derived structures. This frontloads computational cost but dramatically improves query-time performance and accuracy.

::principle{id="write-time-investment" importance="critical"}
**Principle**: Pay the semantic cost once at write-time, reap benefits on every query

**Trade-off**:
- Write: 10-30 seconds per document (acceptable, happens once)
- Read: <100ms per query (required for UX)

**Insight**: Better to spend 30 seconds enriching a document that will be queried 1000+ times than to spend 100ms per query doing the same work repeatedly.
::

---

## Core Enrichment Operations

### 1. Q&A Generation

::pattern{name="qa-generation" benefit="vocabulary-bridging" importance="high"}
**Pattern**: Generate questions that document content answers, using varied vocabulary

**Problem Solved**: Vocabulary mismatch between author's technical terms and user's colloquial searches

**Example**:
```markdown
# Original Document
Always return cleanup functions from useEffect to prevent subscription leaks.
The cleanup function runs when the component unmounts or before the effect re-runs.

# Generated Q&A (multiple access paths)
::qa{id="qa-001" generated="yes" confidence="0.95"}
**Q**: How do I prevent memory leaks in React hooks?
**A**: Return cleanup functions from useEffect. The cleanup runs on unmount or before re-run.
**Source**: [React Best Practices](./react-patterns.md#L45)
**Lifecycle**: current
::

::qa{id="qa-002" generated="yes" confidence="0.92"}
**Q**: What causes memory leaks in useEffect?
**A**: Not cleaning up subscriptions. Always return a cleanup function.
**Source**: [React Best Practices](./react-patterns.md#L52)
**Lifecycle**: current
::

::qa{id="qa-003" generated="yes" confidence="0.90"}
**Q**: Why should I return a function from useEffect?
**A**: To clean up resources when component unmounts or effect re-runs.
**Source**: [React Best Practices](./react-patterns.md#L45)
**Lifecycle**: current
::
```

**Key Benefits**:
- Original: "cleanup functions", "subscription leaks" (technical)
- Generated Q&A: "memory leaks", "prevent", "why return function" (colloquial)
- User searching "make my React app faster" can find useEffect optimization

**Implementation**:
```typescript
async function generateQA(document: Document, block: SemanticBlock): Promise<QADocument[]> {
  const questions = await llm.generate({
    context: document.content,
    block: block.content,
    instructions: `
      Generate 3-5 questions that this content answers.

      Requirements:
      - Use varied vocabulary (technical + colloquial)
      - Include different question types (what/why/how/when)
      - Use phrasings users actually search with
      - Match the lifecycle of source content
      - Cite exact source location

      Examples:
      - Technical: "How do I implement memoization?"
      - Colloquial: "How do I make my React components faster?"
      - Specific: "When should I use React.memo?"
      - Broad: "What are React performance optimization techniques?"
    `
  })

  return questions.map(q => ({
    question: q.question,
    answer: q.answer,
    questionType: q.type,  // what/why/how/when
    source: {
      document: document.id,
      block: block.id,
      lines: block.lines
    },
    lifecycle: block.lifecycle,  // Inherit from source
    generated: true,
    confidence: q.confidence
  }))
}
```
::

---

### 2. Relationship Inference

::pattern{name="relationship-inference" benefit="knowledge-graph-building"}
**Pattern**: Automatically detect and create relationships between documents

**Types of Inferred Relationships**:

#### Supersession Relationships
```typescript
// Detect "we switched from X to Y" patterns
async function inferSupersession(document: Document): Promise<Relationship[]> {
  const relationships = []

  // Pattern matching
  const supersessionPatterns = [
    /(?:switched|migrated|moved) from (\w+) to (\w+)/gi,
    /(\w+) (?:is|was) superseded by (\w+)/gi,
    /(?:replacing|deprecating) (\w+) (?:with|in favor of) (\w+)/gi
  ]

  for (const pattern of supersessionPatterns) {
    const matches = document.content.matchAll(pattern)

    for (const match of matches) {
      const [_, old, new_] = match

      // Find documents about old approach
      const oldDocs = await findDocumentsAbout(old)

      if (oldDocs.length > 0) {
        relationships.push({
          type: 'SUPERSEDES',
          source: document.id,
          target: oldDocs[0].id,
          confidence: 0.85,
          evidence: match[0],  // The matching text
          inferredBy: 'supersession-pattern-matching'
        })

        // Suggest lifecycle update
        await suggestLifecycleUpdate(oldDocs[0], 'deprecated', {
          supersededBy: document.id,
          reason: match[0]
        })
      }
    }
  }

  return relationships
}
```

#### Temporal Relationships
```typescript
// Documents created around same time discussing same topic
async function inferTemporalContext(document: Document): Promise<Relationship[]> {
  const contextWindow = 7 * 24 * 60 * 60 * 1000  // 7 days

  const relatedDocs = await storage
    .where({ date: { $gte: document.date - contextWindow, $lte: document.date + contextWindow } })
    .where({ topics: { $overlap: document.topics } })
    .limit(10)

  return relatedDocs.map(related => ({
    type: 'TEMPORAL_CONTEXT',
    source: document.id,
    target: related.id,
    confidence: computeTopicOverlap(document, related),
    timeProximity: Math.abs(document.date - related.date),
    inferredBy: 'temporal-clustering'
  }))
}
```

#### Causal Relationships
```typescript
// "Because of X, we decided Y" patterns
async function inferCausalRelationships(document: Document): Promise<Relationship[]> {
  const causalPatterns = [
    /because (?:of )?(.+?), we (?:decided|chose) to (.+)/gi,
    /due to (.+?), (?:the team|we) (.+)/gi,
    /(?:motivated by|driven by) (.+?), (?:we|the decision) (.+)/gi
  ]

  // Extract cause → effect pairs
  // Link to documents about the cause
  // Create MOTIVATES relationship
}
```

#### Topic Clustering
```typescript
// Group semantically similar documents
async function inferTopicRelationships(document: Document): Promise<Relationship[]> {
  // Use embeddings to find semantically similar
  const similar = await findSemanticallyRelated(document, {
    threshold: 0.75,
    limit: 10
  })

  return similar.map(related => ({
    type: 'RELATED_TO',
    source: document.id,
    target: related.id,
    confidence: related.similarityScore,
    semanticDistance: 1 - related.similarityScore,
    sharedTopics: findSharedTopics(document, related),
    inferredBy: 'embedding-similarity'
  }))
}
```
::

---

### 3. Lifecycle Detection

::pattern{name="lifecycle-detection" benefit="automatic-attention-management"}
**Pattern**: Automatically infer document lifecycle state from content signals

**Lifecycle States**:
- **current**: Active, recommended approach
- **stable**: Established, not changing
- **evolving**: Subject to refinement
- **deprecated**: Superseded but still in use
- **historical**: Superseded, kept for context
- **archived**: No longer relevant

**Detection Signals**:
```typescript
async function detectLifecycle(document: Document): Promise<LifecycleState> {
  const signals = {
    // Current indicators
    current: [
      /as of \d{4}-\d{2}-\d{2}/i,           // Recent date
      /current approach/i,
      /recommended/i,
      /use this/i
    ],

    // Deprecated indicators
    deprecated: [
      /deprecated/i,
      /superseded by/i,
      /no longer recommended/i,
      /avoid using/i,
      /replaced by/i
    ],

    // Historical indicators
    historical: [
      /originally planned/i,
      /previous approach/i,
      /for historical context/i,
      /lessons learned/i
    ],

    // Evolving indicators
    evolving: [
      /work in progress/i,
      /under development/i,
      /subject to change/i,
      /experimental/i
    ]
  }

  // Score each lifecycle state
  const scores = {}
  for (const [state, patterns] of Object.entries(signals)) {
    scores[state] = patterns.filter(pattern =>
      document.content.match(pattern)
    ).length
  }

  // Additional signals
  if (document.date > Date.now() - (30 * 24 * 60 * 60 * 1000)) {
    scores.current += 0.5  // Recent documents more likely current
  }

  if (document.referencedBy.length === 0 && document.age > 180) {
    scores.archived += 0.5  // Unreferenced old docs likely archived
  }

  // Return highest-scoring state
  const lifecycle = Object.entries(scores)
    .sort(([,a], [,b]) => b - a)[0][0]

  return {
    state: lifecycle,
    confidence: scores[lifecycle] / Math.max(...Object.values(scores)),
    signals: patterns.filter(p => document.content.match(p)),
    suggestManualReview: scores[lifecycle] < 2  // Low signal count
  }
}
```
::

---

### 4. Metadata Extraction

::pattern{name="metadata-extraction" benefit="structured-filtering"}
**Pattern**: Extract structured metadata from unstructured content

**Extracted Metadata**:
```typescript
interface ExtractedMetadata {
  // Topic classification
  topics: string[]              // ["database", "performance", "graph-storage"]
  primaryTopic: string          // "database-migration"

  // Participants
  authors: string[]             // Mentioned contributors
  reviewers: string[]           // People who approved/reviewed

  // Technical details
  technologies: string[]        // ["SurrealDB", "Kuzu", "TypeScript"]
  components: string[]          // ["storage-layer", "query-engine"]

  // Decision markers
  hasDecisions: boolean
  decisionConfidence: number    // 0-1, how definitive
  decisionType: string          // "architectural" | "implementation" | "tooling"

  // Evidence markers
  hasEvidence: boolean
  evidenceTypes: string[]       // ["benchmark", "analysis", "user-feedback"]

  // Temporal markers
  effectiveDate?: Date          // When decision takes effect
  expirationDate?: Date         // Time-limited decisions

  // Attention markers
  significance: number          // 0-1, how important
  urgency: number              // 0-1, how time-sensitive

  // Quality markers
  completeness: number         // 0-1, how thorough
  clarityScore: number         // 0-1, how understandable
}

async function extractMetadata(document: Document): Promise<ExtractedMetadata> {
  // Use combination of:
  // - Pattern matching for technical terms
  // - Named entity recognition for people/technologies
  // - LLM for semantic understanding
  // - Heuristics for quality scoring
}
```
::

---

### 5. Semantic Block Extraction

::pattern{name="semantic-block-extraction" benefit="projection-ready"}
**Pattern**: Extract semantic blocks from unstructured text, even without explicit tags

**Challenge**: Most documents aren't written with semantic tags. Need to infer structure.

**Approach**:
```typescript
async function extractSemanticBlocks(document: Document): Promise<SemanticBlock[]> {
  const blocks = []

  // 1. Pattern-based extraction (high confidence)
  blocks.push(...extractByPatterns(document))

  // 2. LLM-based extraction (medium confidence)
  blocks.push(...extractByLLM(document))

  // 3. Structure-based extraction (low confidence)
  blocks.push(...extractByMarkdownStructure(document))

  return blocks
}

function extractByPatterns(document: Document): SemanticBlock[] {
  const blocks = []

  // Decision patterns
  const decisionPatterns = [
    /(?:we decided|decision was made) to (.+)/gi,
    /(?:chose|selected|picked) (\w+) (?:because|due to) (.+)/gi
  ]

  for (const pattern of decisionPatterns) {
    const matches = document.content.matchAll(pattern)
    for (const match of matches) {
      blocks.push({
        type: 'decision',
        content: match[0],
        attributes: {
          decision: match[1],
          rationale: match[2] || null
        },
        confidence: 0.9,
        extractedBy: 'pattern-matching'
      })
    }
  }

  // Quote patterns
  const quotePattern = /"(.+?)" - ([\w\s]+)/g
  const quotes = document.content.matchAll(quotePattern)
  for (const quote of quotes) {
    blocks.push({
      type: 'quote',
      content: quote[1],
      attributes: {
        speaker: quote[2].trim()
      },
      confidence: 0.95,
      extractedBy: 'pattern-matching'
    })
  }

  // Timeline patterns
  const datePattern = /(\d{4}-\d{2}-\d{2}):?\s*(.+)/g
  const events = document.content.matchAll(datePattern)
  for (const event of events) {
    blocks.push({
      type: 'timeline',
      content: event[2],
      attributes: {
        date: event[1]
      },
      confidence: 0.85,
      extractedBy: 'pattern-matching'
    })
  }

  return blocks
}

async function extractByLLM(document: Document): Promise<SemanticBlock[]> {
  const analysis = await llm.analyze({
    content: document.content,
    task: `
      Extract semantic blocks from this document:
      - decisions (what was decided, rationale)
      - outcomes (what was built, current state)
      - quotes (who said what)
      - themes (recurring patterns)
      - timeline events (significant moments)
      - evidence (benchmarks, measurements)

      Return structured JSON for each block.
    `
  })

  return analysis.blocks.map(block => ({
    ...block,
    confidence: 0.75,  // LLM-extracted has lower confidence
    extractedBy: 'llm-analysis',
    requiresReview: true  // Flag for human validation
  }))
}
```
::

---

### 6. Contradiction Detection

::pattern{name="contradiction-detection" benefit="knowledge-coherence"}
**Pattern**: Detect when new document contradicts existing knowledge

**Example**:
```typescript
async function detectContradictions(newDocument: Document): Promise<Contradiction[]> {
  const contradictions = []

  // Extract claims from new document
  const newClaims = await extractClaims(newDocument)

  // Find documents on same topic
  const relatedDocs = await findRelatedDocuments(newDocument)

  for (const relatedDoc of relatedDocs) {
    const existingClaims = await extractClaims(relatedDoc)

    for (const newClaim of newClaims) {
      for (const existingClaim of existingClaims) {
        // Semantic contradiction detection
        const conflict = await detectConflict(newClaim, existingClaim)

        if (conflict) {
          contradictions.push({
            newClaim,
            existingClaim,
            newDoc: newDocument,
            existingDoc: relatedDoc,
            conflictType: conflict.type,
            resolution: await suggestResolution(
              newDocument,
              relatedDoc,
              newClaim,
              existingClaim
            )
          })
        }
      }
    }
  }

  return contradictions
}

async function suggestResolution(
  newDoc: Document,
  existingDoc: Document,
  newClaim: Claim,
  existingClaim: Claim
): Promise<ResolutionSuggestion> {

  // Factors for automatic resolution
  const factors = {
    recency: newDoc.date > existingDoc.date,
    authority: compareLifecycle(newDoc.lifecycle, existingDoc.lifecycle),
    evidence: (newClaim.evidence?.length || 0) > (existingClaim.evidence?.length || 0),
    confidence: newClaim.confidence > existingClaim.confidence
  }

  if (factors.recency && factors.authority) {
    return {
      action: 'mark-existing-superseded',
      confidence: 0.9,
      reason: 'New document is more recent and has higher authority'
    }
  }

  if (!factors.recency && !factors.authority) {
    return {
      action: 'manual-review-required',
      confidence: 0.3,
      reason: 'Existing document has more authority, needs human judgment'
    }
  }

  return {
    action: 'flag-for-review',
    confidence: 0.5,
    reason: 'Mixed signals, recommend manual resolution'
  }
}
```
::

---

## The Complete Ingestion Pipeline

::implementation{component="semantic-ingestion-pipeline"}
**Full Workflow**:

```typescript
class SemanticIngestionPipeline {

  async ingest(document: Document): Promise<EnrichedDocument> {
    console.log(`Ingesting: ${document.path}`)

    // 1. Extract semantic structure (2-5s)
    const semanticBlocks = await this.extractSemanticBlocks(document)
    console.log(`- Extracted ${semanticBlocks.length} semantic blocks`)

    // 2. Infer metadata (1-2s)
    const metadata = await this.extractMetadata(document, semanticBlocks)
    console.log(`- Extracted metadata: ${metadata.topics.length} topics, ${metadata.technologies.length} technologies`)

    // 3. Detect lifecycle (0.5s)
    const lifecycle = await this.detectLifecycle(document, semanticBlocks)
    console.log(`- Detected lifecycle: ${lifecycle.state} (confidence: ${lifecycle.confidence})`)

    // 4. Generate Q&A (5-10s)
    const qaDocuments = await this.generateQA(document, semanticBlocks)
    console.log(`- Generated ${qaDocuments.length} Q&A pairs`)

    // 5. Infer relationships (2-3s)
    const relationships = await this.inferRelationships(document, semanticBlocks)
    console.log(`- Inferred ${relationships.length} relationships`)

    // 6. Detect contradictions (2-3s)
    const contradictions = await this.detectContradictions(document, semanticBlocks)
    if (contradictions.length > 0) {
      console.warn(`- ⚠️ Found ${contradictions.length} potential contradictions`)
    }

    // 7. Compute embeddings (1-2s)
    const embeddings = await this.computeEmbeddings(document, semanticBlocks)
    console.log(`- Computed embeddings for document and ${semanticBlocks.length} blocks`)

    // 8. Store everything
    const enrichedDoc = {
      original: document,
      semanticBlocks,
      metadata,
      lifecycle,
      qaDocuments,
      relationships,
      contradictions,
      embeddings,
      enrichedAt: Date.now(),
      enrichmentVersion: '1.0'
    }

    await this.store(enrichedDoc)

    // 9. Trigger downstream processes
    await this.continuityortex.onDocumentIngested(enrichedDoc)

    console.log(`✓ Ingestion complete (${Date.now() - startTime}ms)`)

    return enrichedDoc
  }
}
```

**Performance Profile**:
- Total time: 15-30 seconds per document
- Amortized over 1000s of queries
- Can be parallelized for batch imports
::

---

## Q&A Generation Best Practices

::best-practice{category="qa-generation"}
**Guidelines for High-Quality Q&A**:

1. **Generate Multiple Question Variations**:
   - Formal: "What is the current database strategy?"
   - Colloquial: "What database should I use?"
   - Specific: "Should I use Kuzu or SurrealDB?"
   - Historical: "Why did we move away from Kuzu?"

2. **Match User Intent Patterns**:
   - What-questions: factual information
   - Why-questions: rationale and reasoning
   - How-questions: implementation guidance
   - When-questions: timing and lifecycle
   - Should-questions: recommendations

3. **Preserve Lifecycle Context**:
   ```markdown
   ::qa{lifecycle="deprecated"}
   **Q**: Should I use Kuzu for graph storage?
   **A**: No, Kuzu was superseded by SurrealDB on 2025-10-13 due to performance issues.
          Current approach: [SurrealDB Migration](...)
   ::
   ```

4. **Include Proper Citations**:
   - Exact source location (file:line)
   - Link to full context
   - Evidence/benchmarks
   - Related decisions

5. **Confidence Scoring**:
   - High confidence (0.9+): Direct factual Q&A
   - Medium confidence (0.7-0.9): Inferred Q&A
   - Low confidence (<0.7): Flag for review

6. **Update on Source Changes**:
   - Q&A inherits lifecycle from source
   - Regenerate when source updated
   - Archive Q&A when source deprecated
::

---

## Storage Integration

::implementation{component="enriched-storage"}
**Dual-Role Storage for Enriched Documents**:

**Primary Storage (Graph DB)**:
```typescript
// Store semantic blocks as typed nodes
CREATE (doc:Document { id: 'team-sync-2025-10-13' })
CREATE (decision:Decision {
  id: 'switch-to-surrealdb',
  content: 'Use SurrealDB instead of Kuzu',
  date: '2025-10-13',
  lifecycle: 'current'
})
CREATE (qa:QADocument {
  id: 'qa-001',
  question: 'What database should I use?',
  answer: 'Use SurrealDB...',
  generated: true
})

// Relationships
CREATE (doc)-[:CONTAINS]->(decision)
CREATE (qa)-[:ANSWERS_FROM]->(decision)
CREATE (qa)-[:CITES]->(doc)
CREATE (decision)-[:SUPERSEDES]->(old_decision)
```

**Semantic Storage (Analytics DB)**:
```sql
-- Q&A optimized for search
CREATE TABLE qa_documents (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source_doc TEXT NOT NULL,
  source_block TEXT NOT NULL,
  lifecycle TEXT NOT NULL,
  generated BOOLEAN DEFAULT false,
  confidence REAL,
  created_at TIMESTAMP
);

CREATE INDEX idx_qa_question_fts ON qa_documents USING gin(to_tsvector('english', question));
CREATE INDEX idx_qa_lifecycle ON qa_documents(lifecycle) WHERE lifecycle IN ('current', 'stable');

-- Optimized query for current Q&A
CREATE VIEW current_qa AS
SELECT * FROM qa_documents
WHERE lifecycle IN ('current', 'stable')
ORDER BY confidence DESC;
```
::

---

## Validation & Quality Control

::testing{component="enrichment-quality"}
**Quality Metrics**:

1. **Q&A Relevance**: Do generated questions actually match likely user queries?
2. **Relationship Accuracy**: Are inferred relationships correct?
3. **Lifecycle Detection**: Is automatic lifecycle classification accurate?
4. **Contradiction Detection**: Are real conflicts caught?
5. **Performance**: Is ingestion time acceptable?

**Validation Approach**:
```typescript
async function validateEnrichment(enriched: EnrichedDocument) {
  const validation = {
    qaQuality: await validateQAQuality(enriched.qaDocuments),
    relationshipAccuracy: await validateRelationships(enriched.relationships),
    lifecycleCorrectness: await validateLifecycle(enriched.lifecycle),
    contradictionRelevance: await validateContradictions(enriched.contradictions),
    performanceAcceptable: enriched.enrichmentTime < 30000  // 30s max
  }

  if (Object.values(validation).some(v => !v)) {
    // Flag for manual review
    await flagForReview(enriched, validation)
  }

  return validation
}
```
::

---

## Related Documents

- [[semantic-pipeline-stages]] - Where enrichment fits in the overall pipeline
- [[projection-based-compression]] - How enriched content enables projections
- [[semantic-maintenance]] - Continuous enrichment and health monitoring
- [[attention-gravity-problem]] - Why Q&A generation helps with discoverability

---

*Document created: 2025-10-28*
*Last updated: 2025-10-28*
*Lifecycle: current*
