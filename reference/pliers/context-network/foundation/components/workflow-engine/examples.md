# Workflow Engine Examples

This document provides practical examples and use cases for the Workflow Engine component, demonstrating real-world implementations and patterns.

## Table of Contents

1. [Basic Sequential Workflow](#basic-sequential-workflow)
2. [Approval Chain Workflow](#approval-chain-workflow)
3. [Parallel Execution Workflow](#parallel-execution-workflow)
4. [Conditional Branching Workflow](#conditional-branching-workflow)
5. [Sub-workflow Composition](#sub-workflow-composition)
6. [Event-Driven Workflow](#event-driven-workflow)
7. [SLA and Escalation Workflow](#sla-and-escalation-workflow)
8. [Complex Enterprise Workflow](#complex-enterprise-workflow)
9. [Integration Patterns](#integration-patterns)
10. [Common Patterns and Best Practices](#common-patterns-and-best-practices)

## Basic Sequential Workflow

### Use Case: Employee Onboarding

A simple sequential workflow for employee onboarding that progresses through multiple steps in order.

```typescript
import { WorkflowDefinition, WorkflowStateMachine } from './schema';

const employeeOnboardingWorkflow: WorkflowDefinition = {
  id: "emp-onboarding-v1",
  name: "employee_onboarding",
  version: "1.0.0",
  title: "Employee Onboarding Process",
  description: "Standard onboarding workflow for new employees",

  definition: {
    version: "1.0.0",
    name: "employee_onboarding",
    description: "Automates the complete employee onboarding process",
    settings: {
      allowConcurrentInstances: true,
      maxConcurrentInstances: 50,
      autoCleanupCompletedInstances: true,
      cleanupAfterDays: 90,
      enableVersionMigration: true,
      requireApprovalForModification: true
    },
    variables: [
      {
        name: "employee_id",
        type: "string",
        required: true,
        description: "Unique identifier for the new employee"
      },
      {
        name: "department",
        type: "string",
        required: true,
        description: "Employee's assigned department"
      },
      {
        name: "start_date",
        type: "date",
        required: true,
        description: "Employee's start date"
      },
      {
        name: "manager_id",
        type: "string",
        required: true,
        description: "Manager's user ID"
      }
    ]
  },

  stateMachine: {
    states: {
      "initial": {
        id: "initial",
        name: "Initial State",
        type: "initial",
        properties: {
          isInterruptible: false,
          allowManualTransition: false,
          requireApproval: false,
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "create_accounts": {
        id: "create_accounts",
        name: "Create System Accounts",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: false,
          requireApproval: false,
          slaMinutes: 240, // 4 hours
          maxRetries: 3,
          retryDelay: 30,
          rollbackOnFailure: true,
          persistData: true
        },
        timeouts: [{
          timeoutMinutes: 240,
          action: {
            type: "escalate",
            parameters: { "escalate_to": "it_manager" }
          }
        }]
      },
      "provision_equipment": {
        id: "provision_equipment",
        name: "Provision Equipment",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: true,
          requireApproval: false,
          slaMinutes: 480, // 8 hours
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "schedule_orientation": {
        id: "schedule_orientation",
        name: "Schedule Orientation",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: true,
          requireApproval: false,
          slaMinutes: 1440, // 24 hours
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "complete": {
        id: "complete",
        name: "Onboarding Complete",
        type: "final",
        properties: {
          isInterruptible: false,
          allowManualTransition: false,
          requireApproval: false,
          rollbackOnFailure: false,
          persistData: true
        }
      }
    },

    transitions: [
      {
        id: "start_onboarding",
        from: "initial",
        to: "create_accounts",
        trigger: {
          type: "automatic"
        },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "accounts_to_equipment",
        from: "create_accounts",
        to: "provision_equipment",
        trigger: {
          type: "automatic"
        },
        condition: "context.accounts_created === true",
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "equipment_to_orientation",
        from: "provision_equipment",
        to: "schedule_orientation",
        trigger: {
          type: "automatic"
        },
        condition: "context.equipment_provisioned === true",
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "finish_onboarding",
        from: "schedule_orientation",
        to: "complete",
        trigger: {
          type: "manual"
        },
        condition: "context.orientation_scheduled === true",
        priority: 1,
        isManual: true,
        requiresApproval: false
      }
    ],

    initialState: "initial",
    finalStates: ["complete"],
    guards: {},
    actions: {}
  },

  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: "system",
  updatedBy: "system",
  metadata: {
    category: "hr",
    tags: ["onboarding", "hr", "automation"],
    businessOwner: "hr_manager",
    technicalOwner: "dev_team"
  }
};
```

### Usage Example

```typescript
// Start a new onboarding workflow
const newInstance = await workflowEngine.createInstance({
  workflowDefinitionId: "emp-onboarding-v1",
  initialData: {
    employee_id: "EMP001",
    department: "Engineering",
    start_date: "2025-02-01",
    manager_id: "MGR123"
  },
  assignedTo: "hr_coordinator",
  priority: "medium",
  startImmediately: true
});

console.log(`Onboarding workflow started: ${newInstance.id}`);
```

## Approval Chain Workflow

### Use Case: Purchase Request Approval

A workflow with multiple approval levels based on purchase amount.

```typescript
import { ApprovalChain, WorkflowDefinition } from './schema';

const purchaseApprovalChain: ApprovalChain = {
  id: "purchase_approval_chain",
  name: "Purchase Request Approval",
  description: "Multi-level approval for purchase requests",

  steps: [
    {
      id: "manager_approval",
      name: "Manager Approval",
      type: "individual",
      approvers: [{
        type: "dynamic",
        identifier: "submission.manager_id"
      }],
      requirements: {
        minimumApprovals: 1,
        unanimousRequired: false,
        allowSelfApproval: false,
        requireComments: false,
        timeoutMinutes: 2880 // 48 hours
      },
      parallel: false,
      optional: false,
      skipCondition: "submission.amount <= 100"
    },
    {
      id: "finance_approval",
      name: "Finance Team Approval",
      type: "role",
      approvers: [{
        type: "role",
        identifier: "finance_approver"
      }],
      requirements: {
        minimumApprovals: 1,
        unanimousRequired: false,
        allowSelfApproval: false,
        requireComments: true,
        timeoutMinutes: 4320 // 72 hours
      },
      parallel: false,
      optional: false,
      skipCondition: "submission.amount <= 1000",
      escalation: {
        enabled: true,
        triggers: [{
          type: "timeout",
          threshold: 4320,
          businessDaysOnly: true
        }],
        actions: [{
          type: "escalate",
          target: "finance_manager",
          delay: 0
        }],
        maxEscalations: 2,
        escalationInterval: 1440 // 24 hours
      }
    },
    {
      id: "executive_approval",
      name: "Executive Approval",
      type: "group",
      approvers: [{
        type: "group",
        identifier: "executives"
      }],
      requirements: {
        minimumApprovals: 2,
        unanimousRequired: false,
        allowSelfApproval: false,
        requireComments: true,
        timeoutMinutes: 10080 // 1 week
      },
      parallel: false,
      optional: false,
      skipCondition: "submission.amount <= 10000"
    }
  ],

  configuration: {
    allowParallelSteps: false,
    allowSkipSteps: true,
    requireAllSteps: false,
    notifyOnStart: true,
    notifyOnComplete: true,
    trackDecisionHistory: true,
    enableReminders: true,
    reminderIntervalMinutes: 1440,
    maxReminderCount: 3
  }
};

const purchaseRequestWorkflow: WorkflowDefinition = {
  id: "purchase-request-v1",
  name: "purchase_request",
  version: "1.0.0",
  title: "Purchase Request Workflow",
  description: "Handles purchase request approvals with escalation",

  definition: {
    version: "1.0.0",
    name: "purchase_request",
    settings: {
      allowConcurrentInstances: true,
      autoCleanupCompletedInstances: true,
      cleanupAfterDays: 365,
      enableVersionMigration: true,
      requireApprovalForModification: true
    },
    variables: [
      {
        name: "amount",
        type: "number",
        required: true,
        description: "Purchase amount in USD"
      },
      {
        name: "vendor",
        type: "string",
        required: true,
        description: "Vendor name"
      },
      {
        name: "justification",
        type: "string",
        required: true,
        description: "Business justification"
      },
      {
        name: "urgency",
        type: "string",
        required: false,
        defaultValue: "normal",
        validation: {
          options: ["low", "normal", "high", "urgent"]
        }
      }
    ]
  },

  stateMachine: {
    states: {
      "initial": {
        id: "initial",
        name: "Initial",
        type: "initial",
        properties: {
          isInterruptible: false,
          allowManualTransition: false,
          requireApproval: false,
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "pending_approval": {
        id: "pending_approval",
        name: "Pending Approval",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: false,
          requireApproval: true,
          slaMinutes: 10080, // 1 week
          rollbackOnFailure: false,
          persistData: true
        },
        timeouts: [{
          timeoutMinutes: 10080,
          action: {
            type: "escalate"
          }
        }]
      },
      "approved": {
        id: "approved",
        name: "Approved",
        type: "final",
        properties: {
          isInterruptible: false,
          allowManualTransition: false,
          requireApproval: false,
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "rejected": {
        id: "rejected",
        name: "Rejected",
        type: "final",
        properties: {
          isInterruptible: false,
          allowManualTransition: false,
          requireApproval: false,
          rollbackOnFailure: false,
          persistData: true
        }
      }
    },

    transitions: [
      {
        id: "start_approval",
        from: "initial",
        to: "pending_approval",
        trigger: { type: "automatic" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "approve_request",
        from: "pending_approval",
        to: "approved",
        trigger: { type: "event", eventType: "approval.granted" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "reject_request",
        from: "pending_approval",
        to: "rejected",
        trigger: { type: "event", eventType: "approval.rejected" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      }
    ],

    initialState: "initial",
    finalStates: ["approved", "rejected"],
    guards: {},
    actions: {}
  },

  approvalChains: [purchaseApprovalChain],
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: "system",
  updatedBy: "system",
  metadata: {
    category: "finance",
    tags: ["purchase", "approval", "finance"],
    businessOwner: "finance_manager"
  }
};
```

### Approval Usage Example

```typescript
// Start purchase request workflow
const purchaseInstance = await workflowEngine.createInstance({
  workflowDefinitionId: "purchase-request-v1",
  initialData: {
    amount: 5000,
    vendor: "TechCorp Solutions",
    justification: "New development servers needed for Q2 projects",
    urgency: "high"
  },
  assignedTo: "finance_team",
  priority: "high"
});

// Manager approves the request
await workflowEngine.approveStep(purchaseInstance.id, {
  stepId: "manager_approval",
  action: "approve",
  comments: "Approved for Q2 infrastructure needs",
  approverId: "manager_001"
});

// Check approval status
const approvals = await workflowEngine.getApprovals(purchaseInstance.id);
console.log('Pending approvals:', approvals.filter(a => !a.decidedAt));
```

## Parallel Execution Workflow

### Use Case: Multi-Department Project Setup

A workflow that executes multiple independent tasks in parallel.

```typescript
const projectSetupWorkflow: WorkflowDefinition = {
  id: "project-setup-v1",
  name: "project_setup",
  version: "1.0.0",
  title: "Multi-Department Project Setup",
  description: "Parallel setup tasks across multiple departments",

  definition: {
    version: "1.0.0",
    name: "project_setup",
    settings: {
      allowConcurrentInstances: true,
      autoCleanupCompletedInstances: true,
      cleanupAfterDays: 180,
      enableVersionMigration: true,
      requireApprovalForModification: false
    },
    variables: [
      {
        name: "project_name",
        type: "string",
        required: true,
        description: "Name of the new project"
      },
      {
        name: "project_manager",
        type: "string",
        required: true,
        description: "Project manager user ID"
      },
      {
        name: "budget",
        type: "number",
        required: true,
        description: "Project budget"
      },
      {
        name: "departments",
        type: "array",
        required: true,
        description: "List of involved departments"
      }
    ]
  },

  stateMachine: {
    states: {
      "initial": {
        id: "initial",
        name: "Initial",
        type: "initial",
        properties: {
          isInterruptible: false,
          allowManualTransition: false,
          requireApproval: false,
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "parallel_setup": {
        id: "parallel_setup",
        name: "Parallel Department Setup",
        type: "parallel",
        properties: {
          isInterruptible: true,
          allowManualTransition: false,
          requireApproval: false,
          slaMinutes: 2880, // 48 hours
          rollbackOnFailure: true,
          persistData: true
        },
        substates: [
          {
            id: "it_setup",
            name: "IT Infrastructure Setup",
            type: "intermediate",
            properties: {
              isInterruptible: true,
              allowManualTransition: true,
              requireApproval: false,
              slaMinutes: 1440, // 24 hours
              rollbackOnFailure: false,
              persistData: true
            }
          },
          {
            id: "hr_setup",
            name: "HR Team Assignment",
            type: "intermediate",
            properties: {
              isInterruptible: true,
              allowManualTransition: true,
              requireApproval: false,
              slaMinutes: 720, // 12 hours
              rollbackOnFailure: false,
              persistData: true
            }
          },
          {
            id: "finance_setup",
            name: "Financial Setup",
            type: "intermediate",
            properties: {
              isInterruptible: true,
              allowManualTransition: true,
              requireApproval: false,
              slaMinutes: 1440, // 24 hours
              rollbackOnFailure: false,
              persistData: true
            }
          },
          {
            id: "legal_setup",
            name: "Legal Review",
            type: "intermediate",
            properties: {
              isInterruptible: true,
              allowManualTransition: true,
              requireApproval: true,
              slaMinutes: 2880, // 48 hours
              rollbackOnFailure: false,
              persistData: true
            }
          }
        ]
      },
      "integration": {
        id: "integration",
        name: "Integration and Finalization",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: true,
          requireApproval: false,
          slaMinutes: 480, // 8 hours
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "complete": {
        id: "complete",
        name: "Project Setup Complete",
        type: "final",
        properties: {
          isInterruptible: false,
          allowManualTransition: false,
          requireApproval: false,
          rollbackOnFailure: false,
          persistData: true
        }
      }
    },

    transitions: [
      {
        id: "start_parallel",
        from: "initial",
        to: "parallel_setup",
        trigger: { type: "automatic" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "parallel_to_integration",
        from: "parallel_setup",
        to: "integration",
        trigger: { type: "automatic" },
        condition: "context.all_substates_complete === true",
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "complete_setup",
        from: "integration",
        to: "complete",
        trigger: { type: "manual" },
        condition: "context.integration_complete === true",
        priority: 1,
        isManual: true,
        requiresApproval: false
      }
    ],

    initialState: "initial",
    finalStates: ["complete"],
    guards: {},
    actions: {}
  },

  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: "system",
  updatedBy: "system",
  metadata: {
    category: "project_management",
    tags: ["project", "setup", "parallel", "multi-department"]
  }
};
```

### Parallel Execution Configuration

```typescript
const parallelExecutionConfig: ParallelExecution = {
  type: "parallel",
  branches: [
    {
      id: "it_branch",
      name: "IT Setup Branch",
      steps: [
        {
          id: "create_repositories",
          name: "Create Code Repositories",
          type: "plugin",
          configuration: {
            pluginId: "git_manager",
            action: "create_repository",
            repository_name: "{{project_name}}",
            visibility: "private"
          },
          timeoutMinutes: 30
        },
        {
          id: "setup_ci_cd",
          name: "Setup CI/CD Pipeline",
          type: "plugin",
          configuration: {
            pluginId: "cicd_manager",
            action: "create_pipeline",
            project_name: "{{project_name}}"
          },
          timeoutMinutes: 60
        }
      ],
      weight: 30
    },
    {
      id: "hr_branch",
      name: "HR Setup Branch",
      steps: [
        {
          id: "assign_team",
          name: "Assign Team Members",
          type: "notification",
          configuration: {
            template: "team_assignment",
            recipients: [
              {
                type: "user",
                identifier: "{{project_manager}}"
              }
            ],
            channels: [
              {
                type: "email",
                configuration: {}
              }
            ]
          },
          timeoutMinutes: 15
        }
      ],
      weight: 10
    },
    {
      id: "finance_branch",
      name: "Finance Setup Branch",
      steps: [
        {
          id: "create_budget",
          name: "Create Project Budget",
          type: "webhook",
          configuration: {
            url: "https://finance.company.com/api/budgets",
            method: "POST",
            headers: {
              "Authorization": "Bearer {{finance_api_token}}"
            },
            payload: {
              project_name: "{{project_name}}",
              budget: "{{budget}}",
              manager: "{{project_manager}}"
            }
          },
          timeoutMinutes: 30
        }
      ],
      weight: 20
    },
    {
      id: "legal_branch",
      name: "Legal Review Branch",
      steps: [
        {
          id: "legal_review",
          name: "Legal Compliance Review",
          type: "approval",
          configuration: {
            approvalChain: "legal_review_chain",
            requireComments: true
          },
          timeoutMinutes: 2880 // 48 hours
        }
      ],
      weight: 40
    }
  ],
  waitStrategy: "all",
  timeoutMinutes: 2880, // 48 hours
  failureStrategy: "fail_fast",
  maxConcurrency: 4
};
```

## Conditional Branching Workflow

### Use Case: Insurance Claim Processing

A workflow that branches based on claim amount and type.

```typescript
const insuranceClaimWorkflow: WorkflowDefinition = {
  id: "insurance-claim-v1",
  name: "insurance_claim",
  version: "1.0.0",
  title: "Insurance Claim Processing",
  description: "Automated insurance claim processing with conditional routing",

  definition: {
    version: "1.0.0",
    name: "insurance_claim",
    settings: {
      allowConcurrentInstances: true,
      autoCleanupCompletedInstances: true,
      cleanupAfterDays: 2555, // 7 years (legal requirement)
      enableVersionMigration: true,
      requireApprovalForModification: true
    },
    variables: [
      {
        name: "claim_amount",
        type: "number",
        required: true,
        description: "Claim amount in USD"
      },
      {
        name: "claim_type",
        type: "string",
        required: true,
        description: "Type of insurance claim",
        validation: {
          options: ["auto", "home", "life", "health", "business"]
        }
      },
      {
        name: "policy_number",
        type: "string",
        required: true,
        description: "Insurance policy number"
      },
      {
        name: "has_fraud_indicators",
        type: "boolean",
        required: false,
        defaultValue: false,
        description: "Whether fraud indicators are present"
      }
    ]
  },

  stateMachine: {
    states: {
      "initial": {
        id: "initial",
        name: "Claim Submitted",
        type: "initial",
        properties: {
          isInterruptible: false,
          allowManualTransition: false,
          requireApproval: false,
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "validation": {
        id: "validation",
        name: "Initial Validation",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: false,
          requireApproval: false,
          slaMinutes: 240, // 4 hours
          maxRetries: 2,
          retryDelay: 30,
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "routing_decision": {
        id: "routing_decision",
        name: "Routing Decision",
        type: "choice",
        properties: {
          isInterruptible: false,
          allowManualTransition: false,
          requireApproval: false,
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "automated_processing": {
        id: "automated_processing",
        name: "Automated Processing",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: true,
          requireApproval: false,
          slaMinutes: 60, // 1 hour
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "manual_review": {
        id: "manual_review",
        name: "Manual Review",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: true,
          requireApproval: true,
          slaMinutes: 4320, // 72 hours
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "fraud_investigation": {
        id: "fraud_investigation",
        name: "Fraud Investigation",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: true,
          requireApproval: true,
          slaMinutes: 14400, // 10 days
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "approved": {
        id: "approved",
        name: "Claim Approved",
        type: "final",
        properties: {
          isInterruptible: false,
          allowManualTransition: false,
          requireApproval: false,
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "denied": {
        id: "denied",
        name: "Claim Denied",
        type: "final",
        properties: {
          isInterruptible: false,
          allowManualTransition: false,
          requireApproval: false,
          rollbackOnFailure: false,
          persistData: true
        }
      }
    },

    transitions: [
      {
        id: "start_validation",
        from: "initial",
        to: "validation",
        trigger: { type: "automatic" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "validation_to_routing",
        from: "validation",
        to: "routing_decision",
        trigger: { type: "automatic" },
        condition: "context.validation_passed === true",
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "validation_failed",
        from: "validation",
        to: "denied",
        trigger: { type: "automatic" },
        condition: "context.validation_passed === false",
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "route_to_automated",
        from: "routing_decision",
        to: "automated_processing",
        trigger: { type: "automatic" },
        condition: "submission.claim_amount <= 1000 && submission.has_fraud_indicators === false",
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "route_to_manual",
        from: "routing_decision",
        to: "manual_review",
        trigger: { type: "automatic" },
        condition: "submission.claim_amount > 1000 && submission.claim_amount <= 10000 && submission.has_fraud_indicators === false",
        priority: 2,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "route_to_fraud",
        from: "routing_decision",
        to: "fraud_investigation",
        trigger: { type: "automatic" },
        condition: "submission.has_fraud_indicators === true || submission.claim_amount > 10000",
        priority: 3,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "automated_approve",
        from: "automated_processing",
        to: "approved",
        trigger: { type: "automatic" },
        condition: "context.automated_decision === 'approve'",
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "automated_deny",
        from: "automated_processing",
        to: "denied",
        trigger: { type: "automatic" },
        condition: "context.automated_decision === 'deny'",
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "manual_approve",
        from: "manual_review",
        to: "approved",
        trigger: { type: "event", eventType: "approval.granted" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "manual_deny",
        from: "manual_review",
        to: "denied",
        trigger: { type: "event", eventType: "approval.rejected" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "fraud_approve",
        from: "fraud_investigation",
        to: "approved",
        trigger: { type: "event", eventType: "approval.granted" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "fraud_deny",
        from: "fraud_investigation",
        to: "denied",
        trigger: { type: "event", eventType: "approval.rejected" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      }
    ],

    initialState: "initial",
    finalStates: ["approved", "denied"],
    guards: {
      "validation_guard": {
        name: "validation_guard",
        description: "Validates claim data and policy",
        evaluate: async (context: WorkflowContext) => {
          // Implementation would validate policy number, coverage, etc.
          return context.data.policy_valid === true;
        },
        timeout: 30000
      },
      "fraud_detection_guard": {
        name: "fraud_detection_guard",
        description: "Checks for fraud indicators",
        evaluate: async (context: WorkflowContext) => {
          // Implementation would run fraud detection algorithms
          return context.data.fraud_score < 0.7;
        },
        timeout: 60000
      }
    },
    actions: {}
  },

  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: "system",
  updatedBy: "system",
  metadata: {
    category: "insurance",
    tags: ["insurance", "claims", "conditional", "fraud-detection"],
    businessOwner: "claims_manager"
  }
};
```

### Conditional Logic Examples

```typescript
// Advanced conditional expressions
const conditionalExamples: ConditionExpression[] = [
  // Simple field comparison
  {
    type: "simple",
    field: "submission.claim_amount",
    operator: "greater_than",
    value: 5000
  },

  // Complex boolean logic
  {
    type: "complex",
    expression: "(submission.claim_amount > 1000 AND submission.policy_type = 'premium') OR (submission.customer_tier = 'gold')"
  },

  // Script-based evaluation
  {
    type: "script",
    language: "javascript",
    script: `
      const amount = submission.claim_amount;
      const type = submission.claim_type;
      const history = context.customer_claim_history || [];

      // High-value claims or customers with claim history need manual review
      if (amount > 5000 || history.length > 2) {
        return 'manual_review';
      }

      // Auto-approve low-risk claims
      if (amount <= 1000 && type === 'auto' && history.length === 0) {
        return 'auto_approve';
      }

      return 'standard_review';
    `
  },

  // JSONPath-based evaluation
  {
    type: "script",
    language: "jsonpath",
    script: "$.submission[?(@.claim_amount > 1000 && @.policy_status == 'active')]"
  }
];
```

## Sub-workflow Composition

### Use Case: Employee Termination Process

A main workflow that orchestrates multiple sub-workflows for different aspects of employee termination.

```typescript
const terminationSubWorkflows = {
  // IT Access Revocation Sub-workflow
  itAccessRevocation: {
    id: "it-access-revocation-v1",
    name: "IT Access Revocation",
    version: "1.0.0",
    title: "Revoke IT Access and Equipment Recovery",
    description: "Sub-workflow for revoking IT access and recovering equipment"
  },

  // HR Documentation Sub-workflow
  hrDocumentation: {
    id: "hr-documentation-v1",
    name: "HR Documentation",
    version: "1.0.0",
    title: "HR Exit Documentation",
    description: "Sub-workflow for completing HR exit documentation"
  },

  // Benefits Termination Sub-workflow
  benefitsTermination: {
    id: "benefits-termination-v1",
    name: "Benefits Termination",
    version: "1.0.0",
    title: "Benefits and Payroll Termination",
    description: "Sub-workflow for terminating benefits and final payroll"
  }
};

const employeeTerminationWorkflow: WorkflowDefinition = {
  id: "employee-termination-v1",
  name: "employee_termination",
  version: "1.0.0",
  title: "Employee Termination Process",
  description: "Comprehensive employee termination workflow with sub-processes",

  definition: {
    version: "1.0.0",
    name: "employee_termination",
    settings: {
      allowConcurrentInstances: true,
      autoCleanupCompletedInstances: true,
      cleanupAfterDays: 2555, // 7 years (legal requirement)
      enableVersionMigration: true,
      requireApprovalForModification: true
    },
    variables: [
      {
        name: "employee_id",
        type: "string",
        required: true,
        description: "Employee ID being terminated"
      },
      {
        name: "termination_type",
        type: "string",
        required: true,
        description: "Type of termination",
        validation: {
          options: ["voluntary", "involuntary", "retirement", "layoff"]
        }
      },
      {
        name: "last_work_date",
        type: "date",
        required: true,
        description: "Employee's last working day"
      },
      {
        name: "manager_id",
        type: "string",
        required: true,
        description: "Manager conducting termination"
      },
      {
        name: "reason",
        type: "string",
        required: false,
        description: "Reason for termination"
      }
    ]
  },

  stateMachine: {
    states: {
      "initial": {
        id: "initial",
        name: "Termination Initiated",
        type: "initial",
        properties: {
          isInterruptible: false,
          allowManualTransition: false,
          requireApproval: false,
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "manager_confirmation": {
        id: "manager_confirmation",
        name: "Manager Confirmation",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: true,
          requireApproval: true,
          slaMinutes: 1440, // 24 hours
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "hr_notification": {
        id: "hr_notification",
        name: "HR Notification",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: false,
          requireApproval: false,
          slaMinutes: 60, // 1 hour
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "parallel_termination": {
        id: "parallel_termination",
        name: "Parallel Termination Processes",
        type: "parallel",
        properties: {
          isInterruptible: true,
          allowManualTransition: false,
          requireApproval: false,
          slaMinutes: 4320, // 72 hours
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "final_review": {
        id: "final_review",
        name: "Final Review and Closure",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: true,
          requireApproval: true,
          slaMinutes: 1440, // 24 hours
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "complete": {
        id: "complete",
        name: "Termination Complete",
        type: "final",
        properties: {
          isInterruptible: false,
          allowManualTransition: false,
          requireApproval: false,
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "cancelled": {
        id: "cancelled",
        name: "Termination Cancelled",
        type: "final",
        properties: {
          isInterruptible: false,
          allowManualTransition: false,
          requireApproval: false,
          rollbackOnFailure: false,
          persistData: true
        }
      }
    },

    transitions: [
      {
        id: "start_confirmation",
        from: "initial",
        to: "manager_confirmation",
        trigger: { type: "automatic" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "confirm_to_hr",
        from: "manager_confirmation",
        to: "hr_notification",
        trigger: { type: "event", eventType: "approval.granted" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "cancel_termination",
        from: "manager_confirmation",
        to: "cancelled",
        trigger: { type: "event", eventType: "approval.rejected" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "hr_to_parallel",
        from: "hr_notification",
        to: "parallel_termination",
        trigger: { type: "automatic" },
        condition: "context.hr_notified === true",
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "parallel_to_review",
        from: "parallel_termination",
        to: "final_review",
        trigger: { type: "automatic" },
        condition: "context.all_subworkflows_complete === true",
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "complete_termination",
        from: "final_review",
        to: "complete",
        trigger: { type: "event", eventType: "approval.granted" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      }
    ],

    initialState: "initial",
    finalStates: ["complete", "cancelled"],
    guards: {},
    actions: {}
  },

  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: "system",
  updatedBy: "system",
  metadata: {
    category: "hr",
    tags: ["termination", "hr", "sub-workflow", "parallel"],
    businessOwner: "hr_director"
  }
};
```

### Sub-workflow Step Configuration

```typescript
const subWorkflowSteps: ExecutionStep[] = [
  // IT Access Revocation Sub-workflow
  {
    id: "it_access_revocation",
    name: "IT Access Revocation",
    type: "sub_workflow",
    configuration: {
      workflowId: "it-access-revocation-v1",
      version: "1.0.0",
      waitForCompletion: true,
      failureHandling: "fail_parent",
      passParentContext: true,
      isolateExecution: false
    },
    inputMapping: {
      "employee_id": "submission.employee_id",
      "last_work_date": "submission.last_work_date",
      "termination_type": "submission.termination_type"
    },
    outputMapping: {
      "equipment_recovered": "context.it_equipment_recovered",
      "access_revoked": "context.it_access_revoked",
      "final_backup_completed": "context.it_backup_completed"
    },
    timeoutMinutes: 2880, // 48 hours
    retryPolicy: {
      maxAttempts: 2,
      backoffStrategy: "exponential",
      baseDelay: 30000,
      maxDelay: 300000,
      jitter: true
    }
  },

  // HR Documentation Sub-workflow
  {
    id: "hr_documentation",
    name: "HR Documentation",
    type: "sub_workflow",
    configuration: {
      workflowId: "hr-documentation-v1",
      version: "1.0.0",
      waitForCompletion: true,
      failureHandling: "continue",
      passParentContext: true,
      isolateExecution: false
    },
    inputMapping: {
      "employee_id": "submission.employee_id",
      "termination_type": "submission.termination_type",
      "reason": "submission.reason",
      "manager_id": "submission.manager_id"
    },
    outputMapping: {
      "exit_interview_completed": "context.hr_exit_interview_completed",
      "documents_signed": "context.hr_documents_signed",
      "cobra_notification_sent": "context.hr_cobra_sent"
    },
    timeoutMinutes: 4320, // 72 hours
    retryPolicy: {
      maxAttempts: 3,
      backoffStrategy: "linear",
      baseDelay: 60000,
      maxDelay: 600000,
      jitter: false
    }
  },

  // Benefits Termination Sub-workflow
  {
    id: "benefits_termination",
    name: "Benefits Termination",
    type: "sub_workflow",
    configuration: {
      workflowId: "benefits-termination-v1",
      version: "1.0.0",
      waitForCompletion: true,
      failureHandling: "retry",
      passParentContext: true,
      isolateExecution: true
    },
    inputMapping: {
      "employee_id": "submission.employee_id",
      "last_work_date": "submission.last_work_date",
      "termination_type": "submission.termination_type"
    },
    outputMapping: {
      "benefits_terminated": "context.benefits_terminated",
      "final_payroll_processed": "context.final_payroll_processed",
      "401k_rollover_initiated": "context.retirement_rollover_initiated"
    },
    timeoutMinutes: 1440, // 24 hours
    retryPolicy: {
      maxAttempts: 5,
      backoffStrategy: "exponential",
      baseDelay: 15000,
      maxDelay: 600000,
      jitter: true,
      retryableErrors: ["TEMPORARY_ERROR", "NETWORK_ERROR"],
      nonRetryableErrors: ["EMPLOYEE_NOT_FOUND", "POLICY_VIOLATION"]
    }
  }
];
```

### Sub-workflow Usage Example

```typescript
// Start employee termination workflow
const terminationInstance = await workflowEngine.createInstance({
  workflowDefinitionId: "employee-termination-v1",
  initialData: {
    employee_id: "EMP12345",
    termination_type: "voluntary",
    last_work_date: "2025-02-15",
    manager_id: "MGR789",
    reason: "Career advancement opportunity"
  },
  assignedTo: "hr_coordinator",
  priority: "high"
});

// Monitor sub-workflow progress
const subWorkflowResults = await workflowEngine.getSubWorkflowStatus(
  terminationInstance.id,
  "parallel_termination"
);

console.log('Sub-workflow statuses:', subWorkflowResults.map(sw => ({
  name: sw.name,
  status: sw.status,
  progress: sw.completedSteps / sw.totalSteps
})));
```

## Event-Driven Workflow

### Use Case: Customer Support Ticket Escalation

A workflow that responds to external events and dynamically adjusts based on customer interactions.

```typescript
const supportTicketWorkflow: WorkflowDefinition = {
  id: "support-ticket-v1",
  name: "support_ticket",
  version: "1.0.0",
  title: "Customer Support Ticket Workflow",
  description: "Event-driven customer support ticket processing with automatic escalation",

  definition: {
    version: "1.0.0",
    name: "support_ticket",
    settings: {
      allowConcurrentInstances: true,
      maxConcurrentInstances: 1000,
      autoCleanupCompletedInstances: true,
      cleanupAfterDays: 365,
      enableVersionMigration: true,
      requireApprovalForModification: false
    },
    variables: [
      {
        name: "ticket_id",
        type: "string",
        required: true,
        description: "Support ticket ID"
      },
      {
        name: "customer_id",
        type: "string",
        required: true,
        description: "Customer ID"
      },
      {
        name: "priority",
        type: "string",
        required: true,
        defaultValue: "medium",
        validation: {
          options: ["low", "medium", "high", "urgent"]
        }
      },
      {
        name: "category",
        type: "string",
        required: true,
        description: "Issue category"
      },
      {
        name: "customer_tier",
        type: "string",
        required: false,
        defaultValue: "standard",
        validation: {
          options: ["standard", "premium", "enterprise"]
        }
      }
    ]
  },

  stateMachine: {
    states: {
      "initial": {
        id: "initial",
        name: "Ticket Created",
        type: "initial",
        properties: {
          isInterruptible: false,
          allowManualTransition: false,
          requireApproval: false,
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "auto_classification": {
        id: "auto_classification",
        name: "Automatic Classification",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: false,
          requireApproval: false,
          slaMinutes: 15,
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "agent_assignment": {
        id: "agent_assignment",
        name: "Agent Assignment",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: true,
          requireApproval: false,
          slaMinutes: 30,
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "in_progress": {
        id: "in_progress",
        name: "In Progress",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: true,
          requireApproval: false,
          slaMinutes: 1440, // 24 hours (varies by priority)
          rollbackOnFailure: false,
          persistData: true
        },
        timeouts: [
          {
            timeoutMinutes: 240, // 4 hours warning
            action: {
              type: "notify",
              parameters: {
                "type": "sla_warning",
                "recipients": ["assigned_agent", "team_lead"]
              }
            }
          },
          {
            timeoutMinutes: 1440, // 24 hours escalation
            action: {
              type: "escalate",
              parameters: { "escalate_to": "senior_agent" }
            }
          }
        ]
      },
      "waiting_customer": {
        id: "waiting_customer",
        name: "Waiting for Customer Response",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: true,
          requireApproval: false,
          slaMinutes: 4320, // 72 hours
          rollbackOnFailure: false,
          persistData: true
        },
        timeouts: [
          {
            timeoutMinutes: 4320, // 72 hours
            action: {
              type: "transition",
              parameters: { "target_state": "closed_no_response" }
            }
          }
        ]
      },
      "escalated": {
        id: "escalated",
        name: "Escalated",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: true,
          requireApproval: false,
          slaMinutes: 480, // 8 hours
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "resolved": {
        id: "resolved",
        name: "Resolved",
        type: "final",
        properties: {
          isInterruptible: false,
          allowManualTransition: false,
          requireApproval: false,
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "closed_no_response": {
        id: "closed_no_response",
        name: "Closed - No Response",
        type: "final",
        properties: {
          isInterruptible: false,
          allowManualTransition: false,
          requireApproval: false,
          rollbackOnFailure: false,
          persistData: true
        }
      }
    },

    transitions: [
      {
        id: "start_classification",
        from: "initial",
        to: "auto_classification",
        trigger: { type: "automatic" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "classification_to_assignment",
        from: "auto_classification",
        to: "agent_assignment",
        trigger: { type: "automatic" },
        condition: "context.classification_complete === true",
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "assignment_to_progress",
        from: "agent_assignment",
        to: "in_progress",
        trigger: { type: "event", eventType: "ticket.agent_assigned" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "progress_to_waiting",
        from: "in_progress",
        to: "waiting_customer",
        trigger: { type: "event", eventType: "ticket.customer_response_requested" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "waiting_to_progress",
        from: "waiting_customer",
        to: "in_progress",
        trigger: { type: "event", eventType: "ticket.customer_responded" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "progress_to_escalated",
        from: "in_progress",
        to: "escalated",
        trigger: {
          type: "event",
          eventType: "ticket.escalated"
        },
        priority: 2,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "escalated_to_progress",
        from: "escalated",
        to: "in_progress",
        trigger: { type: "event", eventType: "ticket.escalation_resolved" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "resolve_ticket",
        from: "in_progress",
        to: "resolved",
        trigger: { type: "event", eventType: "ticket.resolved" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "resolve_escalated",
        from: "escalated",
        to: "resolved",
        trigger: { type: "event", eventType: "ticket.resolved" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "timeout_closure",
        from: "waiting_customer",
        to: "closed_no_response",
        trigger: { type: "event", eventType: "workflow.timeout.occurred" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      }
    ],

    initialState: "initial",
    finalStates: ["resolved", "closed_no_response"],
    guards: {},
    actions: {}
  },

  eventHooks: {
    triggers: [
      {
        id: "customer_response_trigger",
        name: "Customer Response Received",
        eventType: "support.customer_response",
        condition: "event.ticket_id == instance.ticket_id",
        action: {
          type: "advance_state",
          targetState: "in_progress",
          parameters: {
            "response_content": "event.content",
            "response_timestamp": "event.timestamp"
          }
        },
        priority: 1,
        enabled: true
      },
      {
        id: "priority_change_trigger",
        name: "Priority Changed",
        eventType: "support.priority_changed",
        condition: "event.ticket_id == instance.ticket_id",
        action: {
          type: "execute_step",
          stepId: "recalculate_sla",
          parameters: {
            "new_priority": "event.new_priority",
            "changed_by": "event.changed_by"
          }
        },
        priority: 2,
        enabled: true
      },
      {
        id: "customer_escalation_trigger",
        name: "Customer Escalation Request",
        eventType: "support.customer_escalation",
        condition: "event.ticket_id == instance.ticket_id",
        action: {
          type: "advance_state",
          targetState: "escalated",
          parameters: {
            "escalation_reason": "customer_request",
            "escalated_by": "event.customer_id"
          }
        },
        priority: 3,
        enabled: true
      }
    ],
    handlers: [
      {
        id: "sla_recalculation_handler",
        name: "SLA Recalculation Handler",
        eventTypes: ["support.priority_changed"],
        handler: {
          type: "script",
          configuration: {
            language: "javascript",
            script: `
              const prioritySLA = {
                low: 4320,    // 72 hours
                medium: 1440, // 24 hours
                high: 480,    // 8 hours
                urgent: 120   // 2 hours
              };

              const newSLA = prioritySLA[event.new_priority] || 1440;
              const timeElapsed = Date.now() - instance.startedAt;
              const remainingTime = (newSLA * 60 * 1000) - timeElapsed;

              return {
                newTimeoutAt: new Date(Date.now() + remainingTime),
                slaMinutes: newSLA
              };
            `
          }
        },
        priority: 1,
        async: false,
        timeout: 5000
      }
    ],
    filters: [
      {
        id: "ticket_filter",
        name: "Ticket ID Filter",
        eventTypes: ["support.*"],
        condition: "event.ticket_id != null",
        action: "include"
      }
    ],
    settings: {
      enableAsync: true,
      maxConcurrentHandlers: 10,
      defaultTimeout: 30000,
      retryFailedHandlers: true,
      maxRetryAttempts: 3,
      deadLetterQueue: true
    }
  },

  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: "system",
  updatedBy: "system",
  metadata: {
    category: "customer_support",
    tags: ["support", "tickets", "event-driven", "escalation"],
    businessOwner: "support_manager"
  }
};
```

### Event Integration Examples

```typescript
// Event publishing examples
const ticketEvents = {
  // Customer responds to ticket
  customerResponse: {
    type: 'support.customer_response',
    data: {
      ticket_id: 'TICKET-12345',
      customer_id: 'CUST-789',
      content: 'Thank you for the quick response. The solution worked perfectly!',
      timestamp: new Date().toISOString(),
      channel: 'email'
    }
  },

  // Priority escalation
  priorityEscalation: {
    type: 'support.priority_changed',
    data: {
      ticket_id: 'TICKET-12345',
      old_priority: 'medium',
      new_priority: 'urgent',
      changed_by: 'AGENT-456',
      reason: 'Production system down',
      timestamp: new Date().toISOString()
    }
  },

  // Customer escalation request
  customerEscalation: {
    type: 'support.customer_escalation',
    data: {
      ticket_id: 'TICKET-12345',
      customer_id: 'CUST-789',
      reason: 'Unsatisfied with response time',
      escalation_type: 'manager_review',
      timestamp: new Date().toISOString()
    }
  }
};

// Publish events to trigger workflow transitions
await eventEngine.publish(ticketEvents.customerResponse);
await eventEngine.publish(ticketEvents.priorityEscalation);
```

## SLA and Escalation Workflow

### Use Case: Document Review Process

A workflow with strict SLA requirements and multi-level escalation.

```typescript
const documentReviewWorkflow: WorkflowDefinition = {
  id: "document-review-v1",
  name: "document_review",
  version: "1.0.0",
  title: "Document Review and Approval",
  description: "Document review workflow with SLA tracking and automatic escalation",

  timeoutConfig: {
    stepTimeouts: {
      "initial_review": 480,      // 8 hours
      "legal_review": 1440,       // 24 hours
      "executive_review": 2880,   // 48 hours
      "compliance_check": 720     // 12 hours
    },
    stateTimeouts: {
      "pending_review": 2880,     // 48 hours total
      "legal_approval": 4320,     // 72 hours total
      "final_approval": 1440      // 24 hours total
    },
    workflowTimeout: 10080,       // 1 week maximum
    escalationRules: [
      {
        id: "first_level_escalation",
        name: "First Level Escalation",
        description: "Escalate to senior reviewer after 50% of SLA",
        triggerCondition: {
          type: "timeout",
          threshold: 240 // 50% of initial_review SLA
        },
        actions: [
          {
            type: "notify",
            target: "senior_reviewer",
            notificationTemplate: "sla_warning_template",
            delay: 0
          },
          {
            type: "notify",
            target: "document_owner",
            notificationTemplate: "escalation_notice_template",
            delay: 30 // 30 minutes after first notification
          }
        ],
        priority: 1,
        enabled: true
      },
      {
        id: "second_level_escalation",
        name: "Second Level Escalation",
        description: "Escalate to department head after SLA breach",
        triggerCondition: {
          type: "timeout",
          threshold: 480 // Full SLA time exceeded
        },
        actions: [
          {
            type: "escalate",
            target: "department_head",
            delay: 0
          },
          {
            type: "notify",
            target: "compliance_team",
            notificationTemplate: "sla_breach_template",
            delay: 0
          }
        ],
        priority: 2,
        enabled: true
      },
      {
        id: "final_escalation",
        name: "Executive Escalation",
        description: "Escalate to executive level for critical SLA breaches",
        triggerCondition: {
          type: "timeout",
          threshold: 1440 // 24 hours past SLA
        },
        actions: [
          {
            type: "escalate",
            target: "executive_team",
            delay: 0
          },
          {
            type: "notify",
            target: "ceo_office",
            notificationTemplate: "critical_escalation_template",
            delay: 0
          }
        ],
        priority: 3,
        enabled: true,
        condition: "submission.document_type == 'regulatory' OR submission.priority == 'critical'"
      }
    ],
    slaConfiguration: {
      levels: [
        {
          name: "Standard",
          description: "Standard document review SLA",
          targetMinutes: 2880, // 48 hours
          warningThreshold: 75, // 75% of target time
          breachThreshold: 100, // 100% of target time
          category: "medium",
          businessDaysOnly: true,
          excludeWeekends: true,
          excludeHolidays: true
        },
        {
          name: "Urgent",
          description: "Urgent document review SLA",
          targetMinutes: 480, // 8 hours
          warningThreshold: 50, // 50% of target time
          breachThreshold: 100, // 100% of target time
          category: "high",
          businessDaysOnly: false,
          excludeWeekends: false,
          excludeHolidays: false
        },
        {
          name: "Critical",
          description: "Critical document review SLA",
          targetMinutes: 120, // 2 hours
          warningThreshold: 25, // 25% of target time
          breachThreshold: 100, // 100% of target time
          category: "critical",
          businessDaysOnly: false,
          excludeWeekends: false,
          excludeHolidays: false
        }
      ],
      breachActions: [
        {
          type: "notify",
          configuration: {
            recipients: ["sla_manager", "quality_assurance"],
            template: "sla_breach_report",
            includeMetrics: true
          }
        },
        {
          type: "escalate",
          configuration: {
            escalationLevel: "department_head",
            autoEscalate: true
          }
        },
        {
          type: "metric",
          configuration: {
            metricName: "sla_breach_count",
            tags: ["document_review", "sla"]
          }
        }
      ],
      reporting: {
        enableReporting: true,
        reportingInterval: "daily",
        reportRecipients: ["operations_manager", "quality_team"],
        includeMetrics: [
          "sla_adherence_rate",
          "average_completion_time",
          "escalation_frequency",
          "breach_count_by_category"
        ],
        reportFormat: "html"
      },
      businessCalendar: {
        timezone: "America/New_York",
        workingDays: [1, 2, 3, 4, 5], // Monday-Friday
        workingHours: {
          start: "09:00",
          end: "17:00"
        },
        holidays: [
          {
            name: "New Year's Day",
            date: "2025-01-01",
            recurring: true,
            type: "national"
          },
          {
            name: "Independence Day",
            date: "2025-07-04",
            recurring: true,
            type: "national"
          },
          {
            name: "Christmas Day",
            date: "2025-12-25",
            recurring: true,
            type: "national"
          }
        ]
      }
    },
    notificationSettings: {
      enableWarnings: true,
      warningThresholds: [25, 50, 75], // Percentages of SLA time
      notificationChannels: ["email", "slack"],
      escalationNotifications: true,
      customTemplates: {
        "sla_warning": "You have {remaining_time} remaining to complete document review for {document_title}",
        "sla_breach": "SLA breached for document review: {document_title}. Escalating to {escalation_target}",
        "escalation_notice": "Document review escalated due to SLA concerns: {document_title}"
      }
    }
  },

  definition: {
    version: "1.0.0",
    name: "document_review",
    settings: {
      allowConcurrentInstances: true,
      autoCleanupCompletedInstances: true,
      cleanupAfterDays: 1095, // 3 years
      enableVersionMigration: true,
      requireApprovalForModification: true
    },
    variables: [
      {
        name: "document_id",
        type: "string",
        required: true,
        description: "Document identifier"
      },
      {
        name: "document_type",
        type: "string",
        required: true,
        description: "Type of document",
        validation: {
          options: ["contract", "policy", "regulatory", "procedure", "manual"]
        }
      },
      {
        name: "priority",
        type: "string",
        required: false,
        defaultValue: "standard",
        validation: {
          options: ["standard", "urgent", "critical"]
        }
      },
      {
        name: "requestor_id",
        type: "string",
        required: true,
        description: "User who requested the review"
      },
      {
        name: "department",
        type: "string",
        required: true,
        description: "Requesting department"
      }
    ]
  },

  stateMachine: {
    states: {
      "initial": {
        id: "initial",
        name: "Review Requested",
        type: "initial",
        properties: {
          isInterruptible: false,
          allowManualTransition: false,
          requireApproval: false,
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "pending_review": {
        id: "pending_review",
        name: "Pending Initial Review",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: true,
          requireApproval: true,
          slaMinutes: 480, // Dynamic based on priority
          rollbackOnFailure: false,
          persistData: true,
          notifyOnEntry: {
            enabled: true,
            channels: [
              {
                type: "email",
                configuration: {
                  template: "review_assignment_template"
                }
              }
            ],
            recipients: [
              {
                type: "dynamic",
                identifier: "assigned_reviewer"
              }
            ]
          }
        },
        timeouts: [
          {
            timeoutMinutes: 240, // 50% warning
            action: {
              type: "notify",
              parameters: {
                template: "sla_warning_template",
                recipients: ["assigned_reviewer", "team_lead"]
              }
            }
          },
          {
            timeoutMinutes: 360, // 75% warning
            action: {
              type: "notify",
              parameters: {
                template: "urgent_sla_warning_template",
                recipients: ["assigned_reviewer", "team_lead", "department_head"]
              }
            }
          },
          {
            timeoutMinutes: 480, // SLA breach - escalate
            action: {
              type: "escalate",
              parameters: {
                escalate_to: "senior_reviewer"
              }
            },
            escalationRule: "first_level_escalation"
          }
        ]
      },
      "legal_approval": {
        id: "legal_approval",
        name: "Legal Review Required",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: true,
          requireApproval: true,
          slaMinutes: 1440, // 24 hours
          rollbackOnFailure: false,
          persistData: true
        },
        timeouts: [
          {
            timeoutMinutes: 720, // 50% warning
            action: {
              type: "notify",
              parameters: {
                template: "legal_review_warning",
                recipients: ["legal_team", "legal_manager"]
              }
            }
          },
          {
            timeoutMinutes: 1440, // SLA breach
            action: {
              type: "escalate",
              parameters: {
                escalate_to: "chief_legal_officer"
              }
            },
            escalationRule: "second_level_escalation"
          }
        ]
      },
      "final_approval": {
        id: "final_approval",
        name: "Final Approval",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: true,
          requireApproval: true,
          slaMinutes: 1440, // 24 hours
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "approved": {
        id: "approved",
        name: "Document Approved",
        type: "final",
        properties: {
          isInterruptible: false,
          allowManualTransition: false,
          requireApproval: false,
          rollbackOnFailure: false,
          persistData: true,
          notifyOnEntry: {
            enabled: true,
            channels: [
              {
                type: "email",
                configuration: {
                  template: "approval_notification_template"
                }
              }
            ],
            recipients: [
              {
                type: "user",
                identifier: "{{requestor_id}}"
              }
            ]
          }
        }
      },
      "rejected": {
        id: "rejected",
        name: "Document Rejected",
        type: "final",
        properties: {
          isInterruptible: false,
          allowManualTransition: false,
          requireApproval: false,
          rollbackOnFailure: false,
          persistData: true
        }
      }
    },

    transitions: [
      {
        id: "start_review",
        from: "initial",
        to: "pending_review",
        trigger: { type: "automatic" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "require_legal",
        from: "pending_review",
        to: "legal_approval",
        trigger: { type: "event", eventType: "approval.conditional" },
        condition: "submission.document_type == 'contract' OR submission.document_type == 'regulatory'",
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "skip_legal",
        from: "pending_review",
        to: "final_approval",
        trigger: { type: "event", eventType: "approval.granted" },
        condition: "submission.document_type != 'contract' AND submission.document_type != 'regulatory'",
        priority: 2,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "legal_to_final",
        from: "legal_approval",
        to: "final_approval",
        trigger: { type: "event", eventType: "approval.granted" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "approve_document",
        from: "final_approval",
        to: "approved",
        trigger: { type: "event", eventType: "approval.granted" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "reject_initial",
        from: "pending_review",
        to: "rejected",
        trigger: { type: "event", eventType: "approval.rejected" },
        priority: 3,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "reject_legal",
        from: "legal_approval",
        to: "rejected",
        trigger: { type: "event", eventType: "approval.rejected" },
        priority: 3,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "reject_final",
        from: "final_approval",
        to: "rejected",
        trigger: { type: "event", eventType: "approval.rejected" },
        priority: 3,
        isManual: false,
        requiresApproval: false
      }
    ],

    initialState: "initial",
    finalStates: ["approved", "rejected"],
    guards: {},
    actions: {}
  },

  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: "system",
  updatedBy: "system",
  metadata: {
    category: "compliance",
    tags: ["document", "review", "approval", "sla", "escalation"],
    businessOwner: "compliance_manager"
  }
};
```

### SLA Monitoring Usage Example

```typescript
// Start document review with SLA tracking
const reviewInstance = await workflowEngine.createInstance({
  workflowDefinitionId: "document-review-v1",
  initialData: {
    document_id: "DOC-2025-001",
    document_type: "contract",
    priority: "urgent",
    requestor_id: "USER-123",
    department: "sales"
  },
  priority: "urgent"
});

// Monitor SLA compliance
const slaStatus = await workflowEngine.getSLAStatus(reviewInstance.id);
console.log('SLA Status:', {
  currentSLA: slaStatus.currentLevel,
  timeRemaining: slaStatus.timeRemaining,
  breachRisk: slaStatus.breachRisk,
  escalationsTriggered: slaStatus.escalationCount
});

// Get SLA metrics for reporting
const slaMetrics = await workflowEngine.getSLAMetrics("document-review-v1", {
  timeRange: {
    from: new Date('2025-01-01'),
    to: new Date('2025-01-31')
  }
});

console.log('Monthly SLA Report:', {
  adherenceRate: slaMetrics.adherenceRate,
  averageCompletionTime: slaMetrics.averageCompletionTime,
  breachCount: slaMetrics.breachCount,
  escalationFrequency: slaMetrics.escalationFrequency
});
```

## Complex Enterprise Workflow

### Use Case: Vendor Onboarding Process

A comprehensive enterprise workflow with multiple departments, approvals, integrations, and compliance requirements.

```typescript
const vendorOnboardingWorkflow: WorkflowDefinition = {
  id: "vendor-onboarding-v2",
  name: "vendor_onboarding",
  version: "2.0.0",
  title: "Enterprise Vendor Onboarding",
  description: "Comprehensive vendor onboarding with compliance, security, and financial verification",

  definition: {
    version: "2.0.0",
    name: "vendor_onboarding",
    settings: {
      allowConcurrentInstances: true,
      maxConcurrentInstances: 100,
      autoCleanupCompletedInstances: true,
      cleanupAfterDays: 2555, // 7 years
      enableVersionMigration: true,
      requireApprovalForModification: true
    },
    variables: [
      {
        name: "vendor_name",
        type: "string",
        required: true,
        description: "Legal vendor name"
      },
      {
        name: "vendor_type",
        type: "string",
        required: true,
        validation: {
          options: ["supplier", "service_provider", "contractor", "consultant", "technology"]
        }
      },
      {
        name: "estimated_annual_spend",
        type: "number",
        required: true,
        description: "Estimated annual spend in USD"
      },
      {
        name: "risk_category",
        type: "string",
        required: true,
        validation: {
          options: ["low", "medium", "high", "critical"]
        }
      },
      {
        name: "requires_background_check",
        type: "boolean",
        required: false,
        defaultValue: false
      },
      {
        name: "data_access_required",
        type: "boolean",
        required: false,
        defaultValue: false
      },
      {
        name: "industry_sector",
        type: "string",
        required: true,
        description: "Vendor's industry sector"
      },
      {
        name: "requested_by",
        type: "string",
        required: true,
        description: "Employee requesting vendor onboarding"
      },
      {
        name: "business_justification",
        type: "string",
        required: true,
        description: "Business justification for vendor"
      }
    ]
  },

  stateMachine: {
    states: {
      "initial": {
        id: "initial",
        name: "Vendor Application Submitted",
        type: "initial",
        properties: {
          isInterruptible: false,
          allowManualTransition: false,
          requireApproval: false,
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "initial_screening": {
        id: "initial_screening",
        name: "Initial Screening",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: false,
          requireApproval: false,
          slaMinutes: 480, // 8 hours
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "risk_assessment": {
        id: "risk_assessment",
        name: "Risk Assessment",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: true,
          requireApproval: true,
          slaMinutes: 1440, // 24 hours
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "parallel_verification": {
        id: "parallel_verification",
        name: "Parallel Verification Processes",
        type: "parallel",
        properties: {
          isInterruptible: true,
          allowManualTransition: false,
          requireApproval: false,
          slaMinutes: 7200, // 5 days
          rollbackOnFailure: true,
          persistData: true
        },
        substates: [
          {
            id: "financial_verification",
            name: "Financial Verification",
            type: "intermediate",
            properties: {
              isInterruptible: true,
              allowManualTransition: true,
              requireApproval: true,
              slaMinutes: 2880, // 48 hours
              rollbackOnFailure: false,
              persistData: true
            }
          },
          {
            id: "security_assessment",
            name: "Security Assessment",
            type: "intermediate",
            properties: {
              isInterruptible: true,
              allowManualTransition: true,
              requireApproval: true,
              slaMinutes: 4320, // 72 hours
              rollbackOnFailure: false,
              persistData: true
            }
          },
          {
            id: "compliance_check",
            name: "Compliance Verification",
            type: "intermediate",
            properties: {
              isInterruptible: true,
              allowManualTransition: true,
              requireApproval: true,
              slaMinutes: 3600, // 60 hours
              rollbackOnFailure: false,
              persistData: true
            }
          },
          {
            id: "legal_review",
            name: "Legal Review",
            type: "intermediate",
            properties: {
              isInterruptible: true,
              allowManualTransition: true,
              requireApproval: true,
              slaMinutes: 7200, // 120 hours (5 days)
              rollbackOnFailure: false,
              persistData: true
            }
          }
        ]
      },
      "final_approval": {
        id: "final_approval",
        name: "Final Executive Approval",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: true,
          requireApproval: true,
          slaMinutes: 2880, // 48 hours
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "system_setup": {
        id: "system_setup",
        name: "System Setup and Integration",
        type: "intermediate",
        properties: {
          isInterruptible: true,
          allowManualTransition: false,
          requireApproval: false,
          slaMinutes: 1440, // 24 hours
          rollbackOnFailure: true,
          persistData: true
        }
      },
      "approved": {
        id: "approved",
        name: "Vendor Onboarded",
        type: "final",
        properties: {
          isInterruptible: false,
          allowManualTransition: false,
          requireApproval: false,
          rollbackOnFailure: false,
          persistData: true
        }
      },
      "rejected": {
        id: "rejected",
        name: "Vendor Rejected",
        type: "final",
        properties: {
          isInterruptible: false,
          allowManualTransition: false,
          requireApproval: false,
          rollbackOnFailure: false,
          persistData: true
        }
      }
    },

    transitions: [
      {
        id: "start_screening",
        from: "initial",
        to: "initial_screening",
        trigger: { type: "automatic" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "screening_to_risk",
        from: "initial_screening",
        to: "risk_assessment",
        trigger: { type: "automatic" },
        condition: "context.screening_passed === true",
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "screening_failed",
        from: "initial_screening",
        to: "rejected",
        trigger: { type: "automatic" },
        condition: "context.screening_passed === false",
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "risk_to_verification",
        from: "risk_assessment",
        to: "parallel_verification",
        trigger: { type: "event", eventType: "approval.granted" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "risk_rejected",
        from: "risk_assessment",
        to: "rejected",
        trigger: { type: "event", eventType: "approval.rejected" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "verification_to_final",
        from: "parallel_verification",
        to: "final_approval",
        trigger: { type: "automatic" },
        condition: "context.all_verifications_passed === true",
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "verification_failed",
        from: "parallel_verification",
        to: "rejected",
        trigger: { type: "automatic" },
        condition: "context.critical_verification_failed === true",
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "final_approved",
        from: "final_approval",
        to: "system_setup",
        trigger: { type: "event", eventType: "approval.granted" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "final_rejected",
        from: "final_approval",
        to: "rejected",
        trigger: { type: "event", eventType: "approval.rejected" },
        priority: 1,
        isManual: false,
        requiresApproval: false
      },
      {
        id: "setup_complete",
        from: "system_setup",
        to: "approved",
        trigger: { type: "automatic" },
        condition: "context.system_setup_complete === true",
        priority: 1,
        isManual: false,
        requiresApproval: false
      }
    ],

    initialState: "initial",
    finalStates: ["approved", "rejected"],
    guards: {
      "financial_threshold_guard": {
        name: "financial_threshold_guard",
        description: "Checks if vendor spend requires additional approvals",
        evaluate: async (context: WorkflowContext) => {
          const spend = context.data.estimated_annual_spend as number;
          return spend >= 100000; // $100K threshold
        },
        timeout: 5000
      },
      "security_clearance_guard": {
        name: "security_clearance_guard",
        description: "Determines if security clearance is required",
        evaluate: async (context: WorkflowContext) => {
          const dataAccess = context.data.data_access_required as boolean;
          const riskCategory = context.data.risk_category as string;
          return dataAccess || riskCategory === 'high' || riskCategory === 'critical';
        },
        timeout: 5000
      }
    },
    actions: {
      "notify_procurement": {
        name: "notify_procurement",
        description: "Notifies procurement team of vendor approval",
        execute: async (context: WorkflowContext) => {
          // Implementation would send notification
          return { success: true };
        },
        timeout: 10000
      }
    }
  },

  approvalChains: [
    {
      id: "risk_assessment_chain",
      name: "Risk Assessment Approval Chain",
      description: "Risk-based approval chain for vendor assessment",
      steps: [
        {
          id: "department_manager",
          name: "Department Manager Approval",
          type: "individual",
          approvers: [{
            type: "dynamic",
            identifier: "submission.requesting_department_manager"
          }],
          requirements: {
            minimumApprovals: 1,
            unanimousRequired: false,
            allowSelfApproval: false,
            requireComments: true,
            timeoutMinutes: 1440
          },
          parallel: false,
          optional: false,
          skipCondition: "submission.estimated_annual_spend <= 10000"
        },
        {
          id: "procurement_approval",
          name: "Procurement Team Approval",
          type: "role",
          approvers: [{
            type: "role",
            identifier: "procurement_manager"
          }],
          requirements: {
            minimumApprovals: 1,
            unanimousRequired: false,
            allowSelfApproval: false,
            requireComments: true,
            timeoutMinutes: 2880
          },
          parallel: false,
          optional: false
        },
        {
          id: "cfo_approval",
          name: "CFO Approval",
          type: "individual",
          approvers: [{
            type: "role",
            identifier: "cfo"
          }],
          requirements: {
            minimumApprovals: 1,
            unanimousRequired: false,
            allowSelfApproval: false,
            requireComments: true,
            timeoutMinutes: 4320
          },
          parallel: false,
          optional: false,
          skipCondition: "submission.estimated_annual_spend <= 500000"
        }
      ],
      configuration: {
        allowParallelSteps: false,
        allowSkipSteps: true,
        requireAllSteps: false,
        notifyOnStart: true,
        notifyOnComplete: true,
        trackDecisionHistory: true,
        enableReminders: true,
        reminderIntervalMinutes: 1440,
        maxReminderCount: 5
      }
    }
  ],

  eventHooks: {
    triggers: [
      {
        id: "high_risk_alert",
        name: "High Risk Vendor Alert",
        eventType: "vendor.risk_score_updated",
        condition: "event.risk_score > 8.0",
        action: {
          type: "escalate",
          parameters: {
            escalate_to: "risk_committee",
            alert_level: "high"
          }
        },
        priority: 1,
        enabled: true
      },
      {
        id: "compliance_flag",
        name: "Compliance Issue Flagged",
        eventType: "vendor.compliance_issue",
        action: {
          type: "advance_state",
          targetState: "rejected",
          parameters: {
            rejection_reason: "compliance_violation"
          }
        },
        priority: 1,
        enabled: true
      }
    ],
    handlers: [
      {
        id: "integration_setup",
        name: "System Integration Handler",
        eventTypes: ["vendor.approved"],
        handler: {
          type: "plugin",
          configuration: {
            pluginId: "vendor_integration_manager",
            action: "setup_vendor_account"
          }
        },
        priority: 1,
        async: true,
        timeout: 300000 // 5 minutes
      }
    ],
    filters: [],
    settings: {
      enableAsync: true,
      maxConcurrentHandlers: 5,
      defaultTimeout: 60000,
      retryFailedHandlers: true,
      maxRetryAttempts: 3,
      deadLetterQueue: true
    }
  },

  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: "system",
  updatedBy: "system",
  metadata: {
    category: "vendor_management",
    tags: ["vendor", "onboarding", "compliance", "enterprise", "parallel"],
    businessOwner: "procurement_director",
    technicalOwner: "vendor_management_team",
    priority: "high"
  }
};
```

## Integration Patterns

### External System Integration

Examples of integrating workflows with external systems.

```typescript
// External system integration steps
const externalIntegrationSteps: ExecutionStep[] = [
  // Webhook integration
  {
    id: "webhook_notification",
    name: "Send Webhook Notification",
    type: "webhook",
    configuration: {
      url: "https://external-system.company.com/api/notifications",
      method: "POST",
      headers: {
        "Authorization": "Bearer {{api_token}}",
        "Content-Type": "application/json",
        "X-Workflow-Id": "{{workflow_instance_id}}"
      },
      payload: {
        event_type: "workflow_completed",
        workflow_id: "{{workflow_id}}",
        instance_id: "{{workflow_instance_id}}",
        data: "{{submission_data}}",
        timestamp: "{{timestamp}}"
      },
      retryPolicy: {
        maxAttempts: 3,
        backoffStrategy: "exponential",
        baseDelay: 1000,
        maxDelay: 30000,
        jitter: true
      }
    },
    timeoutMinutes: 5,
    retryPolicy: {
      maxAttempts: 3,
      backoffStrategy: "exponential",
      baseDelay: 5000,
      maxDelay: 60000,
      jitter: true,
      retryableErrors: ["NETWORK_ERROR", "TIMEOUT", "5XX_ERROR"],
      nonRetryableErrors: ["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND"]
    }
  },

  // Plugin execution
  {
    id: "external_data_sync",
    name: "Sync Data to External System",
    type: "plugin",
    configuration: {
      pluginId: "external_system_connector",
      action: "sync_data",
      configuration: {
        system: "erp_system",
        endpoint: "/api/v2/vendors",
        data_mapping: {
          "vendor_name": "submission.vendor_name",
          "contact_email": "submission.contact_email",
          "tax_id": "submission.tax_id",
          "payment_terms": "submission.payment_terms"
        }
      }
    },
    inputMapping: {
      "vendor_data": "submission",
      "workflow_context": "context"
    },
    outputMapping: {
      "external_vendor_id": "context.erp_vendor_id",
      "sync_status": "context.erp_sync_status",
      "sync_timestamp": "context.erp_sync_timestamp"
    },
    timeoutMinutes: 10
  },

  // Script execution for complex logic
  {
    id: "custom_business_logic",
    name: "Execute Custom Business Logic",
    type: "script",
    configuration: {
      language: "javascript",
      script: `
        // Custom business logic implementation
        const vendorData = submission;
        const riskScore = context.risk_assessment_score || 0;

        // Calculate vendor tier based on spend and risk
        let vendorTier = 'standard';
        if (vendorData.estimated_annual_spend > 1000000 && riskScore < 3) {
          vendorTier = 'strategic';
        } else if (vendorData.estimated_annual_spend > 100000 && riskScore < 5) {
          vendorTier = 'preferred';
        } else if (riskScore > 7) {
          vendorTier = 'restricted';
        }

        // Set payment terms based on tier
        const paymentTerms = {
          strategic: 'NET-45',
          preferred: 'NET-30',
          standard: 'NET-15',
          restricted: 'COD'
        };

        // Calculate approval requirements
        const requiresExecutiveApproval =
          vendorData.estimated_annual_spend > 500000 ||
          riskScore > 6 ||
          vendorData.vendor_type === 'technology';

        return {
          vendor_tier: vendorTier,
          payment_terms: paymentTerms[vendorTier],
          requires_executive_approval: requiresExecutiveApproval,
          calculated_at: new Date().toISOString()
        };
      `
    },
    inputMapping: {
      "submission": "submission",
      "context": "context"
    },
    outputMapping: {
      "vendor_tier": "context.calculated_vendor_tier",
      "payment_terms": "context.calculated_payment_terms",
      "requires_executive_approval": "context.requires_executive_approval"
    },
    timeoutMinutes: 2
  },

  // Email notification
  {
    id: "email_notification",
    name: "Send Email Notification",
    type: "notification",
    configuration: {
      template: "vendor_onboarding_complete",
      recipients: [
        {
          type: "user",
          identifier: "{{submission.requested_by}}"
        },
        {
          type: "role",
          identifier: "procurement_team"
        },
        {
          type: "dynamic",
          identifier: "{{submission.business_contact}}"
        }
      ],
      channels: [
        {
          type: "email",
          configuration: {
            subject: "Vendor Onboarding Complete: {{submission.vendor_name}}",
            cc: ["procurement@company.com"],
            attachments: [
              {
                type: "document",
                source: "{{context.signed_contract_url}}"
              }
            ]
          }
        },
        {
          type: "slack",
          configuration: {
            channel: "#procurement-notifications",
            message_format: "rich"
          },
          fallback: {
            type: "email",
            configuration: {}
          }
        }
      ],
      variables: {
        vendor_name: "{{submission.vendor_name}}",
        vendor_id: "{{context.assigned_vendor_id}}",
        onboarding_date: "{{context.completion_date}}",
        next_steps: "{{context.next_steps}}"
      }
    },
    condition: "context.final_approval === true",
    timeoutMinutes: 5
  }
];
```

### API Integration Examples

```typescript
// REST API integration examples
const apiIntegrationExamples = {
  // CRM system integration
  crmIntegration: {
    id: "crm_vendor_sync",
    name: "Sync Vendor to CRM",
    type: "webhook",
    configuration: {
      url: "https://api.salesforce.com/services/data/v50.0/sobjects/Account/",
      method: "POST",
      headers: {
        "Authorization": "Bearer {{salesforce_token}}",
        "Content-Type": "application/json"
      },
      payload: {
        Name: "{{submission.vendor_name}}",
        Type: "Vendor",
        Industry: "{{submission.industry_sector}}",
        AnnualRevenue: "{{submission.estimated_annual_spend}}",
        Custom_Vendor_Tier__c: "{{context.calculated_vendor_tier}}",
        Onboarding_Date__c: "{{context.completion_date}}"
      }
    }
  },

  // ERP system integration
  erpIntegration: {
    id: "erp_vendor_setup",
    name: "Setup Vendor in ERP",
    type: "webhook",
    configuration: {
      url: "https://erp.company.com/api/vendors",
      method: "POST",
      headers: {
        "Authorization": "Bearer {{erp_api_key}}",
        "Content-Type": "application/json",
        "X-Request-ID": "{{workflow_instance_id}}"
      },
      payload: {
        vendor_code: "{{context.generated_vendor_code}}",
        legal_name: "{{submission.vendor_name}}",
        payment_terms: "{{context.calculated_payment_terms}}",
        tax_information: {
          tax_id: "{{submission.tax_id}}",
          tax_classification: "{{submission.tax_classification}}"
        },
        contact_information: {
          primary_contact: "{{submission.primary_contact}}",
          email: "{{submission.contact_email}}",
          phone: "{{submission.contact_phone}}"
        },
        banking_information: "{{context.validated_banking_info}}"
      }
    }
  },

  // Document management integration
  documentManagementIntegration: {
    id: "document_archive",
    name: "Archive Documents",
    type: "plugin",
    configuration: {
      pluginId: "sharepoint_connector",
      action: "create_folder_and_upload",
      folder_structure: "/Vendors/{{submission.vendor_name}}/{{current_year}}",
      documents: [
        {
          source: "{{context.signed_contract_url}}",
          filename: "Contract_{{submission.vendor_name}}_{{current_date}}.pdf"
        },
        {
          source: "{{context.tax_certificate_url}}",
          filename: "Tax_Certificate_{{submission.vendor_name}}.pdf"
        },
        {
          source: "{{context.insurance_certificate_url}}",
          filename: "Insurance_Certificate_{{submission.vendor_name}}.pdf"
        }
      ],
      metadata: {
        vendor_name: "{{submission.vendor_name}}",
        vendor_id: "{{context.assigned_vendor_id}}",
        onboarding_date: "{{context.completion_date}}",
        risk_category: "{{submission.risk_category}}"
      }
    }
  }
};
```

## Common Patterns and Best Practices

### Workflow Design Patterns

#### 1. State Machine Patterns

```typescript
// Saga Pattern - Long-running business process with compensation
const sagaPattern = {
  states: {
    "initial": { type: "initial" },
    "step1": { type: "intermediate", compensationAction: "undo_step1" },
    "step2": { type: "intermediate", compensationAction: "undo_step2" },
    "step3": { type: "intermediate", compensationAction: "undo_step3" },
    "success": { type: "final" },
    "compensating": { type: "intermediate" },
    "failed": { type: "final" }
  },
  transitions: [
    // Forward flow
    { from: "initial", to: "step1", trigger: { type: "automatic" } },
    { from: "step1", to: "step2", condition: "step1_success" },
    { from: "step2", to: "step3", condition: "step2_success" },
    { from: "step3", to: "success", condition: "step3_success" },

    // Compensation flow
    { from: "step1", to: "compensating", condition: "step1_failed" },
    { from: "step2", to: "compensating", condition: "step2_failed" },
    { from: "step3", to: "compensating", condition: "step3_failed" },
    { from: "compensating", to: "failed", condition: "compensation_complete" }
  ]
};

// Circuit Breaker Pattern - Prevent cascade failures
const circuitBreakerGuard: GuardFunction = {
  name: "circuit_breaker_guard",
  description: "Prevents execution when external service is down",
  evaluate: async (context: WorkflowContext) => {
    const failureRate = await getServiceFailureRate('external_api');
    const isServiceHealthy = failureRate < 0.5; // 50% threshold

    if (!isServiceHealthy) {
      console.log('Circuit breaker open - skipping external service call');
      return false;
    }

    return true;
  },
  timeout: 5000,
  cacheResult: true,
  cacheDuration: 60000 // Cache for 1 minute
};
```

#### 2. Error Handling Patterns

```typescript
// Retry with Exponential Backoff
const retryPattern: RetryPolicy = {
  maxAttempts: 5,
  backoffStrategy: "exponential",
  baseDelay: 1000,      // 1 second
  maxDelay: 30000,      // 30 seconds max
  jitter: true,         // Add randomization
  retryableErrors: [
    "NETWORK_ERROR",
    "TIMEOUT",
    "RATE_LIMITED",
    "TEMPORARY_UNAVAILABLE"
  ],
  nonRetryableErrors: [
    "UNAUTHORIZED",
    "FORBIDDEN",
    "NOT_FOUND",
    "VALIDATION_ERROR"
  ]
};

// Dead Letter Queue Pattern
const deadLetterHandling = {
  maxRetries: 3,
  retryDelay: 60000, // 1 minute
  deadLetterQueue: "failed_workflow_steps",
  alerting: {
    enabled: true,
    recipients: ["ops_team@company.com"],
    threshold: 10 // Alert after 10 failures
  }
};
```

#### 3. Data Flow Patterns

```typescript
// Input/Output Mapping Pattern
const dataFlowMapping = {
  // Map workflow input to step input
  inputMapping: {
    "step_vendor_name": "submission.vendor_name",
    "step_contact_email": "submission.contact_email",
    "calculated_risk_score": "context.risk_assessment.final_score",
    "current_timestamp": "system.timestamp"
  },

  // Map step output to workflow context
  outputMapping: {
    "context.external_vendor_id": "result.vendor_id",
    "context.integration_status": "result.status",
    "context.error_details": "result.error_message"
  },

  // Data transformation
  transformations: [
    {
      field: "vendor_name",
      operation: "uppercase"
    },
    {
      field: "contact_email",
      operation: "validate_email"
    },
    {
      field: "annual_spend",
      operation: "format_currency"
    }
  ]
};
```

#### 4. Security Patterns

```typescript
// Role-Based Access Control
const rbacPattern = {
  statePermissions: {
    "pending_review": {
      read: ["reviewer", "manager", "admin"],
      write: ["reviewer", "admin"],
      approve: ["reviewer", "manager", "admin"]
    },
    "executive_approval": {
      read: ["executive", "admin"],
      write: ["executive", "admin"],
      approve: ["executive", "admin"]
    }
  },

  fieldPermissions: {
    "salary_information": {
      read: ["hr", "payroll", "admin"],
      write: ["hr", "admin"]
    },
    "ssn": {
      read: ["hr_manager", "admin"],
      write: ["hr_manager", "admin"],
      encrypt: true
    }
  }
};

// Audit Trail Pattern
const auditPattern = {
  logAllStateChanges: true,
  logAllDataChanges: true,
  logAllApprovalDecisions: true,
  retentionPeriod: "7_years",
  encryptSensitiveData: true,
  immutableLogs: true
};
```

#### 5. Performance Patterns

```typescript
// Caching Strategy
const cachingStrategy = {
  workflowDefinitionCache: {
    enabled: true,
    ttl: 3600, // 1 hour
    maxSize: 1000
  },

  userDataCache: {
    enabled: true,
    ttl: 900, // 15 minutes
    maxSize: 10000
  },

  externalApiCache: {
    enabled: true,
    ttl: 300, // 5 minutes
    maxSize: 5000,
    staleWhileRevalidate: true
  }
};

// Batch Processing Pattern
const batchProcessingPattern = {
  batchSize: 100,
  parallelBatches: 5,
  batchTimeout: 300000, // 5 minutes

  // Process multiple workflows in parallel
  processBatch: async (workflowInstances: WorkflowInstance[]) => {
    const batches = chunk(workflowInstances, 100);

    return Promise.allSettled(
      batches.map(batch =>
        processWorkflowBatch(batch)
      )
    );
  }
};
```

### Best Practices Summary

#### Workflow Design
1. **Keep states focused** - Each state should have a single responsibility
2. **Use descriptive names** - State and transition names should be self-documenting
3. **Plan for failure** - Always include error states and compensation actions
4. **Design for scalability** - Consider parallel execution where possible
5. **Implement timeouts** - All states should have reasonable timeout values

#### Performance Optimization
1. **Cache frequently accessed data** - Workflow definitions, user data, external API responses
2. **Use pagination** - For large result sets and historical data
3. **Implement connection pooling** - For database and external service connections
4. **Monitor and alert** - Track performance metrics and set up alerts
5. **Optimize database queries** - Use appropriate indexes and query patterns

#### Security Considerations
1. **Encrypt sensitive data** - Both at rest and in transit
2. **Implement RBAC** - Role-based access control for all operations
3. **Log all actions** - Comprehensive audit trails for compliance
4. **Validate all inputs** - Never trust user input or external data
5. **Use secure communication** - TLS for all API communications

#### Monitoring and Debugging
1. **Structured logging** - Use consistent log formats with correlation IDs
2. **Real-time metrics** - Track workflow performance and health
3. **Distributed tracing** - Trace requests across service boundaries
4. **Health checks** - Regular health checks for all components
5. **Error aggregation** - Centralized error tracking and alerting

This comprehensive set of examples demonstrates the flexibility and power of the Workflow Engine, covering everything from simple sequential workflows to complex enterprise processes with multiple integrations, approvals, and compliance requirements.