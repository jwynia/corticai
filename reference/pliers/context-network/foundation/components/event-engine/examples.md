# Event Engine Examples and Use Cases

## Purpose
Provides practical examples, implementation patterns, and use cases for the Event Engine component to guide development and demonstrate real-world usage scenarios.

## Classification
- **Domain:** Implementation Guide
- **Stability:** Evolving
- **Abstraction:** Practical
- **Confidence:** High

## Overview

This document provides comprehensive examples of how to use the Event Engine in various scenarios, from basic event publishing to complex event-driven workflows. Each example includes complete code implementations, configuration options, and best practices.

## Basic Event Operations

### Publishing Events

#### Simple Event Publishing

```typescript
import { EventEngine, BaseEvent, EVENT_TYPES } from './schema';

// Initialize the event engine
const eventEngine = new EventEngine({
  store: {
    connectionString: 'postgresql://localhost/pliers_events'
  }
});

// Create and publish a form creation event
async function publishFormCreated() {
  const event: BaseEvent = {
    id: crypto.randomUUID(),
    type: EVENT_TYPES.FORM_CREATED,
    version: 1,
    timestamp: new Date(),
    aggregateId: 'form-123',
    aggregateType: 'form',
    sequenceNumber: 1,
    metadata: {
      userId: 'user-456',
      sourceSystem: 'form-designer',
      sourceVersion: '1.0.0',
      sessionId: 'session-789'
    },
    payload: {
      formId: 'form-123',
      name: 'Customer Registration Form',
      version: 1,
      definition: {
        fields: [
          { id: 'name', type: 'text', label: 'Full Name', required: true },
          { id: 'email', type: 'email', label: 'Email Address', required: true }
        ]
      },
      createdBy: 'user-456'
    }
  };

  await eventEngine.publish(event);
  console.log('Form creation event published successfully');
}
```

#### Batch Event Publishing

```typescript
async function publishFormWithInitialSubmission() {
  const formEvent: BaseEvent = {
    id: crypto.randomUUID(),
    type: EVENT_TYPES.FORM_CREATED,
    version: 1,
    timestamp: new Date(),
    aggregateId: 'form-456',
    aggregateType: 'form',
    sequenceNumber: 1,
    correlationId: crypto.randomUUID(),
    metadata: {
      userId: 'user-123',
      sourceSystem: 'api',
      sourceVersion: '2.0.0'
    },
    payload: {
      formId: 'form-456',
      name: 'Product Feedback Form',
      version: 1,
      definition: { /* form definition */ },
      createdBy: 'user-123'
    }
  };

  const submissionEvent: BaseEvent = {
    id: crypto.randomUUID(),
    type: EVENT_TYPES.SUBMISSION_CREATED,
    version: 1,
    timestamp: new Date(),
    aggregateId: 'submission-789',
    aggregateType: 'submission',
    sequenceNumber: 1,
    causationId: formEvent.id,
    correlationId: formEvent.correlationId,
    metadata: {
      userId: 'user-789',
      sourceSystem: 'frontend',
      sourceVersion: '1.5.0'
    },
    payload: {
      submissionId: 'submission-789',
      formId: 'form-456',
      data: {
        rating: 5,
        comments: 'Great product!',
        recommend: true
      },
      status: 'submitted',
      submittedBy: 'user-789'
    }
  };

  // Publish events as an atomic batch
  await eventEngine.publishBatch([formEvent, submissionEvent]);
  console.log('Form and initial submission events published');
}
```

### Event Subscription and Streaming

#### Real-time Event Subscription

```typescript
import { EventFilter, EventHandler } from './schema';

// Subscribe to all form-related events
async function subscribeToFormEvents() {
  const filter: EventFilter = {
    aggregateTypes: ['form'],
    eventTypes: ['form.created', 'form.updated', 'form.deleted']
  };

  const handler: EventHandler = async (event) => {
    console.log(`Received form event: ${event.type}`);

    switch (event.type) {
      case 'form.created':
        await handleFormCreated(event);
        break;
      case 'form.updated':
        await handleFormUpdated(event);
        break;
      case 'form.deleted':
        await handleFormDeleted(event);
        break;
    }
  };

  const subscription = await eventEngine.subscribe(filter, handler);
  console.log(`Subscribed to form events: ${subscription.id}`);

  return subscription;
}

async function handleFormCreated(event: BaseEvent) {
  // Update search index
  await searchEngine.indexForm(event.payload.formId, event.payload.definition);

  // Send notification to form creator
  await notificationService.sendFormCreatedNotification(
    event.payload.createdBy,
    event.payload.name
  );

  // Log for analytics
  analytics.track('form_created', {
    formId: event.payload.formId,
    userId: event.payload.createdBy,
    timestamp: event.timestamp
  });
}
```

#### WebSocket Event Streaming

