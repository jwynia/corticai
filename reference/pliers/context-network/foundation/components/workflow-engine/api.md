# Workflow Engine API Specification

This document provides comprehensive API specifications for the Workflow Engine component, including REST endpoints, GraphQL schema, WebSocket events, and integration patterns.

## Table of Contents

1. [REST API Endpoints](#rest-api-endpoints)
2. [GraphQL Schema](#graphql-schema)
3. [WebSocket Events](#websocket-events)
4. [Authentication & Authorization](#authentication--authorization)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [API Versioning](#api-versioning)
8. [SDK Examples](#sdk-examples)
9. [Integration Patterns](#integration-patterns)

## REST API Endpoints

### Base URL Structure

```
Production:  https://api.pliers.company.com/v1
Staging:     https://api.staging.pliers.company.com/v1
Development: http://localhost:3000/api/v1
```

### Authentication Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-Request-ID: <unique_request_id>
X-Client-Version: <client_version>
```

---

## Workflow Definition Management

### List Workflow Definitions

```http
GET /workflows
```

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 50, max: 100)
- `status` (string, optional): Filter by status (`draft`, `active`, `deprecated`, `archived`)
- `category` (string, optional): Filter by category
- `tags` (string[], optional): Filter by tags (comma-separated)
- `search` (string, optional): Search in name, title, description
- `sort` (string, optional): Sort field (`name`, `title`, `created_at`, `updated_at`)
- `order` (string, optional): Sort order (`asc`, `desc`)
- `include` (string[], optional): Include related data (`instances`, `metrics`)

**Response:**
```json
{
  "data": [
    {
      "id": "workflow-123",
      "name": "employee_onboarding",
      "version": "1.2.0",
      "title": "Employee Onboarding Process",
      "description": "Standard onboarding workflow for new employees",
      "status": "active",
      "category": "hr",
      "tags": ["onboarding", "hr", "automation"],
      "metadata": {
        "author": "hr_team",
        "businessOwner": "hr_manager",
        "technicalOwner": "dev_team"
      },
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-20T15:30:00Z",
      "createdBy": "user-456",
      "updatedBy": "user-789"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 125,
    "totalPages": 3,
    "hasNext": true,
    "hasPrevious": false
  },
  "meta": {
    "requestId": "req-123456",
    "timestamp": "2025-01-22T12:00:00Z",
    "version": "1.0.0"
  }
}
```

### Create Workflow Definition

```http
POST /workflows
```

**Request Body:**
```json
{
  "name": "vendor_onboarding",
  "title": "Vendor Onboarding Process",
  "description": "Comprehensive vendor onboarding workflow",
  "definition": {
    "version": "1.0.0",
    "name": "vendor_onboarding",
    "settings": {
      "allowConcurrentInstances": true,
      "maxConcurrentInstances": 50,
      "autoCleanupCompletedInstances": true,
      "cleanupAfterDays": 365
    },
    "variables": [
      {
        "name": "vendor_name",
        "type": "string",
        "required": true,
        "description": "Vendor legal name"
      }
    ]
  },
  "stateMachine": {
    "states": {
      "initial": {
        "id": "initial",
        "name": "Application Submitted",
        "type": "initial",
        "properties": {
          "isInterruptible": false,
          "rollbackOnFailure": false,
          "persistData": true
        }
      }
    },
    "transitions": [
      {
        "id": "start_review",
        "from": "initial",
        "to": "under_review",
        "trigger": { "type": "automatic" },
        "priority": 1
      }
    ],
    "initialState": "initial",
    "finalStates": ["approved", "rejected"]
  },
  "metadata": {
    "category": "vendor_management",
    "tags": ["vendor", "onboarding"],
    "businessOwner": "procurement_team"
  },
  "publishImmediately": false
}
```

**Response:**
```json
{
  "data": {
    "id": "workflow-789",
    "name": "vendor_onboarding",
    "version": "1.0.0",
    "status": "draft",
    "createdAt": "2025-01-22T12:00:00Z"
  },
  "meta": {
    "requestId": "req-123456",
    "timestamp": "2025-01-22T12:00:00Z"
  }
}
```

### Get Workflow Definition

```http
GET /workflows/{workflowId}
```

**Path Parameters:**
- `workflowId` (string, required): Workflow definition ID

**Query Parameters:**
- `version` (string, optional): Specific version to retrieve
- `include` (string[], optional): Include related data (`instances`, `analytics`, `history`)

**Response:**
```json
{
  "data": {
    "id": "workflow-123",
    "name": "employee_onboarding",
    "version": "1.2.0",
    "title": "Employee Onboarding Process",
    "description": "Standard onboarding workflow for new employees",
    "definition": {
      "version": "1.2.0",
      "settings": {
        "allowConcurrentInstances": true,
        "maxConcurrentInstances": 50
      },
      "variables": [...]
    },
    "stateMachine": {
      "states": {...},
      "transitions": [...],
      "initialState": "initial",
      "finalStates": ["completed"]
    },
    "approvalChains": [...],
    "eventHooks": {...},
    "timeoutConfig": {...},
    "status": "active",
    "metadata": {...},
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-20T15:30:00Z"
  }
}
```

### Update Workflow Definition

```http
PUT /workflows/{workflowId}
```

**Request Body:**
```json
{
  "title": "Updated Employee Onboarding Process",
  "description": "Enhanced onboarding workflow with automation",
  "definition": {
    "settings": {
      "maxConcurrentInstances": 100
    }
  },
  "versionStrategy": "minor",
  "publishImmediately": false
}
```

**Response:**
```json
{
  "data": {
    "id": "workflow-123",
    "name": "employee_onboarding",
    "version": "1.3.0",
    "status": "draft",
    "updatedAt": "2025-01-22T12:00:00Z"
  }
}
```

### Delete Workflow Definition

```http
DELETE /workflows/{workflowId}
```

**Response:**
```json
{
  "data": {
    "id": "workflow-123",
    "status": "archived",
    "deletedAt": "2025-01-22T12:00:00Z"
  }
}
```

### Validate Workflow Definition

```http
POST /workflows/{workflowId}/validate
```

**Response:**
```json
{
  "data": {
    "valid": true,
    "errors": [],
    "warnings": [
      {
        "code": "PERFORMANCE_WARNING",
        "message": "State timeout exceeds recommended maximum",
        "path": "stateMachine.states.review.properties.slaMinutes",
        "severity": "warning"
      }
    ],
    "recommendations": [
      {
        "type": "performance",
        "priority": "medium",
        "description": "Consider reducing timeout values for better SLA compliance"
      }
    ],
    "complexity": {
      "cyclomaticComplexity": 5,
      "stateCount": 8,
      "transitionCount": 12,
      "maintainabilityScore": 85
    }
  }
}
```

### Publish Workflow Definition

```http
POST /workflows/{workflowId}/publish
```

**Request Body:**
```json
{
  "version": "1.0.0",
  "releaseNotes": "Initial release of vendor onboarding workflow"
}
```

**Response:**
```json
{
  "data": {
    "id": "workflow-123",
    "status": "active",
    "publishedAt": "2025-01-22T12:00:00Z",
    "version": "1.0.0"
  }
}
```

### List Workflow Versions

```http
GET /workflows/{workflowId}/versions
```

**Response:**
```json
{
  "data": [
    {
      "version": "1.2.0",
      "status": "active",
      "publishedAt": "2025-01-20T15:30:00Z",
      "createdBy": "user-789",
      "releaseNotes": "Added automated approval logic"
    },
    {
      "version": "1.1.0",
      "status": "deprecated",
      "publishedAt": "2025-01-15T10:00:00Z",
      "createdBy": "user-456",
      "releaseNotes": "Enhanced validation rules"
    }
  ]
}
```

---

## Workflow Instance Management

### List Workflow Instances

```http
GET /workflows/{workflowId}/instances
```

**Query Parameters:**
- `status` (string[], optional): Filter by status
- `assignedTo` (string, optional): Filter by assigned user
- `createdBy` (string, optional): Filter by creator
- `dateRange` (object, optional): Date range filter
- `priority` (string[], optional): Filter by priority
- `search` (string, optional): Search in instance data
- `page`, `limit`, `sort`, `order` (pagination parameters)

**Response:**
```json
{
  "data": [
    {
      "id": "instance-456",
      "workflowDefinitionId": "workflow-123",
      "workflowVersion": "1.2.0",
      "submissionId": "submission-789",
      "currentState": "pending_approval",
      "status": "running",
      "instanceData": {
        "employee_id": "EMP001",
        "department": "Engineering"
      },
      "startedAt": "2025-01-22T09:00:00Z",
      "lastActivityAt": "2025-01-22T11:30:00Z",
      "timeoutAt": "2025-01-23T09:00:00Z",
      "assignedTo": "manager-123",
      "priority": "medium",
      "createdBy": "hr-coordinator",
      "createdAt": "2025-01-22T09:00:00Z"
    }
  ],
  "pagination": {...}
}
```

### Create Workflow Instance

```http
POST /workflows/{workflowId}/instances
```

**Request Body:**
```json
{
  "workflowVersion": "1.2.0",
  "submissionId": "submission-789",
  "initialData": {
    "employee_id": "EMP001",
    "department": "Engineering",
    "start_date": "2025-02-01",
    "manager_id": "MGR123"
  },
  "assignedTo": "hr-coordinator",
  "priority": "high",
  "startImmediately": true,
  "scheduledStart": null,
  "metadata": {
    "source": "hr_system",
    "requestId": "req-456"
  }
}
```

**Response:**
```json
{
  "data": {
    "id": "instance-456",
    "workflowDefinitionId": "workflow-123",
    "status": "running",
    "currentState": "initial",
    "startedAt": "2025-01-22T12:00:00Z",
    "timeoutAt": "2025-01-23T12:00:00Z"
  }
}
```

### Get Workflow Instance

```http
GET /workflow-instances/{instanceId}
```

**Query Parameters:**
- `include` (string[], optional): Include related data (`history`, `approvals`, `metrics`)

**Response:**
```json
{
  "data": {
    "id": "instance-456",
    "workflowDefinitionId": "workflow-123",
    "workflowVersion": "1.2.0",
    "submissionId": "submission-789",
    "currentState": "pending_approval",
    "previousState": "under_review",
    "status": "running",
    "instanceData": {
      "employee_id": "EMP001",
      "department": "Engineering"
    },
    "contextData": {
      "accounts_created": true,
      "equipment_requested": true
    },
    "startedAt": "2025-01-22T09:00:00Z",
    "lastActivityAt": "2025-01-22T11:30:00Z",
    "timeoutAt": "2025-01-23T09:00:00Z",
    "assignedTo": "manager-123",
    "priority": "medium",
    "version": 3,
    "lockVersion": 2
  }
}
```

### Update Workflow Instance

```http
PUT /workflow-instances/{instanceId}
```

**Request Body:**
```json
{
  "instanceData": {
    "additional_info": "Updated contact information"
  },
  "assignedTo": "new-manager-456",
  "priority": "high",
  "lockVersion": 2
}
```

**Response:**
```json
{
  "data": {
    "id": "instance-456",
    "version": 4,
    "lockVersion": 3,
    "updatedAt": "2025-01-22T12:00:00Z"
  }
}
```

### Advance Workflow Instance

```http
POST /workflow-instances/{instanceId}/advance
```

**Request Body:**
```json
{
  "targetState": "approved",
  "triggerType": "manual",
  "data": {
    "approval_notes": "All requirements met"
  },
  "comment": "Manually advancing due to expedited processing",
  "bypassValidation": false
}
```

**Response:**
```json
{
  "data": {
    "id": "instance-456",
    "currentState": "approved",
    "previousState": "pending_approval",
    "advancedAt": "2025-01-22T12:00:00Z",
    "advancedBy": "manager-123"
  }
}
```

### Suspend Workflow Instance

```http
POST /workflow-instances/{instanceId}/suspend
```

**Request Body:**
```json
{
  "reason": "Waiting for external documentation",
  "suspendedUntil": "2025-01-25T09:00:00Z",
  "notifyOnResume": true
}
```

**Response:**
```json
{
  "data": {
    "id": "instance-456",
    "status": "suspended",
    "suspendedAt": "2025-01-22T12:00:00Z",
    "suspendedBy": "manager-123",
    "suspendedUntil": "2025-01-25T09:00:00Z"
  }
}
```

### Resume Workflow Instance

```http
POST /workflow-instances/{instanceId}/resume
```

**Request Body:**
```json
{
  "reason": "Required documentation received",
  "data": {
    "documentation_received": true
  }
}
```

**Response:**
```json
{
  "data": {
    "id": "instance-456",
    "status": "running",
    "resumedAt": "2025-01-22T12:00:00Z",
    "resumedBy": "manager-123"
  }
}
```

### Cancel Workflow Instance

```http
DELETE /workflow-instances/{instanceId}
```

**Request Body:**
```json
{
  "reason": "Request withdrawn by employee",
  "performCleanup": true
}
```

**Response:**
```json
{
  "data": {
    "id": "instance-456",
    "status": "cancelled",
    "cancelledAt": "2025-01-22T12:00:00Z",
    "cancelledBy": "hr-coordinator"
  }
}
```

---

## Approval Operations

### Get Workflow Instance Approvals

```http
GET /workflow-instances/{instanceId}/approvals
```

**Query Parameters:**
- `pending` (boolean, optional): Filter for pending approvals only
- `stepId` (string, optional): Filter by approval step

**Response:**
```json
{
  "data": [
    {
      "id": "approval-123",
      "workflowInstanceId": "instance-456",
      "stepId": "manager_approval",
      "chainId": "approval_chain_1",
      "approver": {
        "id": "user-789",
        "name": "John Manager",
        "email": "john.manager@company.com"
      },
      "action": null,
      "comments": null,
      "decidedAt": null,
      "timeoutAt": "2025-01-24T09:00:00Z",
      "delegatedTo": null,
      "status": "pending"
    }
  ]
}
```

### Approve Workflow Step

```http
POST /workflow-instances/{instanceId}/approve
```

**Request Body:**
```json
{
  "stepId": "manager_approval",
  "action": "approve",
  "comments": "Employee meets all requirements for onboarding",
  "attachments": ["doc-123", "doc-456"],
  "delegatedBy": null
}
```

**Response:**
```json
{
  "data": {
    "id": "approval-123",
    "action": "approve",
    "decidedAt": "2025-01-22T12:00:00Z",
    "decidedBy": "manager-789",
    "nextStep": "equipment_provisioning"
  }
}
```

### Reject Workflow Step

```http
POST /workflow-instances/{instanceId}/reject
```

**Request Body:**
```json
{
  "stepId": "manager_approval",
  "action": "reject",
  "reason": "incomplete_documentation",
  "comments": "Missing required background check documentation",
  "requestChanges": true
}
```

**Response:**
```json
{
  "data": {
    "id": "approval-123",
    "action": "reject",
    "decidedAt": "2025-01-22T12:00:00Z",
    "decidedBy": "manager-789",
    "workflowStatus": "rejected"
  }
}
```

### Delegate Approval

```http
POST /workflow-instances/{instanceId}/delegate
```

**Request Body:**
```json
{
  "stepId": "manager_approval",
  "delegateTo": "backup-manager-456",
  "reason": "Out of office until next week",
  "expiresAt": "2025-01-30T17:00:00Z",
  "comments": "Please review and approve employee onboarding"
}
```

**Response:**
```json
{
  "data": {
    "id": "approval-123",
    "delegatedTo": "backup-manager-456",
    "delegatedAt": "2025-01-22T12:00:00Z",
    "delegatedBy": "manager-789",
    "expiresAt": "2025-01-30T17:00:00Z"
  }
}
```

### Get User's Pending Approvals

```http
GET /users/{userId}/approvals
```

**Query Parameters:**
- `workflowId` (string, optional): Filter by workflow
- `priority` (string[], optional): Filter by priority
- `overdueOnly` (boolean, optional): Show only overdue approvals

**Response:**
```json
{
  "data": [
    {
      "id": "approval-123",
      "workflowInstance": {
        "id": "instance-456",
        "workflowName": "employee_onboarding",
        "title": "Employee Onboarding Process"
      },
      "stepId": "manager_approval",
      "stepName": "Manager Approval",
      "priority": "medium",
      "timeoutAt": "2025-01-24T09:00:00Z",
      "requestedAt": "2025-01-22T09:00:00Z",
      "isOverdue": false,
      "hoursRemaining": 45
    }
  ],
  "summary": {
    "total": 5,
    "overdue": 1,
    "urgent": 2,
    "expiringSoon": 3
  }
}
```

---

## Monitoring and Analytics

### Get Workflow Analytics

```http
GET /workflows/{workflowId}/analytics
```

**Query Parameters:**
- `timeRange` (object): Time range for analytics
- `granularity` (string): Data granularity (`hour`, `day`, `week`, `month`)
- `metrics` (string[]): Specific metrics to include

**Request Body (for complex filters):**
```json
{
  "timeRange": {
    "from": "2025-01-01T00:00:00Z",
    "to": "2025-01-31T23:59:59Z"
  },
  "granularity": "day",
  "metrics": ["completion_rate", "average_duration", "sla_adherence"],
  "filters": {
    "department": ["engineering", "sales"],
    "priority": ["high", "urgent"]
  }
}
```

**Response:**
```json
{
  "data": {
    "summary": {
      "totalInstances": 245,
      "completedInstances": 198,
      "completionRate": 80.8,
      "averageCompletionTime": 14400000,
      "slaAdherenceRate": 92.5,
      "currentActiveInstances": 47
    },
    "metrics": {
      "completion_rate": [
        {
          "date": "2025-01-01",
          "value": 78.5
        },
        {
          "date": "2025-01-02",
          "value": 82.1
        }
      ],
      "average_duration": [
        {
          "date": "2025-01-01",
          "value": 15600000
        }
      ]
    },
    "bottlenecks": [
      {
        "stepId": "legal_review",
        "stepName": "Legal Review",
        "averageWaitTime": 7200000,
        "impact": "high"
      }
    ],
    "trends": {
      "completion_rate": "increasing",
      "average_duration": "decreasing",
      "volume": "stable"
    }
  }
}
```

### Get Workflow Instance History

```http
GET /workflow-instances/{instanceId}/history
```

**Query Parameters:**
- `includeData` (boolean): Include data changes in history
- `eventTypes` (string[]): Filter by event types

**Response:**
```json
{
  "data": [
    {
      "id": "history-123",
      "timestamp": "2025-01-22T09:00:00Z",
      "actionType": "state_transition",
      "fromState": "initial",
      "toState": "under_review",
      "executedBy": "system",
      "duration": 150,
      "result": "success",
      "metadata": {
        "trigger": "automatic",
        "transitionId": "start_review"
      }
    },
    {
      "id": "history-124",
      "timestamp": "2025-01-22T11:30:00Z",
      "actionType": "approval_request",
      "stepId": "manager_approval",
      "executedBy": "system",
      "result": "success",
      "metadata": {
        "approver": "manager-789",
        "timeoutAt": "2025-01-24T09:00:00Z"
      }
    }
  ]
}
```

### Get Workflow Instance Timeline

```http
GET /workflow-instances/{instanceId}/timeline
```

**Response:**
```json
{
  "data": {
    "instanceId": "instance-456",
    "timeline": [
      {
        "timestamp": "2025-01-22T09:00:00Z",
        "type": "workflow_started",
        "title": "Workflow Started",
        "description": "Employee onboarding workflow initiated",
        "state": "initial",
        "actor": {
          "type": "user",
          "id": "hr-coordinator",
          "name": "HR Coordinator"
        },
        "automated": false
      },
      {
        "timestamp": "2025-01-22T09:01:00Z",
        "type": "state_transition",
        "title": "Moved to Under Review",
        "description": "Automatic transition to review state",
        "state": "under_review",
        "actor": {
          "type": "system",
          "name": "Workflow Engine"
        },
        "automated": true
      },
      {
        "timestamp": "2025-01-22T11:30:00Z",
        "type": "approval_requested",
        "title": "Approval Requested",
        "description": "Manager approval requested",
        "state": "pending_approval",
        "actor": {
          "type": "system",
          "name": "Workflow Engine"
        },
        "automated": true,
        "details": {
          "approver": "manager-789",
          "timeoutAt": "2025-01-24T09:00:00Z"
        }
      }
    ],
    "currentState": "pending_approval",
    "progress": {
      "completed": 2,
      "total": 6,
      "percentage": 33.3
    }
  }
}
```

### Search Workflow Instances

```http
POST /workflow-instances/search
```

**Request Body:**
```json
{
  "query": {
    "workflowIds": ["workflow-123", "workflow-456"],
    "status": ["running", "waiting"],
    "assignedTo": ["manager-789"],
    "dateRange": {
      "field": "createdAt",
      "from": "2025-01-01T00:00:00Z",
      "to": "2025-01-31T23:59:59Z"
    },
    "dataFilters": [
      {
        "field": "instanceData.department",
        "operator": "equals",
        "value": "Engineering"
      },
      {
        "field": "instanceData.priority",
        "operator": "in",
        "value": ["high", "urgent"]
      }
    ],
    "stateTimeRange": {
      "state": "pending_approval",
      "minMinutes": 1440
    }
  },
  "sort": [
    {
      "field": "lastActivityAt",
      "direction": "desc"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50
  },
  "include": ["workflow", "submission"]
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "instance-456",
      "workflowDefinitionId": "workflow-123",
      "currentState": "pending_approval",
      "status": "running",
      "timeInCurrentState": 2880,
      "assignedTo": "manager-789",
      "lastActivityAt": "2025-01-22T11:30:00Z",
      "workflow": {
        "name": "employee_onboarding",
        "title": "Employee Onboarding Process"
      }
    }
  ],
  "pagination": {...},
  "aggregations": {
    "statusCounts": {
      "running": 25,
      "waiting": 12,
      "suspended": 3
    },
    "stateCounts": {
      "pending_approval": 15,
      "under_review": 8,
      "equipment_provisioning": 2
    }
  }
}
```

---

## Administrative Operations

### Migrate Workflow Instances

```http
POST /workflows/{workflowId}/migrate
```

**Request Body:**
```json
{
  "fromVersion": "1.1.0",
  "toVersion": "1.2.0",
  "migrationStrategy": "immediate",
  "instanceHandling": "migrate_active",
  "dryRun": false,
  "filters": {
    "status": ["running", "waiting"],
    "createdAfter": "2025-01-01T00:00:00Z"
  }
}
```

**Response:**
```json
{
  "data": {
    "migrationId": "migration-123",
    "status": "in_progress",
    "totalInstances": 45,
    "migratedInstances": 12,
    "failedInstances": 0,
    "startedAt": "2025-01-22T12:00:00Z",
    "estimatedCompletion": "2025-01-22T12:30:00Z"
  }
}
```

### Bulk Update Workflow Instances

```http
POST /workflow-instances/bulk-update
```

**Request Body:**
```json
{
  "filters": {
    "workflowId": "workflow-123",
    "status": ["running"],
    "assignedTo": "old-manager-123"
  },
  "updates": {
    "assignedTo": "new-manager-456",
    "priority": "high"
  },
  "dryRun": false,
  "maxInstances": 100
}
```

**Response:**
```json
{
  "data": {
    "operationId": "bulk-op-456",
    "totalMatched": 25,
    "updated": 25,
    "failed": 0,
    "errors": []
  }
}
```

### Get Workflow Engine Health

```http
GET /workflows/health
```

**Response:**
```json
{
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-22T12:00:00Z",
    "version": "1.0.0",
    "components": {
      "database": {
        "status": "healthy",
        "latency": 15,
        "connections": {
          "active": 12,
          "idle": 8,
          "max": 50
        }
      },
      "eventEngine": {
        "status": "healthy",
        "latency": 8,
        "queueDepth": 5
      },
      "cache": {
        "status": "healthy",
        "hitRate": 0.85,
        "memoryUsage": 0.42
      }
    },
    "metrics": {
      "activeInstances": 156,
      "instancesPerSecond": 2.3,
      "averageResponseTime": 245,
      "errorRate": 0.002
    }
  }
}
```

### Cleanup Completed Workflows

```http
POST /workflows/cleanup
```

**Request Body:**
```json
{
  "dryRun": false,
  "olderThan": "2024-01-01T00:00:00Z",
  "status": ["completed", "cancelled"],
  "archiveData": true,
  "maxInstances": 1000
}
```

**Response:**
```json
{
  "data": {
    "operationId": "cleanup-789",
    "instancesFound": 847,
    "instancesArchived": 847,
    "dataArchived": true,
    "startedAt": "2025-01-22T12:00:00Z",
    "completedAt": "2025-01-22T12:05:00Z"
  }
}
```

---

## GraphQL Schema

### Core Types

```graphql
scalar DateTime
scalar JSON

enum WorkflowStatus {
  DRAFT
  ACTIVE
  DEPRECATED
  ARCHIVED
}

enum WorkflowInstanceStatus {
  PENDING
  RUNNING
  WAITING
  SUSPENDED
  COMPLETED
  FAILED
  CANCELLED
  ESCALATED
}

enum ApprovalAction {
  APPROVE
  REJECT
  REQUEST_CHANGES
  DELEGATE
  ESCALATE
}

type WorkflowDefinition {
  id: ID!
  name: String!
  version: String!
  title: String!
  description: String
  definition: JSON!
  stateMachine: JSON!
  approvalChains: [ApprovalChain!]
  eventHooks: JSON
  timeoutConfig: JSON
  metadata: JSON
  status: WorkflowStatus!
  createdAt: DateTime!
  updatedAt: DateTime!
  createdBy: User
  updatedBy: User

  # Relationships
  instances(
    first: Int
    after: String
    status: [WorkflowInstanceStatus!]
    assignedTo: ID
  ): WorkflowInstanceConnection!

  analytics(
    timeRange: TimeRangeInput
    metrics: [String!]
  ): WorkflowAnalytics!
}

type WorkflowInstance {
  id: ID!
  workflowDefinition: WorkflowDefinition!
  workflowVersion: String!
  submission: FormSubmission
  currentState: String!
  previousState: String
  instanceData: JSON!
  contextData: JSON!
  status: WorkflowInstanceStatus!
  startedAt: DateTime
  completedAt: DateTime
  failedAt: DateTime
  lastActivityAt: DateTime!
  timeoutAt: DateTime
  slaBreachAt: DateTime
  escalatedAt: DateTime
  createdBy: User
  assignedTo: User
  createdAt: DateTime!
  updatedAt: DateTime!
  version: Int!
  lockVersion: Int!

  # Relationships
  approvals: [WorkflowApproval!]!
  history: [WorkflowExecutionHistory!]!
  timeline: WorkflowTimeline!
  metrics: WorkflowInstanceMetrics!
}

type WorkflowApproval {
  id: ID!
  workflowInstance: WorkflowInstance!
  stepId: String!
  chainId: String!
  approver: User!
  action: ApprovalAction
  comments: String
  decisionData: JSON
  decidedAt: DateTime
  timeoutAt: DateTime
  delegatedTo: User
  delegatedAt: DateTime
  delegationChain: [DelegationInfo!]
  attachments: [Attachment!]
}

type WorkflowExecutionHistory {
  id: ID!
  workflowInstance: WorkflowInstance!
  stepId: String
  actionType: String!
  fromState: String
  toState: String
  executionData: JSON
  result: String!
  errorMessage: String
  executionTimeMs: Int!
  executedAt: DateTime!
  executedBy: User
}

type WorkflowTimeline {
  instanceId: ID!
  events: [TimelineEvent!]!
  currentState: String!
  progress: ProgressInfo!
}

type TimelineEvent {
  timestamp: DateTime!
  type: String!
  title: String!
  description: String!
  state: String
  actor: Actor!
  automated: Boolean!
  details: JSON
}

type Actor {
  type: String! # "user" | "system"
  id: String
  name: String!
}

type ProgressInfo {
  completed: Int!
  total: Int!
  percentage: Float!
}
```

### Query Operations

```graphql
type Query {
  # Workflow Definitions
  workflows(
    first: Int
    after: String
    status: [WorkflowStatus!]
    category: String
    tags: [String!]
    search: String
  ): WorkflowDefinitionConnection!

  workflow(id: ID!, version: String): WorkflowDefinition

  # Workflow Instances
  workflowInstances(
    first: Int
    after: String
    workflowId: ID
    status: [WorkflowInstanceStatus!]
    assignedTo: ID
  ): WorkflowInstanceConnection!

  workflowInstance(id: ID!): WorkflowInstance

  # User-specific queries
  myApprovals(
    first: Int
    after: String
    workflowId: ID
    priority: [String!]
    overdueOnly: Boolean
  ): WorkflowApprovalConnection!

  myWorkflows(
    first: Int
    after: String
    status: [WorkflowInstanceStatus!]
  ): WorkflowInstanceConnection!

  # Search and analytics
  searchWorkflowInstances(
    query: WorkflowInstanceSearchInput!
    first: Int
    after: String
  ): WorkflowInstanceSearchResult!

  workflowAnalytics(
    workflowId: ID!
    timeRange: TimeRangeInput
    metrics: [String!]
  ): WorkflowAnalytics!
}
```

### Mutation Operations

```graphql
type Mutation {
  # Workflow Definition Management
  createWorkflow(input: CreateWorkflowInput!): CreateWorkflowPayload!
  updateWorkflow(id: ID!, input: UpdateWorkflowInput!): UpdateWorkflowPayload!
  deleteWorkflow(id: ID!): DeleteWorkflowPayload!
  publishWorkflow(id: ID!, input: PublishWorkflowInput!): PublishWorkflowPayload!

  # Workflow Instance Management
  createWorkflowInstance(input: CreateWorkflowInstanceInput!): CreateWorkflowInstancePayload!
  updateWorkflowInstance(id: ID!, input: UpdateWorkflowInstanceInput!): UpdateWorkflowInstancePayload!
  advanceWorkflowInstance(id: ID!, input: AdvanceWorkflowInput!): AdvanceWorkflowPayload!
  suspendWorkflowInstance(id: ID!, input: SuspendWorkflowInput!): SuspendWorkflowPayload!
  resumeWorkflowInstance(id: ID!, input: ResumeWorkflowInput!): ResumeWorkflowPayload!
  cancelWorkflowInstance(id: ID!, input: CancelWorkflowInput!): CancelWorkflowPayload!

  # Approval Operations
  approveWorkflowStep(input: ApprovalDecisionInput!): ApprovalDecisionPayload!
  rejectWorkflowStep(input: ApprovalDecisionInput!): ApprovalDecisionPayload!
  delegateApproval(input: DelegateApprovalInput!): DelegateApprovalPayload!

  # Administrative Operations
  migrateWorkflowInstances(input: MigrateWorkflowInput!): MigrateWorkflowPayload!
  bulkUpdateWorkflowInstances(input: BulkUpdateInput!): BulkUpdatePayload!
}
```

### Subscription Operations

```graphql
type Subscription {
  # Workflow instance updates
  workflowInstanceUpdated(instanceId: ID!): WorkflowInstance!
  workflowInstanceStateChanged(instanceId: ID!): WorkflowStateChangeEvent!

  # Approval updates
  approvalRequested(userId: ID!): WorkflowApproval!
  approvalDecided(instanceId: ID!): WorkflowApproval!

  # Dashboard updates
  workflowMetricsUpdated(workflowId: ID!): WorkflowMetrics!
  userDashboardUpdated(userId: ID!): UserDashboard!
}
```

### Input Types

```graphql
input CreateWorkflowInput {
  name: String!
  title: String!
  description: String
  definition: JSON!
  stateMachine: JSON!
  approvalChains: [ApprovalChainInput!]
  eventHooks: JSON
  timeoutConfig: JSON
  metadata: JSON
  publishImmediately: Boolean
}

input CreateWorkflowInstanceInput {
  workflowDefinitionId: ID!
  workflowVersion: String
  submissionId: ID
  initialData: JSON
  assignedTo: ID
  priority: String
  startImmediately: Boolean
  scheduledStart: DateTime
  metadata: JSON
}

input ApprovalDecisionInput {
  workflowInstanceId: ID!
  stepId: String!
  action: ApprovalAction!
  comments: String
  reason: String
  delegatedTo: ID
  attachments: [ID!]
}

input TimeRangeInput {
  from: DateTime!
  to: DateTime!
}

input WorkflowInstanceSearchInput {
  workflowIds: [ID!]
  status: [WorkflowInstanceStatus!]
  assignedTo: [ID!]
  dateRange: DateRangeInput
  dataFilters: [DataFilterInput!]
  stateTimeRange: StateTimeRangeInput
}
```

---

## WebSocket Events

### Connection Setup

```javascript
// WebSocket connection URL
const wsUrl = 'wss://api.pliers.company.com/v1/ws';

// Connection with authentication
const ws = new WebSocket(wsUrl, {
  headers: {
    'Authorization': 'Bearer <jwt_token>',
    'X-Client-Version': '1.0.0'
  }
});

// Subscribe to workflow instance updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'workflow_instance',
  params: {
    instanceId: 'instance-456'
  }
}));
```

### Event Types

#### Workflow Instance Events

```json
{
  "type": "workflow_instance_updated",
  "channel": "workflow_instance",
  "data": {
    "instanceId": "instance-456",
    "workflowId": "workflow-123",
    "currentState": "pending_approval",
    "previousState": "under_review",
    "status": "running",
    "updatedAt": "2025-01-22T12:00:00Z",
    "updatedBy": "user-789",
    "changes": {
      "currentState": {
        "from": "under_review",
        "to": "pending_approval"
      }
    }
  },
  "timestamp": "2025-01-22T12:00:00Z",
  "correlationId": "corr-123"
}
```

```json
{
  "type": "workflow_instance_state_changed",
  "channel": "workflow_instance",
  "data": {
    "instanceId": "instance-456",
    "workflowId": "workflow-123",
    "fromState": "under_review",
    "toState": "pending_approval",
    "trigger": "automatic",
    "transitionId": "review_to_approval",
    "duration": 150,
    "userId": null,
    "automated": true
  },
  "timestamp": "2025-01-22T12:00:00Z"
}
```

#### Approval Events

```json
{
  "type": "approval_requested",
  "channel": "user_approvals",
  "data": {
    "approvalId": "approval-123",
    "workflowInstanceId": "instance-456",
    "workflowName": "employee_onboarding",
    "stepId": "manager_approval",
    "stepName": "Manager Approval",
    "approverId": "manager-789",
    "timeoutAt": "2025-01-24T09:00:00Z",
    "priority": "medium",
    "requestedAt": "2025-01-22T12:00:00Z"
  },
  "timestamp": "2025-01-22T12:00:00Z"
}
```

```json
{
  "type": "approval_decided",
  "channel": "workflow_instance",
  "data": {
    "approvalId": "approval-123",
    "workflowInstanceId": "instance-456",
    "stepId": "manager_approval",
    "action": "approve",
    "decidedBy": "manager-789",
    "decidedAt": "2025-01-22T12:00:00Z",
    "comments": "All requirements met",
    "nextStep": "equipment_provisioning"
  },
  "timestamp": "2025-01-22T12:00:00Z"
}
```

#### Timeout and Escalation Events

```json
{
  "type": "workflow_timeout_warning",
  "channel": "workflow_instance",
  "data": {
    "instanceId": "instance-456",
    "workflowId": "workflow-123",
    "currentState": "pending_approval",
    "timeoutAt": "2025-01-24T09:00:00Z",
    "warningThreshold": "75%",
    "hoursRemaining": 6,
    "assignedTo": "manager-789"
  },
  "timestamp": "2025-01-22T12:00:00Z"
}
```

```json
{
  "type": "workflow_escalated",
  "channel": "workflow_instance",
  "data": {
    "instanceId": "instance-456",
    "workflowId": "workflow-123",
    "escalationReason": "sla_breach",
    "escalatedFrom": "manager-789",
    "escalatedTo": "senior-manager-456",
    "escalationLevel": 1,
    "escalatedAt": "2025-01-22T12:00:00Z"
  },
  "timestamp": "2025-01-22T12:00:00Z"
}
```

#### Dashboard Events

```json
{
  "type": "workflow_metrics_updated",
  "channel": "workflow_dashboard",
  "data": {
    "workflowId": "workflow-123",
    "metrics": {
      "activeInstances": 47,
      "completedToday": 12,
      "averageCompletionTime": 14400000,
      "slaAdherenceRate": 92.5,
      "pendingApprovals": 15
    },
    "updatedAt": "2025-01-22T12:00:00Z"
  },
  "timestamp": "2025-01-22T12:00:00Z"
}
```

### Subscription Management

```javascript
// Subscribe to multiple channels
const subscriptions = [
  {
    type: 'subscribe',
    channel: 'workflow_instance',
    params: { instanceId: 'instance-456' }
  },
  {
    type: 'subscribe',
    channel: 'user_approvals',
    params: { userId: 'user-123' }
  },
  {
    type: 'subscribe',
    channel: 'workflow_dashboard',
    params: { workflowId: 'workflow-123' }
  }
];

subscriptions.forEach(sub => ws.send(JSON.stringify(sub)));

// Unsubscribe from channel
ws.send(JSON.stringify({
  type: 'unsubscribe',
  channel: 'workflow_instance',
  params: { instanceId: 'instance-456' }
}));
```

---

## Authentication & Authorization

### JWT Token Structure

```json
{
  "sub": "user-123",
  "name": "John Doe",
  "email": "john.doe@company.com",
  "roles": ["employee", "manager"],
  "permissions": [
    "workflow:read",
    "workflow:create",
    "workflow:approve",
    "workflow_instance:read",
    "workflow_instance:update"
  ],
  "department": "engineering",
  "manager": "manager-789",
  "iat": 1642781234,
  "exp": 1642784834,
  "iss": "pliers-auth-service",
  "aud": "pliers-api"
}
```

### Permission System

#### Workflow Definition Permissions

```json
{
  "workflow:read": "Read workflow definitions",
  "workflow:create": "Create new workflow definitions",
  "workflow:update": "Update existing workflow definitions",
  "workflow:delete": "Delete workflow definitions",
  "workflow:publish": "Publish workflow definitions",
  "workflow:manage": "Full workflow definition management"
}
```

#### Workflow Instance Permissions

```json
{
  "workflow_instance:read": "Read workflow instances",
  "workflow_instance:create": "Create workflow instances",
  "workflow_instance:update": "Update workflow instances",
  "workflow_instance:delete": "Cancel workflow instances",
  "workflow_instance:advance": "Manually advance workflow instances",
  "workflow_instance:approve": "Approve workflow steps",
  "workflow_instance:assign": "Assign workflow instances to users"
}
```

#### Administrative Permissions

```json
{
  "workflow:admin": "Full administrative access",
  "workflow:migrate": "Migrate workflow instances",
  "workflow:bulk_update": "Perform bulk updates",
  "workflow:analytics": "Access workflow analytics",
  "workflow:health": "Access health endpoints"
}
```

### Role-Based Access Examples

```http
# Employee can read their own workflow instances
GET /workflow-instances/instance-123
Authorization: Bearer <employee_token>

# Manager can approve workflow steps
POST /workflow-instances/instance-123/approve
Authorization: Bearer <manager_token>

# Admin can access all workflows
GET /workflows
Authorization: Bearer <admin_token>
```

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "WORKFLOW_NOT_FOUND",
    "message": "Workflow definition not found",
    "details": {
      "workflowId": "workflow-999",
      "version": "1.0.0"
    },
    "path": "/workflows/workflow-999",
    "timestamp": "2025-01-22T12:00:00Z",
    "requestId": "req-123456"
  },
  "meta": {
    "version": "1.0.0",
    "documentation": "https://docs.pliers.company.com/api/errors"
  }
}
```

### Error Codes

#### Workflow Definition Errors (4000-4099)

```json
{
  "WORKFLOW_NOT_FOUND": {
    "code": 4001,
    "httpStatus": 404,
    "message": "Workflow definition not found"
  },
  "WORKFLOW_VERSION_NOT_FOUND": {
    "code": 4002,
    "httpStatus": 404,
    "message": "Workflow definition version not found"
  },
  "WORKFLOW_VALIDATION_FAILED": {
    "code": 4003,
    "httpStatus": 400,
    "message": "Workflow definition validation failed"
  },
  "WORKFLOW_NAME_CONFLICT": {
    "code": 4004,
    "httpStatus": 409,
    "message": "Workflow name already exists"
  },
  "WORKFLOW_PUBLISH_FAILED": {
    "code": 4005,
    "httpStatus": 400,
    "message": "Workflow definition cannot be published"
  }
}
```

#### Workflow Instance Errors (4100-4199)

```json
{
  "WORKFLOW_INSTANCE_NOT_FOUND": {
    "code": 4101,
    "httpStatus": 404,
    "message": "Workflow instance not found"
  },
  "WORKFLOW_INSTANCE_LOCKED": {
    "code": 4102,
    "httpStatus": 409,
    "message": "Workflow instance is locked by another operation"
  },
  "INVALID_STATE_TRANSITION": {
    "code": 4103,
    "httpStatus": 400,
    "message": "Invalid state transition"
  },
  "WORKFLOW_INSTANCE_COMPLETED": {
    "code": 4104,
    "httpStatus": 400,
    "message": "Cannot modify completed workflow instance"
  },
  "CONCURRENT_MODIFICATION": {
    "code": 4105,
    "httpStatus": 409,
    "message": "Workflow instance was modified by another user"
  }
}
```

#### Approval Errors (4200-4299)

```json
{
  "APPROVAL_NOT_FOUND": {
    "code": 4201,
    "httpStatus": 404,
    "message": "Approval not found"
  },
  "APPROVAL_ALREADY_DECIDED": {
    "code": 4202,
    "httpStatus": 400,
    "message": "Approval has already been decided"
  },
  "INSUFFICIENT_APPROVAL_PERMISSIONS": {
    "code": 4203,
    "httpStatus": 403,
    "message": "User does not have permission to approve this step"
  },
  "APPROVAL_TIMEOUT_EXCEEDED": {
    "code": 4204,
    "httpStatus": 400,
    "message": "Approval timeout has been exceeded"
  },
  "INVALID_DELEGATION": {
    "code": 4205,
    "httpStatus": 400,
    "message": "Invalid approval delegation"
  }
}
```

#### System Errors (5000-5099)

```json
{
  "INTERNAL_SERVER_ERROR": {
    "code": 5000,
    "httpStatus": 500,
    "message": "Internal server error"
  },
  "DATABASE_ERROR": {
    "code": 5001,
    "httpStatus": 500,
    "message": "Database operation failed"
  },
  "EXTERNAL_SERVICE_ERROR": {
    "code": 5002,
    "httpStatus": 502,
    "message": "External service error"
  },
  "TIMEOUT_ERROR": {
    "code": 5003,
    "httpStatus": 504,
    "message": "Operation timeout"
  }
}
```

### Validation Errors

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed",
    "details": {
      "field": "definition.stateMachine.states",
      "errors": [
        {
          "code": "REQUIRED_FIELD",
          "message": "Field is required",
          "path": "definition.stateMachine.states.initial"
        },
        {
          "code": "INVALID_FORMAT",
          "message": "Invalid state name format",
          "path": "definition.stateMachine.states.pending-approval",
          "expected": "snake_case or camelCase"
        }
      ]
    }
  }
}
```

---

## Rate Limiting

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642785434
X-RateLimit-Policy: 1000;w=3600
```

