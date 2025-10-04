# Implementation Guide: Integrating React Form Builders with Pliers

## Classification
- **Domain:** Practical/Applied
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** High based on research findings

## Quick Start Paths

### For Form Ecosystem Integration

Given Pliers' form decomposition philosophy, the implementation approach changes significantly:

1. **Install core dependencies for form ecosystem:**
   ```bash
   npm install @rjsf/core @rjsf/utils @rjsf/validator-ajv8 @rjsf/mui
   npm install @tanstack/react-query  # For collection management
   npm install @dnd-kit/core @dnd-kit/sortable  # For relationship management
   ```

2. **Create form ecosystem component structure:**
   ```typescript
   // Main form with related collections
   const FormEcosystem = ({ mainForm, relatedCollections }) => {
     return (
       <div className="form-ecosystem">
         <MainFormSection form={mainForm} />
         <RelatedCollectionsPanel collections={relatedCollections} />
         <MiniDashboards queries={mainForm.dashboardQueries} />
       </div>
     );
   };
   ```

3. **Implement collection management:**
   ```typescript
   const RelatedCollection = ({ collection, parentId }) => {
     // All data loaded upfront in v2, will be lazy-loaded in v3
     const items = useCollectionData(collection.type, parentId);

     // Client-side queries against loaded data
     const filteredItems = useMemo(() => {
       return collection.query
         ? runClientQuery(items, collection.query)
         : items;
     }, [items, collection.query]);

     return (
       <CollectionView
         items={filteredItems}
         onAdd={() => createRelatedItem(collection.type, parentId)}
         onView={(item) => openReadOnlyModal(item)}
         onEdit={(item) => openInNewTab(item)}
       />
     );
   };
   ```

### For Immediate Integration
1. **Install RJSF and dependencies:**
   ```bash
   npm install @rjsf/core @rjsf/utils @rjsf/validator-ajv8 @rjsf/mui
   ```

2. **Create basic form component:**
   ```typescript
   import Form from '@rjsf/mui';
   import validator from '@rjsf/validator-ajv8';
   
   const schema = {
     type: 'object',
     required: ['name', 'email'],
     properties: {
       name: { type: 'string', title: 'Name' },
       email: { type: 'string', format: 'email', title: 'Email' }
     }
   };
   
   export const BasicForm = () => (
     <Form 
       schema={schema}
       validator={validator}
       onSubmit={({formData}) => console.log(formData)}
     />
   );
   ```

3. **Transform Pliers schema to JSON Schema:**
   ```typescript
   function pliersToJsonSchema(pliersForm) {
     return {
       type: 'object',
       title: pliersForm.title,
       properties: pliersForm.fields.reduce((acc, field) => {
         acc[field.name] = mapFieldToJsonSchema(field);
         return acc;
       }, {}),
       required: pliersForm.fields
         .filter(f => f.required)
         .map(f => f.name)
     };
   }
   ```

### For Visual Form Builder
1. **Option A: Integrate react-json-schema-form-builder**
   ```bash
   npm install @ginkgo-bioworks/react-json-schema-form-builder
   ```

2. **Option B: Build custom builder using DnD Kit**
   ```typescript
   import { DndContext, DragOverlay } from '@dnd-kit/core';
   import { arrayMove, SortableContext } from '@dnd-kit/sortable';
   
   const FormBuilder = () => {
     const [fields, setFields] = useState([]);
     
     return (
       <DndContext onDragEnd={handleDragEnd}>
         <FieldPalette />
         <FormCanvas fields={fields} />
         <SchemaOutput schema={generateSchema(fields)} />
       </DndContext>
     );
   };
   ```

## Implementation Patterns

### Pattern: Form Decomposition Monitor

**Context:** Prevent forms from growing beyond manageable size

