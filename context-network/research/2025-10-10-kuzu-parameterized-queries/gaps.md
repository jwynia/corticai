# Open Questions: Kuzu Parameterized Query Research

## Classification
- **Domain:** Research/Meta
- **Stability:** Dynamic (evolves as questions are answered)
- **Abstraction:** Conceptual
- **Confidence:** Speculative (questions, not findings)

---

## Identified Knowledge Gaps

### 1. Performance Impact of Validated Literals vs Parameters

**Why it matters:** Need to quantify the cost of not being able to parameterize path depths

**What we found:**
- Theory suggests parameters should be faster (plan reuse)
- No benchmarks found comparing parameterized vs validated literal approaches
- Anecdotal evidence suggests difference is negligible for path queries

**What's missing:**
- Quantitative performance comparison
- Memory usage analysis (plan caching impact)
- Scalability testing (10, 100, 1000 different depths)

**Suggested research:**
- Benchmark suite comparing:
  - Same query, different parameter values (pure parameterization)
  - Same query, different literal values (validated literal approach)
  - Measure: execution time, memory usage, plan generation overhead
- Test with various graph sizes (1K, 10K, 100K, 1M nodes)
- Analyze Kuzu query plan caching behavior

**Priority:** LOW (current implementation performs well)

**Estimated effort:** 1-2 days (setup benchmarks, run tests, analyze results)

---

### 2. Future of Structural Parameterization in Graph Databases

**Why it matters:** Could eliminate need for validated literal workarounds

**What we found:**
- openCypher standard excludes structural parameterization by design
- Kuzu maintainers stated no plans to deviate from standard
- Neo4j Cypher 5.26+ added dynamic labels/types (different feature)
- Emerging GQL standard (ISO/IEC 39075) is successor to openCypher

**What's missing:**
- Will GQL standard include structural parameterization?
- Are there alternative approaches being considered?
- How do other graph databases (ArangoDB, TigerGraph) handle this?
- Would procedural extensions (APOC-like) be added to Kuzu?

**Suggested research:**
- Monitor GQL standard development (ISO/IEC 39075)
- Survey other graph databases' approaches
- Follow Kuzu roadmap and feature requests
- Check for academic papers on graph query optimization

**Priority:** MEDIUM (impacts long-term architecture decisions)

**Estimated effort:** Ongoing (quarterly review, 2-3 hours per quarter)

---

### 3. Security Implications of Large Parameter Sets

**Why it matters:** Need to understand resource exhaustion vectors

**What we found:**
- Parameter validation includes size limits (1MB for strings)
- No documented limits on parameter count
- No information on memory usage per parameter
- No guidance on batching large operations

**What's missing:**
- Maximum safe parameter count
- Memory overhead per parameter
- Best practices for very large batch operations
- Resource exhaustion attack vectors

**Suggested research:**
- Test with increasingly large parameter sets (10, 100, 1K, 10K params)
- Monitor memory usage and performance degradation
- Test batch insert with varying batch sizes
- Document recommended limits based on findings

**Priority:** MEDIUM (impacts batch operation design)

**Estimated effort:** 1 day (stress testing and analysis)

---

### 4. Cross-Database Query Pattern Portability

**Why it matters:** May need to migrate between graph databases

**What we found:**
- Kuzu follows openCypher standard
- Neo4j has additional features (dynamic labels in 5.26+)
- Amazon Neptune has openCypher support with limitations
- Other databases (ArangoDB, TigerGraph) use different query languages

**What's missing:**
- Comprehensive comparison of parameterization across databases
- Migration paths if switching databases
- Common subset of portable patterns
- Database-specific optimizations worth using

**Suggested research:**
- Create compatibility matrix for major graph databases
- Document portability concerns for each pattern
- Identify "lowest common denominator" safe patterns
- Test same queries across multiple databases

**Priority:** LOW (not planning to switch databases)

**Estimated effort:** 2-3 days (multi-database testing)

---

### 5. Query Monitoring and Anomaly Detection

**Why it matters:** Need to detect suspicious query patterns in production

**What we found:**
- Basic query execution monitoring implemented
- Suspicious pattern detection in prototype stage
- No baseline for "normal" query behavior
- No automated alerting system

