# JSONB Schema Patterns and Validation

## Overview

This document defines the standardized JSONB structures used throughout the Pliers v3 database, validation patterns, query strategies, and best practices for working with PostgreSQL's JSONB data type.

## Core JSONB Schemas

### Form Definition Schema

The form definition stored in `forms.definition` column contains the complete structure and behavior of a form.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["title", "fields"],
  "properties": {
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 255
    },
    "description": {
      "type": "string",
      "maxLength": 1000
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "fields": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/field"
      }
    },
    "sections": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/section"
      }
    },
    "pages": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/page"
      }
    },
    "logic": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/conditionalLogic"
      }
    },
    "calculations": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/calculation"
      }
    },
    "validation": {
      "$ref": "#/definitions/formValidation"
    },
    "settings": {
      "$ref": "#/definitions/formSettings"
    }
  },
  "definitions": {
    "field": {
      "type": "object",
      "required": ["id", "type", "name"],
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^field_[a-zA-Z0-9_]+$"
        },
        "type": {
          "type": "string",
          "enum": [
            "text", "textarea", "email", "password", "url", "tel",
            "number", "integer", "decimal", "currency", "percentage",
            "date", "time", "datetime", "datetime-local",
            "select", "multiselect", "radio", "checkbox", "checkboxgroup",
            "file", "files", "image", "signature", "location",
            "section", "repeater", "grid"
          ]
        },
        "name": {
          "type": "string",
          "pattern": "^[a-zA-Z][a-zA-Z0-9_]*$"
        },
        "label": {
          "type": "string"
        },
        "placeholder": {
          "type": "string"
        },
        "helpText": {
          "type": "string"
        },
        "required": {
          "type": "boolean",
          "default": false
        },
        "readOnly": {
          "type": "boolean",
          "default": false
        },
        "hidden": {
          "type": "boolean",
          "default": false
        },
        "validation": {
          "$ref": "#/definitions/fieldValidation"
        },
        "conditional": {
          "$ref": "#/definitions/conditionalLogic"
        },
        "choices": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/choice"
          }
        },
        "defaultValue": {},
        "ui": {
          "$ref": "#/definitions/fieldUI"
        },
        "metadata": {
          "type": "object"
        }
      }
    },
    "fieldValidation": {
      "type": "object",
      "properties": {
        "minLength": { "type": "integer" },
        "maxLength": { "type": "integer" },
        "min": { "type": "number" },
        "max": { "type": "number" },
        "pattern": { "type": "string" },
        "format": { "type": "string" },
        "custom": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "rule": { "type": "string" },
              "message": { "type": "string" },
              "params": { "type": "object" }
            }
          }
        }
      }
    },
    "conditionalLogic": {
      "type": "object",
      "properties": {
        "show": { "type": "boolean" },
        "when": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "field": { "type": "string" },
              "operator": {
                "type": "string",
                "enum": ["equals", "not_equals", "contains", "greater_than", "less_than", "is_empty", "is_not_empty"]
              },
              "value": {}
            }
          }
        },
        "action": {
          "type": "string",
          "enum": ["show", "hide", "enable", "disable", "require", "unrequire"]
        }
      }
    },
    "choice": {
      "type": "object",
      "required": ["value", "label"],
      "properties": {
        "value": { "type": "string" },
        "label": { "type": "string" },
        "disabled": { "type": "boolean" },
        "metadata": { "type": "object" }
      }
    },
    "fieldUI": {
      "type": "object",
      "properties": {
        "width": {
          "type": "string",
          "enum": ["full", "half", "third", "quarter"]
        },
        "className": { "type": "string" },
        "icon": { "type": "string" },
        "prefix": { "type": "string" },
        "suffix": { "type": "string" }
      }
    }
  }
}
```

### Submission Data Schema

The submission data stored in `submissions.data` column contains the actual form responses.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "description": "Flat key-value structure where keys are field names",
  "patternProperties": {
    "^[a-zA-Z][a-zA-Z0-9_]*$": {
      "description": "Field value - can be any JSON type",
      "oneOf": [
        { "type": "string" },
        { "type": "number" },
        { "type": "boolean" },
        { "type": "array" },
        { "type": "object" },
        { "type": "null" }
      ]
    }
  },
  "additionalProperties": false
}
```

