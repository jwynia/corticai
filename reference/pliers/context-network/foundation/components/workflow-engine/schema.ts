/**
 * Workflow Engine TypeScript Schema
 *
 * This file contains all TypeScript interfaces, types, and schemas
 * for the Workflow Engine component of Pliers v3.
 */

import { z } from 'zod';

// ============================================================================
// CORE WORKFLOW TYPES
// ============================================================================

export type WorkflowStatus = 'draft' | 'active' | 'deprecated' | 'archived';
export type WorkflowInstanceStatus = 'pending' | 'running' | 'waiting' | 'suspended' | 'completed' | 'failed' | 'cancelled' | 'escalated';
export type WorkflowActionType = 'state_transition' | 'step_execution' | 'approval_request' | 'escalation' | 'timeout' | 'user_action';
export type WorkflowExecutionResult = 'success' | 'failure' | 'timeout' | 'cancelled' | 'pending';
export type ApprovalAction = 'approve' | 'reject' | 'request_changes' | 'delegate' | 'escalate';

// ============================================================================
// WORKFLOW DEFINITION INTERFACES
// ============================================================================

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  title: string;
  description?: string;
  definition: WorkflowDefinitionData;
  stateMachine: WorkflowStateMachine;
  approvalChains?: ApprovalChain[];
  eventHooks?: EventHookConfiguration;
  timeoutConfig?: TimeoutConfiguration;
  metadata: WorkflowMetadata;
  status: WorkflowStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface WorkflowDefinitionData {
  version: string;
  name: string;
  description?: string;
  tags?: string[];
  category?: string;
  icon?: string;
  color?: string;
  settings: WorkflowSettings;
  variables?: WorkflowVariable[];
  constants?: WorkflowConstant[];
}

export interface WorkflowSettings {
  allowConcurrentInstances: boolean;
  maxConcurrentInstances?: number;
  autoCleanupCompletedInstances: boolean;
  cleanupAfterDays?: number;
  enableVersionMigration: boolean;
  requireApprovalForModification: boolean;
}

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'array';
  defaultValue?: unknown;
  required: boolean;
  description?: string;
  validation?: VariableValidation;
}

export interface WorkflowConstant {
  name: string;
  value: unknown;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json';
  description?: string;
}

export interface VariableValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  options?: string[];
}

export interface WorkflowMetadata {
  author?: string;
  authorEmail?: string;
  documentation?: string;
  tags?: string[];
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  businessOwner?: string;
  technicalOwner?: string;
  lastReviewDate?: Date;
  nextReviewDate?: Date;
  dependencies?: string[];
  integrations?: string[];
}

// ============================================================================
// STATE MACHINE INTERFACES
// ============================================================================

export interface WorkflowStateMachine {
  states: Record<string, WorkflowState>;
  transitions: WorkflowTransition[];
  initialState: string;
  finalStates: string[];
  guards: Record<string, GuardFunction>;
  actions: Record<string, ActionFunction>;
}

export interface WorkflowState {
  id: string;
  name: string;
  type: StateType;
  properties: StateProperties;
  entryActions?: string[];
  exitActions?: string[];
  timeouts?: StateTimeout[];
  substates?: WorkflowState[];
  onEntry?: StateHandler;
  onExit?: StateHandler;
  onTimeout?: StateHandler;
}

export type StateType = 'initial' | 'intermediate' | 'final' | 'parallel' | 'choice' | 'fork' | 'join' | 'history';

export interface StateProperties {
  isInterruptible: boolean;
  allowManualTransition: boolean;
  requireApproval: boolean;
  slaMinutes?: number;
  maxRetries?: number;
  retryDelay?: number;
  rollbackOnFailure: boolean;
  persistData: boolean;
  notifyOnEntry?: NotificationConfig;
  notifyOnExit?: NotificationConfig;
  customProperties?: Record<string, unknown>;
}

export interface StateTimeout {
  timeoutMinutes: number;
  action: TimeoutAction;
  targetState?: string;
  escalationRule?: string;
  condition?: string;
}