**Solution:**
```typescript
class FormComplexityMonitor {
  private readonly COMPLEXITY_THRESHOLD = 20;

  analyzeForm(formDef: FormDefinition): ComplexityAnalysis {
    const fieldCount = formDef.fields.length;
    const cohesionGroups = this.detectFieldGroups(formDef.fields);

    return {
      complexity: fieldCount,
      exceededThreshold: fieldCount > this.COMPLEXITY_THRESHOLD,
      suggestedGroups: cohesionGroups,
      recommendation: this.generateRecommendation(cohesionGroups)
    };
  }

  private detectFieldGroups(fields: Field[]): FieldGroup[] {
    // Analyze field names and types to detect logical groups
    // e.g., all fields starting with "billing_" could be a group
    const groups = new Map<string, Field[]>();

    fields.forEach(field => {
      const prefix = field.name.split('_')[0];
      if (!groups.has(prefix)) {
        groups.set(prefix, []);
      }
      groups.get(prefix).push(field);
    });

    return Array.from(groups.entries())
      .filter(([_, fields]) => fields.length >= 3)
      .map(([prefix, fields]) => ({
        name: prefix,
        fields,
        suggestedFormName: `${prefix}_details`
      }));
  }
}
```

### Pattern: Collection Query Engine

**Context:** Run queries against loaded collection data client-side

**Solution:**
```typescript
class ClientSideQueryEngine {
  query(collection: any[], queryDef: QueryDefinition): any[] {
    let results = [...collection];

    // Apply filters
    if (queryDef.where) {
      results = results.filter(item =>
        this.evaluateCondition(item, queryDef.where)
      );
    }

    // Apply sorting
    if (queryDef.orderBy) {
      results.sort((a, b) =>
        this.compareValues(
          a[queryDef.orderBy.field],
          b[queryDef.orderBy.field],
          queryDef.orderBy.direction
        )
      );
    }

    // Apply limit
    if (queryDef.limit) {
      results = results.slice(0, queryDef.limit);
    }

    return results;
  }

  // Example: Show all blocked child tasks
  blockedTasks(tasks: Task[]): Task[] {
    return this.query(tasks, {
      where: { field: 'status', operator: 'equals', value: 'blocked' },
      orderBy: { field: 'priority', direction: 'desc' }
    });
  }
}
```

### Pattern: Semantic Navigation Manager

**Context:** Navigate based on relationships, not browser history

**Solution:**
```typescript
class SemanticNavigator {
  private relationships: Map<string, RelationshipDef> = new Map();

  navigateToParent(currentEntity: Entity) {
    const parentRef = currentEntity.relationships?.parent;
    if (parentRef) {
      this.openInCurrentTab({
        formType: parentRef.formType,
        id: parentRef.id,
        context: 'parent'
      });
    }
  }

  navigateToChild(parentEntity: Entity, childType: string, childId: string) {
    this.openInNewTab({
      formType: childType,
      id: childId,
      context: 'child',
      parentRef: {
        formType: parentEntity.formType,
        id: parentEntity.id
      }
    });
  }

  openInNewTab(target: NavigationTarget) {
    // Preserve semantic context in URL
    const url = `/forms/${target.formType}/${target.id}?context=${target.context}`;
    if (target.parentRef) {
      url += `&parent=${target.parentRef.formType}:${target.parentRef.id}`;
    }
    window.open(url, '_blank');
  }
}
```

### Pattern: Modal for Read-Only Display

**Context:** Show form data without editing capabilities

**Solution:**
```typescript
const ReadOnlyModal = ({ entity, onClose }) => {
  return (
    <Modal size="large" onClose={onClose}>
      <ModalHeader>
        {entity.title}
        <Badge>{entity.status}</Badge>
      </ModalHeader>

      <ModalBody>
        <ReadOnlyForm
          schema={entity.schema}
          data={entity.data}
          // No onChange handler - truly read-only
        />
      </ModalBody>

      <ModalFooter>
        <Button
          variant="primary"
          onClick={() => navigator.openInNewTab(entity)}
        >
          Edit in New Tab
        </Button>
        <Button
          onClick={() => navigator.navigateToParent(entity)}
        >
          View Parent
        </Button>
        <Button onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};
```

### Pattern: Pliers-JSON Schema Bridge

**Context:** Need bidirectional conversion between Pliers and JSON Schema formats