```typescript
// Client-side WebSocket connection for real-time events
class EventStreamClient {
  private ws: WebSocket;
  private subscriptions: Map<string, EventHandler> = new Map();

  async connect(url: string, authToken: string) {
    this.ws = new WebSocket(`${url}?token=${authToken}`);

    this.ws.onopen = () => {
      console.log('Connected to event stream');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('Disconnected from event stream');
      // Implement reconnection logic
      setTimeout(() => this.connect(url, authToken), 5000);
    };
  }

  async subscribeToSubmissionUpdates(formId: string, handler: EventHandler) {
    const filter: EventFilter = {
      eventTypes: ['submission.created', 'submission.status.changed'],
      payloadFilters: [{
        path: '$.formId',
        operator: 'equals',
        value: formId
      }]
    };

    const subscriptionId = crypto.randomUUID();
    this.subscriptions.set(subscriptionId, handler);

    // Send subscription request
    this.ws.send(JSON.stringify({
      type: 'subscribe',
      subscriptionId,
      filter,
      options: {
        includeHistory: false,
        bufferSize: 50
      }
    }));

    return subscriptionId;
  }

  private handleMessage(message: any) {
    if (message.type === 'event') {
      const handler = this.subscriptions.get(message.streamId);
      if (handler) {
        handler(message.data);
      }
    }
  }
}
```

## Plugin System Examples

### Basic Plugin Implementation

```typescript
import { EventPlugin, PluginContext, PluginResult } from './schema';

// Email notification plugin
class EmailNotificationPlugin implements EventPlugin {
  id = 'email-notification-plugin';
  name = 'Email Notification Plugin';
  version = '1.0.0';
  priority = 50;

  async process(event: BaseEvent, context: PluginContext): Promise<PluginResult> {
    const startTime = Date.now();

    try {
      if (event.type === 'submission.created') {
        await this.sendSubmissionNotification(event);
      } else if (event.type === 'submission.status.changed') {
        await this.sendStatusChangeNotification(event);
      }

      return {
        pluginId: this.id,
        success: true,
        executionTime: Date.now() - startTime,
        metadata: {
          emailsSent: 1,
          notificationType: this.getNotificationType(event.type)
        }
      };
    } catch (error) {
      return {
        pluginId: this.id,
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
        retryable: true
      };
    }
  }

  private async sendSubmissionNotification(event: BaseEvent) {
    const { formId, submittedBy } = event.payload;

    // Get form definition to find notification recipients
    const form = await formEngine.getForm(formId);
    const recipients = form.settings.notificationEmails || [];

    if (recipients.length > 0) {
      await emailService.send({
        to: recipients,
        subject: `New submission for ${form.name}`,
        template: 'submission-notification',
        data: {
          formName: form.name,
          submissionId: event.payload.submissionId,
          submittedBy,
          submissionUrl: `${config.baseUrl}/submissions/${event.payload.submissionId}`
        }
      });
    }
  }

  private async sendStatusChangeNotification(event: BaseEvent) {
    const { submissionId, fromStatus, toStatus, changedBy } = event.payload;

    // Get submission details
    const submission = await submissionEngine.getSubmission(submissionId);
    const form = await formEngine.getForm(submission.formId);

    await emailService.send({
      to: [submission.submittedBy],
      subject: `Status update for your ${form.name} submission`,
      template: 'status-change-notification',
      data: {
        formName: form.name,
        submissionId,
        fromStatus,
        toStatus,
        changedBy,
        submissionUrl: `${config.baseUrl}/submissions/${submissionId}`
      }
    });
  }

  private getNotificationType(eventType: string): string {
    switch (eventType) {
      case 'submission.created':
        return 'new_submission';
      case 'submission.status.changed':
        return 'status_change';
      default:
        return 'unknown';
    }
  }
}

// Register the plugin
await eventEngine.registerPlugin(
  new EmailNotificationPlugin(),
  ['submission.created', 'submission.status.changed'],
  {
    priority: 50,
    timeout: 10000,
    retry: {
      maxAttempts: 3,
      backoffStrategy: 'exponential',
      baseDelay: 1000
    }
  }
);
```

### Advanced Plugin with Event Generation

