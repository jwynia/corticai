/**
 * Kuzu Query Helper Utilities
 *
 * Pure utility functions for Kuzu query operations.
 * These functions have no dependencies on external state and are highly unit testable.
 *
 * Design Principles:
 * - Pure functions only (no side effects)
 * - No external dependencies
 * - Easy to test in isolation
 * - Reusable across Kuzu adapters
 */

import { GraphEntity } from '../types/GraphTypes'

/**
 * Convert properties object to Kuzu MAP format string
 *
 * @param properties - Key-value pairs to format
 * @returns Kuzu MAP syntax string
 *
 * @example
 * formatProperties({ name: "Alice", age: 30 })
 * // Returns: "MAP(['name': 'Alice', 'age': '30'])"
 */
export function formatProperties(properties: Record<string, any>): string {
  const pairs = Object.entries(properties).map(([key, value]) => {
    const valueStr = typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : String(value)
    return `'${key}': '${valueStr}'`
  })
  return `MAP([${pairs.join(', ')}])`
}

/**
 * Parse properties from Kuzu MAP format
 *
 * @param mapValue - Raw MAP value from Kuzu query result
 * @returns Parsed properties object
 *
 * @remarks
 * Kuzu returns MAP values as JavaScript objects, so this is primarily
 * a validation and normalization function.
 */
export function parseProperties(mapValue: any): Record<string, any> {
  // This is a simplified implementation - in reality, Kuzu returns structured data
  if (!mapValue || typeof mapValue !== 'object') {
    return {}
  }

  try {
    // Kuzu MAP is returned as a JavaScript object
    return mapValue as Record<string, any>
  } catch {
    return {}
  }
}

/**
 * Safely escape a string for use in Kuzu queries
 *
 * @param str - String to escape
 * @returns Escaped string safe for query use
 *
 * @remarks
 * This is a temporary solution for queries that cannot use parameterized statements.
 * Prefer parameterized queries whenever possible for better security.
 *
 * @example
 * escapeString("O'Reilly")
 * // Returns: "O\\'Reilly"
 */
export function escapeString(str: string): string {
  // Escape backslashes first, then single quotes
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

/**
 * Extract and parse properties from a node or edge result
 *
 * @param data - Raw result data from Kuzu query
 * @param fieldName - Property field name to extract (default: 'data')
 * @returns Parsed properties object
 *
 * @remarks
 * Handles Kuzu's table-prefixed field names (e.g., "Entity.data", "Relationship.data")
 */
export function extractProperties(data: any, fieldName: string = 'data'): any {
  const value = data[`Entity.${fieldName}`] || data[`Relationship.${fieldName}`] || data[fieldName]
  if (typeof value === 'string') {
    try {
      return JSON.parse(value || '{}')
    } catch {
      return {}
    }
  }
  return value || {}
}

/**
 * Generate simple checksum for entity
 *
 * @param entity - Entity to generate checksum for
 * @returns Hexadecimal checksum string
 *
 * @remarks
 * Uses a simple hash algorithm for development.
 * In production, consider using a proper cryptographic hash (e.g., SHA-256).
 */
export function generateChecksum(entity: GraphEntity): string {
  const content = JSON.stringify({
    id: entity.id,
    type: entity.type,
    properties: entity.properties
  })
  // Simple hash - in production, use proper crypto hash
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(16)
}

/**
 * Generate storage metadata for entity
 *
 * @param entity - Entity to generate metadata for
 * @returns Storage metadata object with timestamp, version, and checksum
 */
export function generateStorageMetadata(entity: GraphEntity): any {
  const now = new Date()
  const existingStorage = entity._storage

  return {
    storedAt: now,
    version: existingStorage ? existingStorage.version + 1 : 1,
    checksum: generateChecksum(entity)
  }
}