### Rate Limit Tiers

#### Standard Tier
- **Workflow Operations:** 100 requests per hour
- **Instance Operations:** 1000 requests per hour
- **Analytics:** 50 requests per hour
- **WebSocket Connections:** 10 concurrent connections

#### Premium Tier
- **Workflow Operations:** 500 requests per hour
- **Instance Operations:** 5000 requests per hour
- **Analytics:** 200 requests per hour
- **WebSocket Connections:** 50 concurrent connections

#### Enterprise Tier
- **Workflow Operations:** 2000 requests per hour
- **Instance Operations:** 20000 requests per hour
- **Analytics:** 1000 requests per hour
- **WebSocket Connections:** 200 concurrent connections

### Rate Limit Exceeded Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 1000,
      "remaining": 0,
      "resetAt": "2025-01-22T13:00:00Z",
      "retryAfter": 3600
    }
  }
}
```

---

## API Versioning

### Versioning Strategy

- **URL Versioning:** `/api/v1/workflows`, `/api/v2/workflows`
- **Header Versioning:** `Accept: application/vnd.pliers.v1+json`
- **Semantic Versioning:** API versions follow semantic versioning principles

### Version Support

- **Current Version:** v1.0.0
- **Supported Versions:** v1.x.x
- **Deprecated Versions:** None (initial release)
- **End-of-Life:** 12 months after deprecation notice

### Version Compatibility

```http
# Request specific API version
GET /api/v1/workflows
Accept: application/vnd.pliers.v1+json

