# Form Engine API Specification

## Purpose
This document provides comprehensive REST API specifications for the Form Engine component, including all endpoints, request/response schemas, authentication, error handling, and integration patterns.

## Classification
- **Domain:** API Specification
- **Stability:** Stable
- **Abstraction:** Interface
- **Confidence:** Established

## API Overview

The Form Engine API provides RESTful endpoints for managing form definitions, form submissions, and related operations. The API follows OpenAPI 3.0 standards and includes comprehensive error handling, authentication, and rate limiting.

### Base Configuration

```yaml
openapi: 3.0.3
info:
  title: Form Engine API
  description: Comprehensive form management and submission API
  version: 1.0.0
  contact:
    name: API Support
    email: api-support@pliers.dev
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.pliers.dev/v1
    description: Production server
  - url: https://staging-api.pliers.dev/v1
    description: Staging server
  - url: http://localhost:3000/api/v1
    description: Development server

security:
  - BearerAuth: []
  - ApiKeyAuth: []

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
```

## Authentication and Authorization

### Authentication Methods

1. **JWT Bearer Token** (Recommended for web applications)
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

2. **API Key** (For server-to-server communication)
```http
X-API-Key: api_key_1234567890abcdef
```

### Authorization Levels

| Role | Permissions |
|------|-------------|
| **admin** | Full access to all forms and submissions |
| **editor** | Create, read, update forms; read all submissions |
| **author** | Create, read, update own forms; read own submissions |
| **viewer** | Read access to published forms only |
| **submitter** | Submit forms and view own submissions |

### Scope-Based Access

```typescript
interface AuthScope {
  forms: 'read' | 'write' | 'admin';
  submissions: 'read' | 'write' | 'admin';
  analytics: 'read' | 'admin';
}
```

## Form Definition Endpoints

### 1. List Forms

Retrieve a paginated list of form definitions with filtering and search capabilities.

```http
GET /forms
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 20, max: 100) |
| `status` | string[] | No | Filter by status (draft, published, deprecated, archived) |
| `category` | string[] | No | Filter by category |
| `tags` | string[] | No | Filter by tags |
| `search` | string | No | Full-text search in title and description |
| `sort` | string | No | Sort field (title, createdAt, updatedAt) |
| `order` | string | No | Sort order (asc, desc) |
| `createdBy` | string | No | Filter by creator user ID |
| `dateFrom` | string | No | Filter forms created after date (ISO 8601) |
| `dateTo` | string | No | Filter forms created before date (ISO 8601) |

#### Example Request

```http
GET /forms?page=1&limit=10&status=published&category=hr&search=job%20application&sort=updatedAt&order=desc

Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "job_application",
      "version": "2.1.0",
      "status": "published",
      "metadata": {
        "title": "Job Application Form",
        "description": "Apply for a position at our company",
        "category": "hr",
        "tags": ["job", "application", "recruitment"],
        "version": "2.1.0"
      },
      "createdAt": "2025-01-22T10:00:00Z",
      "updatedAt": "2025-01-22T11:15:00Z",
      "createdBy": "550e8400-e29b-41d4-a716-446655440001",
      "updatedBy": "550e8400-e29b-41d4-a716-446655440001"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "metadata": {
    "totalByStatus": {
      "published": 15,
      "draft": 8,
      "deprecated": 2
    }
  }
}
```

### 2. Create Form

Create a new form definition.

```http
POST /forms
```

#### Request Body

```json
{
  "name": "customer_feedback",
  "metadata": {
    "title": "Customer Feedback Form",
    "description": "Help us improve our services",
    "category": "feedback",
    "tags": ["customer", "feedback", "survey"],
    "submitButtonText": "Submit Feedback",
    "successMessage": "Thank you for your feedback!"
  },
  "schema": {
    "fields": [
      {
        "id": "customer_name",
        "type": "text",
        "name": "customer_name",
        "required": true,
        "validation": {
          "required": true,
          "minLength": 2,
          "maxLength": 100
        },
        "ui": {
          "label": "Your Name",
          "placeholder": "Enter your full name",
          "width": "full",
          "order": 1
        }
      },
      {
        "id": "email",
        "type": "email",
        "name": "email",
        "required": true,
        "validation": {
          "required": true,
          "format": "email"
        },
        "ui": {
          "label": "Email Address",
          "placeholder": "your.email@example.com",
          "width": "full",
          "order": 2
        }
      },
      {
        "id": "rating",
        "type": "rating",
        "name": "overall_rating",
        "required": true,
        "validation": {
          "required": true,
          "min": 1,
          "max": 5
        },
        "ui": {
          "label": "Overall Rating",
          "helpText": "Rate your overall experience",
          "width": "full",
          "order": 3
        }
      },
      {
        "id": "comments",
        "type": "textarea",
        "name": "comments",
        "validation": {
          "maxLength": 1000
        },
        "ui": {
          "label": "Additional Comments",
          "placeholder": "Tell us more about your experience...",
          "helpText": "Optional feedback (max 1000 characters)",
          "width": "full",
          "order": 4
        }
      }
    ],
    "layout": {
      "type": "grid",
      "columns": 1,
      "gap": "1rem"
    }
  }
}
```

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440005",
  "name": "customer_feedback",
  "version": "1.0.0",
  "status": "draft",
  "metadata": {
    "title": "Customer Feedback Form",
    "description": "Help us improve our services",
    "category": "feedback",
    "tags": ["customer", "feedback", "survey"],
    "version": "1.0.0",
    "submitButtonText": "Submit Feedback",
    "successMessage": "Thank you for your feedback!"
  },
  "schema": {
    "fields": [
      // ... field definitions
    ]
  },
  "createdAt": "2025-01-22T16:00:00Z",
  "updatedAt": "2025-01-22T16:00:00Z",
  "createdBy": "550e8400-e29b-41d4-a716-446655440002",
  "updatedBy": "550e8400-e29b-41d4-a716-446655440002"
}
```

