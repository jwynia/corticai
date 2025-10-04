# Submission Engine API Specification

## Purpose
This document provides comprehensive REST API specifications for the Submission Engine component, detailing all endpoints, request/response formats, authentication requirements, and integration patterns for submission management operations.

## Classification
- **Domain:** API Specification
- **Stability:** Stable
- **Abstraction:** Interface
- **Confidence:** Established

## API Overview

The Submission Engine API follows RESTful principles and provides comprehensive endpoints for:

- **Submission CRUD Operations** - Create, read, update, delete submissions
- **Draft Management** - Auto-save, restore, and manage draft submissions
- **Validation Operations** - Field-level and full-form validation
- **File Management** - Upload, download, and manage file attachments
- **Search and Query** - Advanced search and filtering capabilities
- **Analytics and Reporting** - Submission statistics and insights
- **Audit and History** - Access submission history and audit trails
- **Collaboration** - Real-time collaborative editing support

### Base URL
```
https://api.pliers.dev/v1
```

### Authentication
All API endpoints require authentication using JWT tokens:

```http
Authorization: Bearer <jwt_token>
```

### Content Types
- **Request:** `application/json` (except file uploads)
- **Response:** `application/json`
- **File Upload:** `multipart/form-data`

### Rate Limiting
- **Standard Operations:** 1000 requests per hour per user
- **File Upload:** 100 requests per hour per user
- **Search Operations:** 500 requests per hour per user

## Core Submission Operations

### Create Submission

Creates a new form submission.

```http
POST /submissions
```

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "formDefinitionId": "job-application-form-v2",
  "formVersion": "2.1.0",
  "submissionData": {
    "personal_info": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com"
    }
  },
  "metadata": {
    "deviceType": "desktop",
    "browserName": "Chrome",
    "tags": ["urgent-hiring"],
    "category": "engineering"
  },
  "isDraft": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "sub_01HXXXXXXXXXXXXXXXXXXX",
    "formDefinitionId": "job-application-form-v2",
    "formVersion": "2.1.0",
    "submissionData": {
      "personal_info": {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com"
      }
    },
    "status": "draft",
    "version": 1,
    "lockVersion": 0,
    "createdAt": "2024-01-22T10:30:00Z",
    "updatedAt": "2024-01-22T10:30:00Z",
    "createdBy": "usr_01HXXXXXXXXXXXXXXXXXXX",
    "metadata": {
      "deviceType": "desktop",
      "browserName": "Chrome",
      "completionPercentage": 15,
      "tags": ["urgent-hiring"],
      "category": "engineering"
    }
  }
}
```

**Error Responses:**
```json
// 400 Bad Request - Invalid form definition
{
  "success": false,
  "error": "FORM_NOT_FOUND",
  "message": "Form definition not found",
  "details": {
    "formDefinitionId": "invalid-form-id"
  }
}