Example submission data:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "dateOfBirth": "1990-01-15",
  "interests": ["coding", "music", "travel"],
  "address": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94105"
  },
  "agreeToTerms": true,
  "attachments": [
    {
      "id": "file_123",
      "name": "resume.pdf",
      "size": 245000,
      "url": "/api/attachments/file_123"
    }
  ]
}
```

### Workflow Definition Schema

The workflow definition stored in `workflows.definition` column contains the state machine configuration.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["initialState", "states"],
  "properties": {
    "name": { "type": "string" },
    "description": { "type": "string" },
    "version": { "type": "string" },
    "initialState": { "type": "string" },
    "context": {
      "type": "object",
      "description": "Initial context variables"
    },
    "states": {
      "type": "object",
      "patternProperties": {
        "^[a-zA-Z][a-zA-Z0-9_]*$": {
          "$ref": "#/definitions/state"
        }
      }
    },
    "guards": {
      "type": "object",
      "patternProperties": {
        "^[a-zA-Z][a-zA-Z0-9_]*$": {
          "$ref": "#/definitions/guard"
        }
      }
    },
    "actions": {
      "type": "object",
      "patternProperties": {
        "^[a-zA-Z][a-zA-Z0-9_]*$": {
          "$ref": "#/definitions/action"
        }
      }
    }
  },
  "definitions": {
    "state": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "enum": ["initial", "normal", "final", "parallel", "compound"]
        },
        "on": {
          "type": "object",
          "description": "Event transitions",
          "patternProperties": {
            "^[A-Z][A-Z0-9_]*$": {
              "$ref": "#/definitions/transition"
            }
          }
        },
        "entry": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Actions to execute on entry"
        },
        "exit": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Actions to execute on exit"
        },
        "always": {
          "$ref": "#/definitions/transition",
          "description": "Automatic transition"
        },
        "after": {
          "type": "object",
          "description": "Delayed transitions",
          "patternProperties": {
            "^[0-9]+$": {
              "$ref": "#/definitions/transition"
            }
          }
        },
        "states": {
          "type": "object",
          "description": "Nested states for compound states"
        }
      }
    },
    "transition": {
      "oneOf": [
        { "type": "string" },
        {
          "type": "object",
          "properties": {
            "target": { "type": "string" },
            "guard": { "type": "string" },
            "actions": {
              "type": "array",
              "items": { "type": "string" }
            }
          }
        }
      ]
    },
    "guard": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "enum": ["expression", "function", "api"]
        },
        "expression": { "type": "string" },
        "function": { "type": "string" },
        "endpoint": { "type": "string" }
      }
    },
    "action": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "enum": ["assign", "send", "raise", "log", "api", "email", "webhook"]
        },
        "params": { "type": "object" }
      }
    }
  }
}
```

### Event Payload Schema

The event payload stored in `events.payload` column contains event-specific data.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["eventName", "timestamp"],
  "properties": {
    "eventName": { "type": "string" },
    "timestamp": { "type": "string", "format": "date-time" },
    "actor": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "type": { "type": "string" },
        "name": { "type": "string" }
      }
    },
    "target": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "type": { "type": "string" },
        "name": { "type": "string" }
      }
    },
    "changes": {
      "type": "object",
      "properties": {
        "before": { "type": "object" },
        "after": { "type": "object" },
        "delta": { "type": "array" }
      }
    },
    "metadata": { "type": "object" }
  }
}
```

## JSONB Validation Strategies

### Database-Level Validation

#### Using CHECK Constraints

```sql
-- Validate form definition structure
ALTER TABLE forms ADD CONSTRAINT valid_form_definition
CHECK (
    definition ? 'title' AND
    definition ? 'fields' AND
    jsonb_typeof(definition->'fields') = 'array' AND
    jsonb_array_length(definition->'fields') > 0
);

-- Validate submission data has required fields
CREATE OR REPLACE FUNCTION validate_submission_data()
RETURNS TRIGGER AS $$
DECLARE
    required_fields jsonb;
    field record;
BEGIN
    -- Get required fields from form definition
    SELECT jsonb_agg(f->>'name')
    INTO required_fields
    FROM forms,
         jsonb_array_elements(definition->'fields') f
    WHERE id = NEW.form_id
    AND (f->>'required')::boolean = true;

    -- Check all required fields are present
    FOR field IN SELECT jsonb_array_elements_text(required_fields) AS name
    LOOP
        IF NOT (NEW.data ? field.name) OR NEW.data->>field.name IS NULL THEN
            RAISE EXCEPTION 'Required field % is missing', field.name;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_submission_before_insert
    BEFORE INSERT OR UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION validate_submission_data();
```

#### Using pg_jsonschema Extension

```sql
-- Install extension
CREATE EXTENSION IF NOT EXISTS pg_jsonschema;

-- Add validation function
CREATE OR REPLACE FUNCTION validate_json_schema(
    data jsonb,
    schema jsonb
) RETURNS boolean AS $$
BEGIN
    RETURN jsonschema_is_valid(schema, data);
END;
$$ LANGUAGE plpgsql;