### 3. Get Form by ID

Retrieve a specific form definition by its ID.

```http
GET /forms/{formId}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `formId` | string | Yes | UUID of the form |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `version` | string | No | Specific version to retrieve (default: latest) |
| `include` | string[] | No | Additional data to include (submissions, analytics) |

#### Example Request

```http
GET /forms/550e8400-e29b-41d4-a716-446655440000?include=analytics

Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "job_application",
  "version": "2.1.0",
  "status": "published",
  "metadata": {
    "title": "Job Application Form",
    "description": "Apply for a position at our company",
    "category": "hr",
    "tags": ["job", "application", "recruitment"],
    "version": "2.1.0",
    "allowMultipleSubmissions": false,
    "saveProgress": true,
    "showProgressBar": true
  },
  "schema": {
    "fields": [
      // ... complete field definitions
    ],
    "conditional": {
      "rules": [
        // ... conditional logic rules
      ]
    }
  },
  "analytics": {
    "totalSubmissions": 1247,
    "submissionsThisMonth": 89,
    "averageCompletionTime": 342000,
    "abandonmentRate": 0.12
  },
  "createdAt": "2025-01-22T10:00:00Z",
  "updatedAt": "2025-01-22T11:15:00Z",
  "createdBy": "550e8400-e29b-41d4-a716-446655440001",
  "updatedBy": "550e8400-e29b-41d4-a716-446655440001"
}
```

### 4. Update Form

Update an existing form definition. This creates a new version if the form is published.

```http
PUT /forms/{formId}
```

#### Request Body

```json
{
  "metadata": {
    "title": "Updated Job Application Form",
    "description": "Apply for a position at our company - Now with enhanced features"
  },
  "schema": {
    "fields": [
      // ... updated field definitions
    ]
  },
  "changelog": "Added portfolio field for designer positions, improved validation messages"
}
```

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "job_application",
  "version": "2.2.0",
  "status": "draft",
  "parentVersion": "2.1.0",
  "changelog": "Added portfolio field for designer positions, improved validation messages",
  // ... updated form definition
  "updatedAt": "2025-01-22T16:30:00Z",
  "updatedBy": "550e8400-e29b-41d4-a716-446655440001"
}
```

### 5. Delete Form

Soft delete a form definition.