export interface TimeoutAction {
  type: 'transition' | 'escalate' | 'notify' | 'fail' | 'custom';
  parameters?: Record<string, unknown>;
}

export interface StateHandler {
  type: 'script' | 'plugin' | 'webhook' | 'notification';
  config: Record<string, unknown>;
}

export interface WorkflowTransition {
  id: string;
  name?: string;
  from: string;
  to: string;
  trigger?: TransitionTrigger;
  condition?: string;
  guards?: string[];
  actions?: string[];
  priority: number;
  isManual: boolean;
  requiresApproval: boolean;
  approvalChain?: string;
  metadata?: TransitionMetadata;
}

export interface TransitionTrigger {
  type: 'manual' | 'automatic' | 'event' | 'timer' | 'condition';
  eventType?: string;
  timerExpression?: string;
  condition?: string;
  parameters?: Record<string, unknown>;
}

export interface TransitionMetadata {
  description?: string;
  estimatedDuration?: number;
  category?: string;
  tags?: string[];
  businessRules?: string[];
}

export interface GuardFunction {
  name: string;
  description: string;
  evaluate: (context: WorkflowContext) => Promise<boolean>;
  dependencies?: string[];
  timeout?: number;
  cacheResult?: boolean;
  cacheDuration?: number;
}

export interface ActionFunction {
  name: string;
  description: string;
  execute: (context: WorkflowContext) => Promise<ActionResult>;
  dependencies?: string[];
  timeout?: number;
  retryPolicy?: RetryPolicy;
  rollbackAction?: string;
}

export interface ActionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  warnings?: string[];
  nextActions?: string[];
  data?: Record<string, unknown>;
}

// ============================================================================
// WORKFLOW CONTEXT AND EXECUTION
// ============================================================================

export interface WorkflowContext {
  workflowId: string;
  instanceId: string;
  currentState: string;
  previousState?: string;
  data: Record<string, unknown>;
  metadata: WorkflowInstanceMetadata;
  submissionData?: Record<string, unknown>;
  userContext?: UserContext;
  systemContext?: SystemContext;
  executionHistory: ExecutionHistoryEntry[];
  variables: Record<string, unknown>;
  constants: Record<string, unknown>;
}

export interface WorkflowInstanceMetadata {
  startedAt?: Date;
  updatedAt: Date;
  version: number;
  lockVersion: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  source: 'manual' | 'event' | 'scheduled' | 'api';
  correlationId?: string;
  parentInstanceId?: string;
  childInstanceIds?: string[];
  tags?: string[];
}

