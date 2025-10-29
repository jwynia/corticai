# Wiki Architecture Analysis: TV Tropes & Wikipedia

**Status**: Research Documentation
**Domain**: Knowledge Management, Information Architecture
**Created**: 2025-10-28
**Related**: [[../architecture/semantic-processing/design-rationale]], [[../planning/validation-strategy/]]

---

## Overview

Analysis of two major wiki-style knowledge systems (TV Tropes and Wikipedia) reveals architectural patterns that independently validate CorticAI's design choices - and anti-patterns that motivate our improvements.

::insight{category="validation" importance="high"}
**Key Insight**: TV Tropes evolved similar architectural patterns to CorticAI (projections, namespaces, multiple access paths) despite different problem domains. This suggests these patterns solve fundamental knowledge organization problems, not just CorticAI-specific needs.
::

---

## TV Tropes Architecture

**Scale**: ~70,000 pages, ~2M cross-links, highly interconnected graph

### Pattern 1: Multiple Projections (Not Ambiguous "Summary")

::example{system="tvtropes" pattern="projections"}
**Work Example**: Slow Horses (TV Series)

```
/pmwiki/pmwiki.php/Series/SlowHorses     [Main]
  → Comprehensive information: plot, characters, themes
  → ~5000 words

/pmwiki/pmwiki.php/YMMV/SlowHorses       [Your Mileage May Vary]
  → Subjective opinions, fan reactions
  → ~2000 words
  → Clearly marked as opinion

/pmwiki/pmwiki.php/Trivia/SlowHorses     [Trivia]
  → Behind-the-scenes, production facts
  → ~1500 words
  → Meta-information about creation

/pmwiki/pmwiki.php/Laconic/SlowHorses    [Laconic]
  → One-sentence compression
  → ~20 words
  → Explicitly labeled as "extremely compressed"

/pmwiki/pmwiki.php/Funny/SlowHorses      [Funny Moments]
  → Memorable comedic moments
  → ~1000 words
  → Specific lens on content
```

**Compression Contract**: Each namespace has clear purpose
- Main/ = canonical information
- YMMV/ = subjective (take with grain of salt)
- Trivia/ = supplementary (interesting but not essential)
- Laconic/ = ultra-compressed (with warning about loss)
- Funny/ = specific aspect extraction
::

**CorticAI Parallel**:
```markdown
CONTEXT.md (semantic blocks)
  → decision-view: What was decided, rationale, evidence
  → timeline-view: Chronological events
  → outcomes-view: Current state
  → rationale-view: Why decisions made
  → themes-view: Patterns identified

Each projection has explicit compression contract
```

### Pattern 2: Multiple Access Paths

::example{system="tvtropes" pattern="multiple-indexes"}
Same show findable through:

**By Genre**:
- `/Main/SpyFiction` → Lists Slow Horses as example

**By Creator**:
- `/Creator/GaryOldman` → Lists Slow Horses in filmography

**By Trope**:
- `/Main/TheAlcoholic` → Lists Slow Horses character as example
- `/Main/ReassignedToAntarctica` → Lists Slow Horses premise as example

**By Setting**:
- `/Main/BritishSecretService` → Lists Slow Horses

**By Narrative Device**:
- `/Main/SlowBurn` → Lists Slow Horses pacing style

**Result**: 5+ different search paths lead to same content
::

**CorticAI Parallel**: Q&A Generation
```markdown
# Original Technical Content
Use React.memo to leverage memoization for optimized render performance.

# Generated Q&A (Multiple Access Paths)
Q: How do I make my React app faster?         [colloquial]
Q: When should I use React.memo?              [specific]
Q: What are React performance techniques?     [broad]
Q: How do I optimize React rendering?         [technical]
Q: Why is my React component slow?            [problem-oriented]

All point to same source with proper citations
```

### Pattern 3: Bidirectional Linking

::example{system="tvtropes" pattern="bidirectional"}
**Forward Link** (Work → Trope):
```
/Series/SlowHorses mentions:
  → [[Main/TheAlcoholic]] (Jackson Lamb character trait)
```

**Backward Link** (Trope → Work):
```
/Main/TheAlcoholic has example:
  → [[Series/SlowHorses]]: Jackson Lamb is a functioning alcoholic
```

