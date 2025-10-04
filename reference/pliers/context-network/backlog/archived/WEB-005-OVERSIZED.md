# WEB-005: Form Designer Interface

## Metadata
- **Status:** planned
- **Type:** feature
- **Epic:** web-forms
- **Priority:** high
- **Size:** large
- **Created:** 2025-09-26
- **Branch:** [not yet created]

## Description
Create a visual form designer interface that allows users to create and edit form schemas through drag-and-drop functionality. This provides a user-friendly way to build forms without writing JSON schemas manually.

## Acceptance Criteria
- [ ] Implement drag-and-drop form builder interface
- [ ] Create field palette with all available field types
- [ ] Add field property editor with real-time preview
- [ ] Support form layout configuration (sections, columns)
- [ ] Implement conditional logic visual editor
- [ ] Add form validation rule configuration
- [ ] Support field reordering and nesting
- [ ] Implement form preview mode with live updates
- [ ] Add form template library and saving
- [ ] Support form duplication and versioning
- [ ] Implement undo/redo functionality
- [ ] Add form export/import capabilities

## Technical Notes
- Use React DnD or @dnd-kit for drag-and-drop functionality
- Implement real-time preview using the FormRenderer component
- Store form state in React Query with optimistic updates
- Use Monaco Editor for advanced JSON/code editing
- Implement proper TypeScript types for all configuration options

## Dependencies
- WEB-004: Dynamic Form Renderer Engine
- WEB-002: Design System and Component Library
- WEB-003: API Client Integration and State Management

## Form Designer Architecture
```typescript
interface FormDesignerState {
  schema: FormSchema;
  selectedField?: string;
  isDragging: boolean;
  previewMode: boolean;
  history: FormSchema[];
  historyIndex: number;
}

const FormDesigner = () => {
  const [state, setState] = useState<FormDesignerState>({
    schema: createEmptyForm(),
    history: [],
    historyIndex: -1,
    isDragging: false,
    previewMode: false
  });

  return (
    <div className="form-designer">
      <FieldPalette />
      <FormCanvas schema={state.schema} />
      <PropertyPanel selectedField={state.selectedField} />
      <PreviewPanel schema={state.schema} visible={state.previewMode} />
    </div>
  );
};
```

## Field Palette Component
```typescript
interface FieldType {
  type: string;
  label: string;
  icon: React.ComponentType;
  category: 'basic' | 'advanced' | 'layout' | 'data';
  description: string;
  defaultConfig: any;
}

const fieldTypes: FieldType[] = [
  {
    type: 'text',
    label: 'Text Input',
    icon: Type,
    category: 'basic',
    description: 'Single line text input',
    defaultConfig: { placeholder: 'Enter text...' }
  },
  {
    type: 'textarea',
    label: 'Text Area',
    icon: AlignLeft,
    category: 'basic',
    description: 'Multi-line text input',
    defaultConfig: { rows: 4 }
  },
  // ... more field types
];

const FieldPalette = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('basic');

  const filteredFields = fieldTypes.filter(
    field => field.category === selectedCategory
  );

  return (
    <div className="field-palette">
      <CategoryTabs
        categories={['basic', 'advanced', 'layout', 'data']}
        selected={selectedCategory}
        onChange={setSelectedCategory}
      />

      <div className="field-grid">
        {filteredFields.map(fieldType => (
          <DraggableField key={fieldType.type} fieldType={fieldType} />
        ))}
      </div>
    </div>
  );
};

const DraggableField = ({ fieldType }: { fieldType: FieldType }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'FIELD',
    item: { fieldType },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  return (
    <div
      ref={drag}
      className={`field-item ${isDragging ? 'dragging' : ''}`}
      title={fieldType.description}
    >
      <fieldType.icon size={16} />
      <span>{fieldType.label}</span>
    </div>
  );
};
```