export interface UserContext {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  groups: string[];
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SystemContext {
  tenant?: string;
  environment: 'development' | 'staging' | 'production';
  region?: string;
  version: string;
  instanceId: string;
  requestId: string;
  correlationId: string;
  traceId?: string;
  spanId?: string;
}

export interface ExecutionHistoryEntry {
  id: string;
  stepId?: string;
  actionType: WorkflowActionType;
  fromState?: string;
  toState?: string;
  executionData?: Record<string, unknown>;
  result: WorkflowExecutionResult;
  errorMessage?: string;
  executionTimeMs: number;
  executedAt: Date;
  executedBy?: string;
}

// ============================================================================
// WORKFLOW INSTANCE INTERFACES
// ============================================================================

export interface WorkflowInstance {
  id: string;
  workflowDefinitionId: string;
  workflowVersion: string;
  submissionId?: string;
  currentState: string;
  previousState?: string;
  instanceData: Record<string, unknown>;
  contextData: Record<string, unknown>;
  status: WorkflowInstanceStatus;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  lastActivityAt: Date;
  timeoutAt?: Date;
  slaBreachAt?: Date;
  escalatedAt?: Date;
  createdBy?: string;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  lockVersion: number;
}

export interface WorkflowInstanceCreate {
  workflowDefinitionId: string;
  workflowVersion?: string;
  submissionId?: string;
  initialData?: Record<string, unknown>;
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  startImmediately?: boolean;
  scheduledStart?: Date;
  metadata?: Record<string, unknown>;
}

export interface WorkflowInstanceUpdate {
  instanceData?: Record<string, unknown>;
  contextData?: Record<string, unknown>;
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

export interface WorkflowAdvanceRequest {
  targetState?: string;
  triggerType: 'manual' | 'system';
  data?: Record<string, unknown>;
  comment?: string;
  bypassValidation?: boolean;
}

// ============================================================================
// APPROVAL SYSTEM INTERFACES
// ============================================================================

export interface ApprovalChain {
  id: string;
  name: string;
  description?: string;
  steps: ApprovalStep[];
  configuration: ApprovalConfiguration;
  metadata?: ApprovalChainMetadata;
}

export interface ApprovalStep {
  id: string;
  name: string;
  type: ApprovalStepType;
  approvers: ApproverDefinition[];
  requirements: ApprovalRequirements;
  escalation?: EscalationConfig;
  parallel: boolean;
  optional: boolean;
  skipCondition?: string;
  timeoutMinutes?: number;
  metadata?: ApprovalStepMetadata;
}

export type ApprovalStepType = 'individual' | 'group' | 'role' | 'conditional' | 'automatic' | 'external';

export interface ApproverDefinition {
  type: 'user' | 'role' | 'group' | 'dynamic' | 'external';
  identifier: string;
  displayName?: string;
  fallback?: ApproverDefinition[];
  weight?: number;
  canDelegate?: boolean;
  maxDelegationDepth?: number;
}

export interface ApprovalRequirements {
  minimumApprovals: number;
  minimumWeight?: number;
  unanimousRequired: boolean;
  allowSelfApproval: boolean;
  requireComments: boolean;
  requireReason: boolean;
  allowDelegation: boolean;
  timeoutMinutes?: number;
  businessDaysOnly?: boolean;
  excludeWeekends?: boolean;
  excludeHolidays?: boolean;
}

export interface ApprovalConfiguration {
  allowParallelSteps: boolean;
  allowSkipSteps: boolean;
  requireAllSteps: boolean;
  notifyOnStart: boolean;
  notifyOnComplete: boolean;
  trackDecisionHistory: boolean;
  enableReminders: boolean;
  reminderIntervalMinutes?: number;
  maxReminderCount?: number;
}

export interface ApprovalChainMetadata {
  businessOwner?: string;
  lastReviewDate?: Date;
  nextReviewDate?: Date;
  category?: string;
  tags?: string[];
  compliance?: string[];
}

export interface ApprovalStepMetadata {
  description?: string;
  businessJustification?: string;
  complianceRequirement?: string;
  estimatedDuration?: number;
}

export interface EscalationConfig {
  enabled: boolean;
  triggers: EscalationTrigger[];
  actions: EscalationAction[];
  maxEscalations: number;
  escalationInterval: number;
}

export interface EscalationTrigger {
  type: 'timeout' | 'inactivity' | 'condition' | 'manual';
  threshold: number;
  condition?: string;
  businessDaysOnly?: boolean;
}

export interface EscalationAction {
  type: 'notify' | 'reassign' | 'escalate' | 'auto_approve' | 'cancel' | 'delegate';
  target?: string;
  notificationTemplate?: string;
  delay?: number;
  condition?: string;
  parameters?: Record<string, unknown>;
}

export interface ApprovalDecision {
  id: string;
  workflowInstanceId: string;
  stepId: string;
  chainId: string;
  approverId: string;
  action: ApprovalAction;
  comments?: string;
  reason?: string;
  decisionData?: Record<string, unknown>;
  decidedAt: Date;
  timeoutAt?: Date;
  delegatedTo?: string;
  delegatedAt?: Date;
  delegationChain?: DelegationInfo[];
  attachments?: AttachmentInfo[];
}

export interface DelegationInfo {
  fromUserId: string;
  toUserId: string;
  delegatedAt: Date;
  reason?: string;
  expiresAt?: Date;
  revoked?: boolean;
  revokedAt?: Date;
}

export interface AttachmentInfo {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  uploadedBy: string;
}

// ============================================================================
// EXECUTION PATTERNS
// ============================================================================

export interface ExecutionStep {
  id: string;
  name: string;
  type: ExecutionStepType;
  configuration: StepConfiguration;
  inputMapping?: Record<string, string>;
  outputMapping?: Record<string, string>;
  condition?: string;
  retryPolicy?: RetryPolicy;
  timeoutMinutes?: number;
  rollbackStep?: string;
  metadata?: StepMetadata;
}

export type ExecutionStepType =
  | 'action'
  | 'approval'
  | 'notification'
  | 'plugin'
  | 'webhook'
  | 'sub_workflow'
  | 'script'
  | 'delay'
  | 'conditional'
  | 'parallel'
  | 'loop';

export interface StepConfiguration {
  [key: string]: unknown;
}

export interface StepMetadata {
  description?: string;
  category?: string;
  tags?: string[];
  estimatedDuration?: number;
  businessOwner?: string;
  technicalOwner?: string;
}

export interface SequentialExecution {
  type: 'sequential';
  steps: ExecutionStep[];
  continueOnError: boolean;
  rollbackOnFailure: boolean;
  saveStateAfterEachStep: boolean;
}

export interface ParallelExecution {
  type: 'parallel';
  branches: ExecutionBranch[];
  waitStrategy: WaitStrategy;
  timeoutMinutes?: number;
  failureStrategy: FailureStrategy;
  maxConcurrency?: number;
}

export type WaitStrategy = 'all' | 'any' | 'majority' | 'custom';
export type FailureStrategy = 'fail_fast' | 'wait_all' | 'continue' | 'custom';

export interface ExecutionBranch {
  id: string;
  name: string;
  steps: ExecutionStep[];
  weight?: number;
  condition?: string;
  priority?: number;
}

export interface ConditionalExecution {
  type: 'conditional';
  condition: ConditionExpression;
  trueBranch: ExecutionPath;
  falseBranch?: ExecutionPath;
  defaultBranch?: ExecutionPath;
}

export interface ExecutionPath {
  steps: ExecutionStep[];
  parallel?: boolean;
}

export interface ConditionExpression {
  type: 'simple' | 'complex' | 'script';
  field?: string;
  operator?: ComparisonOperator;
  value?: unknown;
  expression?: string;
  script?: string;
  language?: 'javascript' | 'python' | 'jsonpath';
}

export type ComparisonOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'in'
  | 'not_in'
  | 'regex'
  | 'exists'
  | 'not_exists';

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'fixed' | 'linear' | 'exponential';
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
  retryableErrors?: string[];
  nonRetryableErrors?: string[];
}

// ============================================================================
// SUB-WORKFLOW INTERFACES
// ============================================================================

export interface SubWorkflowStep extends ExecutionStep {
  type: 'sub_workflow';
  configuration: SubWorkflowConfiguration;
}

export interface SubWorkflowConfiguration extends StepConfiguration {
  workflowId: string;
  version?: string;
  waitForCompletion: boolean;
  failureHandling: 'fail_parent' | 'continue' | 'retry' | 'compensate';
  compensationWorkflow?: string;
  passParentContext: boolean;
  isolateExecution: boolean;
}

export interface SubWorkflowResult {
  instanceId: string;
  status: WorkflowInstanceStatus;
  result?: unknown;
  error?: string;
  executionTime: number;
  data?: Record<string, unknown>;
}

// ============================================================================
// EVENT INTEGRATION INTERFACES
// ============================================================================

export interface EventHookConfiguration {
  triggers: EventTrigger[];
  handlers: EventHandler[];
  filters: EventFilter[];
  settings: EventHookSettings;
}

export interface EventTrigger {
  id: string;
  name: string;
  eventType: string;
  condition?: string;
  action: TriggerAction;
  priority: number;
  enabled: boolean;
  throttle?: ThrottleConfig;
}

export interface TriggerAction {
  type: 'start_workflow' | 'advance_state' | 'execute_step' | 'escalate' | 'notify';
  workflowId?: string;
  targetState?: string;
  stepId?: string;
  parameters?: Record<string, unknown>;
  delay?: number;
  condition?: string;
}

export interface EventHandler {
  id: string;
  name: string;
  eventTypes: string[];
  handler: HandlerFunction;
  priority: number;
  async: boolean;
  timeout?: number;
}

export interface HandlerFunction {
  type: 'script' | 'plugin' | 'webhook' | 'internal';
  configuration: Record<string, unknown>;
}

export interface EventFilter {
  id: string;
  name: string;
  eventTypes: string[];
  condition: string;
  action: 'include' | 'exclude' | 'transform';
  transformation?: string;
}

export interface EventHookSettings {
  enableAsync: boolean;
  maxConcurrentHandlers: number;
  defaultTimeout: number;
  retryFailedHandlers: boolean;
  maxRetryAttempts: number;
  deadLetterQueue: boolean;
}

export interface ThrottleConfig {
  maxEvents: number;
  timeWindowMs: number;
  action: 'drop' | 'queue' | 'delay';
}

// ============================================================================
// TIMEOUT AND SLA INTERFACES
// ============================================================================

export interface TimeoutConfiguration {
  stepTimeouts: Record<string, number>;
  stateTimeouts: Record<string, number>;
  workflowTimeout?: number;
  escalationRules: EscalationRule[];
  slaConfiguration?: SLAConfiguration;
  notificationSettings: TimeoutNotificationSettings;
}

export interface EscalationRule {
  id: string;
  name: string;
  description?: string;
  triggerCondition: EscalationTrigger;
  actions: EscalationAction[];
  priority: number;
  enabled: boolean;
  condition?: string;
}

export interface SLAConfiguration {
  levels: SLALevel[];
  breachActions: SLABreachAction[];
  reporting: SLAReporting;
  businessCalendar?: BusinessCalendar;
}

export interface SLALevel {
  name: string;
  description: string;
  targetMinutes: number;
  warningThreshold: number;
  breachThreshold: number;
  category: 'critical' | 'high' | 'medium' | 'low';
  businessDaysOnly: boolean;
  excludeWeekends: boolean;
  excludeHolidays: boolean;
}

export interface SLABreachAction {
  type: 'notify' | 'escalate' | 'log' | 'metric' | 'webhook';
  configuration: Record<string, unknown>;
  delay?: number;
  condition?: string;
}

export interface SLAReporting {
  enableReporting: boolean;
  reportingInterval: 'hourly' | 'daily' | 'weekly' | 'monthly';
  reportRecipients: string[];
  includeMetrics: string[];
  reportFormat: 'json' | 'csv' | 'html' | 'pdf';
}

export interface BusinessCalendar {
  timezone: string;
  workingDays: number[];
  workingHours: {
    start: string;
    end: string;
  };
  holidays: HolidayDefinition[];
}

export interface HolidayDefinition {
  name: string;
  date: string;
  recurring: boolean;
  type: 'national' | 'regional' | 'company';
}

export interface TimeoutNotificationSettings {
  enableWarnings: boolean;
  warningThresholds: number[];
  notificationChannels: string[];
  escalationNotifications: boolean;
  customTemplates?: Record<string, string>;
}

// ============================================================================
// MONITORING AND METRICS INTERFACES
// ============================================================================

export interface WorkflowMetrics {
  workflowId?: string;
  instanceId?: string;
  activeInstances: number;
  completedToday: number;
  completedThisWeek: number;
  completedThisMonth: number;
  averageCompletionTime: number;
  medianCompletionTime: number;
  slaBreaches: number;
  pendingApprovals: number;
  escalatedInstances: number;
  errorRate: number;
  throughput: number;
  backlogSize: number;
  resourceUtilization: number;
}

export interface WorkflowInstanceMetrics {
  instanceId: string;
  workflowId: string;
  currentState: string;
  timeInCurrentState: number;
  totalExecutionTime: number;
  stepsCompleted: number;
  stepsRemaining: number;
  approvalsPending: number;
  nextTimeout?: Date;
  healthStatus: HealthStatus;
  performanceRating: 'excellent' | 'good' | 'fair' | 'poor';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface PerformanceMetrics {
  stateTransitionTimes: Record<string, number>;
  stepExecutionTimes: Record<string, number>;
  approvalResponseTimes: Record<string, number>;
  bottleneckAnalysis: BottleneckReport[];
  throughputTrends: ThroughputData[];
  resourceUtilization: ResourceUtilization;
}

export interface BottleneckReport {
  stepId: string;
  stepName: string;
  averageWaitTime: number;
  maxWaitTime: number;
  frequency: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export interface ThroughputData {
  timestamp: Date;
  instancesStarted: number;
  instancesCompleted: number;
  instancesFailed: number;
  averageCompletionTime: number;
}

export interface ResourceUtilization {
  cpu: number;
  memory: number;
  database: number;
  networkIO: number;
  diskIO: number;
}

// ============================================================================
// DEBUGGING AND ANALYSIS INTERFACES
// ============================================================================

export interface ExecutionTrace {
  instanceId: string;
  workflowId: string;
  startTime: Date;
  endTime?: Date;
  steps: ExecutionStepTrace[];
  stateTransitions: StateTransitionTrace[];
  dataChanges: DataChangeTrace[];
  errors: ExecutionError[];
  timeline: TimelineEvent[];
  performance: PerformanceTrace;
}

export interface ExecutionStepTrace {
  stepId: string;
  stepName: string;
  stepType: ExecutionStepType;
  startTime: Date;
  endTime?: Date;
  duration: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  retryCount: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

export interface StateTransitionTrace {
  fromState: string;
  toState: string;
  timestamp: Date;
  trigger: string;
  condition?: string;
  guardResults?: Record<string, boolean>;
  actionResults?: Record<string, ActionResult>;
  duration: number;
  userId?: string;
}

export interface DataChangeTrace {
  timestamp: Date;
  fieldPath: string;
  oldValue?: unknown;
  newValue?: unknown;
  changeType: 'create' | 'update' | 'delete';
  source: 'user' | 'system' | 'plugin' | 'script';
  userId?: string;
}

export interface ExecutionError {
  id: string;
  timestamp: Date;
  stepId?: string;
  state?: string;
  errorType: string;
  errorCode: string;
  message: string;
  stackTrace?: string;
  context?: Record<string, unknown>;
  recoverable: boolean;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface TimelineEvent {
  timestamp: Date;
  type: 'state_change' | 'step_execution' | 'approval' | 'error' | 'escalation' | 'timeout' | 'user_action';
  description: string;
  details?: Record<string, unknown>;
  userId?: string;
  automated: boolean;
}

export interface PerformanceTrace {
  totalDuration: number;
  stepDurations: Record<string, number>;
  stateDurations: Record<string, number>;
  waitTimes: Record<string, number>;
  dbQueryCount: number;
  dbQueryTime: number;
  apiCallCount: number;
  apiCallTime: number;
  memoryPeak: number;
  cpuPeak: number;
}

export interface ValidationReport {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  recommendations: ValidationRecommendation[];
  complexity: ComplexityAnalysis;
}

export interface ValidationError {
  code: string;
  message: string;
  path: string;
  severity: 'error' | 'warning' | 'info';
  context?: Record<string, unknown>;
}

export interface ValidationWarning {
  code: string;
  message: string;
  path: string;
  impact: 'low' | 'medium' | 'high';
  recommendation?: string;
}

export interface ValidationRecommendation {
  type: 'performance' | 'maintainability' | 'security' | 'usability';
  priority: 'low' | 'medium' | 'high';
  description: string;
  implementation?: string;
}

export interface ComplexityAnalysis {
  cyclomaticComplexity: number;
  stateCount: number;
  transitionCount: number;
  approvalStepCount: number;
  conditionCount: number;
  estimatedExecutionTime: number;
  maintainabilityScore: number;
}

export interface SimulationResult {
  simulationId: string;
  workflowId: string;
  inputData: Record<string, unknown>;
  executionPaths: SimulationPath[];
  outcomes: SimulationOutcome[];
  performance: SimulationPerformance;
  recommendations: string[];
}

export interface SimulationPath {
  pathId: string;
  states: string[];
  transitions: string[];
  duration: number;
  probability: number;
  outcome: 'completed' | 'failed' | 'timeout';
}

export interface SimulationOutcome {
  outcome: 'completed' | 'failed' | 'timeout';
  probability: number;
  averageDuration: number;
  finalState: string;
  data?: Record<string, unknown>;
}

export interface SimulationPerformance {
  totalSimulationTime: number;
  pathsAnalyzed: number;
  averageExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  bottlenecks: string[];
}

// ============================================================================
// NOTIFICATION INTERFACES
// ============================================================================

export interface NotificationConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  template?: string;
  recipients: RecipientDefinition[];
  condition?: string;
  throttle?: ThrottleConfig;
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'webhook' | 'slack' | 'teams';
  configuration: Record<string, unknown>;
  fallback?: NotificationChannel;
}

export interface RecipientDefinition {
  type: 'user' | 'role' | 'group' | 'dynamic' | 'external';
  identifier: string;
  displayName?: string;
  contactInfo?: ContactInfo;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  slackUserId?: string;
  teamsUserId?: string;
}

// ============================================================================
// API REQUEST/RESPONSE INTERFACES
// ============================================================================

export interface CreateWorkflowRequest {
  name: string;
  title: string;
  description?: string;
  definition: WorkflowDefinitionData;
  stateMachine: WorkflowStateMachine;
  approvalChains?: ApprovalChain[];
  eventHooks?: EventHookConfiguration;
  timeoutConfig?: TimeoutConfiguration;
  metadata?: WorkflowMetadata;
  publishImmediately?: boolean;
}

export interface UpdateWorkflowRequest {
  title?: string;
  description?: string;
  definition?: Partial<WorkflowDefinitionData>;
  stateMachine?: Partial<WorkflowStateMachine>;
  approvalChains?: ApprovalChain[];
  eventHooks?: EventHookConfiguration;
  timeoutConfig?: TimeoutConfiguration;
  metadata?: Partial<WorkflowMetadata>;
  versionStrategy?: 'major' | 'minor' | 'patch';
}

export interface WorkflowQueryRequest {
  filters?: WorkflowFilter;
  sort?: SortOption[];
  pagination?: PaginationRequest;
  include?: string[];
}

export interface WorkflowFilter {
  status?: WorkflowStatus[];
  category?: string[];
  tags?: string[];
  createdBy?: string[];
  dateRange?: DateRange;
  search?: string;
}

export interface WorkflowInstanceQueryRequest {
  filters?: WorkflowInstanceFilter;
  sort?: SortOption[];
  pagination?: PaginationRequest;
  include?: string[];
}

export interface WorkflowInstanceFilter {
  workflowId?: string[];
  status?: WorkflowInstanceStatus[];
  assignedTo?: string[];
  createdBy?: string[];
  priority?: string[];
  dateRange?: DateRange;
  stateTimeRange?: StateTimeRange;
  search?: string;
}

export interface StateTimeRange {
  state: string;
  minMinutes?: number;
  maxMinutes?: number;
}

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationRequest {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
    cursor?: string;
  };
}

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

export const WorkflowStatusSchema = z.enum(['draft', 'active', 'deprecated', 'archived']);

export const WorkflowInstanceStatusSchema = z.enum([
  'pending', 'running', 'waiting', 'suspended', 'completed', 'failed', 'cancelled', 'escalated'
]);

export const ApprovalActionSchema = z.enum(['approve', 'reject', 'request_changes', 'delegate', 'escalate']);

export const WorkflowVariableSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['string', 'number', 'boolean', 'date', 'json', 'array']),
  defaultValue: z.unknown().optional(),
  required: z.boolean(),
  description: z.string().optional(),
  validation: z.object({
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    pattern: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    options: z.array(z.string()).optional(),
  }).optional(),
});

