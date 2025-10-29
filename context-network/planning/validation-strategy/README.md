# CorticAI Validation Strategy

**Status**: Planning
**Created**: 2025-10-28
**Related**: [[../../research/wiki-architecture-analysis]], [[../../architecture/semantic-processing/]]

---

## Overview

CorticAI's semantic processing architecture will be validated using real-world knowledge graphs (TV Tropes and Wikipedia datasets) rather than just self-hosting on CorticAI's own context network.

::principle{id="real-world-validation" importance="high"}
**Principle**: Test with established, large-scale knowledge graphs to validate architectural claims

**Why Not Just Toy Data**:
- Real-world scale (70K-6.7M articles)
- Real-world complexity (inconsistent structure, sparse/dense linking)
- Ground truth available (TV Tropes' explicit projections)
- Negative examples (Wikipedia's sparse linking)
- Performance validation (can't fake query speed at 6M articles)
::

---

## Validation Approach

### Three-Tier Strategy

**Tier 1: Self-Hosting** (Ongoing)
- Use CorticAI to manage CorticAI's own context network
- Test: Does it prevent its own attention gravity?
- Scale: ~500 documents
- **Primary Value**: Dogfooding, immediate feedback

**Tier 2: TV Tropes Dataset** (Positive Validation)
- Test: Can CorticAI replicate successful patterns?
- Scale: ~70,000 pages, ~2M links
- **Primary Value**: Validates projection model, multiple access paths

**Tier 3: Wikipedia Dataset** (Improvement Validation)
- Test: Can CorticAI improve weaknesses?
- Scale: ~6.7M articles (English), variable link density
- **Primary Value**: Validates relationship inference, attention management

---

## What Each Dataset Tests

### TV Tropes Validates

**Architectural Patterns** (Positive Validation):
1. ✅ **Projection Generation**: Can we generate YMMV/Trivia views from Main/ content?
2. ✅ **Multiple Access Paths**: Genre/Creator/Trope indexes → Q&A multiple phrasings
3. ✅ **Namespace as Lifecycle**: Main/=current, Trivia/=supplementary
4. ✅ **Dense Linking Performance**: 70K pages, 2M links, fast queries
5. ✅ **Bidirectional Consistency**: Can we maintain SUPERSEDES/SUPERSEDED_BY relationships?

**See**: [[tvtropes-dataset-tests.md]] for detailed test specifications

### Wikipedia Validates

**Improvement Opportunities** (Negative Validation):
1. ✅ **Relationship Inference**: Can we find missing obvious links?
2. ✅ **Summary Standardization**: Can we generate consistent projections?
3. ✅ **Lifecycle Detection**: Can we parse history sections and assign states?
4. ✅ **Attention Rebalancing**: Can lifecycle metadata prevent over-referenced article dominance?
5. ✅ **Scalability**: Can we handle 6.7M articles with write-time enrichment?

**See**: [[wikipedia-dataset-tests.md]] for detailed test specifications

---

## Test Categories

### 1. Functionality Tests (Does It Work?)

**Relationship Inference**:
- Can CorticAI infer missing Wikipedia links?
- Accuracy: Precision/recall vs ground truth

**Projection Generation**:
- Can CorticAI generate TV Tropes-style projections?
- Quality: Semantic similarity to human-created projections

**Q&A Generation**:
- Can CorticAI create access paths matching index coverage?
- Coverage: % of queries answerable via Q&A

**Lifecycle Detection**:
- Can CorticAI assign lifecycle states from content signals?
- Accuracy: % correct classifications

### 2. Performance Tests (Is It Fast?)

**Ingestion Time**:
- Write-time enrichment cost per document
- Target: <30s per document at scale

**Query Latency**:
- P50, P95, P99 response times
- Target: P95 <100ms

**Storage Efficiency**:
- Enriched storage size vs original
- Target: <3x original size

**Scalability**:
- Performance degradation with dataset size
- Target: Sub-linear degradation

### 3. Quality Tests (Is It Accurate?)

**Attention Gravity Mitigation**:
- Do lifecycle-aware searches find correct docs first?
- Target: >90% precision for "current X" queries

**Vocabulary Bridging**:
- Can colloquial queries find technical content?
- Target: >80% recall improvement vs baseline

**Supersession Chain Accuracy**:
- Are inferred relationships correct?
- Target: >85% precision on manual review

---

## Success Criteria

### Minimum Viable Validation (MVP)

1. **TV Tropes Projection Test**: Generate YMMV projection with >0.7 semantic similarity to actual
2. **Wikipedia Link Inference**: Recover 60%+ of removed links with 70%+ precision
3. **Performance Baseline**: P95 query latency <200ms on 100K articles
4. **Q&A Coverage**: 50%+ of test queries answerable via generated Q&A

### Target Goals

1. **TV Tropes**: >0.8 semantic similarity on all projection types
2. **Wikipedia**: >75% link recovery with >80% precision
3. **Performance**: P95 <100ms on 1M articles
4. **Q&A Coverage**: >70% of test queries

### Stretch Goals

1. **TV Tropes**: Generate novel projections (not in original dataset)
2. **Wikipedia**: Find links editors should have added but didn't
3. **Performance**: P95 <50ms on full 6.7M Wikipedia
4. **Q&A Coverage**: >85% with better answers than direct article match

---

## Test Execution Plan

### Phase 1: Dataset Preparation (Weeks 1-2)
- Download TV Tropes and Wikipedia dumps
- Parse and convert to CorticAI format
- Create test subsets (10K, 100K, 1M articles)
- Establish ground truth baselines

**Deliverable**: Prepared datasets, baseline metrics

### Phase 2: Core Capability Tests (Weeks 3-6)
- Run TV Tropes projection generation tests
- Run Wikipedia link inference tests
- Run Q&A generation tests
- Run lifecycle detection tests

**Deliverable**: Functionality validation report

### Phase 3: Performance Testing (Weeks 7-8)
- Measure ingestion time at scale
- Measure query latency across dataset sizes
- Measure storage requirements
- Identify performance bottlenecks

**Deliverable**: Performance benchmark report

### Phase 4: Quality Analysis (Weeks 9-10)
- Manual review of generated projections
- Precision/recall analysis of inferred links
- User study: Are Q&A answers better than direct matches?
- Attention gravity test: Do lifecycle searches work?

**Deliverable**: Quality assessment report

### Phase 5: Iteration (Weeks 11-12)
- Address identified issues
- Re-run failed tests
- Optimize performance bottlenecks
- Document lessons learned

**Deliverable**: Final validation report, architectural refinements

---

## Test Infrastructure

### Required Components

1. **Dataset Loaders**:
   - TV Tropes parser (HTML → CorticAI format)
   - Wikipedia dump parser (XML → CorticAI format)

2. **Ingestion Pipeline**:
   - Semantic block extraction
   - Relationship inference
   - Q&A generation
   - Lifecycle detection

3. **Query Engine**:
   - Literal-first search implementation
   - Lifecycle-aware filtering
   - Projection generation

4. **Evaluation Framework**:
   - Precision/recall calculators
   - Latency measurement
   - Storage analysis
   - Manual review tooling

### Test Data Management

**Subsets for Different Tests**:
```
datasets/
├── tvtropes/
│   ├── sample-10k/        # Quick iteration
│   ├── full-70k/          # Complete validation
│   └── ground-truth/      # Known-good projections
│
├── wikipedia/
│   ├── sample-10k/        # Quick iteration
│   ├── subset-100k/       # Moderate scale
│   ├── subset-1m/         # Large scale
│   └── full-6.7m/         # Ultimate test
│
└── test-queries/
    ├── technical.txt      # Technical vocabulary
    ├── colloquial.txt     # Common phrasings
    └── edge-cases.txt     # Difficult queries
```

---

## Reporting

### Per-Test Reports

Each test produces structured report:
```markdown
# Test: Link Inference Quality

## Setup
- Dataset: Wikipedia 100K subset
- Removed: 20% of links (20K links)
- Method: Random sampling, stratified by article popularity

## Results
- Links inferred: 18,500
- Correct: 14,200
- Precision: 76.8%
- Recall: 71.0%
- F1: 73.8%

## Analysis
- High precision on technical articles (85%)
- Lower precision on opinion/subjective content (60%)
- Missed rare relationships (low co-occurrence)

## Recommendations
- Improve opinion content handling
- Add co-occurrence threshold tuning
- Consider hybrid explicit+inferred approach
```

### Final Validation Report

Comprehensive report with:
- Executive summary (pass/fail, key findings)
- Per-test results with analysis
- Performance benchmarks
- Quality assessments
- Architectural recommendations
- Known limitations
- Future work

---

## Risk Mitigation

### Identified Risks

1. **Dataset Size Risk**: Full Wikipedia may be too large for initial testing
   - **Mitigation**: Incremental testing with 10K → 100K → 1M → 6.7M

2. **Ground Truth Quality**: Wikipedia's sparse links may not be "correct" baseline
   - **Mitigation**: Manual review of sample, expert validation

3. **Performance Bottlenecks**: Write-time enrichment may be too slow
   - **Mitigation**: Profile early, optimize before scale testing

4. **Overfitting Risk**: Optimizing for Wikipedia may harm general applicability
   - **Mitigation**: Test on TV Tropes + self-hosting simultaneously

---

## Related Documents

- [[../../research/wiki-architecture-analysis]] - Architectural analysis of TV Tropes & Wikipedia
- [[tvtropes-dataset-tests.md]] - Detailed TV Tropes test specifications
- [[wikipedia-dataset-tests.md]] - Detailed Wikipedia test specifications
- [[benchmark-metrics.md]] - Performance and quality metrics definitions
- [[dataset-preparation.md]] - How to acquire and prepare datasets

---

*Document created: 2025-10-28*
*Status: Planning*
*Next: Create detailed test specifications per dataset*
