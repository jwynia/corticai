/**
 * AI Engine TypeScript Interfaces and Zod Schemas
 *
 * This file contains all TypeScript interfaces and Zod schemas for the AI Engine component.
 * It provides runtime validation and type safety for AI operations, providers, conversations,
 * and related data structures.
 */

import { z } from 'zod';

// ============================================================================
// Base Types and Enums
// ============================================================================

export const AIProviderTypeSchema = z.enum(['openai', 'anthropic', 'google', 'azure-openai', 'local', 'custom']);
export type AIProviderType = z.infer<typeof AIProviderTypeSchema>;

export const AIModelTypeSchema = z.enum(['chat', 'completion', 'embedding', 'multimodal', 'function-calling']);
export type AIModelType = z.infer<typeof AIModelTypeSchema>;

export const MessageRoleSchema = z.enum(['system', 'user', 'assistant', 'function', 'tool']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const ConversationStatusSchema = z.enum(['active', 'paused', 'completed', 'failed', 'cancelled']);
export type ConversationStatus = z.infer<typeof ConversationStatusSchema>;

export const AgentTypeSchema = z.enum([
  'form-designer', 'workflow-automation', 'data-analysis',
  'query-processing', 'content-generation', 'validation'
]);
export type AgentType = z.infer<typeof AgentTypeSchema>;

export const ProtocolVersionSchema = z.enum(['A2A/1.0', 'MCP/1.0', 'AG-UI/1.0']);
export type ProtocolVersion = z.infer<typeof ProtocolVersionSchema>;

// ============================================================================
// LLM Provider System
// ============================================================================

export const ProviderCredentialsSchema = z.object({
  apiKey: z.string().optional(),
  endpoint: z.string().url().optional(),
  organization: z.string().optional(),
  region: z.string().optional(),
  customHeaders: z.record(z.string()).optional(),
  timeout: z.number().min(1000).max(300000).optional().default(30000)
});
export type ProviderCredentials = z.infer<typeof ProviderCredentialsSchema>;

export const ProviderCapabilitiesSchema = z.object({
  functionCalling: z.boolean().default(false),
  streaming: z.boolean().default(false),
  multimodal: z.boolean().default(false),
  embeddings: z.boolean().default(false),
  maxTokens: z.number().min(1000).max(200000),
  supportedLanguages: z.array(z.string()).default(['en']),
  rateLimits: z.object({
    requestsPerMinute: z.number().optional(),
    tokensPerMinute: z.number().optional(),
    concurrent: z.number().optional()
  }).optional()
});
export type ProviderCapabilities = z.infer<typeof ProviderCapabilitiesSchema>;

export const ModelDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: AIProviderTypeSchema,
  type: AIModelTypeSchema,
  maxTokens: z.number(),
  inputCost: z.number().min(0), // Cost per 1K tokens
  outputCost: z.number().min(0), // Cost per 1K tokens
  capabilities: ProviderCapabilitiesSchema,
  deprecated: z.boolean().default(false),
  beta: z.boolean().default(false)
});
export type ModelDefinition = z.infer<typeof ModelDefinitionSchema>;

export const LLMProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: AIProviderTypeSchema,
  description: z.string().optional(),
  credentials: ProviderCredentialsSchema,
  capabilities: ProviderCapabilitiesSchema,
  models: z.array(ModelDefinitionSchema),
  active: z.boolean().default(true),
  priority: z.number().min(1).max(10).default(5),
  healthCheck: z.object({
    lastCheck: z.date().optional(),
    status: z.enum(['healthy', 'degraded', 'unhealthy']).optional(),
    responseTime: z.number().optional()
  }).optional()
});
export type LLMProvider = z.infer<typeof LLMProviderSchema>;

// ============================================================================
// Message and Conversation System
// ============================================================================

export const MessageContentSchema = z.union([
  z.string(),
  z.array(z.object({
    type: z.enum(['text', 'image', 'audio', 'file']),
    content: z.string(),
    metadata: z.record(z.any()).optional()
  }))
]);
export type MessageContent = z.infer<typeof MessageContentSchema>;

