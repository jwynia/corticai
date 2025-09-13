/**
 * CorticAI Context Management - Usage Examples
 *
 * This file demonstrates various ways to use the CorticAI context management system.
 */

import { Mastra } from '@mastra/core/mastra';
import {
  // Direct imports
  setupContextManagement,
  ContextManagerAgent,
  QueryAssistantAgent,
  ContextObserverAgent,

  // Tools and agents
  contextTools,
  contextAgents,

  // Types
  type ObservedMessage,
} from '../src/context/index.js';

// For storage configuration
import { DuckDBStorageAdapter } from '../src/storage/index.js';

/**
 * Example 1: Quick Setup with Convenience Wrapper
 */
async function quickSetupExample() {
  console.log('=== Example 1: Quick Setup ===\n');

  // Setup with DuckDB storage
  const context = setupContextManagement({
    storageType: 'duckdb',
    duckdb: {
      database: './context.db',
      tableName: 'context_entries',
    },
  });

  // Store a decision
  const result = await context.store({
    type: 'decision',
    content: 'Use Mastra framework for agent orchestration',
    rationale: 'Provides excellent LLM integration and workflow capabilities',
    alternatives: ['LangChain', 'AutoGPT', 'Custom solution'],
  }, {
    project: 'corticai',
    tags: ['architecture', 'framework'],
    confidence: 0.9,
  });

  console.log('Stored decision:', result);

  // Query using natural language
  const queryResult = await context.query('What decisions have been made about frameworks?');
  console.log('Query results:', queryResult);

  // Get insights
  const insights = await context.getInsights();
  console.log('Context insights:', insights);
}

/**
 * Example 2: Direct Agent Usage
 */
async function directAgentUsage() {
  console.log('\n=== Example 2: Direct Agent Usage ===\n');

  // Create agents with shared storage
  const config = {
    storageType: 'memory' as const,
  };

  const manager = new ContextManagerAgent(config);
  const assistant = new QueryAssistantAgent(config);

  // Store multiple related contexts
  await manager.storeWithIntelligence({
    type: 'code',
    content: `
      export class ContextManager {
        async store(data: any): Promise<void> {
          // Implementation
        }
      }
    `,
    file: 'src/context/ContextManager.ts',
  });

  await manager.storeWithIntelligence({
    type: 'documentation',
    content: 'The ContextManager class handles intelligent storage of context entries.',
    related: ['ContextManager'],
  });

  // Query for related information
  const summary = await assistant.getSummary('ContextManager');
  console.log('Summary:', summary);

  // Explore context interactively
  const exploration = await assistant.explore();
  console.log('Exploration:', exploration);

  // Perform maintenance
  const maintenance = await manager.performMaintenance();
  console.log('Maintenance actions:', maintenance);
}

/**
 * Example 3: Observational Mode
 */
async function observationalMode() {
  console.log('\n=== Example 3: Observational Mode ===\n');

  // Create observer with custom filters
  const observer = new ContextObserverAgent({
    storageType: 'memory',
    filters: {
      keywords: ['bug', 'fix', 'issue', 'problem'],
      patterns: ['TODO|FIXME', 'decided?|decision'],
      confidence: 0.7,
    },
  });

  // Simulate a conversation
  const messages: ObservedMessage[] = [
    {
      role: 'user',
      content: 'I found a bug in the authentication system. Users can bypass 2FA.',
    },
    {
      role: 'assistant',
      content: 'This is a critical security issue. We should fix this immediately by validating the 2FA token on the server side. TODO: Implement server-side 2FA validation.',
    },
    {
      role: 'user',
      content: 'Should we also add rate limiting?',
    },
    {
      role: 'assistant',
      content: 'Yes, I recommend adding rate limiting. We decided to implement a 5-attempt limit with exponential backoff.',
    },
  ];

  // Observe the conversation
  const observationResult = await observer.observeConversation(messages);
  console.log('Observation result:', observationResult);

  // Get statistics
  const stats = observer.getStatistics();
  console.log('Observer statistics:', stats);
}

/**
 * Example 4: Integration with Mastra Framework
 */
