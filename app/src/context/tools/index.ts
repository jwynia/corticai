/**
 * Context Tools Index
 *
 * Aggregates all context management tools for easy import and use
 */

export * from './store.tool.js';
export * from './query.tool.js';
export * from './analyze.tool.js';

import { contextStoreTools } from './store.tool.js';
import { contextQueryTools } from './query.tool.js';
import { contextAnalysisTools } from './analyze.tool.js';

/**
 * All context tools aggregated
 */
export const contextTools = {
  ...contextStoreTools,
  ...contextQueryTools,
  ...contextAnalysisTools,
};

/**
 * Tool categories for selective import
 */
export const contextToolCategories = {
  storage: contextStoreTools,
  query: contextQueryTools,
  analysis: contextAnalysisTools,
};