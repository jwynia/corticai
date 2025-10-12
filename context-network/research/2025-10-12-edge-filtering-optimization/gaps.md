# Open Questions: Edge Filtering Optimization

## Classification
- **Domain:** Research/Meta
- **Stability:** Dynamic
- **Abstraction:** Conceptual
- **Confidence:** Speculative

## Identified Knowledge Gaps

### 1. Kuzu Version 0.11.2 Existence and Features
- **Why it matters:** CorticAI planning documents reference version 0.11.2, but research found 0.11.0 and 0.11.3
- **What we found:** Release notes for 0.11.0 and references to 0.11.3, but no specific 0.11.2 documentation
- **What's missing:** Confirmation that 0.11.2 exists or clarification of correct target version
- **Suggested research:**
  - Check `package.json` or `package-lock.json` in CorticAI project
  - Review Kuzu GitHub releases page for complete version list
  - Determine if 0.11.2 was an intermediate version or if project should target 0.11.0/0.11.3
- **Impact on implementation:**
  - **LOW** - Features appear consistent across 0.11.x series based on research
  - If 0.11.2 doesn't exist, use 0.11.0 or upgrade to latest (likely 0.11.3 or newer)
- **Estimated research time:** 15 minutes

### 2. Quantitative Performance Metrics for CorticAI Use Case
- **Why it matters:** Need realistic performance expectations for sprint planning and success metrics
- **What we found:**
  - General claims: "2-10x improvement" from query-level filtering
  - Kuzu 0.7.0 blog: 40x improvement on specific recursive query workload
  - Theory strongly supports query-level filtering benefits
- **What's missing:**
  - Actual benchmarks with CorticAI graph size and topology
  - Relationship between edge type cardinality and performance
  - Memory usage improvements (not just execution time)
  - Performance at different graph sizes (100 nodes vs 10K nodes vs 100K nodes)
- **Suggested research:**
  1. Profile current CorticAI traverse() performance with production-like data
  2. Implement prototype with query-level filtering
  3. Measure before/after across multiple test scenarios
  4. Document results in performance benchmark tests
- **Impact on implementation:**
  - **LOW** - Implementation straightforward regardless of exact metrics
  - **HIGH** - For justifying prioritization and measuring success
- **Estimated research time:** 2-3 hours (hands-on testing)

### 3. Edge Type Cardinality Optimization Threshold
- **Why it matters:** Understanding if there's a practical limit to number of edge types in a single filter
- **What we found:**
  - Syntax supports pipe-separated list: `-[:TYPE1|TYPE2|TYPE3|...]->
`
  - No documented limits in Kuzu
- **What's missing:**
  - Performance characteristics with 2 vs 10 vs 50 edge types in filter
  - Database internal optimization strategies (are types checked sequentially or via bitmap/hash?)
  - Best practices for very heterogeneous graphs with many edge types
- **Suggested research:**
  - Review Kuzu source code for multi-type filter implementation
  - Benchmark queries with varying numbers of edge types
  - Consult Kuzu community/developers if needed
- **Impact on implementation:**
  - **VERY LOW** - CorticAI likely has small number of edge types (<10)
  - Implementation identical regardless of cardinality
- **Estimated research time:** 1-2 hours (if needed)

### 4. Kuzu WHERE Predicate Limitations in Practice
- **Why it matters:** Understanding exact boundaries of supported predicates helps avoid implementation pitfalls
- **What we found:**
  - Kuzu supports predicates on relationships OR nodes with AND conjunctions
  - Currently limited - no OR across relationship/node predicates
  - Example: `WHERE r.weight > 0.5 AND n.active = true` ✅
  - Example: `WHERE r.weight > 0.5 OR n.priority = 'high'` ❌
- **What's missing:**
  - Complete list of supported predicate types
  - Error messages when unsupported predicates are used
  - Workarounds for complex predicates (multiple MATCH clauses? post-processing?)
  - Roadmap for expanding predicate support
- **Suggested research:**
  - Test various predicate patterns with actual Kuzu database
  - Review Kuzu GitHub issues for predicate-related discussions
  - Document workarounds if complex predicates needed
- **Impact on implementation:**
  - **LOW for Phase 1** - Simple multi-type filtering doesn't use WHERE predicates
  - **MEDIUM for future** - If advanced filtering needed later
- **Estimated research time:** 1 hour (if complex predicates needed)

### 5. Kuzu Query Plan Analysis and EXPLAIN Support
- **Why it matters:** Verifying that query-level filtering is actually optimized by database
- **What we found:**
  - Graph database best practices mention using EXPLAIN to verify query plans
  - Join order hints documented for Kuzu
- **What's missing:**
  - Kuzu EXPLAIN syntax and output format
  - How to interpret Kuzu query plans
  - Whether edge type filters are pushed down to scan operators
  - Query plan visualization tools for Kuzu
- **Suggested research:**
  - Test `EXPLAIN` command with Kuzu
  - Document query plan analysis approach
  - Compare plans with and without edge type filters
- **Impact on implementation:**
  - **LOW** - Implementation works regardless of EXPLAIN availability
  - **MEDIUM** - For performance validation and debugging
- **Estimated research time:** 30 minutes - 1 hour

## Conflicting Information

