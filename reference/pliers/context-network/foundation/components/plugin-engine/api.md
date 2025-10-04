# Plugin Engine REST API Specification

## Purpose
Defines the REST API endpoints for the Plugin Engine component, enabling plugin management, installation, configuration, and monitoring through HTTP interfaces.

## Classification
- **Domain:** API Specification
- **Stability:** Semi-stable
- **Abstraction:** Interface
- **Confidence:** High

## Overview

The Plugin Engine REST API provides comprehensive endpoints for managing the complete plugin lifecycle, from discovery and installation to monitoring and removal. All endpoints follow RESTful conventions and include proper error handling, pagination, and security controls.

### API Base URL
```
https://api.pliers.dev/v3/plugins
```

### Authentication
All API endpoints require authentication via JWT bearer tokens unless otherwise specified.

```http
Authorization: Bearer <jwt_token>
```

### Content Types
- Request: `application/json`
- Response: `application/json`
- File uploads: `multipart/form-data`

## Plugin Management Endpoints

### List Plugins

Retrieve a paginated list of installed plugins with optional filtering.

```http
GET /plugins
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | - | Filter by plugin status (`active`, `inactive`, `error`) |
| `category` | string | - | Filter by plugin category |
| `search` | string | - | Search plugin names and descriptions |
| `limit` | integer | 20 | Number of plugins per page (max 100) |
| `offset` | integer | 0 | Number of plugins to skip |
| `sort` | string | `name` | Sort field (`name`, `version`, `installed`, `status`) |
| `order` | string | `asc` | Sort order (`asc`, `desc`) |

#### Response

```json
{
  "plugins": [
    {
      "id": "advanced-validation",
      "name": "Advanced Validation",
      "version": "1.2.0",
      "description": "Advanced form validation rules",
      "author": "Pliers Team",
      "category": "validation",
      "status": "active",
      "installedAt": "2025-01-15T10:30:00Z",
      "lastUpdated": "2025-01-20T14:45:00Z",
      "config": {
        "hasCustomConfig": true,
        "isConfigured": true
      },
      "metrics": {
        "executions": 1250,
        "errors": 3,
        "avgExecutionTime": 45
      }
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### Get Plugin Details

Retrieve detailed information about a specific plugin.

```http
GET /plugins/{pluginId}
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pluginId` | string | Plugin identifier |

#### Response

```json
{
  "id": "advanced-validation",
  "name": "Advanced Validation",
  "version": "1.2.0",
  "description": "Advanced form validation rules including phone numbers and credit cards",
  "author": "Pliers Team <plugins@pliers.dev>",
  "license": "MIT",
  "category": "validation",
  "tags": ["validation", "forms", "business-rules"],
  "status": "active",
  "installedAt": "2025-01-15T10:30:00Z",
  "lastUpdated": "2025-01-20T14:45:00Z",
  "manifest": {
    "engines": {
      "pliers": "^3.0.0",
      "node": ">=18.0.0"
    },
    "permissions": {
      "events": ["subscribe"]
    },
    "hooks": {
      "form.validate": {
        "priority": 200,
        "async": false
      }
    }
  },
  "config": {
    "schema": { /* JSON Schema */ },
    "current": {
      "defaultCountryCode": "US",
      "strictBusinessEmail": false
    },
    "isValid": true
  },
  "metrics": {
    "execution": {
      "count": 1250,
      "successCount": 1247,
      "errorCount": 3,
      "avgDuration": 45,
      "maxDuration": 120
    },
    "resources": {
      "memoryUsage": {
        "current": 12.5,
        "peak": 18.2,
        "average": 14.1
      },
      "cpuUsage": {
        "current": 2.1,
        "peak": 8.4,
        "total": 850
      }
    },
    "health": {
      "status": "healthy",
      "lastCheck": "2025-01-22T09:15:00Z",
      "uptime": 518400000
    }
  },
  "dependencies": [
    {
      "name": "libphonenumber-js",
      "version": "1.10.0",
      "status": "satisfied"
    }
  ]
}
```

### Install Plugin

Install a plugin from the marketplace or upload a plugin package.

```http
POST /plugins
```

#### Request Body (Marketplace Installation)

```json
{
  "source": "marketplace",
  "pluginId": "advanced-validation",
  "version": "1.2.0",
  "config": {
    "defaultCountryCode": "US",
    "strictBusinessEmail": false
  }
}
```

#### Request Body (Package Upload)

```http
Content-Type: multipart/form-data

package: <plugin-package.zip>
config: {"defaultCountryCode": "US"}
```

#### Response

```json
{
  "success": true,
  "pluginId": "advanced-validation",
  "version": "1.2.0",
  "installedAt": "2025-01-22T10:00:00Z",
  "status": "active",
  "dependencies": [
    {
      "name": "libphonenumber-js",
      "version": "1.10.0",
      "installed": true
    }
  ],
  "warnings": [
    "Plugin requires restart for full activation"
  ]
}
```

### Update Plugin

Update an installed plugin to a newer version.

```http
PUT /plugins/{pluginId}
```

#### Request Body

```json
{
  "version": "1.3.0",
  "preserveConfig": true,
  "force": false
}
```

#### Response

```json
{
  "success": true,
  "pluginId": "advanced-validation",
  "oldVersion": "1.2.0",
  "newVersion": "1.3.0",
  "updatedAt": "2025-01-22T10:30:00Z",
  "changes": [
    "Added support for international phone validation",
    "Fixed issue with business email detection"
  ],
  "warnings": []
}
```

### Uninstall Plugin

Remove a plugin from the system.

```http
DELETE /plugins/{pluginId}
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `removeData` | boolean | false | Remove plugin data and configuration |
| `force` | boolean | false | Force removal even if dependencies exist |

#### Response

```json
{
  "success": true,
  "pluginId": "advanced-validation",
  "uninstalledAt": "2025-01-22T11:00:00Z",
  "removedData": true,
  "affectedPlugins": []
}
```

## Plugin Configuration Endpoints

### Get Plugin Configuration

Retrieve the current configuration for a plugin.

```http
GET /plugins/{pluginId}/config
```

#### Response

```json
{
  "schema": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
      "defaultCountryCode": {
        "type": "string",
        "description": "Default country code for phone validation",
        "default": "US"
      }
    }
  },
  "current": {
    "defaultCountryCode": "US",
    "strictBusinessEmail": false
  },
  "isValid": true,
  "lastUpdated": "2025-01-20T14:45:00Z"
}
```

### Update Plugin Configuration

Update the configuration for a plugin.

```http
PUT /plugins/{pluginId}/config
```

#### Request Body

```json
{
  "defaultCountryCode": "CA",
  "strictBusinessEmail": true,
  "customValidations": {
    "postalCode": true
  }
}
```

#### Response

```json
{
  "success": true,
  "updatedAt": "2025-01-22T12:00:00Z",
  "isValid": true,
  "restartRequired": false,
  "changes": [
    "defaultCountryCode: US -> CA",
    "strictBusinessEmail: false -> true",
    "Added customValidations.postalCode"
  ]
}
```

### Validate Plugin Configuration

Validate configuration without applying changes.

```http
POST /plugins/{pluginId}/config/validate
```

#### Request Body

```json
{
  "defaultCountryCode": "INVALID",
  "strictBusinessEmail": "not-boolean"
}
```

#### Response

```json
{
  "valid": false,
  "errors": [
    {
      "path": "defaultCountryCode",
      "message": "Invalid country code format",
      "value": "INVALID"
    },
    {
      "path": "strictBusinessEmail",
      "message": "Expected boolean, got string",
      "value": "not-boolean"
    }
  ]
}
```

## Plugin Status and Control Endpoints

### Get Plugin Status

Get the current status and health of a plugin.

```http
GET /plugins/{pluginId}/status
```

#### Response

```json
{
  "status": "active",
  "health": "healthy",
  "uptime": 518400000,
  "lastCheck": "2025-01-22T09:15:00Z",
  "restarts": 0,
  "errors": {
    "recent": [],
    "total": 3
  },
  "resources": {
    "memory": {
      "current": 12.5,
      "limit": 128
    },
    "cpu": {
      "current": 2.1,
      "limit": 1000
    }
  }
}
```

### Start/Stop Plugin

Control plugin execution state.

```http
POST /plugins/{pluginId}/start
POST /plugins/{pluginId}/stop
POST /plugins/{pluginId}/restart
```

#### Request Body (Optional)

```json
{
  "reason": "Configuration update",
  "graceful": true,
  "timeout": 30000
}
```

#### Response

```json
{
  "success": true,
  "action": "restart",
  "previousStatus": "active",
  "currentStatus": "active",
  "timestamp": "2025-01-22T12:30:00Z",
  "duration": 2500
}
```

## Plugin Monitoring Endpoints

### Get Plugin Metrics

Retrieve performance and usage metrics for a plugin.

```http
GET /plugins/{pluginId}/metrics
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period` | string | `24h` | Time period (`1h`, `24h`, `7d`, `30d`) |
| `granularity` | string | `auto` | Data granularity (`minute`, `hour`, `day`) |
| `metrics` | string | `all` | Specific metrics (`execution`, `resources`, `errors`) |

#### Response

```json
{
  "period": {
    "from": "2025-01-21T12:30:00Z",
    "to": "2025-01-22T12:30:00Z",
    "granularity": "hour"
  },
  "execution": {
    "total": 1250,
    "successful": 1247,
    "failed": 3,
    "avgDuration": 45,
    "maxDuration": 120,
    "timeline": [
      {
        "timestamp": "2025-01-22T12:00:00Z",
        "count": 52,
        "avgDuration": 43,
        "errors": 0
      }
    ]
  },
  "resources": {
    "memory": {
      "current": 12.5,
      "peak": 18.2,
      "average": 14.1,
      "timeline": [
        {
          "timestamp": "2025-01-22T12:00:00Z",
          "value": 12.5
        }
      ]
    },
    "cpu": {
      "current": 2.1,
      "peak": 8.4,
      "total": 850,
      "timeline": [
        {
          "timestamp": "2025-01-22T12:00:00Z",
          "value": 2.1
        }
      ]
    }
  }
}
```

### Get Plugin Logs

Retrieve plugin execution logs.

```http
GET /plugins/{pluginId}/logs
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `level` | string | - | Log level filter (`error`, `warn`, `info`, `debug`) |
| `from` | string | - | Start timestamp (ISO 8601) |
| `to` | string | - | End timestamp (ISO 8601) |
| `limit` | integer | 100 | Maximum number of log entries |
| `search` | string | - | Search log messages |

#### Response

```json
{
  "logs": [
    {
      "timestamp": "2025-01-22T12:25:30Z",
      "level": "info",
      "message": "Validated phone number for submission 12345",
      "context": {
        "hook": "submission.beforeValidate",
        "executionId": "exec-789",
        "submissionId": "12345"
      }
    },
    {
      "timestamp": "2025-01-22T12:20:15Z",
      "level": "warn",
      "message": "Business email validation failed for consumer domain",
      "context": {
        "hook": "submission.beforeValidate",
        "executionId": "exec-788",
        "email": "user@gmail.com"
      }
    }
  ],
  "pagination": {
    "total": 1250,
    "limit": 100,
    "hasMore": true
  }
}
```

### Get Plugin Errors

Retrieve plugin error history and details.

```http
GET /plugins/{pluginId}/errors
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `severity` | string | - | Error severity filter (`low`, `medium`, `high`, `critical`) |
| `resolved` | boolean | - | Filter by resolution status |
| `limit` | integer | 50 | Maximum number of errors |

#### Response

```json
{
  "errors": [
    {
      "id": "error-123",
      "type": "runtime_error",
      "severity": "medium",
      "message": "Phone validation timeout",
      "timestamp": "2025-01-22T11:45:00Z",
      "context": {
        "hook": "submission.beforeValidate",
        "executionId": "exec-756",
        "submissionId": "12340"
      },
      "stack": "Error: Phone validation timeout\n    at validatePhoneNumber...",
      "resolved": false,
      "occurrences": 3,
      "firstSeen": "2025-01-22T10:30:00Z",
      "lastSeen": "2025-01-22T11:45:00Z"
    }
  ],
  "summary": {
    "total": 15,
    "unresolved": 8,
    "bySeverity": {
      "critical": 0,
      "high": 2,
      "medium": 6,
      "low": 7
    }
  }
}
```

## Plugin Marketplace Endpoints

### Search Marketplace

Search for plugins in the marketplace.

```http
GET /marketplace/search
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | - | Search query |
| `category` | string | - | Plugin category filter |
| `tags` | string | - | Comma-separated tags |
| `compatibility` | string | - | Pliers version compatibility |
| `verified` | boolean | - | Show only verified plugins |
| `sort` | string | `relevance` | Sort by (`relevance`, `downloads`, `rating`, `updated`) |
| `limit` | integer | 20 | Results per page |
| `offset` | integer | 0 | Results offset |

#### Response

```json
{
  "plugins": [
    {
      "id": "advanced-validation",
      "name": "Advanced Validation",
      "description": "Advanced form validation rules",
      "version": "1.2.0",
      "author": "Pliers Team",
      "category": "validation",
      "tags": ["validation", "forms"],
      "license": "MIT",
      "verified": true,
      "downloads": 15420,
      "rating": 4.8,
      "ratingCount": 127,
      "lastUpdated": "2025-01-20T14:45:00Z",
      "compatibility": ["^3.0.0"],
      "homepage": "https://github.com/pliers/advanced-validation",
      "installed": false
    }
  ],
  "pagination": {
    "total": 156,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  },
  "facets": {
    "categories": {
      "validation": 23,
      "integration": 45,
      "workflow": 32
    },
    "licenses": {
      "MIT": 89,
      "Apache-2.0": 34,
      "GPL-3.0": 12
    }
  }
}
```

### Get Marketplace Plugin Details

Get detailed information about a marketplace plugin.

```http
GET /marketplace/plugins/{pluginId}
```

#### Response

```json
{
  "id": "advanced-validation",
  "name": "Advanced Validation",
  "description": "Advanced form validation rules including phone numbers and credit cards",
  "longDescription": "This plugin provides comprehensive validation...",
  "version": "1.2.0",
  "author": "Pliers Team <plugins@pliers.dev>",
  "category": "validation",
  "tags": ["validation", "forms", "business-rules"],
  "license": "MIT",
  "verified": true,
  "downloads": 15420,
  "rating": 4.8,
  "ratingCount": 127,
  "createdAt": "2024-06-15T10:00:00Z",
  "lastUpdated": "2025-01-20T14:45:00Z",
  "compatibility": ["^3.0.0"],
  "homepage": "https://github.com/pliers/advanced-validation",
  "repository": "https://github.com/pliers/advanced-validation",
  "documentation": "https://docs.pliers.dev/plugins/advanced-validation",
  "support": "support@pliers.dev",
  "versions": [
    {
      "version": "1.2.0",
      "releaseDate": "2025-01-20T14:45:00Z",
      "changes": ["Added international phone support", "Fixed email validation bug"]
    },
    {
      "version": "1.1.0",
      "releaseDate": "2025-01-10T09:30:00Z",
      "changes": ["Added credit card validation"]
    }
  ],
  "screenshots": [
    "https://cdn.pliers.dev/plugins/advanced-validation/screen1.png"
  ],
  "installed": false,
  "dependencies": [
    {
      "name": "libphonenumber-js",
      "version": "^1.10.0"
    }
  ],
  "permissions": {
    "events": ["subscribe"],
    "database": [],
    "network": [],
    "filesystem": []
  }
}
```

## Plugin Development Endpoints

### Validate Plugin Package

Validate a plugin package before installation.

```http
POST /plugins/validate
```

#### Request Body

```http
Content-Type: multipart/form-data

package: <plugin-package.zip>
```

#### Response

```json
{
  "valid": true,
  "manifest": {
    "name": "test-plugin",
    "version": "1.0.0",
    "valid": true
  },
  "security": {
    "safe": true,
    "issues": [],
    "score": 95
  },
  "dependencies": {
    "resolved": true,
    "conflicts": [],
    "missing": []
  },
  "warnings": [
    "Plugin does not include TypeScript definitions"
  ]
}
```

### Plugin Development Mode

Enable development mode for a plugin (allows hot-reloading).

```http
POST /plugins/{pluginId}/dev-mode
```

#### Request Body

```json
{
  "enabled": true,
  "watchPaths": ["./src"],
  "hotReload": true,
  "debugMode": true
}
```

#### Response

```json
{
  "success": true,
  "devMode": {
    "enabled": true,
    "hotReload": true,
    "debugMode": true,
    "watchPaths": ["./src"]
  },
  "websocketUrl": "ws://localhost:3001/plugins/test-plugin/dev"
}
```

## Error Responses

All endpoints use standard HTTP status codes and return errors in a consistent format.

### Error Response Format

```json
{
  "error": {
    "code": "PLUGIN_NOT_FOUND",
    "message": "Plugin 'invalid-plugin' not found",
    "details": {
      "pluginId": "invalid-plugin",
      "availablePlugins": ["advanced-validation", "crm-integration"]
    },
    "timestamp": "2025-01-22T12:00:00Z",
    "requestId": "req-123456"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `PLUGIN_NOT_FOUND` | 404 | Plugin does not exist |
| `PLUGIN_ALREADY_EXISTS` | 409 | Plugin already installed |
| `INVALID_PLUGIN_PACKAGE` | 400 | Invalid plugin package format |
| `DEPENDENCY_CONFLICT` | 409 | Plugin dependency conflicts |
| `PERMISSION_DENIED` | 403 | Insufficient permissions |
| `PLUGIN_STARTUP_FAILED` | 500 | Plugin failed to start |
| `CONFIGURATION_INVALID` | 400 | Plugin configuration is invalid |
| `MARKETPLACE_UNAVAILABLE` | 503 | Marketplace service unavailable |

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **General endpoints**: 100 requests per minute
- **Plugin installation**: 10 requests per minute
- **Plugin uploads**: 5 requests per minute
- **Marketplace search**: 50 requests per minute

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1705924800
```

## WebSocket Events

Real-time plugin events are available via WebSocket:

```javascript
const ws = new WebSocket('wss://api.pliers.dev/v3/plugins/events');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Plugin event:', data);
};
```

### Event Types

```json
{
  "type": "plugin.status.changed",
  "pluginId": "advanced-validation",
  "data": {
    "oldStatus": "loading",
    "newStatus": "active",
    "timestamp": "2025-01-22T12:00:00Z"
  }
}
```

Available event types:
- `plugin.status.changed`
- `plugin.installed`
- `plugin.updated`
- `plugin.uninstalled`
- `plugin.error.occurred`
- `plugin.config.updated`
- `plugin.metrics.updated`

## SDK Integration

The Plugin Engine API is designed to work seamlessly with the official SDKs:

### JavaScript/TypeScript SDK

```typescript
import { PliersClient } from '@pliers/sdk';

const client = new PliersClient({
  apiKey: 'your-api-key',
  baseURL: 'https://api.pliers.dev/v3'
});

// Install plugin
const result = await client.plugins.install({
  pluginId: 'advanced-validation',
  version: '1.2.0'
});

// Get plugin metrics
const metrics = await client.plugins.getMetrics('advanced-validation', {
  period: '24h'
});
```

### CLI Integration

```bash
# Install plugin via CLI
pliers plugins install advanced-validation@1.2.0

# Get plugin status
pliers plugins status advanced-validation

# View plugin logs
pliers plugins logs advanced-validation --follow
```

## Security Considerations

### Authentication and Authorization

- All endpoints require valid JWT tokens
- Role-based access control (RBAC) enforced
- Plugin-specific permissions validated
- Audit logging for all operations

### Input Validation

- All input data validated against schemas
- File uploads scanned for malware
- Size limits enforced on uploads
- Content-Type validation required

### Rate Limiting and Abuse Prevention

- Per-user and per-IP rate limiting
- Plugin installation limits
- Monitoring for suspicious patterns
- Automatic blocking of malicious requests

This comprehensive API specification provides all necessary endpoints for managing plugins in the Pliers platform, from basic CRUD operations to advanced monitoring and marketplace integration.