# Use latest version (not recommended for production)
GET /api/workflows
Accept: application/json
```

---

## SDK Examples

### JavaScript/TypeScript SDK

```typescript
import { WorkflowClient } from '@pliers/workflow-sdk';

// Initialize client
const client = new WorkflowClient({
  baseUrl: 'https://api.pliers.company.com/v1',
  apiKey: 'your-api-key',
  timeout: 30000
});

// Create workflow definition
const workflow = await client.workflows.create({
  name: 'employee_onboarding',
  title: 'Employee Onboarding Process',
  definition: {
    version: '1.0.0',
    settings: {
      allowConcurrentInstances: true
    }
  },
  stateMachine: {
    states: { /* state definitions */ },
    transitions: [ /* transitions */ ]
  }
});

// Start workflow instance
const instance = await client.instances.create({
  workflowDefinitionId: workflow.id,
  initialData: {
    employee_id: 'EMP001',
    department: 'Engineering'
  },
  assignedTo: 'manager-123',
  priority: 'high'
});

// Approve workflow step
await client.approvals.approve({
  workflowInstanceId: instance.id,
  stepId: 'manager_approval',
  action: 'approve',
  comments: 'All requirements met'
});

// Get user's pending approvals
const approvals = await client.users.getApprovals('user-123', {
  overdueOnly: false,
  workflowId: workflow.id
});