**What's missing:**
- What constitutes an anomalous query?
- Machine learning for query pattern detection?
- Integration with security information and event management (SIEM)?
- False positive rate and tuning strategies

**Suggested research:**
- Collect baseline query patterns in production
- Define anomaly detection rules (statistical + rule-based)
- Evaluate ML approaches (if query volume sufficient)
- Design alerting strategy (what to alert on, to whom)

**Priority:** HIGH (production security concern)

**Estimated effort:** 1-2 weeks (system design and implementation)

---

### 6. Parameter Binding in Transactions

**Why it matters:** Need to understand transaction safety with parameters

**What we found:**
- Kuzu auto-commits by default
- Parameters work in single queries
- No documentation on parameter behavior in multi-query transactions

**What's missing:**
- Can parameters be shared across transaction statements?
- Does PreparedStatement span transactions?
- Performance implications of transactions with parameters
- Best practices for transactional batches

**Suggested research:**
- Test parameterization in explicit transactions
- Document parameter scope within transactions
- Benchmark transaction + parameter overhead
- Create transaction-safe query patterns

**Priority:** MEDIUM (affects batch operation strategy)

**Estimated effort:** 1 day (testing and documentation)

---

### 7. Edge Type Filtering in Variable-Length Paths

**Why it matters:** Current implementation filters in post-processing (inefficient)

**What we found:**
- Edge type filtering documented as tech debt (KuzuSecureQueryBuilder.ts:117)
- Kuzu 0.6.1 limitation, unclear if resolved in 0.11.2
- Current workaround: fetch all paths, filter client-side
- Performance impact unknown

**What's missing:**
- Does Kuzu 0.11.2 support native edge type filtering?
- Syntax for filtering: `-[r:TYPE1|TYPE2*1..3]-` or `-[r*1..3 {type IN ['TYPE1', 'TYPE2']}]-`?
- Performance comparison: client-side vs server-side filtering
- When does client-side filtering become prohibitive?

**Suggested research:**
- Test latest Kuzu syntax for edge type filtering in variable-length paths
- Benchmark client-side vs server-side filtering
- Determine threshold for client-side approach (graph size, path length)
- Update implementation if native support exists

**Priority:** MEDIUM (performance optimization opportunity)

**Estimated effort:** 4-6 hours (testing and potential refactoring)

---

## Conflicting Information

### 1. Parameter Support in Kuzu 0.6.1 vs 0.11.2

**Topic:** Exact capabilities difference between versions

**Viewpoint A - Discovery record 2025-09-18:**
- Kuzu 0.6.1 has significant limitations
- Array parameters not supported
- Variable-length paths not supported

**Viewpoint B - Current implementation:**
- Kuzu 0.11.2 fully supports variable-length paths
- Array parameters work in WHERE clauses
- Most limitations resolved

**Unable to resolve because:**
- No comprehensive changelog between versions
- Some features undocumented
- Need to test each specific feature

**Impact on implementation:**
- Assume 0.11.2 capabilities for new code
- Document specific version requirements
- Test thoroughly before relying on features

---

### 2. Best Practice for Path Depth Validation

**Topic:** Optimal approach for validating path depths

**Viewpoint A - Security-first:**
- Very strict validation (depth 1-10 only)
- Fail fast on any unusual values
- Conservative limits prevent performance issues

**Viewpoint B - Flexibility-first:**
- Reasonable validation (depth 1-50)
- Allow power users to go deeper if needed
- Performance limits can be enforced separately

**Unable to resolve because:**
- No empirical data on performance degradation by depth
- Use case requirements vary
- Trade-off between security and usability

**Impact on implementation:**
- Current: depth 1-50 (middle ground)
- Configurable limits considered for future
- Monitor actual usage to adjust

---

### 3. Query Plan Caching Behavior

**Topic:** How Kuzu caches and reuses query plans

**Evidence for caching:**
- PreparedStatement concept implies plan reuse
- Performance best practices mention plan optimization

**Evidence against:**
- No explicit documentation of caching behavior
- Unknown if plans cached across connections
- Unclear how long plans are retained

