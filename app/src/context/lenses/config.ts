/**
 * Lens Configuration System
 *
 * This module provides validation, parsing, and management functionality for
 * lens configurations. It ensures lens configurations are valid and provides
 * utilities for creating and merging configurations.
 *
 * Key Functions:
 * - validateLensConfig: Validates lens configuration structure and values
 * - createDefaultLensConfig: Creates valid default configurations
 * - mergeLensConfigs: Safely merges configuration objects
 * - LensConfigValidationError: Specialized error for configuration issues
 */

import type {
  LensConfig,
  ActivationRule,
  QueryModification,
  ResultTransformation
} from './types'

/**
 * Specialized error for lens configuration validation issues
 */
export class LensConfigValidationError extends Error {
  public readonly details?: Record<string, any>

  constructor(message: string, details?: Record<string, any>) {
    super(message)
    this.name = 'LensConfigValidationError'
    this.details = details
  }
}

/**
 * Validates a lens configuration object
 *
 * Ensures all required fields are present, have correct types,
 * and contain valid values according to lens system requirements.
 *
 * @param config Configuration object to validate
 * @throws LensConfigValidationError if configuration is invalid
 */
export function validateLensConfig(config: any): void {
  // Basic type and structure validation
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new LensConfigValidationError(
      'Configuration must be a non-null object',
      { received: typeof config, value: config }
    )
  }

  // Validate enabled property
  if (typeof config.enabled !== 'boolean') {
    throw new LensConfigValidationError(
      'enabled must be a boolean',
      { field: 'enabled', received: typeof config.enabled, value: config.enabled }
    )
  }

  // Validate priority property
  if (typeof config.priority !== 'number' ||
      config.priority < 0 ||
      !Number.isInteger(config.priority)) {
    throw new LensConfigValidationError(
      'priority must be a non-negative integer',
      { field: 'priority', received: typeof config.priority, value: config.priority }
    )
  }

  // Validate required array properties
  const requiredArrays = ['activationRules', 'queryModifications', 'resultTransformations']
  for (const arrayProp of requiredArrays) {
    if (!Array.isArray(config[arrayProp])) {
      throw new LensConfigValidationError(
        `${arrayProp} must be an array`,
        { field: arrayProp, received: typeof config[arrayProp] }
      )
    }
  }

  // Validate activation rules
  validateActivationRules(config.activationRules)

  // Validate query modifications
  validateQueryModifications(config.queryModifications)

  // Validate result transformations
  validateResultTransformations(config.resultTransformations)
}

/**
 * Validates activation rules array
 */
function validateActivationRules(rules: any[]): void {
  rules.forEach((rule, index) => {
    if (!rule || typeof rule !== 'object') {
      throw new LensConfigValidationError(
        `Activation rule at index ${index} must be an object`,
        { index, received: typeof rule }
      )
    }

    // Validate rule type
    const validTypes = ['file_pattern', 'file_extension', 'recent_action', 'project_type', 'manual']
    if (!validTypes.includes(rule.type)) {
      throw new LensConfigValidationError(
        `Invalid activation rule type at index ${index}`,
        { index, validTypes, received: rule.type }
      )
    }

    // Validate weight
    if (typeof rule.weight !== 'number' || rule.weight < 0 || rule.weight > 1) {
      throw new LensConfigValidationError(
        `Activation rule weight at index ${index} must be a number between 0 and 1`,
        { index, received: rule.weight }
      )
    }

    // Validate pattern for pattern-based rules
    if (['file_pattern', 'file_extension'].includes(rule.type)) {
      if (typeof rule.pattern !== 'string' || rule.pattern.length === 0) {
        throw new LensConfigValidationError(
          `Activation rule pattern at index ${index} must be a non-empty string`,
          { index, type: rule.type, received: rule.pattern }
        )
      }
    }
  })
}

/**
 * Validates query modifications array
 */
function validateQueryModifications(modifications: any[]): void {
  modifications.forEach((mod, index) => {
    if (!mod || typeof mod !== 'object') {
      throw new LensConfigValidationError(
        `Query modification at index ${index} must be an object`,
        { index, received: typeof mod }
      )
    }

    // Validate modification type
    const validTypes = ['add_condition', 'modify_depth', 'add_ordering', 'set_hint']
    if (!validTypes.includes(mod.type)) {
      throw new LensConfigValidationError(
        `Invalid query modification type at index ${index}`,
        { index, validTypes, received: mod.type }
      )
    }

    // Validate field for condition-based modifications
    if (mod.type === 'add_condition') {
      if (typeof mod.field !== 'string' || mod.field.length === 0) {
        throw new LensConfigValidationError(
          `Query modification field at index ${index} must be a non-empty string`,
          { index, type: mod.type, received: mod.field }
        )
      }

      // Validate operator
      const validOperators = ['equals', 'contains', 'starts_with', 'regex', 'in']
      if (!validOperators.includes(mod.operator)) {
        throw new LensConfigValidationError(
          `Invalid query modification operator at index ${index}`,
          { index, validOperators, received: mod.operator }
        )
      }
    }
  })
}

/**
 * Validates result transformations array
 */
function validateResultTransformations(transformations: any[]): void {
  transformations.forEach((transform, index) => {
    if (!transform || typeof transform !== 'object') {
      throw new LensConfigValidationError(
        `Result transformation at index ${index} must be an object`,
        { index, received: typeof transform }
      )
    }

    // Validate transformation type
    const validTypes = ['add_metadata', 'highlight', 'reorder', 'filter', 'group']
    if (!validTypes.includes(transform.type)) {
      throw new LensConfigValidationError(
        `Invalid result transformation type at index ${index}`,
        { index, validTypes, received: transform.type }
      )
    }

    // Validate key for metadata transformations
    if (transform.type === 'add_metadata') {
      if (typeof transform.key !== 'string' || transform.key.length === 0) {
        throw new LensConfigValidationError(
          `Result transformation key at index ${index} must be a non-empty string`,
          { index, type: transform.type, received: transform.key }
        )
      }
    }
  })
}

/**
 * Creates a default lens configuration with optional overrides
 *
 * @param overrides Partial configuration to override defaults
 * @returns Valid default lens configuration
 */
export function createDefaultLensConfig(overrides: Partial<LensConfig> = {}): LensConfig {
  const defaultConfig: LensConfig = {
    enabled: true,
    priority: 5,
    activationRules: [],
    queryModifications: [],
    resultTransformations: []
  }

  const merged = {
    ...defaultConfig,
    ...overrides
  }

  // Validate the merged configuration
  validateLensConfig(merged)

  return merged
}

/**
 * Merges two lens configurations safely
 *
 * Takes a base configuration and applies overrides from another configuration,
 * validating the result to ensure it's still a valid lens configuration.
 *
 * @param baseConfig Base configuration to start with
 * @param overrideConfig Configuration values to override
 * @returns Merged and validated configuration
 * @throws LensConfigValidationError if merged config is invalid
 */
export function mergeLensConfigs(
  baseConfig: LensConfig,
  overrideConfig: Partial<LensConfig>
): LensConfig {
  // Merge configurations (arrays are replaced, not concatenated)
  const merged: LensConfig = {
    ...baseConfig,
    ...overrideConfig
  }

  // Validate the merged result
  validateLensConfig(merged)

  return merged
}