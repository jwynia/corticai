/**
 * Context Agents Index
 *
 * Aggregates all context management agents for easy import and use
 */

export { ContextManagerAgent, createContextManager } from './ContextManager.agent.js';
export { QueryAssistantAgent, createQueryAssistant } from './QueryAssistant.agent.js';
export {
  ContextObserverAgent,
  createContextObserver,
  type ObservedMessage,
  type ObserverFilters
} from './ContextObserver.agent.js';

import { createContextManager } from './ContextManager.agent.js';
import { createQueryAssistant } from './QueryAssistant.agent.js';
import { createContextObserver } from './ContextObserver.agent.js';

/**
 * All context agents aggregated
 */
export const contextAgents = {
  ContextManager: createContextManager,
  QueryAssistant: createQueryAssistant,
  ContextObserver: createContextObserver,
};

/**
 * Create all agents with shared configuration
 */
export function createContextAgents(config?: {
  storageType?: 'memory' | 'json' | 'duckdb';
  storageConfig?: any;
}) {
  return {
    manager: createContextManager(config),
    assistant: createQueryAssistant(config),
    observer: createContextObserver(config),
  };
}