// 422 Unprocessable Entity - Validation failed
{
  "success": false,
  "error": "VALIDATION_FAILED",
  "message": "Submission data validation failed",
  "validationErrors": [
    {
      "fieldId": "email",
      "errorCode": "INVALID_FORMAT",
      "message": "Invalid email format",
      "value": "invalid-email"
    }
  ]
}
```

### Get Submission

Retrieves a specific submission by ID.

```http
GET /submissions/{submissionId}
```

**Query Parameters:**
- `include` (optional): Comma-separated list of related data to include
  - `attachments` - Include file attachments
  - `comments` - Include comments
  - `history` - Include change history
  - `validation` - Include validation results

**Example:**
```http
GET /submissions/sub_01HXXXXXXXXXXXXXXXXXXX?include=attachments,comments
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "sub_01HXXXXXXXXXXXXXXXXXXX",
    "formDefinitionId": "job-application-form-v2",
    "formVersion": "2.1.0",
    "submissionData": {
      "personal_info": {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com"
      }
    },
    "status": "submitted",
    "version": 3,
    "lockVersion": 2,
    "createdAt": "2024-01-22T10:30:00Z",
    "updatedAt": "2024-01-22T14:15:00Z",
    "submittedAt": "2024-01-22T14:15:00Z",
    "createdBy": "usr_01HXXXXXXXXXXXXXXXXXXX",
    "submittedBy": "usr_01HXXXXXXXXXXXXXXXXXXX",
    "attachments": [
      {
        "id": "att_01HXXXXXXXXXXXXXXXXXXX",
        "fieldId": "resume",
        "fileName": "john_doe_resume.pdf",
        "fileSize": 2048576,
        "mimeType": "application/pdf",
        "uploadedAt": "2024-01-22T13:45:00Z"
      }
    ],
    "comments": [
      {
        "id": "cmt_01HXXXXXXXXXXXXXXXXXXX",
        "commentText": "Strong candidate with relevant experience",
        "commentType": "review",
        "createdAt": "2024-01-22T15:00:00Z",
        "createdBy": "usr_02HXXXXXXXXXXXXXXXXXXX"
      }
    ]
  }
}
```

### Update Submission

Updates an existing submission with new data.

```http
PUT /submissions/{submissionId}
```

**Request Body:**
```json
{
  "submissionData": {
    "work_experience": {
      "current_position": "Senior Developer",
      "years_experience": 8
    }
  },
  "metadata": {
    "completionPercentage": 75,
    "totalTimeSpent": 25
  },
  "lockVersion": 2,
  "validateOnUpdate": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "sub_01HXXXXXXXXXXXXXXXXXXX",
    "version": 4,
    "lockVersion": 3,
    "updatedAt": "2024-01-22T15:30:00Z",
    "submissionData": {
      "personal_info": {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com"
      },
      "work_experience": {
        "current_position": "Senior Developer",
        "years_experience": 8
      }
    },
    "validationResult": {
      "valid": true,
      "errors": [],
      "warnings": [],
      "validatedAt": "2024-01-22T15:30:00Z"
    }
  }
}
```

### Partial Update Submission

Updates specific fields without replacing the entire submission data.

```http
PATCH /submissions/{submissionId}
```

**Request Body:**
```json
{
  "submissionData": {
    "personal_info.phone": "+1-555-0123",
    "skills": ["React", "TypeScript", "Node.js"]
  },
  "lockVersion": 3
}
```

### Delete Submission

Soft deletes a submission (marks as deleted but preserves data).

```http
DELETE /submissions/{submissionId}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Submission deleted successfully",
  "data": {
    "id": "sub_01HXXXXXXXXXXXXXXXXXXX",
    "status": "cancelled",
    "deletedAt": "2024-01-22T16:00:00Z"
  }
}
```

## Draft Management

### Save Draft

Saves current submission state as a draft.

```http
POST /submissions/{submissionId}/drafts
```

**Request Body:**
```json
{
  "submissionData": {
    "personal_info": {
      "first_name": "John",
      "last_name": "Doe"
    }
  },
  "autoSave": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "draftId": "dft_01HXXXXXXXXXXXXXXXXXXX",
    "submissionId": "sub_01HXXXXXXXXXXXXXXXXXXX",
    "version": 1,
    "savedAt": "2024-01-22T16:15:00Z",
    "autoSave": true
  }
}
```

### List Drafts

Lists all drafts for a submission.

```http
GET /submissions/{submissionId}/drafts
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "submissionId": "sub_01HXXXXXXXXXXXXXXXXXXX",
    "drafts": [
      {
        "id": "dft_01HXXXXXXXXXXXXXXXXXXX",
        "version": 3,
        "savedAt": "2024-01-22T16:15:00Z",
        "autoSave": true,
        "dataPreview": {
          "personal_info": {
            "first_name": "John",
            "last_name": "Doe"
          }
        }
      },
      {
        "id": "dft_02HXXXXXXXXXXXXXXXXXXX",
        "version": 2,
        "savedAt": "2024-01-22T15:45:00Z",
        "autoSave": false,
        "description": "Before adding work experience"
      }
    ]
  }
}
```

### Restore from Draft

Restores submission data from a specific draft.

```http
POST /submissions/{submissionId}/drafts/{draftId}/restore
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "submissionId": "sub_01HXXXXXXXXXXXXXXXXXXX",
    "restoredFromDraft": "dft_01HXXXXXXXXXXXXXXXXXXX",
    "newVersion": 5,
    "newLockVersion": 4,
    "restoredAt": "2024-01-22T16:30:00Z"
  }
}
```

## Submission State Management

### Submit for Processing

Submits a draft for final processing and review.

```http
POST /submissions/{submissionId}/submit
```

**Request Body:**
```json
{
  "finalValidation": true,
  "lockVersion": 4,
  "submissionData": {
    "final_comments": "Ready for review"
  },
  "comments": "Application completed and ready for processing"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "sub_01HXXXXXXXXXXXXXXXXXXX",
    "status": "submitted",
    "submittedAt": "2024-01-22T17:00:00Z",
    "submittedBy": "usr_01HXXXXXXXXXXXXXXXXXXX",
    "validationResult": {
      "valid": true,
      "errors": [],
      "warnings": [],
      "validatedAt": "2024-01-22T17:00:00Z"
    }
  }
}
```

### Approve Submission

Approves a submitted submission.

```http
POST /submissions/{submissionId}/approve
```

**Request Body:**
```json
{
  "approvedBy": "usr_02HXXXXXXXXXXXXXXXXXXX",
  "comments": "Application meets all requirements",
  "workflowInstanceId": "wfl_01HXXXXXXXXXXXXXXXXXXX"
}
```

### Reject Submission

Rejects a submitted submission with feedback.

```http
POST /submissions/{submissionId}/reject
```

**Request Body:**
```json
{
  "rejectedBy": "usr_02HXXXXXXXXXXXXXXXXXXX",
  "reason": "Insufficient experience for senior role",
  "requiredChanges": [
    "Provide additional references",
    "Include portfolio examples"
  ],
  "allowResubmission": true
}
```

## Validation Operations

### Validate Submission

Validates submission data against form definition and business rules.

```http
POST /submissions/{submissionId}/validate
```

**Request Body:**
```json
{
  "validationType": "full",
  "skipAsyncValidation": false
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "valid": false,
    "errors": [
      {
        "fieldId": "email",
        "errorCode": "DUPLICATE_EMAIL",
        "message": "Email address already exists in system",
        "value": "john.doe@example.com",
        "severity": "error"
      }
    ],
    "warnings": [
      {
        "fieldId": "salary_expectations",
        "errorCode": "SALARY_TOO_HIGH",
        "message": "Salary expectation exceeds typical range",
        "value": 200000,
        "severity": "warning"
      }
    ],
    "fieldErrors": [
      {
        "fieldId": "email",
        "errorCode": "DUPLICATE_EMAIL",
        "message": "Email address already exists in system",
        "value": "john.doe@example.com"
      }
    ],
    "formErrors": [],
    "errorCount": 1,
    "warningCount": 1,
    "validatedAt": "2024-01-22T17:15:00Z",
    "validationDuration": 245
  }
}
```

### Validate Field

Validates a specific field value.

```http
POST /submissions/{submissionId}/validate-field
```

**Request Body:**
```json
{
  "fieldId": "email",
  "value": "john.doe@example.com",
  "skipAsyncValidation": false
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "fieldId": "email",
    "valid": true,
    "errors": [],
    "warnings": [],
    "validatedAt": "2024-01-22T17:20:00Z"
  }
}
```

## File Management

### Upload File

Uploads a file attachment to a submission.

```http
POST /submissions/{submissionId}/attachments
```

**Request Headers:**
```http
Content-Type: multipart/form-data
Authorization: Bearer <jwt_token>
```

**Request Body (multipart/form-data):**
```
fieldId: resume
file: [binary file data]
metadata: {
  "originalName": "john_doe_resume.pdf",
  "description": "Updated resume with recent experience"
}
overwrite: false
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "att_01HXXXXXXXXXXXXXXXXXXX",
    "submissionId": "sub_01HXXXXXXXXXXXXXXXXXXX",
    "fieldId": "resume",
    "fileName": "john_doe_resume.pdf",
    "fileSize": 2048576,
    "mimeType": "application/pdf",
    "storagePath": "/uploads/submissions/sub_01HX.../att_01HX.../john_doe_resume.pdf",
    "checksum": "sha256:a1b2c3d4e5f6...",
    "encrypted": false,
    "uploadedAt": "2024-01-22T17:30:00Z",
    "uploadedBy": "usr_01HXXXXXXXXXXXXXXXXXXX",
    "metadata": {
      "originalName": "john_doe_resume.pdf",
      "sanitizedName": "john_doe_resume.pdf",
      "fileSize": 2048576,
      "mimeType": "application/pdf",
      "extension": "pdf",
      "checksum": "sha256:a1b2c3d4e5f6...",
      "virusScanResult": "pending",
      "processed": false
    }
  }
}
```

### List Attachments

Lists all file attachments for a submission.

```http
GET /submissions/{submissionId}/attachments
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "submissionId": "sub_01HXXXXXXXXXXXXXXXXXXX",
    "attachments": [
      {
        "id": "att_01HXXXXXXXXXXXXXXXXXXX",
        "fieldId": "resume",
        "fileName": "john_doe_resume.pdf",
        "fileSize": 2048576,
        "mimeType": "application/pdf",
        "uploadedAt": "2024-01-22T17:30:00Z",
        "metadata": {
          "virusScanResult": "clean",
          "processed": true,
          "pageCount": 2
        }
      },
      {
        "id": "att_02HXXXXXXXXXXXXXXXXXXX",
        "fieldId": "cover_letter",
        "fileName": "cover_letter.docx",
        "fileSize": 512000,
        "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "uploadedAt": "2024-01-22T17:45:00Z",
        "metadata": {
          "virusScanResult": "clean",
          "processed": true,
          "wordCount": 350
        }
      }
    ]
  }
}
```

### Download File

Downloads a specific file attachment.

```http
GET /submissions/{submissionId}/attachments/{attachmentId}
```

**Response (200 OK):**
```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="john_doe_resume.pdf"
Content-Length: 2048576