// Subscribe to real-time updates
client.subscribe('workflow_instance', { instanceId: instance.id })
  .on('state_changed', (event) => {
    console.log('State changed:', event.data);
  })
  .on('approval_requested', (event) => {
    console.log('Approval requested:', event.data);
  });
```

### Python SDK

```python
from pliers_workflow import WorkflowClient
from pliers_workflow.models import CreateWorkflowRequest, CreateInstanceRequest

# Initialize client
client = WorkflowClient(
    base_url='https://api.pliers.company.com/v1',
    api_key='your-api-key'
)

# Create workflow
workflow_request = CreateWorkflowRequest(
    name='vendor_onboarding',
    title='Vendor Onboarding Process',
    definition={
        'version': '1.0.0',
        'settings': {
            'allowConcurrentInstances': True
        }
    }
)
workflow = client.workflows.create(workflow_request)

# Start instance
instance_request = CreateInstanceRequest(
    workflow_definition_id=workflow.id,
    initial_data={
        'vendor_name': 'ACME Corp',
        'annual_spend': 100000
    },
    priority='medium'
)
instance = client.instances.create(instance_request)

# Monitor instance
status = client.instances.get(instance.id)
print(f"Instance status: {status.status}")
print(f"Current state: {status.current_state}")

# Get analytics
analytics = client.workflows.get_analytics(
    workflow_id=workflow.id,
    time_range={
        'from': '2025-01-01T00:00:00Z',
        'to': '2025-01-31T23:59:59Z'
    },
    metrics=['completion_rate', 'average_duration']
)
print(f"Completion rate: {analytics.summary.completion_rate}%")
```

### Java SDK

```java
import com.pliers.workflow.WorkflowClient;
import com.pliers.workflow.models.*;