## Form Canvas Component
```typescript
const FormCanvas = ({ schema }: { schema: FormSchema }) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'FIELD',
    drop: (item: { fieldType: FieldType }, monitor) => {
      const didDrop = monitor.didDrop();
      if (didDrop) return;

      addField(item.fieldType);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  return (
    <div
      ref={drop}
      className={`form-canvas ${isOver ? 'drag-over' : ''}`}
    >
      <div className="form-header">
        <Input
          value={schema.name}
          onChange={(e) => updateFormProperty('name', e.target.value)}
          placeholder="Form Name"
          className="form-title-input"
        />
        <Textarea
          value={schema.description}
          onChange={(e) => updateFormProperty('description', e.target.value)}
          placeholder="Form Description"
          className="form-description-input"
        />
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <SortableContext
          items={schema.fields.map(f => f.id)}
          strategy={verticalListSortingStrategy}
        >
          {schema.fields.map((field, index) => (
            <SortableFieldItem
              key={field.id}
              field={field}
              index={index}
              isSelected={selectedFieldId === field.id}
              onSelect={() => setSelectedFieldId(field.id)}
              onDelete={() => deleteField(field.id)}
              onDuplicate={() => duplicateField(field.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {schema.fields.length === 0 && (
        <div className="empty-canvas">
          <Icon name="forms" size={48} />
          <p>Drag fields from the palette to start building your form</p>
        </div>
      )}
    </div>
  );
};
```

