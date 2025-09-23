# Planning & Architecture Mode

## 🚫 Implementation Restrictions

**THIS IS A PLANNING-ONLY COMMAND**

You are now in Planning & Architecture Mode for: $ARGUMENTS

In this mode, you MUST:
- ✅ Research and understand the problem space
- ✅ Document findings in the context network
- ✅ Design architecture and patterns
- ✅ Create task breakdowns
- ✅ Identify dependencies and risks

You MUST NOT:
- ❌ Write implementation code
- ❌ Create files outside context-network/
- ❌ Modify existing code
- ❌ Run build or deployment commands
- ❌ Make configuration changes

## Planning Process

### Phase 0: Navigation Hierarchy Check 🧭

**CRITICAL: Apply The Navigation Rule (from CLAUDE.md)**

Before creating ANY planning documents:
1. **Check Parent Context**: What existing planning hierarchy does this fit into?
2. **Validate Discoverability**: Can someone starting from `planning/index.md` find this?
3. **Establish Integration Path**: Where will this link into existing roadmap/backlog?
4. **Prevent Orphaning**: Will this create orphaned planning nodes?

**Navigation Checklist**:
- [ ] Identified parent planning documents (roadmap, backlog, etc.)
- [ ] Determined appropriate phase/milestone for this work
- [ ] Checked for existing related planning work
- [ ] Planned integration into existing hierarchy

### Phase 1: Problem Understanding 🔍

1. **Define the Problem**
   - What are we trying to solve?
   - Why does this matter?
   - Who are the stakeholders?
   - What are the success criteria?

2. **Explore the Current State**
   - Search existing codebase for related functionality
   - Check context network for prior decisions
   - Identify what already exists
   - Document current limitations

3. **Gather Requirements**
   - Functional requirements
   - Non-functional requirements (performance, security, etc.)
   - Constraints and boundaries
   - Assumptions to validate

### Phase 2: Research & Discovery 🔬

1. **Research Existing Solutions**
   - Industry patterns and best practices
   - Similar implementations in the codebase
   - External libraries or frameworks
   - Academic or theoretical foundations

2. **Technology Evaluation**
   - Available tools and technologies
   - Compatibility with existing stack
   - Learning curve and team expertise
   - Long-term maintenance implications

3. **Document Findings**
   ```
   context-network/research/$ARGUMENTS/
   ├── overview.md           # Problem and research summary
   ├── findings.md          # Detailed discoveries
   ├── alternatives.md      # Options considered
   └── recommendations.md   # Suggested approach
   ```

### Phase 3: Architecture Design 📐

1. **High-Level Design**
   - System boundaries and interfaces
   - Component relationships
   - Data flow diagrams
   - Sequence diagrams for key scenarios

2. **Detailed Design Decisions**
   - Create ADRs (Architecture Decision Records)
   - Document trade-offs
   - Specify design patterns to use
   - Define abstraction boundaries

3. **Integration Planning**
   - How this fits with existing architecture
   - API contracts and interfaces
   - Migration strategy if replacing existing functionality
   - Backward compatibility requirements

4. **Document Architecture**
   ```
   context-network/architecture/$ARGUMENTS/
   ├── overview.md          # High-level architecture
   ├── components.md        # Component descriptions
   ├── interactions.md      # How components interact
   ├── decisions/           # ADRs for key decisions
   └── diagrams/           # Visual representations
   ```

### Phase 4: Task Decomposition 📋

1. **Break Down Into Tasks**
   Each task should be:
   - **Independent**: Can be worked on in isolation
   - **Scoped**: Clear boundaries and deliverables
   - **Testable**: Defined success criteria
   - **Estimated**: Rough effort estimate (S/M/L/XL)

2. **Task Template (Groom-Ready Format)**
   ```markdown
   ## Task: [Specific, Actionable Title]

   ### One-liner
   [What this achieves in plain language - for groom summary]

   ### Complexity
   [Trivial/Small/Medium/Large - for groom classification]

   ### Context
   [Why this is needed - brief background]

   ### Scope
   - What this task includes
   - What this task excludes
   - Key files to modify: [List for groom details]

   ### Dependencies
   - Prerequisites: [What must be done first]
   - Blockers: [What could prevent completion]
   - Unblocks: [What this enables afterward]

   ### Acceptance Criteria (Test-Ready)
   - [ ] [Specific, testable criterion]
   - [ ] [Another criterion]
   - [ ] [Performance/security requirements]

   ### Implementation Guide
   1. [First concrete step]
   2. [Second step]
   3. [Validation step]

   ### Estimated Effort
   - Size: [Trivial/Small/Medium/Large]
   - Complexity: [Technical risk level]

   ### Grooming Notes
   - Watch out for: [Pitfalls or edge cases]
   - Related work: [Cross-references]
   - Parent context: [Planning hierarchy reference]
   ```

3. **Create Task List**
   ```
   context-network/planning/$ARGUMENTS/
   ├── task-breakdown.md    # All tasks with details
   ├── dependencies.md      # Task dependency graph
   └── implementation-order.md  # Suggested sequence
   ```

### Phase 5: Risk Assessment ⚠️

1. **Identify Risks**
   - Technical risks (complexity, unknowns)
   - Integration risks (breaking changes)
   - Performance risks (scalability issues)
   - Security risks (vulnerabilities)
   - Operational risks (deployment, monitoring)

2. **Risk Register**
   ```markdown
   ## Risk: [Risk Name]
   
   ### Description
   [What could go wrong]
   
   ### Probability
   [Low/Medium/High]
   
   ### Impact
   [Low/Medium/High]
   
   ### Mitigation
   - Preventive measures
   - Contingency plans
   
   ### Early Warning Signs
   - What to watch for
   ```