### No Major Conflicts Identified
Research sources were generally consistent. Key findings:
- **Standard Cypher Syntax:** All sources agree on `-[:TYPE1|TYPE2*]->` syntax
- **Query-Level Filtering Benefits:** Universal agreement on performance advantages
- **Kuzu Capabilities:** Consistent information across Kuzu-related sources

### Minor Ambiguities

#### 1. Default Relationship Type in Kuzu
- **Observation:** CorticAI code uses `:Relationship` as default type
- **Question:** Is this required by Kuzu or project convention?
- **Unable to confirm:** Whether Kuzu allows type-less variable-length patterns
- **Impact:** Very low - using explicit type is best practice anyway
- **Resolution:** Keep explicit `:Relationship` type, document as best practice

#### 2. ACYCLIC vs TRAIL vs WALK Semantics
- **Source mentions:** Kuzu supports these path uniqueness semantics
- **Missing details:** Exact syntax, performance implications, default behavior
- **Impact:** Low for immediate implementation - standard paths sufficient
- **Resolution:** Note for future research if sophisticated path semantics needed

## Emerging Areas

### 1. Integration with Graph Neural Networks (GNNs)
- **Observation:** Kuzu release notes mention graph learning applications
- **Relevance:** If CorticAI expands to ML-based graph analysis
- **Current Priority:** Low - focus on core functionality first
- **Future Potential:** Edge filtering could be input for GNN feature extraction

### 2. Full-Text and Vector Search in Graphs
- **Observation:** Kuzu 0.11.x series added vector search and full-text search capabilities
- **Relevance:** Could enhance CorticAI's context retrieval
- **Current Priority:** Low - not related to edge filtering optimization
- **Future Potential:** Combine semantic search with graph traversal

### 3. Temporal Graph Features
- **Observation:** Many use cases mentioned temporal filtering (timestamps on relationships)
- **Relevance:** CorticAI may want to track context evolution over time
- **Current Priority:** Medium - could be valuable future feature
- **Implementation Path:** Use Kuzu WHERE predicates on relationship timestamp properties

### 4. Multi-Database Federation
- **Observation:** Some sources discussed querying across multiple graph databases
- **Relevance:** Unknown if CorticAI needs this capability
- **Current Priority:** Very low - single embedded database sufficient for now
- **Future Potential:** Scaling strategy for very large context networks

## Future Research Recommendations

### Priority Order

#### High Priority (Before Implementation)
1. **Verify Kuzu Version** - Determine exact version installed in CorticAI (15 min)
   - Check package.json
   - Confirm version matches research assumptions

2. **Prototype Testing** - Implement and test query-level filtering (1-2 hours)
   - Create simple test case with Kuzu database
   - Verify syntax works as expected
   - Measure basic performance metrics

#### Medium Priority (During Implementation)
3. **Performance Benchmarking** - Measure actual improvement (2-3 hours)
   - Create realistic test graph
   - Profile before/after implementation
   - Document results for team knowledge

4. **Edge Case Testing** - Verify corner cases (1 hour)
   - Empty edge type array handling
   - Single type vs multi-type performance
   - Very long paths (depth > 10)
   - Graphs with no matching paths

#### Low Priority (Post-Implementation)
5. **Advanced Filtering Exploration** - If needed (2-4 hours)
   - Test Kuzu WHERE predicates
   - Document supported predicate patterns
   - Create examples for future reference

6. **Query Plan Analysis** - Performance validation (1 hour)
   - Learn Kuzu EXPLAIN syntax
   - Verify filter pushdown optimization
   - Document query plan interpretation

7. **Kuzu Version Upgrade Path** - Strategic planning (1-2 hours)
   - Review latest Kuzu release notes
   - Identify new features relevant to CorticAI
   - Plan upgrade timeline if beneficial

### Long-Term Research Topics

#### Graph Query Optimization Patterns
- Systematic study of graph query optimization techniques
- Application to CorticAI's specific query patterns
- Documentation of optimization playbook

#### Kuzu Database Internals
- Understanding recursive join algorithms
- Learning about Kuzu's columnar storage format
- Knowledge of query optimization heuristics

#### Graph Database Comparison
- Benchmark Kuzu vs Neo4j vs other embedded graph databases
- Feature comparison for CorticAI use cases
- Decision framework for database selection

## Research Methodology Improvements

### For Next Research Session

**Better Queries:**
- Include exact version numbers in searches: "Kuzu 0.11.2 edge filtering"
- Search GitHub directly: "site:github.com/kuzudb/kuzu edge type filter"
- Look for examples: "Kuzu variable length path example"

**Additional Sources:**
- Kuzu GitHub Discussions - community Q&A
- Kuzu Discord/Slack (if available) - real-time developer support
- Academic papers citing Kuzu - theoretical foundations
- Conference presentations - implementation insights

**Different Approaches:**
- Hands-on testing instead of documentation-only research
- Direct source code analysis of Kuzu query planner
- Create minimal reproduction cases for edge cases
- Engage with Kuzu community for clarification

## Metadata
- **Created:** 2025-10-12
- **Last Updated:** 2025-10-12
- **Gap Analysis Quality:** High - systematic review of missing information
- **Priority Assessment:** Based on immediate CorticAI implementation needs
- **Estimated Total Follow-Up Research:** 4-8 hours (if all gaps addressed)
