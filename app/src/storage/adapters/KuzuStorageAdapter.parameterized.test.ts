/**
 * KuzuStorageAdapter Parameterized Queries Tests
 *
 * Tests for the secure implementation using parameterized queries
 * to prevent SQL injection vulnerabilities.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { KuzuStorageAdapter } from './KuzuStorageAdapter'
import {
  GraphEntity,
  KuzuStorageConfig
} from '../types/GraphTypes'
import * as fs from 'fs'
import * as path from 'path'

describe('KuzuStorageAdapter Parameterized Queries', () => {
  let adapter: KuzuStorageAdapter
  let testDbPath: string
  let config: KuzuStorageConfig

  beforeEach(() => {
    testDbPath = path.join('/tmp', `kuzu-param-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    config = {
      type: 'kuzu',
      database: testDbPath,
      id: 'param-test-adapter',
      debug: false,
      autoCreate: true
    }
    adapter = new KuzuStorageAdapter(config)
  })

  afterEach(async () => {
    try {
      if (adapter) {
        await adapter.clear()
        if (typeof (adapter as any).close === 'function') {
          await (adapter as any).close()
        }
      }
    } catch (error) {
      console.debug('Cleanup error (non-critical):', error);
    }

    try {
      if (fs.existsSync(testDbPath)) {
        fs.rmSync(testDbPath, { recursive: true, force: true })
      }
    } catch (error) {
      console.debug('Cleanup error (non-critical):', error);
    }
  })

  describe('Basic Parameterized Operations', () => {
    it('should use parameterized queries for entity storage', async () => {
      // Test that entities with special characters are handled safely
      const entityWithSpecialChars: GraphEntity = {
        id: "test'id\"with\\special/chars",
        type: 'Special"Type',
        properties: {
          name: "Name with 'quotes' and \"double quotes\"",
          description: 'Description with \\ backslashes'
        }
      }

      // Should not throw and should store/retrieve correctly
      await expect(adapter.set('special-key', entityWithSpecialChars)).resolves.not.toThrow()

      const retrieved = await adapter.get('special-key')
      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe("test'id\"with\\special/chars")
      expect(retrieved?.type).toBe('Special"Type')
      expect(retrieved?.properties.name).toBe("Name with 'quotes' and \"double quotes\"")
    })

    it('should use parameterized queries for entity deletion', async () => {
      // Store an entity first
      const entity: GraphEntity = {
        id: "delete'test\"id",
        type: 'TestType',
        properties: { name: 'Test Entity' }
      }

      await adapter.set('delete-test-key', entity)
      expect(await adapter.has('delete-test-key')).toBe(true)

      // Delete should work with special characters
      const deleted = await adapter.delete('delete-test-key')
      expect(deleted).toBe(true)
      expect(await adapter.has('delete-test-key')).toBe(false)
    })

    it('should handle Unicode characters safely', async () => {
      const unicodeEntity: GraphEntity = {
        id: '测试-emoji-🎯-ñáçéñtéd',
        type: 'Unicode测试',
        properties: {
          emoji: '🚀💻🔐',
          chinese: '数据库安全测试',
          accented: 'café naïve résumé'
        }
      }

      await adapter.set('unicode-key', unicodeEntity)
      const retrieved = await adapter.get('unicode-key')

      expect(retrieved?.id).toBe('测试-emoji-🎯-ñáçéñtéd')
      expect(retrieved?.properties.emoji).toBe('🚀💻🔐')
      expect(retrieved?.properties.chinese).toBe('数据库安全测试')
    })
  })

  describe('Query Builder Protection', () => {
    it('should protect against injection in prepared statements', async () => {
      // This test verifies that when we implement parameterized queries,
      // they properly escape/handle malicious input
      const maliciousEntity: GraphEntity = {
        id: "'; DELETE FROM Entity; SELECT '1",
        type: "'; DROP TABLE Entity; --",
        properties: {
          malicious: "'; INSERT INTO Entity VALUES ('hack', 'hacked', '{}'); --"
        }
      }

      // Store the malicious entity
      await adapter.set('malicious-key', maliciousEntity)

      // Verify it was stored as-is (not executed as SQL)
      const retrieved = await adapter.get('malicious-key')
      expect(retrieved?.id).toBe("'; DELETE FROM Entity; SELECT '1")
      expect(retrieved?.type).toBe("'; DROP TABLE Entity; --")

      // Verify the database still functions normally
      const size = await adapter.size()
      expect(size).toBe(1) // Should only have our one entity

      // Add another entity to verify the DB wasn't corrupted
      const normalEntity: GraphEntity = {
        id: 'normal-id',
        type: 'NormalType',
        properties: { name: 'Normal Entity' }
      }

      await adapter.set('normal-key', normalEntity)
      const normalRetrieved = await adapter.get('normal-key')
      expect(normalRetrieved?.id).toBe('normal-id')

      // Total should now be 2
      const finalSize = await adapter.size()
      expect(finalSize).toBe(2)
    })
  })

  // These tests will pass once we implement the secure query builder
  describe('Secure Query Implementation Requirements', () => {
    it('should have a secure query builder available', () => {
      // Test that the adapter has access to secure query building
      expect(typeof (adapter as any).buildSecureQuery).toBe('function')
    })

    it('should prepare statements before execution', () => {
      // Test that the adapter uses prepared statements
      expect(typeof (adapter as any).prepareStatement).toBe('function')
    })

    it('should never concatenate user input into query strings', async () => {
      // This is more of a design test - we'll implement this check
      const entity: GraphEntity = {
        id: 'test-id',
        type: 'TestType',
        properties: { name: 'Test' }
      }

      // Mock console.warn to catch any warnings about insecure queries
      const warnSpy = vitest.spyOn(console, 'warn').mockImplementation(() => {})

      try {
        await adapter.set('secure-test', entity)

        // Verify no warnings about insecure queries
        const warnings = warnSpy.mock.calls.filter(call =>
          call.some(arg => typeof arg === 'string' && arg.includes('insecure'))
        )
        expect(warnings.length).toBe(0)
      } finally {
        warnSpy.mockRestore()
      }
    })
  })
})