-- Use in CHECK constraint
ALTER TABLE forms ADD CONSTRAINT valid_form_schema
CHECK (validate_json_schema(definition, '{
    "type": "object",
    "required": ["title", "fields"],
    "properties": {
        "title": {"type": "string"},
        "fields": {"type": "array"}
    }
}'::jsonb));
```

### Application-Level Validation

#### TypeScript/Zod Validation

```typescript
import { z } from 'zod';

// Define Zod schema
const FormDefinitionSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  fields: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['text', 'number', 'date', /* ... */]),
      name: z.string(),
      label: z.string(),
      required: z.boolean().default(false),
      validation: z.object({
        minLength: z.number().optional(),
        maxLength: z.number().optional(),
        pattern: z.string().optional()
      }).optional()
    })
  ).min(1)
});

// Validate before insert
async function createForm(definition: unknown) {
  // Parse and validate
  const validated = FormDefinitionSchema.parse(definition);

  // Insert into database
  const result = await db.insert(forms).values({
    definition: validated
  });

  return result;
}
```

## JSONB Query Patterns

### Basic Queries

```sql
-- Get forms with specific field type
SELECT * FROM forms
WHERE definition @> '{"fields": [{"type": "signature"}]}';

-- Get submissions with specific value
SELECT * FROM submissions
WHERE data @> '{"status": "approved"}';

-- Get forms with more than 10 fields
SELECT * FROM forms
WHERE jsonb_array_length(definition->'fields') > 10;
```

### Advanced Queries

```sql
-- Find all forms with email fields
SELECT
    f.id,
    f.name,
    field->>'name' as field_name,
    field->>'label' as field_label
FROM forms f,
     jsonb_array_elements(f.definition->'fields') field
WHERE field->>'type' = 'email';

-- Get submission statistics by form field
SELECT
    f.name as form_name,
    field->>'name' as field_name,
    COUNT(DISTINCT s.id) as submissions_with_value,
    COUNT(DISTINCT s.data->>field->>'name') as unique_values
FROM forms f
JOIN submissions s ON f.id = s.form_id,
     jsonb_array_elements(f.definition->'fields') field
WHERE s.data ? field->>'name'
GROUP BY f.name, field->>'name';

-- Find workflows using specific action type
SELECT
    w.name,
    state_name,
    action
FROM workflows w,
     jsonb_each(w.definition->'states') AS state(state_name, state_def),
     jsonb_array_elements_text(state_def->'entry') AS action
WHERE action LIKE 'email:%';
```

### Path-Based Queries

```sql
-- Using jsonb_path_query
SELECT * FROM forms
WHERE jsonb_path_exists(
    definition,
    '$.fields[*] ? (@.type == "file" && @.validation.maxSize > 10485760)'
);

-- Extract nested values with path
SELECT
    id,
    jsonb_path_query(definition, '$.fields[*].name') as field_names
FROM forms;

-- Complex path queries
SELECT * FROM submissions
WHERE jsonb_path_query_first(
    data,
    '$.address.country'
)::text = '"USA"';
```

## JSONB Update Patterns

### Partial Updates

```sql
-- Add a new field to form definition
UPDATE forms
SET definition = jsonb_set(
    definition,
    '{fields}',
    definition->'fields' || '[{"id": "field_new", "type": "text", "name": "newField"}]'::jsonb
)
WHERE id = 'form_123';

-- Update specific field property
UPDATE forms
SET definition = jsonb_set(
    definition,
    '{fields,0,required}',
    'true'::jsonb
)
WHERE id = 'form_123';

-- Remove a field
UPDATE forms
SET definition = jsonb_set(
    definition,
    '{fields}',
    (
        SELECT jsonb_agg(field)
        FROM jsonb_array_elements(definition->'fields') field
        WHERE field->>'id' != 'field_to_remove'
    )
)
WHERE id = 'form_123';
```

### Deep Merging

```sql
-- Merge settings
UPDATE organizations
SET settings = settings || '{"features": {"newFeature": true}}'::jsonb
WHERE id = 'org_123';

-- Deep merge with jsonb_set
UPDATE forms
SET definition = jsonb_set(
    definition,
    '{settings}',
    COALESCE(definition->'settings', '{}'::jsonb) || '{"theme": "dark"}'::jsonb
)
WHERE id = 'form_123';
```

## JSONB Performance Optimization

### Indexing Strategies

```sql
-- GIN index for containment queries
CREATE INDEX idx_forms_definition_gin ON forms USING gin(definition);

-- GIN index with jsonb_path_ops for smaller index size
CREATE INDEX idx_submissions_data_ops ON submissions USING gin(data jsonb_path_ops);

-- Expression index for frequently queried paths
CREATE INDEX idx_forms_field_types ON forms USING gin((definition->'fields'));

