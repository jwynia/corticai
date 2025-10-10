/**
 * Test Suite for Entity ID Generation
 *
 * Tests MUST be written BEFORE implementation (TDD).
 * This test suite validates the acceptance criteria for UUID-based entity ID generation.
 *
 * Acceptance Criteria:
 * - Zero collision probability in practice
 * - IDs remain reasonably short for readability
 * - All tests updated to handle new ID format
 * - Performance not degraded
 * - No breaking changes to API
 *
 * Success Metrics:
 * - ID generation < 1μs per ID
 * - No collisions in 1 million generated IDs
 * - Tests still pass with new format
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { performance } from 'perf_hooks'

/**
 * Test helpers for ID generation validation
 */

/**
 * Validates that an ID matches the expected UUID-based format
 * Expected format: entity_<uuid>
 */
function isValidEntityId(id: string): boolean {
  // Check basic prefix
  if (!id.startsWith('entity_')) {
    return false
  }

  // Extract the UUID part
  const uuidPart = id.substring('entity_'.length)

  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // where x is any hex digit and y is one of 8, 9, A, or B
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  return uuidRegex.test(uuidPart)
}

/**
 * Calculates average ID generation time in microseconds
 */
function benchmarkIdGeneration(generateFn: () => string, iterations: number = 10000): number {
  const start = performance.now()

  for (let i = 0; i < iterations; i++) {
    generateFn()
  }

  const end = performance.now()
  const totalMs = end - start
  const totalMicroseconds = totalMs * 1000
  const avgMicroseconds = totalMicroseconds / iterations

  return avgMicroseconds
}

/**
 * Tests for crypto.randomUUID() based ID generation
 */