export const MessageSchema = z.object({
  id: z.string(),
  role: MessageRoleSchema,
  content: MessageContentSchema,
  timestamp: z.date(),
  tokens: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
  model: z.string().optional(),
  functionCall: z.object({
    name: z.string(),
    arguments: z.string()
  }).optional(),
  toolCalls: z.array(z.object({
    id: z.string(),
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      arguments: z.string()
    })
  })).optional(),
  metadata: z.record(z.any()).optional()
});
export type Message = z.infer<typeof MessageSchema>;

export const ConversationContextSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  workspace: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string()
  }).optional(),
  form: z.object({
    id: z.string(),
    version: z.string()
  }).optional(),
  workflow: z.object({
    id: z.string(),
    instance: z.string()
  }).optional(),
  constraints: z.object({
    maxTokens: z.number().optional(),
    maxTurns: z.number().optional(),
    timeout: z.number().optional(),
    costLimit: z.number().optional()
  }).optional()
});
export type ConversationContext = z.infer<typeof ConversationContextSchema>;

export const ConversationSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().optional(),
  status: ConversationStatusSchema,
  startTime: z.date(),
  lastActivity: z.date(),
  endTime: z.date().optional(),
  messages: z.array(MessageSchema),
  context: ConversationContextSchema,
  metadata: z.object({
    provider: z.string(),
    model: z.string(),
    totalTokens: z.number().min(0).default(0),
    totalCost: z.number().min(0).default(0),
    messageCount: z.number().min(0).default(0),
    averageResponseTime: z.number().min(0).optional()
  }),
  tags: z.array(z.string()).optional()
});
export type ConversationSession = z.infer<typeof ConversationSessionSchema>;

// ============================================================================
// AI Agent System (A2A Protocol)
// ============================================================================

export const AgentIdentifierSchema = z.object({
  id: z.string(),
  type: AgentTypeSchema,
  version: z.string(),
  instance: z.string().optional()
});
export type AgentIdentifier = z.infer<typeof AgentIdentifierSchema>;

export const RetryPolicySchema = z.object({
  maxAttempts: z.number().min(1).max(10).default(3),
  backoffStrategy: z.enum(['fixed', 'exponential', 'linear']).default('exponential'),
  baseDelay: z.number().min(100).max(30000).default(1000),
  maxDelay: z.number().min(1000).max(300000).default(30000)
});
export type RetryPolicy = z.infer<typeof RetryPolicySchema>;

export const A2APayloadSchema = z.object({
  action: z.string(),
  parameters: z.record(z.any()),
  metadata: z.object({
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    timeout: z.number().min(1000).max(300000).default(30000),
    retryPolicy: RetryPolicySchema.optional()
  })
});
export type A2APayload = z.infer<typeof A2APayloadSchema>;

export const A2AMessageSchema = z.object({
  id: z.string(),
  from: AgentIdentifierSchema,
  to: AgentIdentifierSchema,
  type: z.enum(['request', 'response', 'event', 'broadcast']),
  protocol: z.literal('A2A/1.0'),
  timestamp: z.string().datetime(),
  payload: A2APayloadSchema,
  context: ConversationContextSchema.optional(),
  correlationId: z.string().optional(),
  replyTo: z.string().optional()
});
export type A2AMessage = z.infer<typeof A2AMessageSchema>;

export const AgentDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: AgentTypeSchema,
  version: z.string(),
  description: z.string(),
  capabilities: z.array(z.string()),
  endpoints: z.array(z.string()),
  config: z.object({
    maxConcurrentTasks: z.number().min(1).max(100).default(10),
    timeout: z.number().min(1000).max(300000).default(30000),
    retryPolicy: RetryPolicySchema,
    resourceLimits: z.object({
      memory: z.number().optional(),
      cpu: z.number().optional(),
      tokens: z.number().optional()
    }).optional()
  }),
  active: z.boolean().default(true),
  lastHeartbeat: z.date().optional()
});
export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;