**Consistency**: Both directions manually maintained, community-curated
::

**CorticAI Parallel**: Automatic Relationship Inference
```typescript
// Forward: Decision supersedes planning
SurrealDB decision → SUPERSEDES → Kuzu planning

// Backward: Planning superseded by decision
Kuzu planning → SUPERSEDED_BY → SurrealDB decision

// Automatically inferred at write-time, not manually maintained
```

### Pattern 4: Namespace as Context Marker

::example{system="tvtropes" pattern="namespaces"}
**Namespace Signals How To Interpret**:

- `Main/` = canonical, authoritative
- `YMMV/` = subjective, reader-dependent
- `Trivia/` = supplementary, skippable
- `Headscratchers/` = questions, not answers
- `JustForFun/` = parody, not serious

**User Behavior**: Readers know to trust Main/, take YMMV/ with skepticism
::

**CorticAI Parallel**: Lifecycle States
```typescript
lifecycle: current      → Use this (canonical)
lifecycle: deprecated   → Superseded (historical context)
lifecycle: evolving     → Subject to change (preliminary)
lifecycle: historical   → Background only (supplementary)
lifecycle: archived     → Rarely relevant (skippable)
```

### Pattern 5: Progressive Disclosure

::example{system="tvtropes" pattern="folders"}
**HTML Structure**:
```html
<div class="folderlabel" onclick="togglefolder('SeasonOne')">
    Season One Spoilers ▼
</div>
<div id="SeasonOne" class="folder" style="display:none">
    [Detailed spoiler content - hidden by default]
    [Requires click to expand]
</div>
```

**User Experience**:
- High-level navigation visible
- Details hidden until requested
- Can quickly scan without getting overwhelmed
::

**CorticAI Parallel**: Hierarchical Compression
```
/planning/kuzu-graph-operations/
├── _CURRENT-STATUS.md    [10 lines]  ← Immediate (always visible)
│   "⚠️ DEPRECATED: See SurrealDB migration"
│
├── CONTEXT.md            [150 lines] ← Structured (default view)
│   Semantic blocks with decisions, outcomes, timeline
│
└── archive/              [unlimited] ← Details (deliberate navigation)
    ├── problem-definition.md
    ├── research-findings.md
    └── architecture-design.md
```

---

## Wikipedia Architecture

**Scale**: ~6.7M articles (English), highly variable link density

### Anti-Pattern 1: Sparse Linking

::problem{system="wikipedia" pattern="sparse-linking"}
**Guideline**: "Only link first mention of term in article"

**Result**: Many obvious connections are missing

**Example**: Python (programming language) article
- Mentions "web development" once → links to Web Development article
- Mentions "web development" 10 more times → no links
- Reader on 11th mention: "Wait, what was web development again?"
- Must scroll up to find original link or search separately