**Solution:**
```typescript
interface SchemaConverter {
  toJsonSchema(pliersForm: PliersFormDefinition): JSONSchema;
  toPliersForm(jsonSchema: JSONSchema): PliersFormDefinition;
}

class PliersJsonSchemaBridge implements SchemaConverter {
  private fieldTypeMap = {
    'text': 'string',
    'email': { type: 'string', format: 'email' },
    'number': 'number',
    'select': { type: 'string', enum: [] },
    'multiselect': { type: 'array', items: { type: 'string' } },
    'date': { type: 'string', format: 'date' },
    'file': { type: 'string', format: 'data-url' }
  };
  
  toJsonSchema(pliersForm: PliersFormDefinition): JSONSchema {
    const properties = {};
    const required = [];
    
    pliersForm.fields.forEach(field => {
      properties[field.name] = this.mapField(field);
      if (field.required) required.push(field.name);
    });
    
    return {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      title: pliersForm.title,
      properties,
      required,
      dependencies: this.mapDependencies(pliersForm.conditionalLogic)
    };
  }
  
  private mapField(field: PliersField): any {
    const baseSchema = this.fieldTypeMap[field.type] || 'string';
    
    return {
      ...(typeof baseSchema === 'string' ? { type: baseSchema } : baseSchema),
      title: field.label,
      description: field.helpText,
      ...(field.validation && this.mapValidation(field.validation))
    };
  }
  
  private mapValidation(validation: PliersValidation) {
    const rules = {};
    
    if (validation.min !== undefined) rules.minimum = validation.min;
    if (validation.max !== undefined) rules.maximum = validation.max;
    if (validation.minLength) rules.minLength = validation.minLength;
    if (validation.maxLength) rules.maxLength = validation.maxLength;
    if (validation.pattern) rules.pattern = validation.pattern;
    
    return rules;
  }
}
```

**Consequences:** Enables use of JSON Schema tools while maintaining Pliers format

### Pattern: Custom Widget Registry

**Context:** Pliers has custom field types not in standard JSON Schema

**Solution:**
```typescript
// Custom widget for Pliers signature field
const SignatureWidget = (props) => {
  const { value, onChange } = props;
  
  return (
    <SignaturePad
      data={value}
      onEnd={(signature) => onChange(signature)}
    />
  );
};

// Register custom widgets
const customWidgets = {
  signature: SignatureWidget,
  location: LocationPickerWidget,
  richtext: RichTextEditorWidget
};

// Use in form
<Form
  schema={schema}
  widgets={customWidgets}
  uiSchema={{
    signature_field: { 'ui:widget': 'signature' }
  }}
/>
```

### Pattern: Performance Optimization

**Context:** Large forms with 100+ fields cause performance issues

**Solution:**
```typescript
// 1. Implement field virtualization
import { FixedSizeList } from 'react-window';

const VirtualizedForm = ({ schema, formData }) => {
  const fields = Object.entries(schema.properties);
  
  const Row = ({ index, style }) => {
    const [fieldName, fieldSchema] = fields[index];
    return (
      <div style={style}>
        <FieldTemplate
          name={fieldName}
          schema={fieldSchema}
          value={formData[fieldName]}
        />
      </div>
    );
  };
  
  return (
    <FixedSizeList
      height={600}
      itemCount={fields.length}
      itemSize={80}
    >
      {Row}
    </FixedSizeList>
  );
};

// 2. Memoize schema compilation
const useCompiledSchema = (schema) => {
  return useMemo(() => {
    const ajv = new Ajv();
    return ajv.compile(schema);
  }, [JSON.stringify(schema)]);
};

// 3. Debounce validation
const useDebouncedValidation = (value, validate, delay = 300) => {
  const [errors, setErrors] = useState([]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setErrors(validate(value));
    }, delay);
    
    return () => clearTimeout(timer);
  }, [value, validate, delay]);
  
  return errors;
};
```

### Pattern: OpenAPI Integration

**Context:** Generate forms from OpenAPI specifications

**Solution:**
```typescript
class OpenAPIFormGenerator {
  generateForm(openAPISpec: OpenAPIDocument, operationId: string) {
    const operation = this.findOperation(openAPISpec, operationId);
    const requestBody = operation.requestBody;
    
    if (!requestBody) return null;
    
    const schema = requestBody.content['application/json'].schema;
    return this.openAPISchemaToJsonSchema(schema);
  }
  
  private openAPISchemaToJsonSchema(openAPISchema: any): JSONSchema {
    // Remove OpenAPI-specific properties
    const { 
      nullable, 
      discriminator, 
      xml, 
      externalDocs, 
      example, 
      deprecated,
      ...jsonSchema 
    } = openAPISchema;
    
    // Convert nullable to type array
    if (nullable && jsonSchema.type) {
      jsonSchema.type = [jsonSchema.type, 'null'];
    }
    
    // Recursively process nested schemas
    if (jsonSchema.properties) {
      Object.keys(jsonSchema.properties).forEach(key => {
        jsonSchema.properties[key] = this.openAPISchemaToJsonSchema(
          jsonSchema.properties[key]
        );
      });
    }
    
    if (jsonSchema.items) {
      jsonSchema.items = this.openAPISchemaToJsonSchema(jsonSchema.items);
    }
    
    return jsonSchema;
  }
}

// Usage
const generator = new OpenAPIFormGenerator();
const formSchema = generator.generateForm(apiSpec, 'createUser');
```