3. **Document Risks**
   ```
   context-network/planning/$ARGUMENTS/
   └── risk-assessment.md   # All identified risks
   ```

### Phase 6: Corner-Painting Prevention 🎨

Before finalizing the plan, check:

1. **Performance Implications**
   - Will this scale?
   - Resource consumption?
   - Bottlenecks identified?

2. **Security Considerations**
   - Attack surfaces?
   - Data protection?
   - Authentication/authorization?

3. **Testing Strategy**
   - How will we test this?
   - What can be automated?
   - Edge cases considered?

4. **Migration Planning**
   - How to roll out?
   - Rollback strategy?
   - Data migration needs?

5. **Alternative Approaches**
   - Have we considered other solutions?
   - Why is this approach best?
   - What are we trading off?

6. **Integration Points**
   - Effects on other systems?
   - API compatibility?
   - Breaking changes?

## Deliverables Checklist

### Required Documentation
- [ ] Problem definition in context network
- [ ] Research findings documented
- [ ] Architecture design with diagrams
- [ ] Task breakdown with estimates
- [ ] Dependency graph
- [ ] Risk assessment
- [ ] Implementation readiness checklist

### Architecture Artifacts
- [ ] High-level design document
- [ ] Component specifications
- [ ] Interface definitions
- [ ] Data models
- [ ] Architecture Decision Records (ADRs)

### Planning Artifacts
- [ ] Scoped task list
- [ ] Implementation order
- [ ] Resource requirements
- [ ] Timeline estimates
- [ ] Success metrics

## Implementation Readiness Checklist

Before any implementation begins, ensure:

### Understanding
- [ ] Problem is clearly defined
- [ ] Requirements are documented
- [ ] Constraints are identified
- [ ] Assumptions are validated

### Design
- [ ] Architecture is documented
- [ ] Interfaces are specified
- [ ] Data models are defined
- [ ] Design patterns are chosen

### Planning
- [ ] Tasks are broken down into groom-ready format
- [ ] Dependencies are mapped
- [ ] Risks are assessed
- [ ] Order is determined
- [ ] **Navigation hierarchy established**

### Preparation
- [ ] Team has necessary skills
- [ ] Tools are available
- [ ] Environment is ready
- [ ] Rollback plan exists

### Groom Integration
- [ ] Tasks formatted for `/groom` command processing
- [ ] Acceptance criteria defined for each task
- [ ] Complexity estimates provided (Trivial/Small/Medium/Large)
- [ ] Parent planning context clearly established

## Output Structure

All planning artifacts go in the context network:

```
context-network/
├── planning/
│   └── $ARGUMENTS/
│       ├── README.md              # Planning overview
│       ├── problem-definition.md  # What we're solving
│       ├── requirements.md        # What we need
│       ├── task-breakdown.md      # How we'll do it
│       ├── dependencies.md        # What depends on what
│       ├── risk-assessment.md     # What could go wrong
│       └── readiness-checklist.md # Are we ready?
├── architecture/
│   └── $ARGUMENTS/
│       ├── overview.md           # High-level design
│       ├── components.md         # Detailed components
│       └── decisions/            # ADRs
└── research/
    └── $ARGUMENTS/
        ├── findings.md           # What we learned
        └── alternatives.md       # What we considered
```

## Integration with Groom & Implement Commands

### Planning → Grooming → Implementation Workflow

**This command creates the foundation for the complete workflow:**

1. **`/plan [feature]`** (This command):
   - Creates proper navigation hierarchy
   - Defines problems and architecture
   - Breaks down into groom-ready tasks
   - Establishes parent planning context

2. **`/groom [feature]`** (Next step):
   - Takes planned tasks and makes them implementation-ready
   - Adds detailed acceptance criteria
   - Sequences by dependencies
   - Creates sprint-ready backlog

3. **`/implement [task]`** (Final step):
   - Test-driven implementation of groomed tasks
   - Follows acceptance criteria precisely
   - Updates planning documents with reality

### Task Format for Grooming Success

Tasks created by `/plan` must be ready for `/groom` processing:
- **One-liner summary** for quick understanding
- **Complexity estimate** for workload planning
- **Clear acceptance criteria** for test-driven development
- **Parent context links** for navigation hierarchy
- **Implementation guidance** for getting started

## Success Criteria

This planning session is successful when:

1. **Complete Understanding**: The problem space is thoroughly explored
2. **Clear Architecture**: Design decisions are documented and justified
3. **Groom-Ready Tasks**: Work is broken into groom-processable units
4. **Navigation Hierarchy**: No orphaned planning nodes created
5. **Integration Path**: Clear links to existing planning structure
6. **Identified Risks**: Potential issues are documented with mitigations
7. **No Premature Code**: Zero implementation has occurred
8. **Workflow Ready**: Tasks ready for `/groom` command processing

## Remember

> "Weeks of coding can save you hours of planning" - Unknown

Take the time to understand deeply, design thoughtfully, and plan comprehensively. The goal is to create a plan so clear that implementation becomes straightforward and risk-free.

### Critical Navigation Principles

**NEVER create orphaned planning nodes.** Every planning document must:
1. Have clear parent context in existing hierarchy
2. Be discoverable through logical navigation paths
3. Include proper cross-references and links
4. Integrate into roadmap/backlog structure

**The Bootstrap Problem**: We're building CorticAI to solve navigation problems, so we must not create the navigation problems we're solving while building it.

**Validation Question**: Can someone starting from `context-network/planning/index.md` discover this planning work through logical navigation? If not, fix the hierarchy first.

**Now, let's plan: $ARGUMENTS**