// ============================================================================
// MCP (Model Context Protocol) System
// ============================================================================

export const MCPConstraintsSchema = z.object({
  maxTokens: z.number().min(1000).max(200000),
  allowedTools: z.array(z.string()),
  contentFilters: z.array(z.string()),
  timeouts: z.object({
    request: z.number().min(1000).max(300000).default(30000),
    session: z.number().min(60000).max(3600000).default(1800000)
  }),
  costLimits: z.object({
    perRequest: z.number().min(0).optional(),
    perSession: z.number().min(0).optional(),
    perDay: z.number().min(0).optional()
  })
});
export type MCPConstraints = z.infer<typeof MCPConstraintsSchema>;

export const MCPContextSchema = z.object({
  sessionId: z.string(),
  conversationId: z.string(),
  userId: z.string(),
  workspace: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    metadata: z.record(z.any()).optional()
  }).optional(),
  tools: z.array(z.object({
    name: z.string(),
    description: z.string(),
    schema: z.record(z.any()),
    enabled: z.boolean().default(true)
  })),
  memory: z.object({
    shortTerm: z.array(MessageSchema),
    longTerm: z.array(z.object({
      id: z.string(),
      summary: z.string(),
      timestamp: z.date(),
      relevance: z.number().min(0).max(1)
    })).optional(),
    embeddings: z.array(z.object({
      id: z.string(),
      content: z.string(),
      vector: z.array(z.number()),
      metadata: z.record(z.any()).optional()
    })).optional()
  }),
  constraints: MCPConstraintsSchema
});
export type MCPContext = z.infer<typeof MCPContextSchema>;

// ============================================================================
// AG-UI (Agent-GUI) System
// ============================================================================

export const UIElementSelectorSchema = z.object({
  type: z.enum(['id', 'class', 'xpath', 'css']),
  value: z.string(),
  context: z.string().optional()
});
export type UIElementSelector = z.infer<typeof UIElementSelectorSchema>;

export const UIChangesSchema = z.object({
  properties: z.record(z.any()).optional(),
  content: z.string().optional(),
  attributes: z.record(z.string()).optional(),
  styles: z.record(z.string()).optional(),
  events: z.record(z.string()).optional()
});
export type UIChanges = z.infer<typeof UIChangesSchema>;

export const UIPreviewSchema = z.object({
  type: z.enum(['image', 'html', 'description']),
  content: z.string(),
  metadata: z.record(z.any()).optional()
});
export type UIPreview = z.infer<typeof UIPreviewSchema>;

export const AGUIActionSchema = z.object({
  type: z.enum(['modify', 'create', 'delete', 'style', 'restructure']),
  element: UIElementSelectorSchema,
  changes: UIChangesSchema,
  preview: UIPreviewSchema.optional(),
  reasoning: z.string().optional()
});
export type AGUIAction = z.infer<typeof AGUIActionSchema>;

export const AGUIInteractionSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  type: z.enum(['suggestion', 'completion', 'validation', 'enhancement']),
  target: z.object({
    type: z.string(),
    id: z.string(),
    context: z.record(z.any()).optional()
  }),
  action: AGUIActionSchema,
  confidence: z.number().min(0).max(1),
  alternatives: z.array(AGUIActionSchema).optional(),
  explanation: z.string().optional(),
  userFeedback: z.object({
    accepted: z.boolean(),
    rating: z.number().min(1).max(5).optional(),
    comments: z.string().optional()
  }).optional()
});
export type AGUIInteraction = z.infer<typeof AGUIInteractionSchema>;

// ============================================================================
// Function Calling and Tool System
// ============================================================================

export const ToolParameterSchema = z.object({
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
  description: z.string(),
  required: z.boolean().default(false),
  enum: z.array(z.any()).optional(),
  default: z.any().optional(),
  validation: z.object({
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional()
  }).optional()
});
export type ToolParameter = z.infer<typeof ToolParameterSchema>;