**Unable to resolve because:**
- Internal implementation details not documented
- Would require source code analysis or Kuzu team input
- Behavior may vary by version

**Impact on implementation:**
- Assume PreparedStatements provide plan reuse
- Don't rely on cross-connection plan sharing
- Use PreparedStatement pattern for frequently-executed queries

---

## Emerging Areas

### 1. AI-Powered Query Generation

**Why it seems significant:**
- LLMs can generate Cypher queries from natural language
- CVE-2024-8309 showed risks of AI-generated queries
- Growing use of LangChain, LlamaIndex with graph databases

**Current state:**
- LLMs prone to generating concatenated queries (insecure)
- Need for frameworks that enforce parameterization
- Prompt injection risks in graph query context

**Early indicators noticed:**
- LangChain added security warnings
- Emerging tools for safe AI query generation
- Research on constraining LLM outputs

**Potential implications:**
- May need AI-safe query builder patterns
- Prompt injection mitigation strategies
- Validation of LLM-generated queries

**Monitoring approach:**
- Track LangChain/LlamaIndex security updates
- Watch for graph database + LLM security research
- Consider AI-safe wrapper if using LLMs for queries

---

### 2. Graph Database Standardization (GQL)

**Why it seems significant:**
- ISO/IEC 39075 (GQL) is international standard for graph queries
- Successor to openCypher (which is vendor-neutral)
- Could introduce new parameterization features
- May affect long-term Kuzu roadmap

**Current state:**
- GQL standard in development
- Based on openCypher and other graph languages
- Some vendors (Neo4j, others) participating

**Early indicators noticed:**
- Kuzu designed with standards compliance in mind
- openCypher community active in GQL development
- Growing industry consensus on graph query syntax

**Potential implications:**
- Future Kuzu versions may adopt GQL
- Query patterns may need updates
- New security considerations in GQL

**Monitoring approach:**
- Watch ISO/IEC 39075 development
- Follow Kuzu roadmap for GQL adoption plans
- Review GQL security guidance when available

---

### 3. Graph Database Performance Optimization

**Why it seems significant:**
- Kuzu emphasizes performance (columnar storage, vectorization)
- Query optimization techniques evolving rapidly
- New algorithms for graph traversal

**Current state:**
- Variable-length path performance improving
- SHORTEST algorithms optimized
- GDS (Graph Data Science) functions expanding

**Early indicators noticed:**
- Kuzu 0.11.0 release focused on performance
- Academic research on graph query optimization
- Vendor competition driving innovation

**Potential implications:**
- May enable deeper traversals without performance hit
- Could change optimal query patterns
- New features may offer parameterization alternatives

**Monitoring approach:**
- Follow Kuzu performance blogs and releases
- Benchmark queries after major version upgrades
- Consider performance profiling for critical paths

---

## Future Research Recommendations

### Priority Order

**1. Query Monitoring and Anomaly Detection** - HIGH
- **Rationale:** Production security requirement
- **Timeline:** Next sprint
- **Effort:** 1-2 weeks

**2. Edge Type Filtering Investigation** - MEDIUM
- **Rationale:** Performance optimization opportunity
- **Timeline:** Next quarter
- **Effort:** 4-6 hours

**3. Parameter Set Size Limits** - MEDIUM
- **Rationale:** Affects batch operation design
- **Timeline:** Before scaling to large datasets
- **Effort:** 1 day

**4. Transaction Parameter Behavior** - MEDIUM
- **Rationale:** Informs batch processing strategy
- **Timeline:** Before implementing complex workflows
- **Effort:** 1 day

**5. GQL Standard Monitoring** - LOW (ongoing)
- **Rationale:** Long-term planning
- **Timeline:** Quarterly reviews
- **Effort:** 2-3 hours per quarter

**6. Performance Benchmarking** - LOW
- **Rationale:** Current performance acceptable
- **Timeline:** Annual review
- **Effort:** 1-2 days

**7. Cross-Database Portability** - LOW
- **Rationale:** Not planning to switch databases
- **Timeline:** If migration considered
- **Effort:** 2-3 days

---

## Research Methodology Improvements

### For Next Time