## Decision Framework

### Choosing the Right Approach

```
Start: Pliers Form Engine Integration
    |
    v
Need visual builder?
    ├─ Yes → SurveyJS or Custom DnD builder
    └─ No → Continue
         |
         v
    Complex layouts?
         ├─ Yes → JSON Forms (dual schema)
         └─ No → Continue
              |
              v
         Performance critical?
              ├─ Yes → JSON Forms or Optimized RJSF
              └─ No → Standard RJSF
```

## Resource Requirements

### Knowledge Prerequisites
- React hooks and context
- JSON Schema specification
- TypeScript for type safety
- Form validation patterns
- State management (Redux/Zustand optional)

### Technical Requirements
- React 18+
- Node.js 18+
- TypeScript 5+
- Build tool (Vite/Webpack)
- Testing framework (Jest/Vitest)

### Time Investment
- Basic integration: 1-2 weeks
- Custom widgets: 1 week per widget type
- Visual builder: 3-4 weeks
- Full integration with optimization: 6-8 weeks

### Skill Development Path
1. Learn JSON Schema basics (2-3 days)
2. Implement simple RJSF forms (1 week)
3. Create custom widgets (1 week)
4. Add validation and conditional logic (1 week)
5. Implement performance optimizations (2 weeks)
6. Build visual form designer (3-4 weeks)

## Testing Strategy

### Unit Tests
```typescript
describe('PliersJsonSchemaBridge', () => {
  it('converts Pliers text field to JSON Schema string', () => {
    const pliersField = {
      type: 'text',
      name: 'username',
      label: 'Username',
      required: true
    };
    
    const jsonSchema = bridge.mapField(pliersField);
    
    expect(jsonSchema).toEqual({
      type: 'string',
      title: 'Username'
    });
  });
});
```

### Integration Tests
```typescript
describe('Form Integration', () => {
  it('renders Pliers form using RJSF', async () => {
    const pliersForm = loadPliersForm('test-form');
    const jsonSchema = bridge.toJsonSchema(pliersForm);
    
    render(
      <Form 
        schema={jsonSchema}
        validator={validator}
        onSubmit={onSubmit}
      />
    );
    
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });
});
```

### Performance Tests
```typescript
describe('Performance', () => {
  it('renders 100+ fields within 2 seconds', () => {
    const largeSchema = generateLargeSchema(150);
    
    const startTime = performance.now();
    render(<Form schema={largeSchema} />);
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(2000);
  });
});
```

## Migration Roadmap

### Phase 1: Foundation (Week 1-2)
- Set up RJSF with Material-UI theme
- Implement basic schema converter
- Create proof of concept

### Phase 2: Core Features (Week 3-4)
- Map all Pliers field types
- Implement validation bridge
- Add conditional logic support

### Phase 3: Custom Extensions (Week 5-6)
- Create custom widgets for Pliers-specific fields
- Implement file upload handling
- Add relationship field support

### Phase 4: Optimization (Week 7-8)
- Add performance optimizations
- Implement caching strategies
- Add virtual scrolling for large forms

### Phase 5: Visual Builder (Week 9-12)
- Integrate or build visual form designer
- Add drag-and-drop capabilities
- Implement real-time preview

## Common Pitfalls and Solutions

### Pitfall: Schema Version Conflicts
**Problem:** RJSF supports different JSON Schema drafts
**Solution:** Explicitly specify schema version and use compatible validator

### Pitfall: Bundle Size Growth
**Problem:** Including all UI themes increases bundle size
**Solution:** Use dynamic imports and tree shaking

### Pitfall: Validation Performance
**Problem:** Complex schemas slow down validation
**Solution:** Use compiled validators and debouncing

### Pitfall: State Management Complexity
**Problem:** Form state conflicts with app state
**Solution:** Use controlled components with clear boundaries