```typescript
// Workflow automation plugin that generates new events
class WorkflowAutomationPlugin implements EventPlugin {
  id = 'workflow-automation-plugin';
  name = 'Workflow Automation Plugin';
  version = '2.0.0';
  priority = 75;

  async process(event: BaseEvent, context: PluginContext): Promise<PluginResult> {
    const startTime = Date.now();
    const generatedEvents: BaseEvent[] = [];

    try {
      if (event.type === 'submission.created') {
        const workflowEvents = await this.processSubmissionWorkflow(event, context);
        generatedEvents.push(...workflowEvents);
      }

      return {
        pluginId: this.id,
        success: true,
        executionTime: Date.now() - startTime,
        generatedEvents,
        metadata: {
          workflowRulesApplied: generatedEvents.length,
          context: 'submission_workflow'
        }
      };
    } catch (error) {
      return {
        pluginId: this.id,
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
        retryable: false // Workflow errors are typically not retryable
      };
    }
  }

  private async processSubmissionWorkflow(
    event: BaseEvent,
    context: PluginContext
  ): Promise<BaseEvent[]> {
    const { submissionId, formId, data } = event.payload;
    const events: BaseEvent[] = [];

    // Get form workflow rules
    const form = await formEngine.getForm(formId);
    const workflowRules = form.workflowRules || [];

    for (const rule of workflowRules) {
      if (this.evaluateCondition(rule.condition, data)) {
        // Auto-approve if submission meets criteria
        if (rule.action === 'auto_approve') {
          const statusChangeEvent: BaseEvent = {
            id: crypto.randomUUID(),
            type: EVENT_TYPES.SUBMISSION_STATUS_CHANGED,
            version: 1,
            timestamp: new Date(),
            aggregateId: submissionId,
            aggregateType: 'submission',
            sequenceNumber: 2, // Assuming this is the second event for this submission
            causationId: event.id,
            correlationId: event.correlationId,
            metadata: {
              ...context.event.metadata,
              sourceSystem: 'workflow-automation',
              automationRule: rule.id
            },
            payload: {
              submissionId,
              fromStatus: 'submitted',
              toStatus: 'approved',
              changedBy: 'system',
              reason: `Auto-approved by rule: ${rule.name}`,
              metadata: {
                automationRule: rule.id,
                ruleCondition: rule.condition
              }
            }
          };

          events.push(statusChangeEvent);
        }

        // Assign to specific user/team
        if (rule.action === 'assign') {
          const assignmentEvent: BaseEvent = {
            id: crypto.randomUUID(),
            type: 'submission.assigned',
            version: 1,
            timestamp: new Date(),
            aggregateId: submissionId,
            aggregateType: 'submission',
            sequenceNumber: 2,
            causationId: event.id,
            correlationId: event.correlationId,
            metadata: {
              ...context.event.metadata,
              sourceSystem: 'workflow-automation',
              automationRule: rule.id
            },
            payload: {
              submissionId,
              assignedTo: rule.assignTo,
              assignedBy: 'system',
              reason: `Auto-assigned by rule: ${rule.name}`
            }
          };

          events.push(assignmentEvent);
        }
      }
    }

    return events;
  }

  private evaluateCondition(condition: any, data: any): boolean {
    // Simple condition evaluation (in real implementation, use a proper rules engine)
    switch (condition.operator) {
      case 'equals':
        return data[condition.field] === condition.value;
      case 'greater_than':
        return data[condition.field] > condition.value;
      case 'contains':
        return data[condition.field]?.includes?.(condition.value);
      default:
        return false;
    }
  }
}
```

## Event Routing Examples

### Webhook Integration

```typescript
import { RoutingRule, RoutingTarget } from './schema';

// Route submission events to external webhook
async function setupWebhookRouting() {
  const webhookRule: RoutingRule = {
    id: crypto.randomUUID(),
    name: 'CRM Integration Webhook',
    description: 'Send new customer submissions to CRM system',
    conditions: [
      {
        type: 'event_type',
        operator: 'equals',
        value: 'submission.created'
      },
      {
        type: 'payload',
        operator: 'equals',
        field: 'formId',
        value: 'customer-registration-form'
      }
    ],
    targets: [
      {
        type: 'webhook',
        config: {
          url: 'https://api.crm.com/webhooks/new-customer',
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ${CRM_API_TOKEN}',
            'Content-Type': 'application/json'
          },
          transformPayload: true,
          payloadTemplate: {
            customerData: '${event.payload.data}',
            submissionId: '${event.payload.submissionId}',
            timestamp: '${event.timestamp}',
            source: 'pliers'
          }
        },
        retryConfig: {
          maxAttempts: 5,
          backoffStrategy: 'exponential',
          baseDelay: 2000,
          maxDelay: 30000
        }
      }
    ],
    enabled: true,
    priority: 80,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'admin'
  };

  await eventEngine.addRoute(webhookRule);
  console.log('Webhook routing rule added');
}
```

### Multi-Channel Notification Routing

```typescript
// Route high-priority events to multiple channels
async function setupMultiChannelNotifications() {
  const urgentNotificationRule: RoutingRule = {
    id: crypto.randomUUID(),
    name: 'Urgent Issue Notifications',
    description: 'Multi-channel notifications for critical issues',
    conditions: [
      {
        type: 'payload',
        operator: 'equals',
        field: 'priority',
        value: 'critical'
      },
      {
        type: 'event_type',
        operator: 'in',
        value: ['submission.created', 'submission.status.changed']
      }
    ],
    targets: [
      // Email notification
      {
        type: 'email',
        config: {
          recipients: ['support@company.com', 'alerts@company.com'],
          subject: 'URGENT: Critical submission requires attention',
          template: 'critical-alert',
          priority: 'high'
        }
      },
      // Slack notification
      {
        type: 'webhook',
        config: {
          url: 'https://hooks.slack.com/services/...',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          payloadTemplate: {
            text: ':rotating_light: Critical submission: ${event.payload.submissionId}',
            channel: '#alerts',
            username: 'PlierBot',
            attachments: [{
              color: 'danger',
              fields: [
                { title: 'Submission ID', value: '${event.payload.submissionId}', short: true },
                { title: 'Form', value: '${event.payload.formId}', short: true },
                { title: 'Priority', value: '${event.payload.priority}', short: true },
                { title: 'Time', value: '${event.timestamp}', short: true }
              ]
            }]
          }
        }
      },
      // SMS notification for on-call engineer
      {
        type: 'webhook',
        config: {
          url: 'https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json',
          method: 'POST',
          headers: {
            'Authorization': 'Basic ${TWILIO_AUTH}',
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          payloadTemplate: {
            To: '${ON_CALL_PHONE}',
            From: '${TWILIO_PHONE}',
            Body: 'CRITICAL: Submission ${event.payload.submissionId} needs immediate attention. Check Pliers dashboard.'
          }
        }
      }
    ],
    enabled: true,
    priority: 95,
    rateLimit: {
      maxEvents: 10,
      timeWindow: 300000 // 5 minutes
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'admin'
  };

  await eventEngine.addRoute(urgentNotificationRule);
}
```