**Better queries to try:**
- "Kuzu 0.11.2 edge type filtering variable-length path syntax"
- "Kuzu PreparedStatement performance benchmarks"
- "Graph database parameter injection real-world exploits"
- "GQL ISO 39075 parameterization specification"

**Additional sources to check:**
- Kuzu Discord/Slack community (if exists)
- Academic papers: "graph database security", "Cypher injection"
- Security conference talks: DEF CON, Black Hat (graph database tracks)
- Kuzu performance blog series
- openCypher working group meeting notes

**Different approaches:**
- Contact Kuzu maintainers directly for clarification
- Set up test environment with multiple graph databases
- Create reproducible benchmark suite
- Establish baseline monitoring in production first
- Participate in openCypher/GQL community discussions

---

## Questions for Stakeholders

### For Security Team
1. What query patterns should trigger security alerts?
2. What is acceptable false positive rate for anomaly detection?
3. Should we implement rate limiting on graph queries?
4. What audit trail requirements exist for graph operations?

### For Performance Team
1. What are acceptable query execution time limits?
2. At what scale do we need to revisit query patterns?
3. Should we implement query result caching?
4. What monitoring metrics are most valuable?

### For Product Team
1. What depth of graph traversal do users actually need?
2. Are there use cases requiring dynamic edge type filtering?
3. Should we expose graph query capabilities to end users?
4. What query patterns are most common in production?

---

## Unanswered Technical Questions

### Kuzu-Specific

1. **What is the exact memory overhead per parameter?**
   - Need for capacity planning
   - Affects batch operation design

2. **How long are PreparedStatements cached?**
   - Connection lifetime? Process lifetime?
   - Implications for connection pooling strategy

3. **Does Kuzu support query hints or optimization directives?**
   - Could affect query patterns
   - May offer performance tuning options

4. **What is the limit on query string length?**
   - May affect complex dynamic queries
   - Relevant for query builder design

### OpenCypher Standard

1. **Will GQL include structural parameterization?**
   - Impacts long-term architecture
   - Would eliminate validated literal workarounds

2. **Are there proposals for procedural query extensions?**
   - Similar to Neo4j APOC
   - Could enable new query patterns

3. **What security guidance exists in openCypher spec?**
   - May have missed relevant sections
   - Worth re-reviewing specification

### Security

1. **What are known Cypher injection vectors beyond SQL injection analogues?**
   - Graph-specific attack patterns
   - Need comprehensive threat model

2. **How do other graph databases handle query result size limits?**
   - Prevent resource exhaustion
   - May inform our approach

3. **What are best practices for graph database RBAC?**
   - Complement parameterization
   - Defense in depth strategy

---

## Follow-Up Research Triggers

### Trigger 1: Kuzu Major Version Upgrade
**When:** Upgrading to Kuzu 1.0 or any major version
**Research:**
- Re-validate all parameterization behaviors
- Check for new security features
- Review breaking changes
- Update benchmark suite

### Trigger 2: Performance Degradation
**When:** Query execution time exceeds SLA
**Research:**
- Profile query performance
- Investigate query plan changes
- Consider query optimization
- Re-evaluate validated literal vs parameter trade-offs

### Trigger 3: Security Incident
**When:** Injection attempt detected or successful
**Research:**
- Immediate: Analyze attack vector
- Short-term: Enhance detection and prevention
- Long-term: Audit all query patterns
- Update security tests and documentation

### Trigger 4: Scale Increase
**When:** Graph size increases 10x or query volume increases significantly
**Research:**
- Re-run performance benchmarks
- Evaluate query pattern scalability
- Consider query optimization strategies
- Review resource limits and validation rules

### Trigger 5: GQL Standard Finalization
**When:** ISO/IEC 39075 (GQL) officially published
**Research:**
- Compare GQL vs openCypher parameterization
- Evaluate Kuzu adoption timeline
- Plan migration path if breaking changes
- Update patterns to align with standard

---

## Metadata

- **Document Created:** 2025-10-10
- **Last Updated:** 2025-10-10
- **Review Frequency:** Quarterly
- **Next Review:** 2026-01-10
- **Status:** Open Questions (living document)
- **Confidence in Gaps:** High (well-identified, clearly scoped)