[binary file data]
```

### Delete File

Deletes a file attachment.

```http
DELETE /submissions/{submissionId}/attachments/{attachmentId}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "File attachment deleted successfully",
  "data": {
    "id": "att_01HXXXXXXXXXXXXXXXXXXX",
    "fileName": "john_doe_resume.pdf",
    "deletedAt": "2024-01-22T18:00:00Z"
  }
}
```

## Search and Query Operations

### Search Submissions

Searches submissions with advanced filtering and pagination.

```http
GET /submissions
```

**Query Parameters:**
- `q` (optional): Full-text search query
- `formId` (optional): Filter by form definition ID
- `status` (optional): Comma-separated status values
- `userId` (optional): Filter by user ID
- `startDate` (optional): Start date filter (ISO 8601)
- `endDate` (optional): End date filter (ISO 8601)
- `tags` (optional): Comma-separated tags
- `sortBy` (optional): Sort field (default: `updatedAt`)
- `sortOrder` (optional): Sort order `asc` or `desc` (default: `desc`)
- `limit` (optional): Number of results (default: 50, max: 1000)
- `offset` (optional): Pagination offset (default: 0)
- `include` (optional): Include related data (`attachments`, `comments`, `history`)

**Example:**
```http
GET /submissions?formId=job-application&status=submitted,approved&startDate=2024-01-01&endDate=2024-12-31&sortBy=submittedAt&limit=25&offset=0
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "submissions": [
      {
        "id": "sub_01HXXXXXXXXXXXXXXXXXXX",
        "formDefinitionId": "job-application",
        "status": "submitted",
        "submittedAt": "2024-01-22T17:00:00Z",
        "submissionData": {
          "personal_info": {
            "first_name": "John",
            "last_name": "Doe"
          }
        }
      }
    ],
    "pagination": {
      "totalCount": 156,
      "limit": 25,
      "offset": 0,
      "hasMore": true
    },
    "facets": {
      "status": {
        "submitted": 89,
        "approved": 45,
        "rejected": 22
      },
      "formId": {
        "job-application": 134,
        "internship-application": 22
      }
    },
    "searchDuration": 45
  }
}
```

### Advanced Search

Performs complex queries with field-level filtering.

```http
POST /submissions/search
```

**Request Body:**
```json
{
  "text": "React TypeScript",
  "formId": "job-application",
  "status": ["submitted", "approved"],
  "dateRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-12-31T23:59:59Z"
  },
  "fields": [
    {
      "fieldId": "position",
      "operator": "in",
      "value": ["Senior Developer", "Tech Lead"],
      "caseSensitive": false
    },
    {
      "fieldId": "years_experience",
      "operator": "gte",
      "value": 5
    }
  ],
  "sortBy": "submittedAt",
  "sortOrder": "desc",
  "limit": 50,
  "offset": 0,
  "includeComments": false,
  "includeAttachments": true,
  "includeHistory": false
}
```

### Query Submissions

Executes custom SQL-like queries on submission data.

```http
POST /submissions/query
```

**Request Body:**
```json
{
  "query": {
    "select": ["id", "submissionData.personal_info", "status", "submittedAt"],
    "from": "submissions",
    "where": {
      "and": [
        {
          "field": "formDefinitionId",
          "operator": "equals",
          "value": "job-application"
        },
        {
          "field": "submissionData.years_experience",
          "operator": "between",
          "value": [3, 10]
        }
      ]
    },
    "orderBy": [
      {
        "field": "submittedAt",
        "direction": "desc"
      }
    ],
    "limit": 100
  }
}
```

## Analytics and Reporting

### Get Submission Analytics

Retrieves analytics data for submissions.

```http
GET /submissions/analytics
```

**Query Parameters:**
- `formId` (required): Form definition ID
- `startDate` (required): Start date (ISO 8601)
- `endDate` (required): End date (ISO 8601)
- `groupBy` (optional): Group by field (`day`, `week`, `month`, `status`)

**Example:**
```http
GET /submissions/analytics?formId=job-application&startDate=2024-01-01&endDate=2024-12-31&groupBy=month
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "formId": "job-application",
    "dateRange": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-12-31T23:59:59Z"
    },
    "totalSubmissions": 1250,
    "submissionsByStatus": {
      "draft": 45,
      "submitted": 890,
      "approved": 245,
      "rejected": 70
    },
    "submissionsByDate": [
      {
        "date": "2024-01-01T00:00:00Z",
        "count": 85
      },
      {
        "date": "2024-02-01T00:00:00Z",
        "count": 102
      }
    ],
    "averageCompletionTime": 18.5,
    "averageFieldCompletionRate": {
      "personal_info": 98.5,
      "work_experience": 87.2,
      "references": 65.8
    },
    "mostCommonValidationErrors": [
      {
        "errorCode": "INVALID_EMAIL",
        "count": 23,
        "percentage": 1.8
      }
    ],
    "deviceBreakdown": {
      "desktop": 756,
      "mobile": 389,
      "tablet": 105
    },
    "browserBreakdown": {
      "Chrome": 623,
      "Safari": 345,
      "Firefox": 189,
      "Edge": 93
    }
  }
}
```

### Generate Report

Generates a custom report for submissions.

```http
POST /submissions/reports
```

**Request Body:**
```json
{
  "reportType": "completion_analysis",
  "formId": "job-application",
  "dateRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-12-31T23:59:59Z"
  },
  "filters": {
    "status": ["submitted", "approved"],
    "includeAbandoned": true
  },
  "format": "json",
  "includeCharts": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reportId": "rpt_01HXXXXXXXXXXXXXXXXXXX",
    "reportType": "completion_analysis",
    "generatedAt": "2024-01-22T18:30:00Z",
    "summary": {
      "totalSubmissions": 1250,
      "completionRate": 89.2,
      "averageTimeToComplete": 18.5,
      "abandonnmentRate": 10.8
    },
    "insights": [
      {
        "type": "high_abandonment_field",
        "field": "salary_expectations",
        "abandonnmentRate": 15.3,
        "recommendation": "Consider making this field optional or providing guidance"
      }
    ],
    "downloadUrl": "https://api.pliers.dev/v1/reports/rpt_01HX.../download"
  }
}
```

## History and Audit

### Get Submission History

Retrieves the complete change history for a submission.

```http
GET /submissions/{submissionId}/history
```

**Query Parameters:**
- `limit` (optional): Number of history entries (default: 50)
- `offset` (optional): Pagination offset (default: 0)
- `changeType` (optional): Filter by change type

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "submissionId": "sub_01HXXXXXXXXXXXXXXXXXXX",
    "history": [
      {
        "id": "his_01HXXXXXXXXXXXXXXXXXXX",
        "version": 3,
        "changeType": "update",
        "changes": {
          "fieldChanges": [
            {
              "fieldId": "work_experience.current_position",
              "oldValue": "Developer",
              "newValue": "Senior Developer",
              "changeType": "update",
              "timestamp": "2024-01-22T15:30:00Z"
            }
          ]
        },
        "changedAt": "2024-01-22T15:30:00Z",
        "changedBy": "usr_01HXXXXXXXXXXXXXXXXXXX",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
      }
    ],
    "pagination": {
      "totalCount": 15,
      "limit": 50,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

### Get Specific Version

Retrieves a specific version of a submission.

```http
GET /submissions/{submissionId}/versions/{version}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "sub_01HXXXXXXXXXXXXXXXXXXX",
    "version": 2,
    "submissionData": {
      "personal_info": {
        "first_name": "John",
        "last_name": "Doe"
      }
    },
    "status": "draft",
    "versionTimestamp": "2024-01-22T14:15:00Z",
    "changes": {
      "fieldsAdded": ["personal_info.phone"],
      "fieldsUpdated": ["personal_info.email"],
      "fieldsRemoved": []
    }
  }
}
```

### Revert to Version

Reverts a submission to a previous version.

```http
POST /submissions/{submissionId}/revert/{version}
```

**Request Body:**
```json
{
  "reason": "Reverting to version before incorrect changes",
  "preserveComments": true
}
```

## Comments and Collaboration

### Add Comment

Adds a comment to a submission.

```http
POST /submissions/{submissionId}/comments
```

**Request Body:**
```json
{
  "commentText": "Strong candidate with excellent technical skills",
  "commentType": "review",
  "fieldId": "overall_assessment",
  "metadata": {
    "mentions": ["usr_02HXXXXXXXXXXXXXXXXXXX"],
    "tags": ["technical-review"]
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "cmt_01HXXXXXXXXXXXXXXXXXXX",
    "submissionId": "sub_01HXXXXXXXXXXXXXXXXXXX",
    "commentText": "Strong candidate with excellent technical skills",
    "commentType": "review",
    "fieldId": "overall_assessment",
    "createdAt": "2024-01-22T19:00:00Z",
    "createdBy": "usr_02HXXXXXXXXXXXXXXXXXXX",
    "metadata": {
      "mentions": ["usr_02HXXXXXXXXXXXXXXXXXXX"],
      "tags": ["technical-review"]
    }
  }
}
```

### List Comments

Lists all comments for a submission.

```http
GET /submissions/{submissionId}/comments
```

**Query Parameters:**
- `commentType` (optional): Filter by comment type
- `fieldId` (optional): Filter by field ID
- `limit` (optional): Number of comments (default: 50)
- `offset` (optional): Pagination offset

### WebSocket Collaboration

Real-time collaboration through WebSocket connections.

**Connection:**
```
wss://api.pliers.dev/v1/submissions/{submissionId}/collaborate
```

**Authentication:**
```
Sec-WebSocket-Protocol: bearer.{jwt_token}
```

**Message Format:**
```json
{
  "type": "field_update",
  "submissionId": "sub_01HXXXXXXXXXXXXXXXXXXX",
  "fieldId": "personal_info.first_name",
  "value": "John",
  "userId": "usr_01HXXXXXXXXXXXXXXXXXXX",
  "timestamp": "2024-01-22T19:15:00Z"
}
```

**Event Types:**
- `field_update` - Field value changed
- `field_lock` - Field locked for editing
- `field_unlock` - Field unlocked
- `user_presence` - User presence update
- `validation_update` - Validation result changed

## Error Handling

### Standard Error Response Format

All API errors follow a consistent format:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "additional error context"
  },
  "timestamp": "2024-01-22T20:00:00Z",
  "requestId": "req_01HXXXXXXXXXXXXXXXXXXX"
}
```