export const ToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.enum(['form', 'database', 'workflow', 'analysis', 'integration', 'utility']),
  parameters: z.record(ToolParameterSchema),
  returns: z.object({
    type: z.string(),
    description: z.string(),
    schema: z.record(z.any()).optional()
  }),
  security: z.object({
    requiresAuth: z.boolean().default(true),
    permissions: z.array(z.string()),
    rateLimits: z.object({
      perMinute: z.number().optional(),
      perHour: z.number().optional(),
      perDay: z.number().optional()
    }).optional()
  }),
  cost: z.object({
    baseUnits: z.number().min(0).default(1),
    variableUnits: z.number().min(0).default(0),
    description: z.string().optional()
  }).optional(),
  version: z.string(),
  deprecated: z.boolean().default(false)
});
export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

export const FunctionCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: z.record(z.any()),
  context: z.object({
    userId: z.string(),
    sessionId: z.string(),
    conversationId: z.string(),
    permissions: z.array(z.string())
  }),
  metadata: z.object({
    timestamp: z.date(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    timeout: z.number().min(1000).max(300000).default(30000)
  })
});
export type FunctionCall = z.infer<typeof FunctionCallSchema>;

export const FunctionResultSchema = z.object({
  id: z.string(),
  success: z.boolean(),
  result: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional()
  }).optional(),
  metadata: z.object({
    executionTime: z.number().min(0),
    tokensUsed: z.number().min(0).optional(),
    cost: z.number().min(0).optional(),
    cacheHit: z.boolean().optional()
  })
});
export type FunctionResult = z.infer<typeof FunctionResultSchema>;

// ============================================================================
// Prompt Engineering System
// ============================================================================

export const PromptVariableSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
  description: z.string(),
  required: z.boolean().default(false),
  default: z.any().optional(),
  validation: z.object({
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    pattern: z.string().optional(),
    enum: z.array(z.any()).optional()
  }).optional()
});
export type PromptVariable = z.infer<typeof PromptVariableSchema>;

export const PromptExampleSchema = z.object({
  input: z.record(z.any()),
  expectedOutput: z.string(),
  quality: z.number().min(0).max(1),
  notes: z.string().optional()
});
export type PromptExample = z.infer<typeof PromptExampleSchema>;

export const PromptOptimizationSchema = z.object({
  technique: z.enum(['few-shot', 'chain-of-thought', 'tree-of-thought', 'constitutional', 'retrieval-augmented']),
  examples: z.array(PromptExampleSchema),
  performance: z.object({
    accuracy: z.number().min(0).max(1),
    consistency: z.number().min(0).max(1),
    responseTime: z.number().min(0),
    tokenEfficiency: z.number().min(0).max(1)
  }),
  costEfficiency: z.object({
    costPerRequest: z.number().min(0),
    qualityPerCost: z.number().min(0),
    tokenOptimization: z.number().min(0).max(1)
  })
});
export type PromptOptimization = z.infer<typeof PromptOptimizationSchema>;

export const PromptTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['form-generation', 'validation', 'workflow', 'analysis', 'documentation']),
  description: z.string(),
  template: z.string(),
  variables: z.array(PromptVariableSchema),
  optimization: PromptOptimizationSchema,
  testing: z.object({
    testCases: z.array(PromptExampleSchema),
    lastTested: z.date().optional(),
    passRate: z.number().min(0).max(1).optional(),
    averageQuality: z.number().min(0).max(1).optional()
  }),
  version: z.string(),
  active: z.boolean().default(true),
  metadata: z.record(z.any()).optional()
});
export type PromptTemplate = z.infer<typeof PromptTemplateSchema>;

// ============================================================================
// Context Window Management
// ============================================================================

export const ContextItemSchema = z.object({
  id: z.string(),
  type: z.enum(['message', 'document', 'metadata', 'function-result']),
  content: z.string(),
  tokens: z.number().min(0),
  timestamp: z.date(),
  relevance: z.number().min(0).max(1),
  priority: z.number().min(1).max(10).default(5),
  metadata: z.record(z.any()).optional()
});
export type ContextItem = z.infer<typeof ContextItemSchema>;