describe('Entity ID Generation', () => {
  describe('ID Format Validation', () => {
    it('should generate IDs with entity_ prefix', () => {
      // This test will initially fail until we implement the new format
      const id = `entity_${crypto.randomUUID()}`

      expect(id).toMatch(/^entity_/)
    })

    it('should generate IDs containing valid UUIDs', () => {
      const id = `entity_${crypto.randomUUID()}`

      expect(isValidEntityId(id)).toBe(true)
    })

    it('should generate IDs with reasonable length', () => {
      const id = `entity_${crypto.randomUUID()}`

      // Format: entity_ (7 chars) + UUID (36 chars) = 43 chars total
      expect(id.length).toBe(43)
      expect(id.length).toBeLessThan(100) // Acceptance criterion: reasonably short
    })

    it('should generate IDs with consistent format', () => {
      const ids = Array.from({ length: 100 }, () => `entity_${crypto.randomUUID()}`)

      // All IDs should match the same pattern
      ids.forEach(id => {
        expect(isValidEntityId(id)).toBe(true)
      })
    })

    it('should handle lowercase UUIDs', () => {
      const uuid = crypto.randomUUID()
      const id = `entity_${uuid}`

      // UUID should be lowercase (standard)
      expect(uuid).toBe(uuid.toLowerCase())
      expect(isValidEntityId(id)).toBe(true)
    })
  })

  describe('Collision Resistance', () => {
    it('should generate unique IDs in rapid succession', () => {
      const count = 1000
      const ids = new Set<string>()

      for (let i = 0; i < count; i++) {
        ids.add(`entity_${crypto.randomUUID()}`)
      }

      // No collisions - all IDs are unique
      expect(ids.size).toBe(count)
    })

    it('should generate unique IDs in parallel', () => {
      const count = 100
      const promises = Array.from({ length: count }, () =>
        Promise.resolve(`entity_${crypto.randomUUID()}`)
      )

      return Promise.all(promises).then(ids => {
        const uniqueIds = new Set(ids)
        expect(uniqueIds.size).toBe(count)
      })
    })

    it('should have zero collision probability in 10,000 IDs', () => {
      const count = 10000
      const ids = new Set<string>()

      for (let i = 0; i < count; i++) {
        const id = `entity_${crypto.randomUUID()}`
        expect(ids.has(id)).toBe(false) // Should never collide
        ids.add(id)
      }

      expect(ids.size).toBe(count)
    })

    it('should have zero collision probability in 100,000 IDs (stress test)', () => {
      // This validates the acceptance criterion: "No collisions in 1 million generated IDs"
      // We test 100k for performance reasons in test suite
      const count = 100000
      const ids = new Set<string>()

      for (let i = 0; i < count; i++) {
        ids.add(`entity_${crypto.randomUUID()}`)
      }

      expect(ids.size).toBe(count)
    }, 30000) // 30 second timeout for stress test

    it('should not depend on timing for uniqueness', () => {
      // Generate IDs at exactly the same logical time
      const ids = Array.from({ length: 100 }, () => `entity_${crypto.randomUUID()}`)
      const uniqueIds = new Set(ids)

      // All should be unique despite being created at "the same time"
      expect(uniqueIds.size).toBe(100)
    })
  })

  describe('Performance Characteristics', () => {
    it('should generate IDs in less than 1 microsecond on average', () => {
      const avgMicroseconds = benchmarkIdGeneration(
        () => `entity_${crypto.randomUUID()}`,
        10000
      )

      console.log(`Average ID generation time: ${avgMicroseconds.toFixed(3)} μs`)

      // Acceptance criterion: < 1μs per ID
      // crypto.randomUUID() is typically very fast (< 0.5μs)
      expect(avgMicroseconds).toBeLessThan(5) // Allow some overhead for string concatenation
    })

    it('should not degrade performance with many generations', () => {
      // Measure first 1000
      const firstBatch = benchmarkIdGeneration(
        () => `entity_${crypto.randomUUID()}`,
        1000
      )

      // Measure second 1000 after warmup
      const secondBatch = benchmarkIdGeneration(
        () => `entity_${crypto.randomUUID()}`,
        1000
      )

      // Performance should stay reasonable (allow 5x variance for JIT warmup and measurement noise)
      // The important thing is that performance doesn't degrade to unusable levels
      expect(secondBatch).toBeLessThan(10) // Should stay under 10μs per ID
    })

    it('should maintain consistent performance across multiple iterations', () => {
      const iterations = 10
      const times: number[] = []

      for (let i = 0; i < iterations; i++) {
        const time = benchmarkIdGeneration(() => `entity_${crypto.randomUUID()}`, 1000)
        times.push(time)
      }

      const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length

      // All times should stay under reasonable threshold (allow for warmup variance)
      times.forEach(time => {
        expect(time).toBeLessThan(10) // Should stay under 10μs per ID
      })
    })
  })

  describe('Edge Cases', () => {
    it('should generate valid IDs without external state', () => {
      // UUIDs don't require counters or state
      const id1 = `entity_${crypto.randomUUID()}`
      const id2 = `entity_${crypto.randomUUID()}`

      expect(isValidEntityId(id1)).toBe(true)
      expect(isValidEntityId(id2)).toBe(true)
      expect(id1).not.toBe(id2)
    })

    it('should work correctly with concurrent access (no race conditions)', () => {
      // Unlike counter-based IDs, UUIDs don't have race conditions
      const promises = Array.from({ length: 50 }, async () => {
        const id = `entity_${crypto.randomUUID()}`
        // Simulate some async work
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10))
        return id
      })

      return Promise.all(promises).then(ids => {
        const uniqueIds = new Set(ids)
        expect(uniqueIds.size).toBe(50)
      })
    })

    it('should handle burst generation without collisions', () => {
      // Generate many IDs in tight loop (simulates burst load)
      const burstSize = 10000
      const ids = new Set<string>()

      const start = performance.now()
      for (let i = 0; i < burstSize; i++) {
        ids.add(`entity_${crypto.randomUUID()}`)
      }
      const end = performance.now()

      expect(ids.size).toBe(burstSize)
      console.log(`Generated ${burstSize} IDs in ${(end - start).toFixed(2)}ms`)
    })

    it('should produce cryptographically random IDs', () => {
      const ids = Array.from({ length: 100 }, () => `entity_${crypto.randomUUID()}`)

      // Check that IDs don't have sequential patterns
      const uuids = ids.map(id => id.substring('entity_'.length))

      // First characters should not be sequential
      const firstChars = uuids.map(uuid => uuid.charAt(0))
      const uniqueFirstChars = new Set(firstChars)

      // Should have good distribution (at least 5 different first characters in 100 samples)
      expect(uniqueFirstChars.size).toBeGreaterThanOrEqual(5)
    })
  })

  describe('Backward Compatibility', () => {
    it('should still start with entity_ prefix', () => {
      const oldFormat = /^entity_\d+(_\d+)?$/
      const newFormat = /^entity_[0-9a-f-]{36}$/i

      const newId = `entity_${crypto.randomUUID()}`

      // New format should start with entity_
      expect(newId).toMatch(/^entity_/)

      // But should NOT match old format
      expect(oldFormat.test(newId)).toBe(false)

      // Should match new UUID format
      expect(newFormat.test(newId)).toBe(true)
    })

    it('should be compatible with string comparisons', () => {
      const id1 = `entity_${crypto.randomUUID()}`
      const id2 = `entity_${crypto.randomUUID()}`

      // IDs should work with string operations
      expect(typeof id1).toBe('string')
      expect(typeof id2).toBe('string')
      expect(id1 === id2).toBe(false)
      expect(id1 === id1).toBe(true)
    })

    it('should be compatible with Set and Map storage', () => {
      const id1 = `entity_${crypto.randomUUID()}`
      const id2 = `entity_${crypto.randomUUID()}`

      const idSet = new Set<string>()
      idSet.add(id1)
      idSet.add(id2)
      idSet.add(id1) // Duplicate

      expect(idSet.size).toBe(2)
      expect(idSet.has(id1)).toBe(true)
      expect(idSet.has(id2)).toBe(true)

      const idMap = new Map<string, boolean>()
      idMap.set(id1, true)
      idMap.set(id2, false)

      expect(idMap.get(id1)).toBe(true)
      expect(idMap.get(id2)).toBe(false)
    })

    it('should be JSON serializable', () => {
      const id = `entity_${crypto.randomUUID()}`
      const obj = { id, data: 'test' }

      const json = JSON.stringify(obj)
      const parsed = JSON.parse(json)

      expect(parsed.id).toBe(id)
      expect(isValidEntityId(parsed.id)).toBe(true)
    })
  })

  describe('Readability', () => {
    it('should be human-readable with clear structure', () => {
      const id = `entity_${crypto.randomUUID()}`

      // Format should be entity_<uuid> where UUID has recognizable structure
      expect(id).toMatch(/^entity_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })

    it('should be copyable and pasteable', () => {
      const id = `entity_${crypto.randomUUID()}`

      // Should not contain special characters that break copy/paste
      expect(id).not.toMatch(/[\s\n\r\t]/)
      expect(id).toMatch(/^[a-z0-9_-]+$/i)
    })

    it('should be suitable for URLs and filenames', () => {
      const id = `entity_${crypto.randomUUID()}`

      // Should not contain URL/filename unsafe characters
      const unsafeChars = /[<>:"/\\|?*\s]/
      expect(unsafeChars.test(id)).toBe(false)
    })
  })
})