### HTTP Status Codes

- **200 OK** - Successful operation
- **201 Created** - Resource created successfully
- **400 Bad Request** - Invalid request parameters
- **401 Unauthorized** - Authentication required
- **403 Forbidden** - Access denied
- **404 Not Found** - Resource not found
- **409 Conflict** - Concurrent update conflict
- **413 Payload Too Large** - File size exceeds limit
- **422 Unprocessable Entity** - Validation failed
- **429 Too Many Requests** - Rate limit exceeded
- **500 Internal Server Error** - Server error

### Common Error Codes

- **SUBMISSION_NOT_FOUND** - Submission does not exist
- **FORM_NOT_FOUND** - Form definition not found
- **VALIDATION_FAILED** - Data validation failed
- **CONCURRENT_UPDATE** - Optimistic locking conflict
- **FILE_TOO_LARGE** - File exceeds size limit
- **INVALID_FILE_TYPE** - File type not allowed
- **VIRUS_DETECTED** - Malicious file detected
- **PERMISSION_DENIED** - Access not authorized
- **RATE_LIMIT_EXCEEDED** - Too many requests
- **FIELD_LOCKED** - Field locked by another user

## Rate Limiting

### Rate Limit Headers

All responses include rate limiting information:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1642876800
X-RateLimit-Type: user
```

### Rate Limit Types

- **user** - Per-user limits
- **ip** - Per-IP address limits
- **api_key** - Per-API key limits

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded. Please try again in 60 seconds.",
  "details": {
    "limit": 1000,
    "remaining": 0,
    "resetAt": "2024-01-22T21:00:00Z",
    "retryAfter": 60
  }
}
```