export const RetentionRuleSchema = z.object({
  type: z.enum(['always-keep', 'time-based', 'relevance-based', 'token-based', 'priority-based']),
  condition: z.record(z.any()),
  action: z.enum(['keep', 'compress', 'remove', 'archive']),
  priority: z.number().min(1).max(10).default(5)
});
export type RetentionRule = z.infer<typeof RetentionRuleSchema>;

export const ContextStrategySchema = z.object({
  name: z.string(),
  description: z.string(),
  priority: z.number().min(1).max(10).default(5),
  tokenLimit: z.number().min(1000).max(200000),
  retentionRules: z.array(RetentionRuleSchema),
  compressionRatio: z.number().min(0.1).max(0.9).default(0.5),
  active: z.boolean().default(true)
});
export type ContextStrategy = z.infer<typeof ContextStrategySchema>;

export const ContextSummarySchema = z.object({
  id: z.string(),
  originalTokens: z.number().min(0),
  summaryTokens: z.number().min(0),
  compressionRatio: z.number().min(0).max(1),
  summary: z.string(),
  keyPoints: z.array(z.string()),
  timestamp: z.date(),
  quality: z.number().min(0).max(1).optional()
});
export type ContextSummary = z.infer<typeof ContextSummarySchema>;

// ============================================================================
// Cost Optimization System
// ============================================================================

export const CostConstraintsSchema = z.object({
  maxCostPerRequest: z.number().min(0),
  dailyBudget: z.number().min(0),
  monthlyBudget: z.number().min(0),
  qualityThreshold: z.number().min(0).max(1),
  latencyRequirement: z.number().min(100).max(30000)
});
export type CostConstraints = z.infer<typeof CostConstraintsSchema>;

export const CostEstimateSchema = z.object({
  requestId: z.string(),
  provider: z.string(),
  model: z.string(),
  estimatedTokens: z.object({
    input: z.number().min(0),
    output: z.number().min(0),
    total: z.number().min(0)
  }),
  estimatedCost: z.number().min(0),
  confidence: z.number().min(0).max(1),
  alternatives: z.array(z.object({
    provider: z.string(),
    model: z.string(),
    cost: z.number().min(0),
    qualityScore: z.number().min(0).max(1),
    latency: z.number().min(0)
  })).optional()
});
export type CostEstimate = z.infer<typeof CostEstimateSchema>;

export const CostTrackingSchema = z.object({
  requestId: z.string(),
  userId: z.string(),
  provider: z.string(),
  model: z.string(),
  timestamp: z.date(),
  tokens: z.object({
    input: z.number().min(0),
    output: z.number().min(0),
    total: z.number().min(0)
  }),
  cost: z.number().min(0),
  responseTime: z.number().min(0),
  quality: z.number().min(0).max(1).optional(),
  cached: z.boolean().default(false),
  metadata: z.record(z.any()).optional()
});
export type CostTracking = z.infer<typeof CostTrackingSchema>;

// ============================================================================
// AI Safety and Alignment
// ============================================================================

export const ContentFilterSchema = z.object({
  name: z.string(),
  type: z.enum(['hate-speech', 'violence', 'sexual', 'self-harm', 'harassment', 'privacy', 'bias']),
  severity: z.enum(['low', 'medium', 'high']),
  action: z.enum(['warn', 'block', 'log']),
  active: z.boolean().default(true),
  config: z.record(z.any()).optional()
});
export type ContentFilter = z.infer<typeof ContentFilterSchema>;

export const SafetyViolationSchema = z.object({
  id: z.string(),
  type: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  content: z.string(),
  reason: z.string(),
  timestamp: z.date(),
  action: z.string(),
  userId: z.string().optional(),
  sessionId: z.string().optional()
});
export type SafetyViolation = z.infer<typeof SafetyViolationSchema>;