// Initialize client
WorkflowClient client = WorkflowClient.builder()
    .baseUrl("https://api.pliers.company.com/v1")
    .apiKey("your-api-key")
    .build();

// Create workflow
CreateWorkflowRequest workflowRequest = CreateWorkflowRequest.builder()
    .name("document_review")
    .title("Document Review Process")
    .definition(WorkflowDefinition.builder()
        .version("1.0.0")
        .settings(WorkflowSettings.builder()
            .allowConcurrentInstances(true)
            .build())
        .build())
    .build();

WorkflowDefinition workflow = client.workflows().create(workflowRequest);

// Start instance
CreateInstanceRequest instanceRequest = CreateInstanceRequest.builder()
    .workflowDefinitionId(workflow.getId())
    .initialData(Map.of(
        "document_id", "DOC-123",
        "document_type", "contract"
    ))
    .assignedTo("reviewer-456")
    .build();

WorkflowInstance instance = client.instances().create(instanceRequest);

// Approve step
ApprovalDecisionRequest approvalRequest = ApprovalDecisionRequest.builder()
    .workflowInstanceId(instance.getId())
    .stepId("legal_review")
    .action(ApprovalAction.APPROVE)
    .comments("Legal review completed successfully")
    .build();

client.approvals().approve(approvalRequest);