```http
DELETE /forms/{formId}
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `permanent` | boolean | No | Permanently delete (default: false) |

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "archived",
  "deletedAt": "2025-01-22T17:00:00Z",
  "message": "Form has been archived and is no longer accepting submissions"
}
```

### 6. Form Versions

Manage form versions and retrieve version history.

```http
GET /forms/{formId}/versions
```

#### Response

```json
{
  "data": [
    {
      "version": "2.2.0",
      "status": "draft",
      "changelog": "Added portfolio field for designer positions",
      "createdAt": "2025-01-22T16:30:00Z",
      "createdBy": "550e8400-e29b-41d4-a716-446655440001"
    },
    {
      "version": "2.1.0",
      "status": "published",
      "changelog": "Enhanced conditional logic for technical skills",
      "createdAt": "2025-01-22T11:15:00Z",
      "createdBy": "550e8400-e29b-41d4-a716-446655440001"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### 7. Publish Form

Publish a draft form to make it available for submissions.

```http
POST /forms/{formId}/publish
```

#### Request Body

```json
{
  "publishAt": "2025-01-23T09:00:00Z",
  "notifySubscribers": true,
  "migrationScript": "UPDATE submissions SET status = 'migrated' WHERE form_version < '2.2.0'"
}
```

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "version": "2.2.0",
  "status": "published",
  "publishedAt": "2025-01-23T09:00:00Z",
  "message": "Form has been published successfully"
}
```

### 8. Clone Form

Create a copy of an existing form.

```http
POST /forms/{formId}/clone
```

#### Request Body

```json
{
  "name": "job_application_intern",
  "metadata": {
    "title": "Internship Application Form",
    "category": "hr"
  },
  "modifications": {
    "removeFields": ["salary_expectation"],
    "addFields": [
      {
        "id": "school_name",
        "type": "text",
        "name": "school_name",
        "ui": {
          "label": "School/University",
          "order": 3
        }
      }
    ]
  }
}
```

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440006",
  "name": "job_application_intern",
  "version": "1.0.0",
  "status": "draft",
  "clonedFrom": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "title": "Internship Application Form",
    "category": "hr"
  },
  // ... modified form definition
}
```

### 9. Validate Form

Validate a form definition without saving it.

```http
POST /forms/validate
```

#### Request Body

```json
{
  "schema": {
    "fields": [
      // ... field definitions to validate
    ]
  }
}
```

#### Response

```json
{
  "valid": true,
  "warnings": [
    {
      "field": "phone_number",
      "code": "ACCESSIBILITY_WARNING",
      "message": "Consider adding aria-label for better accessibility"
    }
  ],
  "suggestions": [
    {
      "field": "email",
      "type": "VALIDATION_ENHANCEMENT",
      "message": "Consider adding domain validation for business emails"
    }
  ]
}
```

## Form Submission Endpoints

### 10. List Submissions

Retrieve form submissions with advanced filtering and search.

```http
GET /forms/{formId}/submissions
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 20, max: 100) |
| `status` | string[] | No | Filter by status |
| `submittedBy` | string[] | No | Filter by submitter user ID |
| `dateFrom` | string | No | Submissions after date (ISO 8601) |
| `dateTo` | string | No | Submissions before date (ISO 8601) |
| `search` | string | No | Search in submission data |
| `sort` | string | No | Sort field (submittedAt, updatedAt, status) |
| `order` | string | No | Sort order (asc, desc) |
| `fields` | string[] | No | Specific fields to include |
| `dataFilter` | string | No | JSON filter for submission data |

#### Example Request

```http
GET /forms/550e8400-e29b-41d4-a716-446655440000/submissions?status=submitted&dateFrom=2025-01-01&limit=50&sort=submittedAt&order=desc

Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440100",
      "formDefinitionId": "550e8400-e29b-41d4-a716-446655440000",
      "formVersion": "2.1.0",
      "status": "submitted",
      "data": {
        "first_name": "Jane",
        "last_name": "Smith",
        "email": "jane.smith@example.com",
        "position_applied": "software_engineer"
      },
      "isValid": true,
      "submittedAt": "2025-01-22T14:30:00Z",
      "createdAt": "2025-01-22T14:20:00Z",
      "submittedBy": "550e8400-e29b-41d4-a716-446655440051"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1247,
    "totalPages": 25,
    "hasNext": true,
    "hasPrev": false
  },
  "aggregations": {
    "statusCounts": {
      "submitted": 1100,
      "processing": 89,
      "approved": 45,
      "rejected": 13
    },
    "submissionsByDay": [
      { "date": "2025-01-22", "count": 23 },
      { "date": "2025-01-21", "count": 18 }
    ]
  }
}
```