async function mastraIntegration() {
  console.log('\n=== Example 4: Mastra Integration ===\n');

  // Create Mastra instance with context tools
  const mastra = new Mastra({
    tools: {
      // Include all context tools
      ...contextTools,

      // Can add other tools too
      customTool: {
        id: 'custom',
        name: 'Custom Tool',
        description: 'A custom tool',
        execute: async () => ({ result: 'custom' }),
      },
    },
    agents: {
      // Create context agents
      contextManager: contextAgents.ContextManager({
        storageType: 'memory',
      }),
      queryAssistant: contextAgents.QueryAssistant({
        storageType: 'memory',
      }),
    },
  });

  // Use in a custom agent
  const { Agent } = await import('@mastra/core/agent');
  const { createOpenRouter } = await import('@openrouter/ai-sdk-provider');

  const openRouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1"
  });

  const myAgent = new Agent({
    name: 'MyAgent',
    instructions: 'You help manage project context and answer questions.',
    model: openRouter.chat('anthropic/claude-3.5-haiku'),
    tools: {
      storeContext: contextTools.storeContext,
      queryContext: contextTools.queryContext,
      analyzeContext: contextTools.analyzeContextPatterns,
    },
  });

  console.log('Mastra configured with context management capabilities');
}

/**
 * Example 5: Multi-Agent Collaboration
 */
async function multiAgentCollaboration() {
  console.log('\n=== Example 5: Multi-Agent Collaboration ===\n');

  // Shared storage configuration
  const storageAdapter = new DuckDBStorageAdapter({
    type: 'duckdb',
    database: ':memory:', // In-memory for example
    tableName: 'shared_context',
  });

  // Create multiple agents sharing the same storage
  const projectManager = new ContextManagerAgent({
    storageType: 'duckdb',
    storageConfig: {
      database: ':memory:',
      tableName: 'shared_context',
    },
  });

  const techLead = new QueryAssistantAgent({
    storageType: 'duckdb',
    storageConfig: {
      database: ':memory:',
      tableName: 'shared_context',
    },
  });

  const observer = new ContextObserverAgent({
    storageType: 'duckdb',
    storageConfig: {
      database: ':memory:',
      tableName: 'shared_context',
    },
  });

  // Project manager stores a requirement
  await projectManager.storeWithIntelligence({
    type: 'requirement',
    content: 'System must support 10,000 concurrent users',
    priority: 'high',
  });

  // Tech lead queries for requirements
  const requirements = await techLead.query('What are the high priority requirements?');
  console.log('Requirements found by tech lead:', requirements);

  // Observer watches development discussions
  await observer.observe({
    role: 'user',
    content: 'We need to implement horizontal scaling to meet the concurrent user requirement.',
  });

  console.log('Multi-agent collaboration established');
}

/**
 * Example 6: Building a Knowledge Graph
 */
async function knowledgeGraph() {
  console.log('\n=== Example 6: Knowledge Graph ===\n');

  const context = setupContextManagement({
    storageType: 'memory',
  });

  // Store interconnected context entries
  const entries = [
    {
      id: 'arch_001',
      type: 'pattern',
      content: 'Repository Pattern',
      metadata: { tags: ['architecture', 'pattern'] },
    },
    {
      id: 'impl_001',
      type: 'code',
      content: 'class UserRepository implements Repository<User>',
      metadata: { related: ['arch_001'], tags: ['implementation'] },
    },
    {
      id: 'doc_001',
      type: 'documentation',
      content: 'The Repository pattern provides an abstraction layer over data access',
      metadata: { related: ['arch_001', 'impl_001'], tags: ['documentation'] },
    },
    {
      id: 'decision_001',
      type: 'decision',
      content: 'Use Repository pattern for all entity access',
      metadata: { related: ['arch_001'], tags: ['decision'] },
    },
  ];

  // Store all entries
  for (const entry of entries) {
    await context.store(entry, entry.metadata);
  }

  // Analyze relationships
  const relationships = await contextTools.analyzeContextRelationships.execute({
    context: {
      rootEntityId: 'arch_001',
      maxDepth: 3,
      storageConfig: { type: 'memory' },
    },
  });

  console.log('Knowledge graph:', {
    nodes: relationships.graph.nodes.length,
    edges: relationships.graph.edges.length,
    clusters: relationships.clusters,
  });
}

/**
 * Run all examples
 */
async function runExamples() {
  try {
    await quickSetupExample();
    await directAgentUsage();
    await observationalMode();
    await mastraIntegration();
    await multiAgentCollaboration();
    await knowledgeGraph();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples();
}

export {
  quickSetupExample,
  directAgentUsage,
  observationalMode,
  mastraIntegration,
  multiAgentCollaboration,
  knowledgeGraph,
};