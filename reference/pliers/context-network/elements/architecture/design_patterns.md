# Architectural Design Patterns

## Purpose
Documents proven design patterns and architectural approaches that guide feature development and system extension in Pliers.

## Classification
- **Domain:** Core Concept
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** Established

## Core Patterns

### 1. Form-as-Feature Pattern

#### Intent
Implement new features as form types to leverage the existing form infrastructure rather than building custom solutions.

#### Motivation
The form engine provides a complete feature set including:
- Data storage with JSONB
- Field validation and type safety
- UI generation and rendering
- CRUD operations
- Event handling
- Relationship management
- Status workflows
- Search and filtering
- Audit trails

By implementing features as forms, all these capabilities come "for free" without additional development effort.

#### Structure
```typescript
// Instead of creating custom tables and logic:
// ❌ CREATE TABLE user_profiles (...)
// ❌ Custom validation logic
// ❌ Custom UI components
// ❌ Custom CRUD endpoints

// Use a form definition:
// ✅ Single form type definition
const PersonProfileForm: FormDefinition = {
  name: "person_profile",
  fields: [
    { type: "text", name: "full_name", required: true },
    { type: "email", name: "email", validation: { unique: true } },
    { type: "file", name: "avatar", config: { acceptedTypes: ["image/*"] } },
    { type: "select", name: "department", config: { options: departments } },
    { type: "relationship", name: "manager", config: { targetForm: "person_profile" } }
  ]
};
```

#### Applicability
Use this pattern when:
- Adding new data entities to the system
- Creating configuration interfaces
- Building content management features
- Implementing user-facing data collection
- Creating administrative interfaces

#### Known Uses in Pliers

##### Person Profiles
- **Problem**: Need user profiles beyond basic authentication
- **Solution**: Created "person_profile" form type
- **Benefits**: Automatic profile editing UI, validation, relationships to other entities

##### Theme Settings
- **Problem**: Need configurable UI themes
- **Solution**: "theme_settings" form with color pickers, font selections
- **Benefits**: Live preview through form field changes, version history of theme changes

##### Site/Tenant Configuration
- **Problem**: Multi-tenant settings management
- **Solution**: "tenant_config" form type with nested configuration fields
- **Benefits**: Per-tenant isolation, configuration inheritance, audit trail

##### Content Management System
- **Problem**: Users need to create documentation and content pages
- **Solution**: "content_page" form with rich text fields
- **Benefits**: Automatic page editing, revision history, publishing workflow

##### Dashboard Widgets
- **Problem**: Configurable dashboard with various widget types
- **Solution**: Two-form approach:
  - "widget_config" form defines appearance/layout
  - "widget_query" form defines data source
- **Benefits**: Fully data-driven dashboards, widget library, user customization

#### Implementation Guidelines

1. **Identify Core Data Fields**
   - Map required data to form field types
   - Consider relationships to other entities
   - Plan validation requirements

2. **Define Form Schema**
   ```typescript
   const featureForm = {
     name: "feature_name",
     description: "User-friendly description",
     fields: [...],
     relationships: [...],
     statusDefinitions: [...]
   };
   ```

3. **Leverage Built-in Capabilities**
   - Use conditional fields for dynamic forms
   - Implement calculated fields for derived values
   - Define status workflows for lifecycle management

4. **Extend When Necessary**
   - Add custom validators for complex business logic
   - Create custom field types for specialized UI
   - Implement plugins for side effects

#### Consequences

**Benefits:**
- Rapid feature development
- Consistent user experience
- Automatic API generation
- Built-in validation and security
- Reduced code maintenance
- Standardized data storage

**Tradeoffs:**
- May require creative data modeling
- Complex business logic might need plugins
- Performance considerations for large datasets
- Learning curve for form-based thinking

### 2. Event-Driven Side Effects Pattern

#### Intent
Use the event system and plugins to handle business logic and side effects rather than embedding them in core code.

#### Structure
```typescript
// Plugin subscribes to form events
const NotificationPlugin: Plugin = {
  eventHandlers: [
    {
      event: "form.submission.created",
      formType: "support_ticket",
      handler: async (event) => {
        // Send notification
        // Update external systems
        // Trigger workflows
      }
    }
  ]
};
```

#### Known Uses
- Email notifications on form submission
- Integration with external systems
- Cascade updates across related forms
- Analytics and reporting triggers

### 3. Query-as-Form Pattern

#### Intent
Define data queries and reports as form submissions, making them configurable and reusable.