### 11. Create Submission

Create a new form submission.

```http
POST /forms/{formId}/submissions
```

#### Request Body

```json
{
  "data": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1-555-123-4567",
    "position_applied": "software_engineer",
    "years_experience": "4-5",
    "programming_languages": ["javascript", "python", "typescript"],
    "why_join": "I'm passionate about building scalable applications and would love to contribute to your innovative projects."
  },
  "files": {
    "resume": {
      "name": "john_doe_resume.pdf",
      "data": "base64_encoded_file_data",
      "contentType": "application/pdf"
    }
  },
  "metadata": {
    "source": "web",
    "referrer": "https://careers.example.com",
    "userAgent": "Mozilla/5.0...",
    "timeZone": "America/New_York"
  },
  "draft": false
}
```

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440102",
  "formDefinitionId": "550e8400-e29b-41d4-a716-446655440000",
  "formVersion": "2.1.0",
  "status": "submitted",
  "data": {
    // ... submitted data
  },
  "files": {
    "resume": {
      "name": "john_doe_resume.pdf",
      "size": 1024567,
      "type": "application/pdf",
      "url": "https://storage.example.com/files/resume_john_doe.pdf"
    }
  },
  "isValid": true,
  "submittedAt": "2025-01-22T15:45:00Z",
  "createdAt": "2025-01-22T15:45:00Z",
  "submittedBy": "550e8400-e29b-41d4-a716-446655440052"
}
```

### 12. Get Submission

Retrieve a specific submission.

```http
GET /submissions/{submissionId}
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `include` | string[] | No | Additional data (form_definition, files, history) |

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440102",
  "formDefinitionId": "550e8400-e29b-41d4-a716-446655440000",
  "formVersion": "2.1.0",
  "status": "processing",
  "data": {
    // ... complete submission data
  },
  "files": {
    // ... file metadata and URLs
  },
  "workflowState": {
    "stage": "technical_review",
    "assignedTo": "tech_lead_001",
    "notes": "Strong technical background, schedule technical interview"
  },
  "priority": "high",
  "revisionHistory": [
    {
      "timestamp": "2025-01-22T16:00:00Z",
      "userId": "hr_manager_001",
      "changes": {
        "status": "processing",
        "workflowState.stage": "technical_review"
      },
      "comment": "Moved to technical review stage"
    }
  ],
  "submittedAt": "2025-01-22T15:45:00Z",
  "createdAt": "2025-01-22T15:45:00Z",
  "updatedAt": "2025-01-22T16:00:00Z"
}
```

### 13. Update Submission

Update an existing submission (typically for status changes or workflow progression).

```http
PUT /submissions/{submissionId}
```

#### Request Body

```json
{
  "status": "approved",
  "workflowState": {
    "stage": "offer_extended",
    "assignedTo": "hr_manager_001",
    "notes": "Offer extended, awaiting response"
  },
  "priority": "high",
  "metadata": {
    "reviewedBy": "tech_lead_001",
    "reviewDate": "2025-01-22T17:00:00Z",
    "offerAmount": 95000
  },
  "comment": "Excellent candidate, offer extended"
}
```

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440102",
  "status": "approved",
  "workflowState": {
    "stage": "offer_extended",
    "assignedTo": "hr_manager_001",
    "notes": "Offer extended, awaiting response"
  },
  "updatedAt": "2025-01-22T17:15:00Z",
  "updatedBy": "hr_manager_001",
  "message": "Submission status updated successfully"
}
```

### 14. Delete Submission

Delete a submission (soft delete by default).