## Pagination

### Standard Pagination

Most list endpoints support cursor-based pagination:

**Request:**
```http
GET /submissions?limit=25&offset=50
```

**Response:**
```json
{
  "success": true,
  "data": {
    "submissions": [...],
    "pagination": {
      "totalCount": 1250,
      "limit": 25,
      "offset": 50,
      "hasMore": true,
      "nextOffset": 75,
      "prevOffset": 25
    }
  }
}
```

### Cursor-Based Pagination

For large datasets, cursor-based pagination is available:

**Request:**
```http
GET /submissions?limit=25&cursor=eyJpZCI6InN1Yl8wMUhYIn0%3D
```

**Response:**
```json
{
  "success": true,
  "data": {
    "submissions": [...],
    "pagination": {
      "limit": 25,
      "hasMore": true,
      "nextCursor": "eyJpZCI6InN1Yl8wMkhYIn0%3D",
      "prevCursor": "eyJpZCI6InN1Yl8wMEhYIn0%3D"
    }
  }
}
```

## Webhooks

### Webhook Events

The Submission Engine can send webhook notifications for various events:

- **submission.created** - New submission created
- **submission.updated** - Submission data updated
- **submission.submitted** - Submission submitted for processing
- **submission.approved** - Submission approved
- **submission.rejected** - Submission rejected
- **file.uploaded** - File attachment uploaded
- **validation.completed** - Validation completed

