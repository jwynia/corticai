# Discovery Documentation Triggers

## Purpose
Defines when discoveries should be documented to capture valuable learning and prevent knowledge loss.

## Classification
- **Domain:** Process
- **Stability:** Static
- **Abstraction:** Structural
- **Confidence:** Established

## Trigger Conditions

### Time-Based Triggers
- [ ] **5+ minutes understanding**: Spent more than 5 minutes figuring out how something works
- [ ] **3+ file exploration**: Read more than 3 files to understand one feature or concept
- [ ] **Repetitive research**: "I know I saw this somewhere" moments requiring re-research

### Discovery Type Triggers
- [ ] **Architecture insight**: Discovered why something was designed a certain way
- [ ] **Hidden relationship**: Found unexpected connections between components
- [ ] **Workaround discovered**: Found non-obvious way to solve a problem
- [ ] **Configuration pattern**: Learned specific setup or configuration approach

### Technical Triggers
- [ ] **Debugging session**: Extended debugging that revealed system behavior
- [ ] **Integration complexity**: Understanding how multiple systems work together
- [ ] **Performance insight**: Discovered why something is slow/fast
- [ ] **Security pattern**: Found security-related implementation details

### Knowledge Preservation Triggers
- [ ] **Tribal knowledge**: Information not documented anywhere else
- [ ] **Context-dependent decisions**: Choices that make sense only with background
- [ ] **Tool-specific approaches**: How to work with specific tools or frameworks
- [ ] **Error patterns**: Common mistakes and how to avoid them

## Discovery Record Requirements

When triggers are met, create a discovery record including:

### Required Sections
1. **Discovery Summary**: What was learned and why it matters
2. **Technical Details**: Specific implementation insights
3. **Code Locations**: File paths and line numbers where relevant
4. **Follow-up Items**: Tasks or decisions needed
5. **Navigation Links**: Connections to related content

### File Naming Convention
`/discoveries/records/YYYY-MM-DD-NNN-brief-description.md`

Where:
- `YYYY-MM-DD`: Date of discovery
- `NNN`: Sequential number (001, 002, etc.)
- `brief-description`: 2-4 word summary

## Quality Guidelines

### Good Discovery Records
- **Specific**: Include exact file paths, commands, error messages
- **Contextual**: Explain why this matters for the project
- **Actionable**: Clear follow-up steps if any
- **Searchable**: Use terms others might search for

### Avoid Documenting
- **Obvious patterns**: Things clearly documented in standard docs
- **Temporary states**: Information that will quickly become outdated
- **Personal preferences**: Subjective choices without technical merit

## Integration with Context Network

### Relationship Mapping
- Link discoveries to relevant planning documents
- Update location indexes when new components found
- Cross-reference with decision records
- Connect to task breakdown items

### Navigation Updates
Update these files when discoveries reveal new patterns:
- `/discovery.md` - Main navigation if new sections added
- Category indexes - When discoveries change understanding
- Learning paths - When understanding evolves significantly

## Example Triggers from Recent Session

### ✅ Triggered and Documented
- **Development Environment Validation**: 60+ minutes understanding React Native setup
- **Configuration Dependency Patterns**: Learning React Native package interdependencies
- **Container Development Insights**: Understanding Docker + Metro bundler networking

### ❌ Could Have Been Triggered
- **ESLint Rule Conflicts**: Pattern of TypeScript + React Native rule interactions
- **Testing Library Evolution**: @testing-library/jest-native deprecation pattern

## Maintenance

Review discovery triggers quarterly to:
- Add new trigger types based on team experience
- Remove triggers that generate low-value documentation
- Update quality guidelines based on usage patterns
- Refine integration processes

## Related Documents
- [Context Network Navigation](../discovery.md)
- [Documentation Standards](../meta/maintenance.md)
- [Task Management Process](../processes/creation.md)

## Metadata
- **Created:** 2025-09-23
- **Updated By:** Session Closure Specialist
- **Usage**: Applied during session closure checklist
- **Examples**: Development environment validation session