```http
DELETE /submissions/{submissionId}
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `permanent` | boolean | No | Permanently delete (default: false) |
| `reason` | string | No | Reason for deletion |

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440102",
  "status": "deleted",
  "deletedAt": "2025-01-22T18:00:00Z",
  "deletedBy": "admin_001",
  "reason": "Duplicate submission",
  "message": "Submission has been deleted"
}
```

### 15. Validate Submission

Validate submission data against form definition without saving.

```http
POST /forms/{formId}/validate-submission
```

#### Request Body

```json
{
  "data": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "invalid-email",
    "position_applied": "software_engineer"
  }
}
```

#### Response

```json
{
  "valid": false,
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT",
      "message": "Please enter a valid email address",
      "value": "invalid-email"
    },
    {
      "field": "phone",
      "code": "REQUIRED",
      "message": "Phone number is required",
      "value": null
    }
  ],
  "warnings": [
    {
      "field": "why_join",
      "code": "TOO_SHORT",
      "message": "Consider providing more detail about your motivation"
    }
  ]
}
```

## Advanced Query Endpoints

### 16. Advanced Form Search

Perform complex searches across forms with multiple criteria.

```http
POST /forms/search
```

#### Request Body

```json
{
  "query": {
    "text": "job application",
    "fields": ["metadata.title", "metadata.description"],
    "filters": [
      {
        "field": "metadata.category",
        "operator": "in",
        "value": ["hr", "recruitment"]
      },
      {
        "field": "status",
        "operator": "equals",
        "value": "published"
      },
      {
        "field": "createdAt",
        "operator": "gte",
        "value": "2025-01-01T00:00:00Z"
      }
    ],
    "facets": ["metadata.category", "status", "metadata.tags"]
  },
  "sort": [
    { "field": "_score", "direction": "desc" },
    { "field": "updatedAt", "direction": "desc" }
  ],
  "page": 1,
  "limit": 20
}
```

#### Response

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "job_application",
      "score": 0.95,
      "highlights": {
        "metadata.title": ["<em>Job Application</em> Form"],
        "metadata.description": ["Apply for a position at our company"]
      },
      // ... form data
    }
  ],
  "facets": {
    "metadata.category": [
      { "value": "hr", "count": 15 },
      { "value": "recruitment", "count": 8 }
    ],
    "status": [
      { "value": "published", "count": 18 },
      { "value": "draft", "count": 5 }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 23,
    "totalPages": 2
  }
}
```

### 17. Advanced Submission Query

Query submissions with complex data filters and aggregations.

```http
POST /submissions/query
```

#### Request Body

```json
{
  "query": {
    "formIds": ["550e8400-e29b-41d4-a716-446655440000"],
    "dateRange": {
      "field": "submittedAt",
      "start": "2025-01-01T00:00:00Z",
      "end": "2025-01-31T23:59:59Z"
    },
    "dataFilters": [
      {
        "field": "position_applied",
        "operator": "in",
        "value": ["software_engineer", "senior_software_engineer"]
      },
      {
        "field": "years_experience",
        "operator": "in",
        "value": ["4-5", "6-10", "10+"]
      },
      {
        "field": "programming_languages",
        "operator": "contains",
        "value": "javascript"
      }
    ],
    "status": ["submitted", "processing", "approved"]
  },
  "aggregations": {
    "positionCounts": {
      "field": "data.position_applied",
      "type": "terms"
    },
    "experienceLevels": {
      "field": "data.years_experience",
      "type": "terms"
    },
    "submissionsByDay": {
      "field": "submittedAt",
      "type": "date_histogram",
      "interval": "day"
    },
    "averageProcessingTime": {
      "field": "metadata.processingTime",
      "type": "avg"
    }
  },
  "sort": [
    { "field": "submittedAt", "direction": "desc" }
  ],
  "page": 1,
  "limit": 100
}
```

#### Response

```json
{
  "data": [
    // ... submission data
  ],
  "aggregations": {
    "positionCounts": {
      "buckets": [
        { "key": "software_engineer", "count": 45 },
        { "key": "senior_software_engineer", "count": 23 }
      ]
    },
    "experienceLevels": {
      "buckets": [
        { "key": "4-5", "count": 28 },
        { "key": "6-10", "count": 25 },
        { "key": "10+", "count": 15 }
      ]
    },
    "submissionsByDay": {
      "buckets": [
        { "key": "2025-01-22", "count": 12 },
        { "key": "2025-01-21", "count": 8 }
      ]
    },
    "averageProcessingTime": {
      "value": 1450.5
    }
  },
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 68,
    "totalPages": 1
  }
}
```

## Analytics and Reporting Endpoints

### 18. Form Analytics

Get comprehensive analytics for a specific form.

```http
GET /forms/{formId}/analytics
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | No | Time period (7d, 30d, 90d, 1y, all) |
| `granularity` | string | No | Data granularity (hour, day, week, month) |
| `metrics` | string[] | No | Specific metrics to include |