// Get instance timeline
WorkflowTimeline timeline = client.instances().getTimeline(instance.getId());
timeline.getEvents().forEach(event ->
    System.out.println(event.getTimestamp() + ": " + event.getTitle())
);
```

---

## Integration Patterns

### Webhook Integration

```javascript
// Webhook endpoint configuration
const webhookConfig = {
  url: 'https://your-system.com/api/pliers-webhooks',
  events: [
    'workflow.instance.completed',
    'workflow.instance.failed',
    'workflow.approval.requested',
    'workflow.sla.breached'
  ],
  headers: {
    'Authorization': 'Bearer your-webhook-secret',
    'X-Webhook-Source': 'pliers-workflow-engine'
  },
  retryPolicy: {
    maxAttempts: 3,
    backoffStrategy: 'exponential'
  }
};

// Webhook payload example
const webhookPayload = {
  event: 'workflow.instance.completed',
  timestamp: '2025-01-22T12:00:00Z',
  data: {
    instanceId: 'instance-456',
    workflowId: 'workflow-123',
    workflowName: 'employee_onboarding',
    finalState: 'completed',
    duration: 86400000, // 24 hours in ms
    completedBy: 'manager-789'
  },
  metadata: {
    correlationId: 'corr-123',
    source: 'pliers-workflow-engine',
    version: '1.0.0'
  }
};
```

### Event-Driven Integration

```javascript
// Event publishing to external systems
const eventConfig = {
  eventTypes: [
    {
      internal: 'workflow.instance.started',
      external: 'employee.onboarding.initiated',
      mapping: {
        'employee_id': 'data.instanceData.employee_id',
        'department': 'data.instanceData.department',
        'start_date': 'data.instanceData.start_date'
      }
    }
  ],
  targets: [
    {
      type: 'kafka',
      topic: 'employee-events',
      config: {
        brokers: ['kafka1:9092', 'kafka2:9092']
      }
    },
    {
      type: 'aws_eventbridge',
      eventBusName: 'company-events',
      config: {
        region: 'us-east-1'
      }
    }
  ]
};
```

### Database Integration

```sql
-- Create views for reporting
CREATE VIEW workflow_performance_summary AS
SELECT
    wd.name as workflow_name,
    wd.title as workflow_title,
    COUNT(*) as total_instances,
    COUNT(CASE WHEN wi.status = 'completed' THEN 1 END) as completed_instances,
    AVG(EXTRACT(EPOCH FROM (wi.completed_at - wi.started_at)) * 1000) as avg_duration_ms,
    COUNT(CASE WHEN wi.sla_breach_at IS NOT NULL THEN 1 END) as sla_breaches
FROM workflow_definitions wd
JOIN workflow_instances wi ON wd.id = wi.workflow_definition_id
WHERE wi.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY wd.id, wd.name, wd.title;

-- Create triggers for audit logging
CREATE OR REPLACE FUNCTION log_workflow_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO workflow_audit_log (
        table_name,
        operation,
        old_values,
        new_values,
        changed_by,
        changed_at
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
        current_setting('app.current_user_id', true),
        NOW()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_instances_audit
    AFTER INSERT OR UPDATE OR DELETE ON workflow_instances
    FOR EACH ROW EXECUTE FUNCTION log_workflow_changes();
```

This comprehensive API specification provides everything needed to integrate with the Workflow Engine, from basic CRUD operations to advanced features like real-time monitoring, analytics, and webhook integrations.