#### Structure
```typescript
const QueryForm: FormDefinition = {
  name: "data_query",
  fields: [
    { type: "select", name: "source_form", config: { options: availableForms } },
    { type: "json", name: "filters", config: { schema: filterSchema } },
    { type: "multiselect", name: "columns", config: { options: availableColumns } },
    { type: "select", name: "sort_by" },
    { type: "number", name: "limit" }
  ]
};
```

#### Benefits
- User-configurable reports
- Saved queries and favorites
- Query sharing between users
- Version control for report definitions

### 4. Configuration-as-Data Pattern

#### Intent
Store system configuration as form submissions rather than code or environment variables.

#### Implementation
- System settings as form submissions
- Feature flags as form fields
- UI preferences as user-specific forms
- API configurations as structured forms

#### Benefits
- Runtime configuration changes
- Configuration audit trail
- Per-tenant settings
- A/B testing capabilities

## Pattern Selection Guide

### When to Use Form-as-Feature

✅ **Use when:**
- Feature involves data collection or display
- Need CRUD operations
- Require validation and data integrity
- Want consistent UI/UX
- Need audit trails or versioning

❌ **Don't use when:**
- Feature is purely computational
- Real-time processing required
- Complex state machines beyond status workflows
- Heavy integration logic

### Decision Tree

```
New Feature Required
    ↓
Can it be modeled as data?
    ├─ Yes → Consider Form-as-Feature
    │   ↓
    │   Does it need CRUD operations?
    │   ├─ Yes → Implement as Form Type
    │   └─ No → Evaluate other patterns
    └─ No → Consider Service/Plugin Pattern
```

## Anti-Patterns to Avoid

### 1. Form Field Overload
**Problem**: Cramming too much logic into calculated fields
**Solution**: Use plugins for complex business logic

### 2. Relationship Abuse
**Problem**: Creating deeply nested form relationships
**Solution**: Flatten data structures, use reference IDs

### 3. Status Workflow Complexity
**Problem**: Overly complex status transitions
**Solution**: Keep workflows simple, use events for complex orchestration

### 4. Custom Everything
**Problem**: Building custom solutions without evaluating form capabilities
**Solution**: Always prototype with forms first

## Best Practices

### 1. Start Simple
- Begin with basic form definition
- Add complexity incrementally
- Validate approach early

### 2. Leverage Existing Patterns
- Study successful form implementations
- Reuse field configurations
- Share validation logic

### 3. Document Intent
- Clearly document why feature is a form
- Explain field purposes
- Note any workarounds or limitations

### 4. Plan for Scale
- Consider data volume implications
- Design efficient queries
- Plan archival strategies

## Examples and Case Studies

### Case Study: Multi-Channel Notifications

**Challenge**: Support email, SMS, and in-app notifications

**Solution**:
1. Created "notification_template" form for message templates
2. Created "notification_preference" form for user settings
3. Plugin subscribes to events and routes notifications based on preferences

**Result**: Fully configurable notification system without custom tables

### Case Study: Dynamic Dashboards

**Challenge**: User-customizable dashboards with various widget types

**Solution**:
1. "dashboard_layout" form defines grid and widget positions
2. "widget_instance" form defines individual widget configuration
3. "widget_query" form defines data source for each widget
4. Frontend renders based on form submissions

**Result**: Infinitely customizable dashboards with no custom backend code

## Relationships
- **Parent Nodes:**
  - [elements/architecture/modern_design.md] - implements - Patterns support modern architecture
  - [foundation/principles.md] - embodies - Patterns embody core principles
- **Child Nodes:** None currently
- **Related Nodes:**
  - [elements/core-components/form_engine.md] - utilizes - Patterns leverage form engine
  - [elements/core-components/event_engine.md] - utilizes - Event patterns use event engine
  - [elements/core-components/plugin_system.md] - utilizes - Plugin patterns for extensions

## Navigation Guidance
- **Access Context**: Reference when designing new features or evaluating implementation approaches
- **Common Next Steps**: Review form engine capabilities, examine existing implementations
- **Related Tasks**: Feature design, architecture reviews, implementation planning
- **Update Patterns**: Add new patterns as they emerge, document successful implementations

## Metadata
- **Created:** 2025-09-23
- **Last Updated:** 2025-09-23
- **Updated By:** Claude/Architecture Documentation

## Change History
- 2025-09-23: Initial creation documenting Form-as-Feature and related patterns based on Pliers evolution