### Webhook Configuration

Configure webhooks through the dashboard or API:

```http
POST /webhooks
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks/submissions",
  "events": ["submission.submitted", "submission.approved"],
  "secret": "your-webhook-secret",
  "active": true
}
```

### Webhook Payload

```json
{
  "event": "submission.submitted",
  "timestamp": "2024-01-22T21:30:00Z",
  "data": {
    "submissionId": "sub_01HXXXXXXXXXXXXXXXXXXX",
    "formId": "job-application",
    "userId": "usr_01HXXXXXXXXXXXXXXXXXXX",
    "status": "submitted"
  },
  "webhook": {
    "id": "whk_01HXXXXXXXXXXXXXXXXXXX",
    "attempt": 1
  }
}
```

## OpenAPI Specification

### Download OpenAPI Spec

The complete OpenAPI 3.0 specification is available:

```http
GET /openapi.json
```

### Interactive Documentation

Interactive API documentation is available at:
```
https://api.pliers.dev/docs
```

## SDKs and Client Libraries

### Official SDKs

- **JavaScript/TypeScript**: `@pliers/sdk-js`
- **Python**: `pliers-sdk-python`
- **Go**: `github.com/pliers/sdk-go`
- **PHP**: `pliers/sdk-php`

### SDK Example (JavaScript)