-- B-tree index on extracted value
CREATE INDEX idx_submissions_email ON submissions((data->>'email'));

-- Partial index for specific conditions
CREATE INDEX idx_forms_with_files ON forms USING gin(definition)
WHERE definition @> '{"fields": [{"type": "file"}]}';
```

### Query Optimization

```sql
-- Use specialized operators for better performance
-- @> containment is faster than multiple field checks
SELECT * FROM submissions
WHERE data @> '{"status": "approved", "priority": "high"}';

-- Use jsonb_exists for array element checks
SELECT * FROM forms
WHERE jsonb_exists(definition->'fields', 'signature');

-- Avoid expensive operations in WHERE clause
-- Bad:
SELECT * FROM submissions
WHERE jsonb_array_length(data->'items') > 5;

-- Good: Create functional index
CREATE INDEX idx_submission_items_count ON submissions((jsonb_array_length(data->'items')));
SELECT * FROM submissions
WHERE jsonb_array_length(data->'items') > 5;
```

## JSONB Storage Optimization

### Compression

```sql
-- Enable TOAST compression for large JSONB
ALTER TABLE forms ALTER COLUMN definition SET STORAGE EXTENDED;
ALTER TABLE submissions ALTER COLUMN data SET STORAGE EXTENDED;

-- For very large JSONB, use EXTERNAL storage
ALTER TABLE events ALTER COLUMN payload SET STORAGE EXTERNAL;
```

### Normalization vs Denormalization

```sql
-- Denormalized: All data in JSONB
CREATE TABLE submissions_denormalized (
    id UUID PRIMARY KEY,
    data JSONB -- Contains all submission data including metadata
);

-- Hybrid: Common queries in columns, rest in JSONB
CREATE TABLE submissions_hybrid (
    id UUID PRIMARY KEY,
    form_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    submitted_at TIMESTAMPTZ,
    -- Extracted for performance
    email VARCHAR(255) GENERATED ALWAYS AS (data->>'email') STORED,
    -- Rest of data
    data JSONB
);
```

## JSONB Migration Patterns

### Schema Evolution

```sql
-- Add default value to all existing records
UPDATE forms
SET definition = jsonb_set(
    definition,
    '{version}',
    '"1.0.0"'::jsonb
)
WHERE NOT (definition ? 'version');

-- Rename field in all forms
UPDATE forms
SET definition = jsonb_set(
    definition,
    '{fields}',
    (
        SELECT jsonb_agg(
            CASE
                WHEN field->>'name' = 'oldName'
                THEN field || '{"name": "newName"}'::jsonb
                ELSE field
            END
        )
        FROM jsonb_array_elements(definition->'fields') field
    )
);

-- Migrate to new structure
UPDATE submissions
SET data = jsonb_build_object(
    'formData', data,
    'metadata', jsonb_build_object(
        'source', 'legacy',
        'migrated', now()
    )
)
WHERE NOT (data ? 'formData');
```

## Best Practices

### Do's

✅ **Validate JSONB at application level** before database insertion
✅ **Use appropriate indexes** for your query patterns
✅ **Extract frequently queried fields** to regular columns
✅ **Keep JSONB structures consistent** across records
✅ **Document your JSONB schemas** thoroughly
✅ **Use transactions** for complex JSONB updates
✅ **Monitor JSONB column sizes** and compression ratios

### Don'ts

❌ **Don't store large binary data** in JSONB
❌ **Don't deeply nest** beyond 3-4 levels
❌ **Don't use JSONB** for highly relational data
❌ **Don't forget indexes** on JSONB columns
❌ **Don't mix data types** for the same field across records
❌ **Don't ignore NULL handling** in JSONB queries

## Monitoring and Maintenance

### Size Analysis

```sql
-- Check JSONB column sizes
SELECT
    schemaname,
    tablename,
    attname as column_name,
    pg_size_pretty(
        sum(pg_column_size(column_name::text))::bigint
    ) as total_size,
    count(*) as row_count,
    pg_size_pretty(
        avg(pg_column_size(column_name::text))::bigint
    ) as avg_size
FROM information_schema.columns
JOIN pg_attribute ON attname = column_name
WHERE data_type = 'jsonb'
GROUP BY schemaname, tablename, attname
ORDER BY sum(pg_column_size(column_name::text)) DESC;
```

### Query Performance

```sql
-- Monitor slow JSONB queries
CREATE OR REPLACE VIEW slow_jsonb_queries AS
SELECT
    query,
    calls,
    mean_exec_time,
    total_exec_time
FROM pg_stat_statements
WHERE query LIKE '%jsonb%' OR query LIKE '%->%' OR query LIKE '%@>%'
ORDER BY mean_exec_time DESC
LIMIT 20;
```