export const AlignmentCheckSchema = z.object({
  requestId: z.string(),
  timestamp: z.date(),
  checks: z.array(z.object({
    type: z.enum(['value-alignment', 'ethical-guidelines', 'compliance', 'bias-detection']),
    passed: z.boolean(),
    confidence: z.number().min(0).max(1),
    details: z.string().optional()
  })),
  overallScore: z.number().min(0).max(1),
  recommendation: z.enum(['approve', 'review', 'reject']),
  humanReviewRequired: z.boolean().default(false)
});
export type AlignmentCheck = z.infer<typeof AlignmentCheckSchema>;

// ============================================================================
// Request and Response Types
// ============================================================================

export const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema),
  model: z.string().optional(),
  provider: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(200000).optional(),
  stream: z.boolean().default(false),
  functions: z.array(ToolDefinitionSchema).optional(),
  functionCall: z.enum(['none', 'auto']).or(z.object({ name: z.string() })).optional(),
  tools: z.array(ToolDefinitionSchema).optional(),
  toolChoice: z.enum(['none', 'auto']).or(z.object({ type: z.literal('function'), function: z.object({ name: z.string() }) })).optional(),
  metadata: z.record(z.any()).optional()
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatResponseSchema = z.object({
  id: z.string(),
  message: MessageSchema,
  usage: z.object({
    promptTokens: z.number().min(0),
    completionTokens: z.number().min(0),
    totalTokens: z.number().min(0)
  }),
  cost: z.number().min(0),
  model: z.string(),
  provider: z.string(),
  metadata: z.object({
    responseTime: z.number().min(0),
    cached: z.boolean().default(false),
    reasoning: z.string().optional()
  })
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export const ChatChunkSchema = z.object({
  id: z.string(),
  delta: z.object({
    role: MessageRoleSchema.optional(),
    content: z.string().optional(),
    functionCall: z.object({
      name: z.string().optional(),
      arguments: z.string().optional()
    }).optional(),
    toolCalls: z.array(z.object({
      index: z.number(),
      id: z.string().optional(),
      type: z.literal('function').optional(),
      function: z.object({
        name: z.string().optional(),
        arguments: z.string().optional()
      }).optional()
    })).optional()
  }),
  finishReason: z.enum(['stop', 'length', 'function_call', 'tool_calls', 'content_filter']).optional(),
  usage: z.object({
    promptTokens: z.number().min(0),
    completionTokens: z.number().min(0),
    totalTokens: z.number().min(0)
  }).optional()
});
export type ChatChunk = z.infer<typeof ChatChunkSchema>;

// ============================================================================
// API Request/Response Types
// ============================================================================

export const AIServiceRequestSchema = z.object({
  type: z.enum(['chat', 'completion', 'function-call', 'embedding', 'analysis']),
  payload: z.record(z.any()),
  context: ConversationContextSchema.optional(),
  options: z.object({
    provider: z.string().optional(),
    model: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    timeout: z.number().min(1000).max(300000).default(30000),
    retries: z.number().min(0).max(5).default(3)
  }).optional()
});
export type AIServiceRequest = z.infer<typeof AIServiceRequestSchema>;

export const AIServiceResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  success: z.boolean(),
  result: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional()
  }).optional(),
  metadata: z.object({
    provider: z.string(),
    model: z.string(),
    executionTime: z.number().min(0),
    tokensUsed: z.number().min(0).optional(),
    cost: z.number().min(0).optional(),
    cached: z.boolean().default(false)
  })
});
export type AIServiceResponse = z.infer<typeof AIServiceResponseSchema>;

// ============================================================================
// Monitoring and Analytics Types
// ============================================================================

export const AIMetricsSchema = z.object({
  timestamp: z.date(),
  timeframe: z.enum(['minute', 'hour', 'day', 'week', 'month']),
  provider: z.string(),
  model: z.string().optional(),
  metrics: z.object({
    requestCount: z.number().min(0),
    successRate: z.number().min(0).max(1),
    averageResponseTime: z.number().min(0),
    totalTokens: z.number().min(0),
    totalCost: z.number().min(0),
    errorRate: z.number().min(0).max(1),
    cacheHitRate: z.number().min(0).max(1).optional(),
    qualityScore: z.number().min(0).max(1).optional()
  }),
  breakdown: z.object({
    byUser: z.record(z.number()).optional(),
    byEndpoint: z.record(z.number()).optional(),
    byErrorType: z.record(z.number()).optional()
  }).optional()
});
export type AIMetrics = z.infer<typeof AIMetricsSchema>;