export const WorkflowStateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['initial', 'intermediate', 'final', 'parallel', 'choice', 'fork', 'join', 'history']),
  properties: z.object({
    isInterruptible: z.boolean(),
    allowManualTransition: z.boolean(),
    requireApproval: z.boolean(),
    slaMinutes: z.number().positive().optional(),
    maxRetries: z.number().nonnegative().optional(),
    retryDelay: z.number().nonnegative().optional(),
    rollbackOnFailure: z.boolean(),
    persistData: z.boolean(),
  }),
  entryActions: z.array(z.string()).optional(),
  exitActions: z.array(z.string()).optional(),
  timeouts: z.array(z.object({
    timeoutMinutes: z.number().positive(),
    action: z.object({
      type: z.enum(['transition', 'escalate', 'notify', 'fail', 'custom']),
      parameters: z.record(z.unknown()).optional(),
    }),
    targetState: z.string().optional(),
    escalationRule: z.string().optional(),
    condition: z.string().optional(),
  })).optional(),
});

export const WorkflowTransitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  from: z.string().min(1),
  to: z.string().min(1),
  trigger: z.object({
    type: z.enum(['manual', 'automatic', 'event', 'timer', 'condition']),
    eventType: z.string().optional(),
    timerExpression: z.string().optional(),
    condition: z.string().optional(),
    parameters: z.record(z.unknown()).optional(),
  }).optional(),
  condition: z.string().optional(),
  guards: z.array(z.string()).optional(),
  actions: z.array(z.string()).optional(),
  priority: z.number().nonnegative(),
  isManual: z.boolean(),
  requiresApproval: z.boolean(),
  approvalChain: z.string().optional(),
});