```javascript
import { PliersClient } from '@pliers/sdk-js';

const client = new PliersClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.pliers.dev/v1'
});

// Create submission
const submission = await client.submissions.create({
  formDefinitionId: 'job-application',
  submissionData: {
    name: 'John Doe',
    email: 'john@example.com'
  }
});

// Upload file
await client.submissions.uploadFile(submission.id, {
  fieldId: 'resume',
  file: resumeFile
});

// Submit for processing
await client.submissions.submit(submission.id);
```

## Relationships
- **Parent Nodes:** [components/submission-engine/specification.md]
- **Related Nodes:**
  - [components/form-engine/api.md] - Form API specifications
  - [components/event-system/api.md] - Event API specifications
  - [components/search-engine/api.md] - Search API specifications

## Navigation Guidance
- **Access Context:** Use this document for API integration and development
- **Common Next Steps:** Review SDK documentation and integration examples
- **Related Tasks:** API client development, integration implementation
- **Update Patterns:** Update when adding new endpoints or changing API contracts

## Metadata
- **Created:** 2025-01-22
- **Last Updated:** 2025-01-22
- **Updated By:** Claude/DOC-002-2 Implementation
- **Task:** DOC-002-2

## Change History
- 2025-01-22: Initial creation of Submission Engine API specification (DOC-002-2)