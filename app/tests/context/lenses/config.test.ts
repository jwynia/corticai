/**
 * Test suite for Lens Configuration System
 *
 * This test suite validates the lens configuration validation, parsing, and
 * management functionality. Tests are written FIRST to define behavior.
 *
 * Tests cover:
 * - Configuration validation functions
 * - Lens configuration parsing
 * - Configuration error handling
 * - Default configuration generation
 */

import { describe, it, expect } from 'vitest'
import type {
  LensConfig,
  ActivationRule,
  QueryModification,
  ResultTransformation
} from '../../../src/context/lenses/types'

// Import the validation functions we'll implement
import {
  validateLensConfig,
  createDefaultLensConfig,
  mergeLensConfigs,
  LensConfigValidationError
} from '../../../src/context/lenses/config'

describe('Lens Configuration System', () => {
  const createValidLensConfig = (): LensConfig => ({
    enabled: true,
    priority: 5,
    activationRules: [
      {
        type: 'file_pattern',
        pattern: '**/*.test.ts',
        weight: 0.8
      }
    ],
    queryModifications: [
      {
        type: 'add_condition',
        field: 'type',
        operator: 'equals',
        value: 'test'
      }
    ],
    resultTransformations: [
      {
        type: 'add_metadata',
        key: 'relevance',
        value: 'high'
      }
    ]
  })

  describe('validateLensConfig', () => {
    it('should validate a correct lens configuration', () => {
      const validConfig = createValidLensConfig()
      expect(() => validateLensConfig(validConfig)).not.toThrow()
    })

    it('should require enabled property to be boolean', () => {
      const invalidConfigs = [
        { ...createValidLensConfig(), enabled: 'true' },
        { ...createValidLensConfig(), enabled: 1 },
        { ...createValidLensConfig(), enabled: null },
        { ...createValidLensConfig(), enabled: undefined }
      ]

      invalidConfigs.forEach((config, index) => {
        expect(() => validateLensConfig(config as any)).toThrow(
          LensConfigValidationError
        )
      })
    })

    it('should require priority to be a non-negative number', () => {
      const invalidConfigs = [
        { ...createValidLensConfig(), priority: -1 },
        { ...createValidLensConfig(), priority: 'high' },
        { ...createValidLensConfig(), priority: null },
        { ...createValidLensConfig(), priority: 1.5 } // Should be integer
      ]

      invalidConfigs.forEach(config => {
        expect(() => validateLensConfig(config as any)).toThrow(
          LensConfigValidationError
        )
      })
    })

    it('should validate activationRules array structure', () => {
      const invalidConfigs = [
        { ...createValidLensConfig(), activationRules: 'not an array' },
        { ...createValidLensConfig(), activationRules: null },
        {
          ...createValidLensConfig(),
          activationRules: [{ type: 'invalid_rule' }] // Missing required fields
        },
        {
          ...createValidLensConfig(),
          activationRules: [{
            type: 'file_pattern',
            pattern: 123, // Should be string
            weight: 0.5
          }]
        }
      ]

      invalidConfigs.forEach(config => {
        expect(() => validateLensConfig(config as any)).toThrow(
          LensConfigValidationError
        )
      })
    })

    it('should validate queryModifications array structure', () => {
      const invalidConfigs = [
        { ...createValidLensConfig(), queryModifications: 'not an array' },
        {
          ...createValidLensConfig(),
          queryModifications: [{ type: 'invalid_modification' }]
        },
        {
          ...createValidLensConfig(),
          queryModifications: [{
            type: 'add_condition',
            field: '', // Empty field
            operator: 'equals',
            value: 'test'
          }]
        }
      ]

      invalidConfigs.forEach(config => {
        expect(() => validateLensConfig(config as any)).toThrow(
          LensConfigValidationError
        )
      })
    })

    it('should validate resultTransformations array structure', () => {
      const invalidConfigs = [
        { ...createValidLensConfig(), resultTransformations: 'not an array' },
        {
          ...createValidLensConfig(),
          resultTransformations: [{ type: 'invalid_transformation' }]
        },
        {
          ...createValidLensConfig(),
          resultTransformations: [{
            type: 'add_metadata',
            key: null, // Should be string
            value: 'test'
          }]
        }
      ]

      invalidConfigs.forEach(config => {
        expect(() => validateLensConfig(config as any)).toThrow(
          LensConfigValidationError
        )
      })
    })

    it('should validate weight values in activation rules', () => {
      const invalidConfig = {
        ...createValidLensConfig(),
        activationRules: [{
          type: 'file_pattern',
          pattern: '**/*.ts',
          weight: 1.5 // Weight should be between 0 and 1
        }]
      }

      expect(() => validateLensConfig(invalidConfig)).toThrow(
        LensConfigValidationError
      )
    })

    it('should provide detailed error messages', () => {
      try {
        validateLensConfig({
          enabled: 'not a boolean',
          priority: -5,
          activationRules: [],
          queryModifications: [],
          resultTransformations: []
        } as any)
      } catch (error) {
        expect(error).toBeInstanceOf(LensConfigValidationError)
        expect(error.message).toContain('enabled must be a boolean')
      }
    })
  })

  describe('createDefaultLensConfig', () => {
    it('should create valid default configuration', () => {
      const defaultConfig = createDefaultLensConfig()

      expect(defaultConfig.enabled).toBe(true)
      expect(defaultConfig.priority).toBe(5)
      expect(Array.isArray(defaultConfig.activationRules)).toBe(true)
      expect(Array.isArray(defaultConfig.queryModifications)).toBe(true)
      expect(Array.isArray(defaultConfig.resultTransformations)).toBe(true)

      // Default config should pass validation
      expect(() => validateLensConfig(defaultConfig)).not.toThrow()
    })

    it('should create configuration with optional overrides', () => {
      const customConfig = createDefaultLensConfig({
        enabled: false,
        priority: 10
      })

      expect(customConfig.enabled).toBe(false)
      expect(customConfig.priority).toBe(10)
      expect(() => validateLensConfig(customConfig)).not.toThrow()
    })
  })

  describe('mergeLensConfigs', () => {
    it('should merge two valid configurations', () => {
      const baseConfig = createDefaultLensConfig()
      const overrideConfig: Partial<LensConfig> = {
        enabled: false,
        activationRules: [{
          type: 'file_pattern',
          pattern: '**/*.debug.ts',
          weight: 1.0
        }]
      }

      const mergedConfig = mergeLensConfigs(baseConfig, overrideConfig)

      expect(mergedConfig.enabled).toBe(false)
      expect(mergedConfig.priority).toBe(baseConfig.priority)
      expect(mergedConfig.activationRules).toHaveLength(1)
      expect(mergedConfig.activationRules[0].pattern).toBe('**/*.debug.ts')
    })

    it('should validate merged configuration', () => {
      const baseConfig = createDefaultLensConfig()
      const invalidOverride = {
        priority: -1 // Invalid priority
      }

      expect(() => mergeLensConfigs(baseConfig, invalidOverride)).toThrow(
        LensConfigValidationError
      )
    })

    it('should handle array merging correctly', () => {
      const baseConfig = createDefaultLensConfig({
        activationRules: [{
          type: 'file_pattern',
          pattern: '**/*.ts',
          weight: 0.5
        }]
      })

      const overrideConfig: Partial<LensConfig> = {
        activationRules: [{
          type: 'file_pattern',
          pattern: '**/*.test.ts',
          weight: 0.9
        }]
      }

      const mergedConfig = mergeLensConfigs(baseConfig, overrideConfig)

      // Arrays should be replaced, not concatenated
      expect(mergedConfig.activationRules).toHaveLength(1)
      expect(mergedConfig.activationRules[0].pattern).toBe('**/*.test.ts')
    })
  })

  describe('LensConfigValidationError', () => {
    it('should be a proper error class', () => {
      const error = new LensConfigValidationError('test error')
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(LensConfigValidationError)
      expect(error.name).toBe('LensConfigValidationError')
      expect(error.message).toBe('test error')
    })

    it('should support error details', () => {
      const details = {
        field: 'priority',
        value: -1,
        expected: 'non-negative number'
      }
      const error = new LensConfigValidationError('Invalid priority', details)

      expect(error.details).toEqual(details)
    })
  })

  describe('Configuration Edge Cases', () => {
    it('should handle empty arrays in configuration', () => {
      const configWithEmptyArrays: LensConfig = {
        enabled: true,
        priority: 0,
        activationRules: [],
        queryModifications: [],
        resultTransformations: []
      }

      expect(() => validateLensConfig(configWithEmptyArrays)).not.toThrow()
    })

    it('should handle maximum priority value', () => {
      const configWithMaxPriority: LensConfig = {
        enabled: true,
        priority: Number.MAX_SAFE_INTEGER,
        activationRules: [],
        queryModifications: [],
        resultTransformations: []
      }

      expect(() => validateLensConfig(configWithMaxPriority)).not.toThrow()
    })

    it('should reject non-object configurations', () => {
      const invalidConfigs = [
        null,
        undefined,
        'string',
        123,
        [],
        () => {}
      ]

      invalidConfigs.forEach(config => {
        expect(() => validateLensConfig(config as any)).toThrow(
          LensConfigValidationError
        )
      })
    })

    it('should handle missing required properties', () => {
      const incompleteConfigs = [
        { priority: 5, activationRules: [], queryModifications: [], resultTransformations: [] }, // missing enabled
        { enabled: true, activationRules: [], queryModifications: [], resultTransformations: [] }, // missing priority
        { enabled: true, priority: 5, queryModifications: [], resultTransformations: [] }, // missing activationRules
        { enabled: true, priority: 5, activationRules: [], resultTransformations: [] }, // missing queryModifications
        { enabled: true, priority: 5, activationRules: [], queryModifications: [] } // missing resultTransformations
      ]

      incompleteConfigs.forEach(config => {
        expect(() => validateLensConfig(config as any)).toThrow(
          LensConfigValidationError
        )
      })
    })
  })
})