## Event Replay and Debugging

### Debugging Event Sequences

```typescript
// Debug a specific submission workflow
async function debugSubmissionWorkflow(submissionId: string) {
  console.log(`Debugging workflow for submission: ${submissionId}`);

  // Get all events for this submission
  const events = await eventEngine.replayEvents(submissionId);

  console.log(`Found ${events.length} events:`);

  for (const event of events) {
    console.log(`\n[${event.sequenceNumber}] ${event.type} at ${event.timestamp}`);
    console.log(`  User: ${event.metadata.userId || 'system'}`);
    console.log(`  Source: ${event.metadata.sourceSystem}`);

    if (event.causationId) {
      const causedBy = events.find(e => e.id === event.causationId);
      console.log(`  Caused by: ${causedBy?.type || 'unknown'}`);
    }

    // Show relevant payload data
    if (event.type === 'submission.status.changed') {
      console.log(`  Status: ${event.payload.fromStatus} → ${event.payload.toStatus}`);
      console.log(`  Reason: ${event.payload.reason || 'Not specified'}`);
    }

    if (event.type === 'plugin.executed') {
      console.log(`  Plugin: ${event.payload.pluginId}`);
      console.log(`  Success: ${event.payload.success}`);
      console.log(`  Execution time: ${event.payload.executionTime}ms`);
    }
  }

  // Reconstruct current state
  const currentState = await eventEngine.replayToState(submissionId, {
    id: submissionId,
    status: 'unknown',
    data: {},
    history: []
  }, submissionReducer);

  console.log('\nCurrent state:', JSON.stringify(currentState, null, 2));
}

// State reducer for submission events
function submissionReducer(state: any, event: BaseEvent): any {
  switch (event.type) {
    case 'submission.created':
      return {
        ...state,
        id: event.payload.submissionId,
        formId: event.payload.formId,
        data: event.payload.data,
        status: event.payload.status,
        submittedBy: event.payload.submittedBy,
        createdAt: event.timestamp,
        history: [...state.history, { event: event.type, timestamp: event.timestamp }]
      };

    case 'submission.status.changed':
      return {
        ...state,
        status: event.payload.toStatus,
        lastModified: event.timestamp,
        history: [...state.history, {
          event: event.type,
          timestamp: event.timestamp,
          fromStatus: event.payload.fromStatus,
          toStatus: event.payload.toStatus,
          changedBy: event.payload.changedBy
        }]
      };

    default:
      return {
        ...state,
        history: [...state.history, { event: event.type, timestamp: event.timestamp }]
      };
  }
}
```

### Time-Travel Debugging

```typescript
// Replay system state at a specific point in time
async function timeTravel(aggregateId: string, targetTime: Date) {
  console.log(`Time-traveling to ${targetTime} for aggregate: ${aggregateId}`);

  // Get all events up to the target time
  const events = await eventEngine.readEventsByTimeRange(
    new Date(0), // From beginning
    targetTime
  );

  // Filter events for this aggregate
  const aggregateEvents = events.filter(e => e.aggregateId === aggregateId);

  if (aggregateEvents.length === 0) {
    console.log('No events found for this aggregate at the specified time');
    return null;
  }

  // Replay events to reconstruct state
  const stateAtTime = await eventEngine.createProjection(aggregateEvents, {
    initialState: { id: aggregateId, events: [] },
    handlers: {
      'submission.created': (state, event) => ({
        ...state,
        id: event.payload.submissionId,
        formId: event.payload.formId,
        data: event.payload.data,
        status: event.payload.status,
        events: [...state.events, event]
      }),
      'submission.status.changed': (state, event) => ({
        ...state,
        status: event.payload.toStatus,
        events: [...state.events, event]
      })
    }
  });

  console.log('State at target time:', JSON.stringify(stateAtTime, null, 2));
  return stateAtTime;
}
```

## Dead Letter Queue Management

### Handling Failed Events

