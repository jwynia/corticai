# Project Principles

## Purpose
This document outlines the core principles and standards that guide decision-making and development across the project.

## Classification
- **Domain:** Core Concept
- **Stability:** Static
- **Abstraction:** Conceptual
- **Confidence:** Established

## Content

### Core Values

[List and describe the fundamental values that drive the project]

1. **[Value 1]**
   [Description of Value 1]

2. **[Value 2]**
   [Description of Value 2]

3. **[Value 3]**
   [Description of Value 3]

### Design Principles

[List and describe the key principles that guide design decisions]

1. **[Design Principle 1]**
   [Description of Design Principle 1]
   
   *Example:* [Concrete example of this principle in action]

2. **[Design Principle 2]**
   [Description of Design Principle 2]
   
   *Example:* [Concrete example of this principle in action]

3. **[Design Principle 3]**
   [Description of Design Principle 3]
   
   *Example:* [Concrete example of this principle in action]

### Standards and Guidelines

[List and describe the standards and guidelines that the project adheres to]

#### Development Standards

##### JavaScript/TypeScript Code Standards

**Core Constraints:**
- Be concise and favor functional programming
- Keep functions short, pure, and composable
- One job per function; separate mapping from IO
- Omit needless code and variables; prefer composition with partial application and point-free style
- Keep related code together; group by feature, not by technical type
- Put statements and expressions in positive form
- Use parallel code for parallel concepts
- Avoid null/undefined arguments; use options objects instead
- Chain operations rather than introducing intermediate variables
- Use concise syntax: arrow functions, object destructuring, array destructuring, template literals
- Assign reasonable defaults directly in function signatures
- Prefer immutability; use const, spread, and rest operators instead of mutation
- Favor map, filter, reduce over manual loops
- Prefer async/await over raw promise chains
- Use strict equality (===)
- Modularize by feature; one concern per file or function; prefer named exports
- Avoid `class` and `extends` as much as possible
- Avoid loose procedural sequences; compose clear pipelines instead

**Naming Conventions:**
- Use active voice and clear, consistent naming
- Functions should be verbs (e.g. `increment()`, `filter()`)
- Predicates and booleans should read like yes/no questions (e.g. `isActive`, `hasPermission`)
- Prefer standalone verbs over noun.method (e.g. `createUser()` not `User.create()`)
- Avoid noun-heavy and redundant names
- Avoid "doSomething" style (e.g. `notify()` not `Notifier.doNotification()`)
- Lifecycle methods: prefer `beforeX` / `afterX` over `willX` / `didX`
- Use strong negatives over weak ones: `isEmpty(thing)` not `!isDefined(thing)`
- Mixins and function decorators use `with${Thing}` (e.g. `withUser`, `withFeatures`, `withAuth`)

**Parameter Design:**
- Function callers should understand expected call signature by reading the function signature
- Parameter values should be explicitly named and expressed in function signatures
- Avoid using || for defaults; use parameter defaults instead
- Example: `const createUser = ({ id = createId(), name = '', description = '' } = {}) =>`

#### Quality Standards

- Code must follow established lint and formatting rules
- All functions should be testable in isolation
- Code should be self-documenting through clear naming and structure

#### Structural Standards

- Group code by feature, not by technical type
- One concern per file or function
- Prefer named exports over default exports
- Maintain clear separation between pure functions and side effects

#### Safety and Security Standards

- Never expose or log secrets and keys
- Never commit secrets or keys to the repository
- Use strict equality (===) to avoid type coercion issues
- Validate inputs at boundaries

#### Performance and Efficiency Standards

- Prefer immutable operations that can be optimized by engines
- Chain operations to minimize intermediate allocations
- Use appropriate data structures for the task
- Avoid premature optimization but write efficient code by default

### Process Principles

[List and describe the principles that guide development and operational processes]

1. **[Process Principle 1]**
   [Description of Process Principle 1]

2. **[Process Principle 2]**
   [Description of Process Principle 2]

3. **[Process Principle 3]**
   [Description of Process Principle 3]

### Decision-Making Framework

[Describe the framework used for making decisions in the project]

#### Decision Criteria

- [Criterion 1]
- [Criterion 2]
- [Criterion 3]

#### Trade-off Considerations

- [Trade-off 1]
- [Trade-off 2]
- [Trade-off 3]

### Principle Application

[Describe how these principles should be applied in practice]

#### When Principles Conflict

[Guidance on how to resolve situations where principles may conflict with each other]

#### Exceptions to Principles

[Circumstances under which exceptions to these principles may be considered]

## Relationships
- **Parent Nodes:** [foundation/project_definition.md]
- **Child Nodes:** None
- **Related Nodes:** 
  - [foundation/structure.md] - implements - Project structure implements these principles
  - [processes/creation.md] - guided-by - Creation processes follow these principles
  - [decisions/*] - evaluated-against - Decisions are evaluated against these principles

## Navigation Guidance
- **Access Context:** Use this document when making significant decisions or evaluating options
- **Common Next Steps:** After reviewing principles, typically explore structure.md or specific decision records
- **Related Tasks:** Decision-making, design reviews, code reviews, process definition
- **Update Patterns:** This document should be updated rarely, only when fundamental principles change

## Metadata
- **Created:** [Date]
- **Last Updated:** [Date]
- **Updated By:** [Role/Agent]

## Change History
- [Date]: Initial creation of principles template
