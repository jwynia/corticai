# Research Index

## Purpose
Central index of all research conducted for the Pliers v3 project, organized by domain and date.

## Classification
- **Domain:** Research/Meta
- **Stability:** Dynamic
- **Abstraction:** Index
- **Confidence:** Established

## Active Research

### 2025-09-23: Hanko Authentication Platform Evaluation

**Topic:** Would Hanko (https://github.com/teamhanko/hanko) work with our architecture for handling authentication in the front-end and API?

**Status:** Complete

**Location:** `./hanko-authentication/`

**Key Files:**
- [Overview](./hanko-authentication/overview.md) - Executive summary and key findings
- [Architecture Comparison](./hanko-authentication/architecture-comparison.md) - Detailed technical comparison
- [Integration Analysis](./hanko-authentication/integration-analysis.md) - Integration patterns and approaches
- [Implementation Guide](./hanko-authentication/implementation.md) - Step-by-step implementation plan
- [Findings](./hanko-authentication/findings.md) - Detailed research findings
- [Gaps](./hanko-authentication/gaps.md) - Open questions and uncertainties

**Key Findings:**
1. ✅ Hanko is compatible with Pliers v3 architecture
2. ✅ JWT translation layer at API Gateway enables integration
3. ✅ Enhanced security through passkeys/WebAuthn
4. ⚠️ Custom claims require translation layer
5. ⚠️ Migration requires 3-6 month phased approach

**Recommendations:**
- **Recommended:** Implement Hanko with JWT translation pattern
- **Timeline:** 4-6 weeks for production implementation
- **Priority:** High - significant security and UX improvements

### 2025-09-23: React Form Builder Frameworks Research

**Topic:** Existing React form builder frameworks that create standards-based JSON form schemas for use in front-end applications

**Status:** Complete

**Location:** `./react-form-builders-json-schema/`

**Key Files:**
- [Overview](./react-form-builders-json-schema/overview.md) - Executive summary and framework landscape
- [Findings](./react-form-builders-json-schema/findings.md) - Detailed technical findings
- [Comparison](./react-form-builders-json-schema/comparison.md) - Comprehensive framework comparison matrix
- [Implementation](./react-form-builders-json-schema/implementation.md) - Integration patterns and code examples
- [Sources](./react-form-builders-json-schema/sources.md) - Research sources and methodology
- [Gaps](./react-form-builders-json-schema/gaps.md) - Open questions and future research needs

**Key Findings:**
1. ✅ RJSF (react-jsonschema-form) is the industry standard with full JSON Schema support
2. ✅ JSON Forms offers dual-schema approach for fine-grained control
3. ✅ Visual builders available (SurveyJS, Form.io, custom solutions)
4. ⚠️ Performance issues with complex schemas require optimization
5. ⚠️ OpenAPI integration requires transformation layer

**Recommendations:**
- **Primary:** Adopt RJSF as React rendering layer with Pliers schema bridge
- **Alternative:** JSON Forms for performance-critical applications
- **Timeline:** 6-8 weeks for full integration with optimization
- **Priority:** High - enables standards-based form generation

## Research Categories

### Authentication & Security
- [Hanko Authentication Platform](./hanko-authentication/overview.md) - 2025-09-23

### Frontend & UI Components
- [React Form Builder Frameworks](./react-form-builders-json-schema/overview.md) - 2025-09-23

### Infrastructure & Deployment
- (No research yet)

### Performance & Optimization
- (No research yet)

### Third-Party Integrations
- [Hanko Authentication Platform](./hanko-authentication/overview.md) - 2025-09-23

### Compliance & Regulations
- (No research yet)

## Research Methodology

All research follows the structured approach:
1. Define research questions
2. Check existing context network
3. Execute comprehensive searches
4. Analyze and synthesize findings
5. Document in structured format
6. Identify gaps and future research

## Research Quality Metrics

| Research | Completeness | Sources | Confidence | Actionable |
|----------|-------------|---------|------------|------------|
| Hanko Authentication | 95% | 10+ | High | Yes |
| React Form Builders | 82% | 50+ | High | Yes |

## Upcoming Research Topics

### Planned
- [ ] Vector database options for AI features
- [ ] Message queue comparison (RabbitMQ vs Kafka)
- [ ] CDN and edge deployment strategies
- [ ] Observability platform evaluation

### Suggested
- [ ] GraphQL federation for microservices
- [ ] Container orchestration beyond Kubernetes
- [ ] Serverless architecture patterns
- [ ] Real-time collaboration frameworks

## Research Request Process

To request new research:
1. Check this index for existing research
2. Define clear research questions
3. Specify timeline and priority
4. Add to "Upcoming Research Topics"

## Navigation
- **Foundation:** [[/foundation/]] - Core architecture and design
- **Backlog:** [[/backlog/]] - Development tasks and priorities
- **Decisions:** [[/decisions/]] - Architectural decisions
- **Discoveries:** [[/discoveries/]] - Project insights and findings

## Metadata
- **Created:** 2025-09-23
- **Last Updated:** 2025-09-23
- **Next Review:** Weekly