## Sortable Field Item Component
```typescript
const SortableFieldItem = ({
  field,
  index,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate
}: {
  field: FormField;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`field-item ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="field-header">
        <div className="field-info">
          <FieldTypeIcon type={field.type} />
          <span className="field-label">{field.label || field.name}</span>
          {field.required && <RequiredBadge />}
        </div>

        <div className="field-actions">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
          >
            <Copy size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 size={14} />
          </Button>
          <div
            {...attributes}
            {...listeners}
            className="drag-handle"
          >
            <GripVertical size={14} />
          </div>
        </div>
      </div>

      <div className="field-preview">
        <FieldRenderer
          field={field}
          value=""
          onChange={() => {}}
          preview={true}
        />
      </div>
    </div>
  );
};
```

## Property Panel Component
```typescript
const PropertyPanel = ({ selectedField }: { selectedField?: FormField }) => {
  if (!selectedField) {
    return (
      <div className="property-panel">
        <div className="no-selection">
          <Info size={24} />
          <p>Select a field to edit its properties</p>
        </div>
      </div>
    );
  }

  return (
    <div className="property-panel">
      <div className="panel-header">
        <FieldTypeIcon type={selectedField.type} />
        <span>{getFieldTypeName(selectedField.type)}</span>
      </div>

      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <BasicProperties field={selectedField} />
        </TabsContent>

        <TabsContent value="validation">
          <ValidationProperties field={selectedField} />
        </TabsContent>

        <TabsContent value="advanced">
          <AdvancedProperties field={selectedField} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const BasicProperties = ({ field }: { field: FormField }) => {
  return (
    <div className="property-group">
      <FormField>
        <Label>Field Name</Label>
        <Input
          value={field.name}
          onChange={(e) => updateField(field.id, { name: e.target.value })}
        />
      </FormField>

      <FormField>
        <Label>Label</Label>
        <Input
          value={field.label}
          onChange={(e) => updateField(field.id, { label: e.target.value })}
        />
      </FormField>

      <FormField>
        <Label>Description</Label>
        <Textarea
          value={field.description || ''}
          onChange={(e) => updateField(field.id, { description: e.target.value })}
        />
      </FormField>

      <FormField>
        <div className="checkbox-field">
          <Checkbox
            checked={field.required}
            onCheckedChange={(checked) =>
              updateField(field.id, { required: checked })
            }
          />
          <Label>Required</Label>
        </div>
      </FormField>

      {/* Field-specific configuration */}
      <FieldSpecificConfig field={field} />
    </div>
  );
};
```

## Conditional Logic Editor
```typescript
const ConditionalLogicEditor = ({ field }: { field: FormField }) => {
  const [conditions, setConditions] = useState<ConditionalRule[]>(
    field.conditional?.show || []
  );

  return (
    <div className="conditional-editor">
      <div className="header">
        <Label>Show this field when:</Label>
        <Button
          size="sm"
          onClick={() => addCondition()}
        >
          Add Condition
        </Button>
      </div>

      {conditions.map((condition, index) => (
        <div key={index} className="condition-rule">
          <Select
            value={condition.field}
            onValueChange={(value) =>
              updateCondition(index, { field: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
            <SelectContent>
              {availableFields.map(field => (
                <SelectItem key={field.id} value={field.name}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={condition.operator}
            onValueChange={(value) =>
              updateCondition(index, { operator: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equals">equals</SelectItem>
              <SelectItem value="not_equals">does not equal</SelectItem>
              <SelectItem value="contains">contains</SelectItem>
              <SelectItem value="greater_than">is greater than</SelectItem>
              <SelectItem value="less_than">is less than</SelectItem>
            </SelectContent>
          </Select>

          <Input
            value={condition.value}
            onChange={(e) =>
              updateCondition(index, { value: e.target.value })
            }
            placeholder="Value"
          />

          <Button
            size="sm"
            variant="outline"
            onClick={() => removeCondition(index)}
          >
            <X size={14} />
          </Button>
        </div>
      ))}
    </div>
  );
};
```

## Preview Panel Component
```typescript
const PreviewPanel = ({
  schema,
  visible
}: {
  schema: FormSchema;
  visible: boolean;
}) => {
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});

  if (!visible) return null;

  return (
    <div className="preview-panel">
      <div className="preview-header">
        <h3>Form Preview</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setPreviewValues({})}
        >
          Reset Values
        </Button>
      </div>

      <div className="preview-content">
        <FormRenderer
          schema={schema}
          initialValues={previewValues}
          onSubmit={async (values) => {
            console.log('Preview form submitted:', values);
          }}
          mode="preview"
        />
      </div>
    </div>
  );
};
```

## Undo/Redo System
```typescript
const useFormHistory = (initialSchema: FormSchema) => {
  const [history, setHistory] = useState<FormSchema[]>([initialSchema]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const pushToHistory = (schema: FormSchema) => {
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(schema);
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      return history[currentIndex - 1];
    }
    return null;
  };

  const redo = () => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(currentIndex + 1);
      return history[currentIndex + 1];
    }
    return null;
  };

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return {
    currentSchema: history[currentIndex],
    pushToHistory,
    undo,
    redo,
    canUndo,
    canRedo
  };
};
```

## Form Template System
```typescript
interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  schema: FormSchema;
  thumbnail?: string;
  tags: string[];
}

const FormTemplateLibrary = () => {
  const { data: templates } = useQuery({
    queryKey: ['form-templates'],
    queryFn: () => apiClient.forms.getTemplates()
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredTemplates = templates?.filter(
    template => selectedCategory === 'all' || template.category === selectedCategory
  );

  return (
    <Dialog>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
        </DialogHeader>

        <div className="template-browser">
          <CategoryFilter
            categories={getUniqueCategories(templates)}
            selected={selectedCategory}
            onChange={setSelectedCategory}
          />

          <div className="template-grid">
            {filteredTemplates?.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={() => loadTemplate(template)}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

## Accessibility Features
- Keyboard navigation for drag-and-drop operations
- Screen reader announcements for dynamic changes
- Focus management for modal dialogs
- High contrast mode support
- Proper ARIA labels for all interactive elements

## Performance Optimizations
- Virtualize large field lists in the palette
- Debounce property updates to prevent excessive re-renders
- Lazy load heavy components (Monaco Editor)
- Optimize drag-and-drop operations
- Implement efficient diff algorithm for history

## Testing Strategy
- Unit tests for all components
- Integration tests for drag-and-drop functionality
- Accessibility testing for screen readers
- Performance testing with complex forms
- User experience testing with real users

## References
- React DnD: https://react-dnd.github.io/react-dnd/
- @dnd-kit: https://dndkit.com/
- Monaco Editor: https://microsoft.github.io/monaco-editor/
- Form UX best practices
- Accessibility guidelines for interactive interfaces

## Branch Naming
`feat/WEB-005-form-designer-interface`