#### Response

```json
{
  "formId": "550e8400-e29b-41d4-a716-446655440000",
  "period": "30d",
  "summary": {
    "totalSubmissions": 247,
    "totalViews": 1560,
    "conversionRate": 0.158,
    "averageCompletionTime": 342000,
    "abandonmentRate": 0.12,
    "topExitField": "years_experience"
  },
  "timeSeries": {
    "submissions": [
      { "date": "2025-01-22", "count": 12, "completions": 10 },
      { "date": "2025-01-21", "count": 8, "completions": 7 }
    ],
    "views": [
      { "date": "2025-01-22", "count": 89 },
      { "date": "2025-01-21", "count": 67 }
    ]
  },
  "fieldAnalytics": {
    "first_name": {
      "completionRate": 0.98,
      "averageTime": 3500,
      "errorRate": 0.02,
      "commonErrors": ["TOO_SHORT", "INVALID_CHARACTERS"]
    },
    "email": {
      "completionRate": 0.95,
      "averageTime": 5200,
      "errorRate": 0.05,
      "commonErrors": ["INVALID_FORMAT"]
    }
  },
  "deviceBreakdown": {
    "desktop": 0.65,
    "mobile": 0.30,
    "tablet": 0.05
  },
  "geographicData": [
    { "country": "US", "submissions": 180, "percentage": 0.73 },
    { "country": "CA", "submissions": 42, "percentage": 0.17 }
  ]
}
```

### 19. System Analytics

Get platform-wide analytics and insights.

```http
GET /analytics/overview
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | No | Time period (7d, 30d, 90d, 1y) |
| `include` | string[] | No | Sections to include (forms, submissions, users, performance) |

#### Response

```json
{
  "period": "30d",
  "overview": {
    "totalForms": 156,
    "activeForms": 89,
    "totalSubmissions": 12450,
    "totalUsers": 1250,
    "averageResponseTime": 145
  },
  "growth": {
    "formsCreated": {
      "current": 23,
      "previous": 18,
      "changePercent": 27.8
    },
    "submissions": {
      "current": 12450,
      "previous": 9890,
      "changePercent": 25.9
    }
  },
  "topForms": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "job_application",
      "title": "Job Application Form",
      "submissions": 1247,
      "conversionRate": 0.158
    }
  ],
  "performance": {
    "averageApiResponseTime": 145,
    "p95ResponseTime": 450,
    "errorRate": 0.002,
    "uptime": 0.9995
  }
}
```

## File Management Endpoints

### 20. Upload File

Upload files for form submissions.

```http
POST /files/upload
```

#### Request (Multipart Form Data)

```http
Content-Type: multipart/form-data

file: [binary file data]
fieldId: "resume"
submissionId: "550e8400-e29b-41d4-a716-446655440102"
metadata: {"description": "Resume for software engineer position"}
```

#### Response

```json
{
  "id": "file_550e8400-e29b-41d4-a716-446655440200",
  "fieldId": "resume",
  "submissionId": "550e8400-e29b-41d4-a716-446655440102",
  "filename": "john_doe_resume.pdf",
  "originalName": "Resume - John Doe.pdf",
  "size": 1024567,
  "contentType": "application/pdf",
  "url": "https://storage.example.com/files/resume_john_doe.pdf",
  "thumbnailUrl": "https://storage.example.com/thumbnails/resume_john_doe.jpg",
  "metadata": {
    "description": "Resume for software engineer position",
    "virusScanned": true,
    "scanResult": "clean"
  },
  "uploadedAt": "2025-01-22T15:40:00Z",
  "uploadedBy": "550e8400-e29b-41d4-a716-446655440052"
}
```

### 21. Get File

Download or get file information.

```http
GET /files/{fileId}
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `download` | boolean | No | Force download (default: false) |
| `thumbnail` | boolean | No | Get thumbnail (if available) |