```typescript
// Monitor and retry failed events
async function manageFailed Events() {
  // Get events in dead letter queue
  const deadLetterEvents = await eventEngine.getDeadLetterEvents({
    status: 'pending_retry',
    limit: 50
  });

  console.log(`Found ${deadLetterEvents.length} failed events to retry`);

  for (const dlEvent of deadLetterEvents) {
    const { originalEvent, error, attempts } = dlEvent;

    console.log(`\nRetrying event: ${originalEvent.type}`);
    console.log(`  Previous attempts: ${attempts}`);
    console.log(`  Error: ${error.message}`);

    // Determine if we should retry based on error type
    if (shouldRetry(error, attempts)) {
      try {
        const result = await eventEngine.retryDeadLetterEvent(dlEvent.id);

        if (result.success) {
          console.log(`  ✅ Retry successful`);
        } else {
          console.log(`  ❌ Retry failed: ${result.error?.message}`);
        }
      } catch (retryError) {
        console.error(`  💥 Retry threw exception:`, retryError);
      }
    } else {
      // Mark as permanent failure
      await eventEngine.markPermanentFailure(
        dlEvent.id,
        `Max retries exceeded or non-retryable error: ${error.type}`
      );
      console.log(`  🔒 Marked as permanent failure`);
    }
  }
}

function shouldRetry(error: ProcessingError, attempts: number): boolean {
  // Don't retry validation errors
  if (error.type === 'validation_error') {
    return false;
  }

  // Don't retry authorization errors
  if (error.type === 'authorization_error') {
    return false;
  }

  // Don't retry if max attempts reached
  if (attempts >= 5) {
    return false;
  }

  // Retry network and timeout errors
  return ['network_error', 'timeout_error', 'processing_error'].includes(error.type);
}
```

### Custom Dead Letter Queue Processing