export const CreateWorkflowRequestSchema = z.object({
  name: z.string().min(1).max(255),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  definition: z.object({
    version: z.string(),
    name: z.string(),
    description: z.string().optional(),
    settings: z.object({
      allowConcurrentInstances: z.boolean(),
      maxConcurrentInstances: z.number().positive().optional(),
      autoCleanupCompletedInstances: z.boolean(),
      cleanupAfterDays: z.number().positive().optional(),
      enableVersionMigration: z.boolean(),
      requireApprovalForModification: z.boolean(),
    }),
    variables: z.array(WorkflowVariableSchema).optional(),
  }),
  stateMachine: z.object({
    states: z.record(WorkflowStateSchema),
    transitions: z.array(WorkflowTransitionSchema),
    initialState: z.string().min(1),
    finalStates: z.array(z.string()),
    guards: z.record(z.unknown()),
    actions: z.record(z.unknown()),
  }),
  publishImmediately: z.boolean().optional(),
});

export const WorkflowInstanceCreateSchema = z.object({
  workflowDefinitionId: z.string().uuid(),
  workflowVersion: z.string().optional(),
  submissionId: z.string().uuid().optional(),
  initialData: z.record(z.unknown()).optional(),
  assignedTo: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  startImmediately: z.boolean().optional(),
  scheduledStart: z.date().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const ApprovalDecisionSchema = z.object({
  action: ApprovalActionSchema,
  comments: z.string().optional(),
  reason: z.string().optional(),
  delegatedTo: z.string().uuid().optional(),
  attachments: z.array(z.string().uuid()).optional(),
});

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Export all schemas for external use
export const WorkflowEngineSchemas = {
  WorkflowStatusSchema,
  WorkflowInstanceStatusSchema,
  ApprovalActionSchema,
  WorkflowVariableSchema,
  WorkflowStateSchema,
  WorkflowTransitionSchema,
  CreateWorkflowRequestSchema,
  WorkflowInstanceCreateSchema,
  ApprovalDecisionSchema,
} as const;