#### Response (File Info)

```json
{
  "id": "file_550e8400-e29b-41d4-a716-446655440200",
  "filename": "john_doe_resume.pdf",
  "size": 1024567,
  "contentType": "application/pdf",
  "url": "https://storage.example.com/files/resume_john_doe.pdf",
  "downloadUrl": "https://api.pliers.dev/v1/files/file_550e8400-e29b-41d4-a716-446655440200/download",
  "metadata": {
    "pages": 2,
    "wordCount": 456,
    "virusScanned": true
  }
}
```

## WebSocket Endpoints

### 22. Real-time Form Updates

Connect to real-time form and submission updates.

```javascript
// WebSocket connection
const ws = new WebSocket('wss://api.pliers.dev/v1/ws');

// Authentication
ws.send(JSON.stringify({
  type: 'auth',
  token: 'your_jwt_token'
}));

// Subscribe to form updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'form_updates',
  formId: '550e8400-e29b-41d4-a716-446655440000'
}));

// Subscribe to submission updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'submission_updates',
  formId: '550e8400-e29b-41d4-a716-446655440000'
}));
```

#### WebSocket Events

```typescript
interface WebSocketEvent {
  type: 'form_updated' | 'submission_created' | 'submission_updated' | 'form_published';
  formId: string;
  submissionId?: string;
  data: any;
  timestamp: string;
  userId: string;
}
```

## Error Handling

### Error Response Format

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    },
    "timestamp": "2025-01-22T18:30:00Z",
    "requestId": "req_123456789",
    "documentation": "https://docs.pliers.dev/api/errors#validation-error"
  }
}
```

### HTTP Status Codes

| Status Code | Description | Usage |
|-------------|-------------|-------|
| `200` | OK | Successful GET, PUT requests |
| `201` | Created | Successful POST requests |
| `202` | Accepted | Async operations accepted |
| `204` | No Content | Successful DELETE requests |
| `400` | Bad Request | Invalid request format/data |
| `401` | Unauthorized | Authentication required |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource not found |
| `409` | Conflict | Resource conflict (duplicate, version mismatch) |
| `422` | Unprocessable Entity | Validation errors |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server-side errors |
| `503` | Service Unavailable | Temporary service issues |

### Common Error Codes

```typescript
enum ErrorCode {
  // Authentication & Authorization
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  INVALID_FIELD_TYPE = 'INVALID_FIELD_TYPE',
  INVALID_FIELD_VALUE = 'INVALID_FIELD_VALUE',

  // Resources
  FORM_NOT_FOUND = 'FORM_NOT_FOUND',
  SUBMISSION_NOT_FOUND = 'SUBMISSION_NOT_FOUND',
  VERSION_NOT_FOUND = 'VERSION_NOT_FOUND',

  // Business Logic
  FORM_NOT_PUBLISHED = 'FORM_NOT_PUBLISHED',
  DUPLICATE_SUBMISSION = 'DUPLICATE_SUBMISSION',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE = 'UNSUPPORTED_FILE_TYPE',

  // System
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}
```

## Rate Limiting

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642867200
X-RateLimit-Reset-After: 3600
```

### Rate Limit Tiers

| Tier | Requests/Hour | Burst Limit | File Upload/Day |
|------|---------------|-------------|-----------------|
| **Free** | 1,000 | 100 | 100 MB |
| **Pro** | 10,000 | 500 | 1 GB |
| **Enterprise** | 100,000 | 2,000 | 10 GB |

## API Versioning

### Version Strategy