```typescript
// Custom processor for specific types of failed events
class FailedWebhookProcessor {
  async processFailedWebhooks() {
    const failedWebhooks = await eventEngine.getDeadLetterEvents({
      errorType: 'network_error',
      limit: 100
    });

    for (const failed of failedWebhooks) {
      await this.handleFailedWebhook(failed);
    }
  }

  private async handleFailedWebhook(dlEvent: DeadLetterEvent) {
    const { originalEvent, error, attempts } = dlEvent;

    // Check if the target service is back online
    const serviceUrl = this.extractServiceUrl(error.context?.webhookUrl);
    const isOnline = await this.checkServiceHealth(serviceUrl);

    if (isOnline && attempts < 3) {
      // Service is back online, retry
      await eventEngine.retryDeadLetterEvent(dlEvent.id);
      console.log(`Retried webhook for event ${originalEvent.id}`);
    } else if (!isOnline) {
      // Service still down, reschedule for later
      const nextRetry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      await this.scheduleRetry(dlEvent.id, nextRetry);
      console.log(`Rescheduled webhook retry for ${nextRetry}`);
    } else {
      // Max retries reached, send to alternative endpoint or alert admins
      await this.sendToAlternativeEndpoint(originalEvent);
      await eventEngine.markPermanentFailure(
        dlEvent.id,
        'Max retries reached, sent to alternative endpoint'
      );
    }
  }

  private extractServiceUrl(webhookUrl: string): string {
    try {
      const url = new URL(webhookUrl);
      return `${url.protocol}//${url.host}`;
    } catch {
      return '';
    }
  }

  private async checkServiceHealth(serviceUrl: string): Promise<boolean> {
    try {
      const response = await fetch(`${serviceUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async scheduleRetry(dlEventId: string, retryAt: Date) {
    // Update the dead letter event with new retry time
    // This would be implemented based on your specific DLQ storage
  }

  private async sendToAlternativeEndpoint(event: BaseEvent) {
    // Send to backup webhook or queue for manual processing
    await backupQueue.add('failed-webhook', {
      originalEvent: event,
      reason: 'primary_webhook_failed',
      timestamp: new Date()
    });
  }
}
```

## Event Compaction Examples

### Automatic Snapshot Creation

```typescript
// Configure automatic snapshot creation for performance
async function setupSnapshotCompaction() {
  const snapshotStrategy: CompactionStrategy = {
    type: 'snapshot',
    config: {
      snapshotFrequency: 100, // Create snapshot every 100 events
      keepSnapshots: 5,       // Keep last 5 snapshots
      preserveAuditTrail: true
    }
  };

  // Schedule compaction for submission aggregates
  await eventEngine.scheduleCompaction({
    id: crypto.randomUUID(),
    name: 'Submission Snapshot Compaction',
    strategy: snapshotStrategy,
    schedule: '0 2 * * *', // Daily at 2 AM
    enabled: true,
    aggregateTypes: ['submission'],
    createdAt: new Date(),
    createdBy: 'system'
  });

  console.log('Snapshot compaction scheduled');
}
```

### Custom Compaction Logic

```typescript
// Custom compaction for form definition changes
class FormCompactionProcessor {
  async compactFormEvents(formId: string) {
    const events = await eventEngine.readEvents(formId);

    // Group events by type
    const eventsByType = this.groupEventsByType(events);

    // Keep only the latest version creation event
    const versionEvents = eventsByType['form.version.created'] || [];
    const latestVersion = versionEvents[versionEvents.length - 1];

    // Keep all structural changes but merge cosmetic updates
    const updateEvents = eventsByType['form.updated'] || [];
    const compactedUpdates = this.mergeCosmetic Updates(updateEvents);

    // Create compacted event sequence
    const compactedEvents = [
      eventsByType['form.created'][0], // Always keep creation event
      ...compactedUpdates,
      latestVersion
    ].filter(Boolean);

    // Calculate space savings
    const originalSize = events.length;
    const compactedSize = compactedEvents.length;
    const spaceReduction = ((originalSize - compactedSize) / originalSize) * 100;

    console.log(`Compacted ${originalSize} events to ${compactedSize} (${spaceReduction.toFixed(1)}% reduction)`);

    return {
      originalEventCount: originalSize,
      compactedEventCount: compactedSize,
      spaceSaved: originalSize - compactedSize,
      compactionTime: Date.now(),
      strategy: 'custom_form_compaction'
    };
  }

  private groupEventsByType(events: BaseEvent[]): Record<string, BaseEvent[]> {
    return events.reduce((groups, event) => {
      const type = event.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(event);
      return groups;
    }, {} as Record<string, BaseEvent[]>);
  }

  private mergeCosmeticUpdates(updateEvents: BaseEvent[]): BaseEvent[] {
    // Merge consecutive cosmetic updates (label changes, descriptions, etc.)
    const merged: BaseEvent[] = [];
    let currentBatch: BaseEvent[] = [];

    for (const event of updateEvents) {
      const isCosmeticUpdate = this.isCosmeticUpdate(event);

      if (isCosmeticUpdate) {
        currentBatch.push(event);
      } else {
        // Structural change - flush cosmetic batch and add structural change
        if (currentBatch.length > 0) {
          merged.push(this.createMergedEvent(currentBatch));
          currentBatch = [];
        }
        merged.push(event);
      }
    }

    // Flush remaining cosmetic batch
    if (currentBatch.length > 0) {
      merged.push(this.createMergedEvent(currentBatch));
    }

    return merged;
  }

  private isCosmeticUpdate(event: BaseEvent): boolean {
    const changes = event.payload.changes || {};
    const cosmeticFields = ['label', 'description', 'helpText', 'placeholder'];

    return Object.keys(changes).every(field =>
      cosmeticFields.some(cosmetic => field.includes(cosmetic))
    );
  }

  private createMergedEvent(events: BaseEvent[]): BaseEvent {
    if (events.length === 1) {
      return events[0];
    }

    // Merge all cosmetic changes into a single event
    const mergedChanges = events.reduce((acc, event) => {
      return { ...acc, ...event.payload.changes };
    }, {});

    return {
      ...events[events.length - 1], // Use latest event as base
      payload: {
        ...events[events.length - 1].payload,
        changes: mergedChanges,
        mergedFrom: events.map(e => e.id),
        compactionType: 'cosmetic_merge'
      },
      metadata: {
        ...events[events.length - 1].metadata,
        compactionInfo: {
          originalEventCount: events.length,
          mergedEventIds: events.map(e => e.id),
          compactionTimestamp: new Date()
        }
      }
    };
  }
}
```

## Performance and Monitoring Examples

### Event Volume Monitoring

```typescript
// Monitor event volume and performance
async function monitorEventEngine() {
  const timeRange = {
    from: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    to: new Date()
  };

  // Get volume metrics
  const volumeMetrics = await eventEngine.getVolumeMetrics(timeRange);
  console.log('Event Volume (Last 24h):');
  console.log(`  Total events: ${volumeMetrics.totalEvents}`);
  console.log(`  Events/second: ${volumeMetrics.eventsPerSecond.toFixed(2)}`);
  console.log(`  Peak volume: ${volumeMetrics.peakVolume}/sec`);

  console.log('\nEvents by type:');
  Object.entries(volumeMetrics.eventsByType)
    .sort(([,a], [,b]) => b - a)
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

  // Get performance metrics
  const perfMetrics = await eventEngine.getPerformanceMetrics(timeRange);
  console.log('\nPerformance Metrics:');
  console.log(`  Avg processing time: ${perfMetrics.averageEventProcessingTime.toFixed(2)}ms`);
  console.log(`  P95 processing time: ${perfMetrics.p95EventProcessingTime.toFixed(2)}ms`);
  console.log(`  Avg query time: ${perfMetrics.averageQueryTime.toFixed(2)}ms`);
  console.log(`  Throughput: ${perfMetrics.throughput.toFixed(2)} events/sec`);

  // Get error metrics
  const errorMetrics = await eventEngine.getErrorMetrics(timeRange);
  console.log('\nError Metrics:');
  console.log(`  Total errors: ${errorMetrics.totalErrors}`);
  console.log(`  Error rate: ${errorMetrics.errorRate.toFixed(2)}%`);
  console.log(`  DLQ size: ${errorMetrics.deadLetterQueueSize}`);
  console.log(`  Retry success rate: ${errorMetrics.retrySuccessRate.toFixed(2)}%`);

  // Alert if metrics exceed thresholds
  if (perfMetrics.p95EventProcessingTime > 1000) {
    console.warn('⚠️  HIGH LATENCY: P95 processing time exceeds 1000ms');
  }

  if (errorMetrics.errorRate > 5) {
    console.warn('⚠️  HIGH ERROR RATE: Error rate exceeds 5%');
  }

  if (errorMetrics.deadLetterQueueSize > 100) {
    console.warn('⚠️  LARGE DLQ: Dead letter queue has >100 events');
  }
}
```

### Health Check Implementation

```typescript
// Comprehensive health check for event engine
async function performHealthCheck(): Promise<HealthStatus> {
  const startTime = Date.now();
  const components: Record<string, any> = {};

  // Check event store connectivity
  try {
    await eventEngine.store.ping();
    components.eventStore = {
      status: 'healthy',
      message: 'Event store is accessible',
      lastCheck: new Date(),
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    components.eventStore = {
      status: 'unhealthy',
      message: `Event store error: ${error.message}`,
      lastCheck: new Date()
    };
  }

  // Check cache connectivity
  try {
    await eventEngine.cache.ping();
    components.cache = {
      status: 'healthy',
      message: 'Cache is accessible',
      lastCheck: new Date()
    };
  } catch (error) {
    components.cache = {
      status: 'degraded',
      message: `Cache error: ${error.message}`,
      lastCheck: new Date()
    };
  }

  // Check plugin system
  try {
    const activePlugins = await eventEngine.getActivePlugins();
    components.plugins = {
      status: 'healthy',
      message: `${activePlugins.length} plugins active`,
      lastCheck: new Date()
    };
  } catch (error) {
    components.plugins = {
      status: 'degraded',
      message: `Plugin system error: ${error.message}`,
      lastCheck: new Date()
    };
  }

  // Check dead letter queue size
  try {
    const dlqSize = await eventEngine.getDeadLetterQueueSize();
    components.deadLetterQueue = {
      status: dlqSize < 100 ? 'healthy' : 'degraded',
      message: `${dlqSize} events in DLQ`,
      lastCheck: new Date()
    };
  } catch (error) {
    components.deadLetterQueue = {
      status: 'unhealthy',
      message: `DLQ check failed: ${error.message}`,
      lastCheck: new Date()
    };
  }

  // Determine overall status
  const componentStatuses = Object.values(components).map(c => c.status);
  const overallStatus = componentStatuses.includes('unhealthy') ? 'unhealthy' :
                       componentStatuses.includes('degraded') ? 'degraded' : 'healthy';

  // Get current metrics
  const metrics = await eventEngine.getCurrentMetrics();

  return {
    status: overallStatus,
    timestamp: new Date(),
    version: '1.0.0',
    uptime: process.uptime() * 1000,
    components,
    metrics: {
      eventsProcessedLast1m: metrics.eventsProcessedLast1m,
      activeSubscriptions: metrics.activeSubscriptions,
      errorRate: metrics.errorRate,
      memoryUsage: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal * 100,
      diskUsage: await getDiskUsage()
    }
  };
}

async function getDiskUsage(): Promise<number> {
  // Implementation would depend on your system
  // This is a placeholder
  return 45.2; // Percentage
}
```

## Integration Testing Examples

### End-to-End Event Flow Testing

```typescript
import { EventEngine } from './event-engine';
import { TestContainers } from 'testcontainers';

describe('Event Engine Integration Tests', () => {
  let eventEngine: EventEngine;
  let postgres: StartedTestContainer;

  beforeAll(async () => {
    // Start test database
    postgres = await new GenericContainer('postgres:15')
      .withEnvironment({
        POSTGRES_DB: 'test_events',
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test'
      })
      .withExposedPorts(5432)
      .start();

    // Initialize event engine with test database
    eventEngine = new EventEngine({
      store: {
        connectionString: `postgresql://test:test@localhost:${postgres.getMappedPort(5432)}/test_events`
      }
    });

    await eventEngine.initialize();
  });

  afterAll(async () => {
    await eventEngine.shutdown();
    await postgres.stop();
  });

  test('should handle complete form submission workflow', async () => {
    const correlationId = crypto.randomUUID();
    const events: BaseEvent[] = [];

    // Setup event capture
    const subscription = await eventEngine.subscribe(
      { correlationId: correlationId },
      (event) => events.push(event)
    );

    // Step 1: Create form
    const formCreatedEvent: BaseEvent = {
      id: crypto.randomUUID(),
      type: 'form.created',
      version: 1,
      timestamp: new Date(),
      aggregateId: 'test-form-123',
      aggregateType: 'form',
      sequenceNumber: 1,
      correlationId,
      metadata: {
        userId: 'test-user',
        sourceSystem: 'test',
        sourceVersion: '1.0.0'
      },
      payload: {
        formId: 'test-form-123',
        name: 'Test Registration Form',
        version: 1,
        definition: {
          fields: [
            { id: 'email', type: 'email', required: true },
            { id: 'name', type: 'text', required: true }
          ]
        },
        createdBy: 'test-user'
      }
    };

    await eventEngine.publish(formCreatedEvent);

    // Step 2: Submit form
    const submissionCreatedEvent: BaseEvent = {
      id: crypto.randomUUID(),
      type: 'submission.created',
      version: 1,
      timestamp: new Date(),
      aggregateId: 'test-submission-456',
      aggregateType: 'submission',
      sequenceNumber: 1,
      causationId: formCreatedEvent.id,
      correlationId,
      metadata: {
        userId: 'submitter',
        sourceSystem: 'test',
        sourceVersion: '1.0.0'
      },
      payload: {
        submissionId: 'test-submission-456',
        formId: 'test-form-123',
        data: {
          email: 'test@example.com',
          name: 'Test User'
        },
        status: 'submitted',
        submittedBy: 'submitter'
      }
    };

    await eventEngine.publish(submissionCreatedEvent);

    // Step 3: Status change
    const statusChangedEvent: BaseEvent = {
      id: crypto.randomUUID(),
      type: 'submission.status.changed',
      version: 1,
      timestamp: new Date(),
      aggregateId: 'test-submission-456',
      aggregateType: 'submission',
      sequenceNumber: 2,
      causationId: submissionCreatedEvent.id,
      correlationId,
      metadata: {
        userId: 'reviewer',
        sourceSystem: 'test',
        sourceVersion: '1.0.0'
      },
      payload: {
        submissionId: 'test-submission-456',
        fromStatus: 'submitted',
        toStatus: 'approved',
        changedBy: 'reviewer',
        reason: 'Meets all requirements'
      }
    };

    await eventEngine.publish(statusChangedEvent);

    // Wait for event processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify all events were captured
    expect(events).toHaveLength(3);
    expect(events.map(e => e.type)).toEqual([
      'form.created',
      'submission.created',
      'submission.status.changed'
    ]);

    // Verify event ordering
    expect(events[1].causationId).toBe(formCreatedEvent.id);
    expect(events[2].causationId).toBe(submissionCreatedEvent.id);

    // Verify correlation
    expect(events.every(e => e.correlationId === correlationId)).toBe(true);

    // Clean up
    await subscription.unsubscribe();
  });

  test('should handle plugin processing chain', async () => {
    // Register test plugins
    const plugin1Results: PluginResult[] = [];
    const plugin2Results: PluginResult[] = [];

    const plugin1: EventPlugin = {
      id: 'test-plugin-1',
      name: 'Test Plugin 1',
      version: '1.0.0',
      priority: 100,
      async process(event, context) {
        const result: PluginResult = {
          pluginId: 'test-plugin-1',
          success: true,
          executionTime: 10,
          metadata: { processed: true }
        };
        plugin1Results.push(result);
        return result;
      }
    };

    const plugin2: EventPlugin = {
      id: 'test-plugin-2',
      name: 'Test Plugin 2',
      version: '1.0.0',
      priority: 50,
      async process(event, context) {
        const result: PluginResult = {
          pluginId: 'test-plugin-2',
          success: true,
          executionTime: 15,
          metadata: {
            processed: true,
            previousResults: context.previousResults.length
          }
        };
        plugin2Results.push(result);
        return result;
      }
    };

    await eventEngine.registerPlugin(plugin1, ['test.event'], { priority: 100 });
    await eventEngine.registerPlugin(plugin2, ['test.event'], { priority: 50 });

    // Publish test event
    const testEvent: BaseEvent = {
      id: crypto.randomUUID(),
      type: 'test.event',
      version: 1,
      timestamp: new Date(),
      aggregateId: 'test-aggregate',
      aggregateType: 'test',
      sequenceNumber: 1,
      metadata: {
        sourceSystem: 'test',
        sourceVersion: '1.0.0'
      },
      payload: { test: true }
    };

    await eventEngine.publish(testEvent);

    // Wait for plugin processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify plugins were executed in priority order
    expect(plugin1Results).toHaveLength(1);
    expect(plugin2Results).toHaveLength(1);
    expect(plugin1Results[0].success).toBe(true);
    expect(plugin2Results[0].success).toBe(true);

    // Plugin 2 should have received plugin 1's result as context
    expect(plugin2Results[0].metadata?.previousResults).toBe(1);
  });
});
```

This comprehensive examples document provides practical implementations for all major Event Engine features, demonstrating real-world usage patterns that development teams can adapt for their specific needs.

## Relationships
- **Parent Nodes:** [foundation/components/event-engine/specification.md] - demonstrates - Practical implementations of specification
- **Related Nodes:**
  - [foundation/components/event-engine/schema.ts] - uses - TypeScript types and interfaces
  - [foundation/components/event-engine/api.md] - implements - API patterns and WebSocket usage

## Navigation Guidance
- **Access Context**: Reference when implementing event-driven features or understanding practical usage patterns
- **Common Next Steps**: Review API documentation or specific implementation areas
- **Related Tasks**: Event system implementation, plugin development, integration testing
- **Update Patterns**: Update when new usage patterns emerge or examples need enhancement

## Metadata
- **Created:** 2025-01-22
- **Last Updated:** 2025-01-22
- **Updated By:** Claude/DOC-002-4 Implementation

## Change History
- 2025-01-22: Initial examples document with comprehensive usage patterns and implementation guides