export const PerformanceAlertSchema = z.object({
  id: z.string(),
  type: z.enum(['performance', 'cost', 'quality', 'security', 'capacity']),
  severity: z.enum(['info', 'warning', 'error', 'critical']),
  title: z.string(),
  description: z.string(),
  timestamp: z.date(),
  provider: z.string().optional(),
  model: z.string().optional(),
  metric: z.string(),
  threshold: z.number(),
  actualValue: z.number(),
  resolved: z.boolean().default(false),
  resolvedAt: z.date().optional(),
  actions: z.array(z.string()).optional()
});
export type PerformanceAlert = z.infer<typeof PerformanceAlertSchema>;

// ============================================================================
// Export all schemas for runtime validation
// ============================================================================

export const AIEngineSchemas = {
  // Base types
  AIProviderType: AIProviderTypeSchema,
  AIModelType: AIModelTypeSchema,
  MessageRole: MessageRoleSchema,
  ConversationStatus: ConversationStatusSchema,
  AgentType: AgentTypeSchema,
  ProtocolVersion: ProtocolVersionSchema,

  // Provider system
  ProviderCredentials: ProviderCredentialsSchema,
  ProviderCapabilities: ProviderCapabilitiesSchema,
  ModelDefinition: ModelDefinitionSchema,
  LLMProvider: LLMProviderSchema,

  // Message and conversation
  MessageContent: MessageContentSchema,
  Message: MessageSchema,
  ConversationContext: ConversationContextSchema,
  ConversationSession: ConversationSessionSchema,

  // A2A Protocol
  AgentIdentifier: AgentIdentifierSchema,
  RetryPolicy: RetryPolicySchema,
  A2APayload: A2APayloadSchema,
  A2AMessage: A2AMessageSchema,
  AgentDefinition: AgentDefinitionSchema,

  // MCP Protocol
  MCPConstraints: MCPConstraintsSchema,
  MCPContext: MCPContextSchema,

  // AG-UI Protocol
  UIElementSelector: UIElementSelectorSchema,
  UIChanges: UIChangesSchema,
  UIPreview: UIPreviewSchema,
  AGUIAction: AGUIActionSchema,
  AGUIInteraction: AGUIInteractionSchema,

  // Function calling
  ToolParameter: ToolParameterSchema,
  ToolDefinition: ToolDefinitionSchema,
  FunctionCall: FunctionCallSchema,
  FunctionResult: FunctionResultSchema,

  // Prompt engineering
  PromptVariable: PromptVariableSchema,
  PromptExample: PromptExampleSchema,
  PromptOptimization: PromptOptimizationSchema,
  PromptTemplate: PromptTemplateSchema,

  // Context management
  ContextItem: ContextItemSchema,
  RetentionRule: RetentionRuleSchema,
  ContextStrategy: ContextStrategySchema,
  ContextSummary: ContextSummarySchema,

  // Cost optimization
  CostConstraints: CostConstraintsSchema,
  CostEstimate: CostEstimateSchema,
  CostTracking: CostTrackingSchema,

  // Safety and alignment
  ContentFilter: ContentFilterSchema,
  SafetyViolation: SafetyViolationSchema,
  AlignmentCheck: AlignmentCheckSchema,

  // Requests and responses
  ChatRequest: ChatRequestSchema,
  ChatResponse: ChatResponseSchema,
  ChatChunk: ChatChunkSchema,
  AIServiceRequest: AIServiceRequestSchema,
  AIServiceResponse: AIServiceResponseSchema,

  // Monitoring
  AIMetrics: AIMetricsSchema,
  PerformanceAlert: PerformanceAlertSchema
};