- **URL Versioning**: `/api/v1/forms`
- **Header Versioning**: `Accept: application/vnd.pliers.v1+json`
- **Backward Compatibility**: 12 months minimum
- **Deprecation Notice**: 6 months advance notice

### Version Migration

```http
GET /api/v1/forms
X-API-Version: v1
X-Prefer-Version: v2
```

Response includes migration information:

```json
{
  "data": [...],
  "apiVersion": "v1",
  "deprecation": {
    "deprecated": true,
    "sunsetDate": "2025-12-31",
    "migrationGuide": "https://docs.pliers.dev/migration/v1-to-v2"
  }
}
```

## Integration Examples

### cURL Examples

```bash
# Create a new form
curl -X POST https://api.pliers.dev/v1/forms \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "contact_form",
    "metadata": {
      "title": "Contact Us",
      "category": "communication"
    },
    "schema": {
      "fields": [...]
    }
  }'

# Get form submissions
curl -X GET "https://api.pliers.dev/v1/forms/550e8400-e29b-41d4-a716-446655440000/submissions?status=submitted&limit=50" \
  -H "Authorization: Bearer your_jwt_token"

# Upload a file
curl -X POST https://api.pliers.dev/v1/files/upload \
  -H "Authorization: Bearer your_jwt_token" \
  -F "file=@resume.pdf" \
  -F "fieldId=resume" \
  -F "submissionId=550e8400-e29b-41d4-a716-446655440102"
```

### JavaScript SDK Example

```javascript
import { FormEngineClient } from '@pliers/form-engine-sdk';

const client = new FormEngineClient({
  baseUrl: 'https://api.pliers.dev/v1',
  apiKey: 'your_api_key'
});

// Create a form
const form = await client.forms.create({
  name: 'feedback_form',
  metadata: {
    title: 'Customer Feedback',
    category: 'feedback'
  },
  schema: {
    fields: [
      {
        id: 'rating',
        type: 'rating',
        name: 'overall_rating',
        required: true,
        ui: { label: 'Overall Rating' }
      }
    ]
  }
});

// Submit form data
const submission = await client.submissions.create(form.id, {
  data: {
    overall_rating: 5,
    comments: 'Great service!'
  }
});

// Query submissions
const submissions = await client.submissions.query({
  formId: form.id,
  status: ['submitted'],
  dateRange: {
    field: 'submittedAt',
    start: '2025-01-01T00:00:00Z',
    end: '2025-01-31T23:59:59Z'
  }
});
```

## Security Considerations

### Data Protection

- **Encryption at Rest**: AES-256 for sensitive fields
- **Encryption in Transit**: TLS 1.3 for all API calls
- **Field-Level Encryption**: Configurable per field type
- **Data Masking**: Automatic PII masking in logs

### Access Control

- **JWT Tokens**: Short-lived access tokens (15 minutes)
- **Refresh Tokens**: Longer-lived refresh tokens (7 days)
- **Scope-Based Access**: Granular permission system
- **Rate Limiting**: Per-user and per-IP limits

### Compliance

- **GDPR**: Data portability and right to deletion
- **HIPAA**: Healthcare data protection
- **SOC2**: Enterprise security compliance
- **Data Retention**: Configurable retention policies

### Audit Logging

All API calls are logged with:
- User identification
- Request details
- Response status
- Timing information
- IP address and user agent

## Relationships
- **Parent Nodes:** [components/form-engine/specification.md]
- **Child Nodes:** None
- **Related Nodes:**
  - [components/form-engine/schema.ts] - TypeScript types used in API
  - [components/form-engine/examples.md] - Usage examples for API endpoints

## Navigation Guidance
- **Access Context:** Use this document for API implementation and integration
- **Common Next Steps:** Review schema.ts for data types, examples.md for usage patterns
- **Related Tasks:** API development, client library creation, integration testing
- **Update Patterns:** Update when adding new endpoints or changing existing APIs

## Metadata
- **Created:** 2025-01-22
- **Last Updated:** 2025-01-22
- **Updated By:** Claude/DOC-002-1 Implementation
- **Task:** DOC-002-1

## Change History
- 2025-01-22: Initial creation of Form Engine API specification (DOC-002-1)