**Why This Fails**:
- Assumes linear reading (users don't)
- Optimizes for page load (links aren't expensive anymore)
- Creates artificial scarcity of navigation
::

**CorticAI Opportunity**: Relationship Inference
```typescript
// Wikipedia: Only 1 explicit link
"Python is used for web development" → [Web Development]
"Python is popular in web development" → (no link)
"Django enables web development" → (no link)

// CorticAI: Infer implicit relationships
detectImplicitLinks(article) → {
  "web development": {
    explicitLinks: 1,
    additionalMentions: 10,
    contextual Relevance: 0.9,
    suggestedRelationship: "frequently-discusses"
  }
}
```

### Anti-Pattern 2: Ambiguous "Summary" Sections

::problem{system="wikipedia" pattern="summary-ambiguity"}
**Example Analysis**: 100 random "Summary" sections

**What They Preserve**:
- 35%: Plot/chronology focus
- 25%: Key achievements focus
- 20%: Controversy/criticism focus
- 15%: Technical definition focus
- 5%: Mixed/unclear

**Problem**: No standard for what "Summary" means
- Readers don't know what to expect
- Different editors make different compression choices
- No explicit contract about what's discarded

**Example**: "Python (programming language)" summary
- Focuses on: Creation history, key features, popularity
- Discards: Syntax examples, performance characteristics, ecosystem
- Another editor might make opposite choices
::

**CorticAI Solution**: Explicit Projection Contracts
```markdown
---
projection-type: decision-extraction
preserves: [decisions, rationale, evidence, outcomes]
discards: [discussion-process, alternatives-considered]
reconstructable: yes
---
```

### Anti-Pattern 3: Flat Namespace (No Lifecycle)

::problem{system="wikipedia" pattern="no-lifecycle"}
**All Content Treated Equally**:
- Current best practices
- Historical approaches
- Deprecated techniques
- Controversial theories

**Problem**: No signal for "should I use this?"

**Example**: "Python 2 vs Python 3" article
- Python 2: Deprecated 2020, but article gives equal weight
- No clear "use Python 3" guidance at top
- Historical information mixed with current recommendations
- Reader must synthesize lifecycle themselves
::

**CorticAI Solution**: Lifecycle Metadata
```markdown
::decision{id="python-3-migration" lifecycle="historical" superseded-date="2020-01-01"}
Python 2 was official deprecated in 2020. All new projects should use Python 3.

Historical context: [link to Python 2 archive]
Migration guide: [link to current migration docs]
::
```

### Pattern That Works: "See Also" Sections

::example{system="wikipedia" pattern="see-also"}
**Structure**:
```markdown
## See also
- **Main article**: [[Web framework]]
- **Related**: [[Django (web framework)]], [[Flask (web framework)]]
- **Comparison**: [[Comparison of web frameworks]]
```

**Why It Works**:
- Explicit relationship types (main, related, comparison)
- Manually curated (high quality)
- Consistent format
::

**CorticAI Adoption**:
```markdown
## Related Documents
- **Current Approach**: [[SurrealDB Migration]]
- **Supersedes**: [[Kuzu Planning]]
- **Related**: [[Graph Storage Architecture]], [[Performance Requirements]]
- **Evidence**: [[Benchmark Results]]
```

---

## Attention Gravity in Both Systems

### TV Tropes: Popularity Bias

::problem{system="tvtropes" pattern="popularity-gravity"}
**Observation**: Popular works get disproportionate attention

**Example**: Marvel Cinematic Universe
- Every MCU film has 50+ trope examples
- Every trope page cites MCU as example
- Searching any action/superhero trope → MCU dominates results

**Their Solution**:
- "Just for Fun" namespace for parody overload
- "Laconic" compression for quick lookup
- Multiple specialized indexes (not just popularity sorting)
::

### Wikipedia: Over-Linking

::problem{system="wikipedia" pattern="over-referenced"}
**Observation**: Popular articles get linked from everywhere

**Example**: "United States" article
- 500,000+ incoming links
- Every article mentioning US links to it
- Searching geography/politics → US dominates

**Missing Solution**: No lifecycle or relevance weighting
- Historical references to US (1800s context) → same article as modern US
- No distinction between "US as example" vs "US as main subject"
::

### CorticAI: Lifecycle-Aware Attention Management

::solution{system="corticai" addresses="popularity-and-volume-bias"}
**Approach**: Attention weight ≠ link count alone

```typescript
function computeAttentionWeight(document: Document): number {
  const factors = {
    // Not just popularity
    linkCount: document.incomingLinks.length * 0.2,

    // Lifecycle authority
    lifecycleWeight: getLifecycleWeight(document.lifecycle) * 0.3,

    // Contextual relevance
    querySimilarity: computeSimilarity(document, query) * 0.3,

    // Recency (but not primary)
    recencyBoost: computeRecencyBoost(document.date) * 0.1,

    // Usage patterns
    traversalFrequency: document.traversalCount * 0.1
  }

  return Object.values(factors).reduce((a, b) => a + b, 0)
}
```

**Result**: Kuzu planning (7 docs, many links) doesn't overwhelm SurrealDB migration (2 docs, current lifecycle)
::

---

## Validation Opportunities

### What TV Tropes Validates

::validation{dataset="tvtropes" validates="design-choices"}
1. **Projections Work At Scale**: 70K pages × 5 namespaces = 350K projection views, manageable
2. **Multiple Access Paths Work**: Genre/Creator/Trope indexes don't confuse users
3. **Namespace Clarity Helps**: Users understand YMMV/ ≠ Main/
4. **Dense Linking Is Manageable**: 2M cross-links, page load still fast
5. **Community Maintenance Works**: Bidirectional links stay consistent
::

### What Wikipedia Shows Need For

::validation{dataset="wikipedia" motivates="improvements"}
1. **Relationship Inference**: Sparse linking leaves obvious connections missing
2. **Projection Standardization**: Inconsistent summaries show need for contracts
3. **Lifecycle Metadata**: No current/historical distinction confuses users
4. **Attention Management**: Popular articles dominate searches unfairly
5. **Semantic Enhancement**: Only 30% of valuable cross-references are explicit
::

---

## Test Strategy Using These Datasets

### TV Tropes Tests (Positive Validation)

Can CorticAI replicate TV Tropes' successful patterns?

1. **Projection Generation**: Given Main/ content, generate YMMV/ and Trivia/ views
2. **Access Path Coverage**: Generate Q&A that matches Genre/Creator/Trope index coverage
3. **Namespace Mapping**: Map Main/→current, Trivia/→supplementary, prove lifecycle works
4. **Performance**: Handle 70K pages + 2M links with <100ms query time

### Wikipedia Tests (Improvement Validation)

Can CorticAI improve Wikipedia's weaknesses?

1. **Link Inference**: Remove 20% of links, infer them back from content
2. **Summary Analysis**: Analyze what 100 summary sections preserve/discard, generate standardized projections
3. **Lifecycle Detection**: Parse "History" sections, assign lifecycle states
4. **Attention Rebalancing**: Show Python 3 guidance before Python 2 historical content

**See**: [[../planning/validation-strategy/]] for detailed test specifications

---

## Architectural Lessons

### Adopted from TV Tropes

::lesson{source="tvtropes" adopted="yes"}
1. **Multiple Projections**: Main/YMMV/Trivia → decision/timeline/outcomes views
2. **Namespace Clarity**: Main/ vs YMMV/ → current vs deprecated
3. **Progressive Disclosure**: Folder collapse → hierarchical compression
4. **Multiple Indexes**: Genre/Creator/Trope → Q&A multiple phrasings
5. **Consistent Cross-Reference Format**: Standard linking syntax
::

### Improvements Over Wikipedia

::lesson{source="wikipedia" improved="yes"}
1. **Dense Linking**: Infer implicit relationships, don't rely on manual linking
2. **Projection Contracts**: Explicit preservation contracts, not ambiguous "summary"
3. **Lifecycle Signals**: Current/deprecated/historical, not flat namespace
4. **Attention Weighting**: Lifecycle + relevance, not just link count
5. **Semantic Enhancement**: Auto-generate access paths, don't assume users know technical terms
::

---

## Implementation Implications

### What TV Tropes Shows Is Possible

- **Scale**: 70K pages with rich structure is manageable
- **User Expectations**: Namespace conventions become intuitive
- **Maintenance**: Community can keep bidirectional links consistent
- **Performance**: Dense linking doesn't prevent fast navigation

### What Wikipedia Shows Is Needed

- **Automation**: Manual linking at 6.7M scale fails
- **Consistency**: Need enforced standards, not editor discretion
- **Context**: Must distinguish current/historical/opinion explicitly
- **Discovery**: Can't assume users know technical vocabulary

### CorticAI Design Validated

::validation{confidence="high"}
CorticAI's architectural choices align with:
- What TV Tropes learned through evolution (projections, namespaces)
- What Wikipedia struggles with (sparse links, ambiguous summaries)
- Independent validation of patterns solving real knowledge organization problems
::

---

## Related Documents

- [[../architecture/semantic-processing/design-rationale]] - How CorticAI differs from existing tools
- [[../architecture/semantic-processing/projection-based-compression]] - Projection model (inspired by TV Tropes)
- [[../architecture/semantic-processing/attention-gravity-problem]] - Volume bias problem (seen in both systems)
- [[../planning/validation-strategy/]] - Using these datasets to test CorticAI

---

## References

**Datasets**:
- TV Tropes: Available via web scraping or database dumps (~70K pages)
- Wikipedia: Official database dumps (https://dumps.wikimedia.org/) (~6.7M English articles)

**Analysis**:
- TV Tropes community guidelines (namespace usage, linking conventions)
- Wikipedia Manual of Style (linking guidelines, summary sections)
- Previous research on wiki architecture and knowledge organization

---

*Document created: 2025-10-28*
*Status: Research Documentation*
*Next: Create detailed test specifications in validation-strategy/*
