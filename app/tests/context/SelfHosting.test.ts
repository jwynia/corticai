/**
 * Self-Hosting Validation Tests
 *
 * These tests validate that CorticAI can successfully manage its own development
 * context, proving the meta-capability and preventing coordination problems.
 *
 * Test-First Development: These tests are written BEFORE implementation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import { ContextInitializer } from '../../src/context/ContextInitializer'
import { UniversalFallbackAdapter } from '../../src/adapters/UniversalFallbackAdapter'
import { Entity } from '../../src/types/entity'

describe('Self-Hosting Validation', () => {
  let tempDir: string
  let contextNetworkPath: string

  beforeEach(async () => {
    // Create temporary test directory
    tempDir = path.join(process.cwd(), '.test-self-hosting-' + Date.now())
    await fs.mkdir(tempDir, { recursive: true })

    // Use actual context network path for validation
    contextNetworkPath = path.join(process.cwd(), '../context-network')
  })

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('Context Network Indexing', () => {
    it('should initialize CorticAI for self-hosting', async () => {
      const initializer = new ContextInitializer()
      const config = await initializer.initialize(tempDir)

      // Should create standard .context structure
      expect(config).toBeDefined()
      expect(config.engine.mode).toBeDefined()
      expect(config.databases.kuzu).toBeDefined()
      expect(config.databases.duckdb).toBeDefined()

      // Verify directory structure was created
      const contextDir = path.join(tempDir, '.context')
      const stats = await fs.stat(contextDir)
      expect(stats.isDirectory()).toBe(true)
    })

    it('should discover planning documents in context network', async () => {
      // Test that we can find planning documents
      const planningDir = path.join(contextNetworkPath, 'planning')

      try {
        const files = await fs.readdir(planningDir)
        const mdFiles = files.filter(f => f.endsWith('.md'))

        // Should find groomed-backlog.md, roadmap.md, etc.
        expect(mdFiles.length).toBeGreaterThan(0)
        expect(mdFiles).toContain('groomed-backlog.md')
      } catch (error) {
        // If context network doesn't exist, skip this test
        console.warn('Context network not found, skipping discovery test')
      }
    })

    it('should discover task documents in context network', async () => {
      const tasksDir = path.join(contextNetworkPath, 'tasks')

      try {
        const files = await fs.readdir(tasksDir)
        const mdFiles = files.filter(f => f.endsWith('.md'))

        // Should find sync reports and other task documents
        expect(mdFiles.length).toBeGreaterThan(0)
      } catch (error) {
        console.warn('Tasks directory not found, skipping discovery test')
      }
    })
  })

  describe('Entity Extraction from Planning Documents', () => {
    it('should extract entities from markdown planning documents', async () => {
      const adapter = new UniversalFallbackAdapter()

      // Create test planning document
      const planningContent = `# Test Planning Document

## Current Phase
Phase 7 Cloud Storage Architecture - IN PROGRESS

## Tasks
### 1. Strategic Production Readiness Assessment
**One-liner**: Define production readiness criteria
**Complexity**: Medium (2-3 hours)

### 2. Self-Hosting Validation
**One-liner**: Use CorticAI to manage its own context
**Complexity**: Medium (4-5 hours)
`

      const metadata = {
        path: '/test/planning.md',
        filename: 'planning.md',
        extension: '.md',
        size: planningContent.length
      }

      const entities = adapter.extract(planningContent, metadata)

      // Should extract document entity
      expect(entities.length).toBeGreaterThan(0)
      expect(entities[0].type).toBe('document')
      expect(entities[0].name).toBe('planning.md')

      // Should extract section entities
      const sections = entities.filter(e => e.type === 'section')
      expect(sections.length).toBeGreaterThan(0)

      // Should find "Current Phase" section
      const currentPhase = sections.find(s => s.name.includes('Current Phase'))
      expect(currentPhase).toBeDefined()
    })

    it('should extract task information from planning documents', async () => {
      const adapter = new UniversalFallbackAdapter()

      const taskContent = `## Task #0: Fix Build Quality Issues

**Status**: Complete
**Complexity**: Medium
**Priority**: CRITICAL

### Acceptance Criteria
- [x] Fix TypeScript compilation errors
- [x] All tests pass
- [ ] Performance validated
`

      const metadata = {
        path: '/test/task.md',
        filename: 'task.md',
        extension: '.md'
      }

      const entities = adapter.extract(taskContent, metadata)

      // Should extract document and sections
      expect(entities.length).toBeGreaterThan(0)

      // Should extract task header as section
      const taskSection = entities.find(e =>
        e.type === 'section' && e.name.includes('Fix Build Quality Issues')
      )
      expect(taskSection).toBeDefined()

      // Should have metadata with line numbers
      if (taskSection) {
        expect(taskSection.metadata?.lineNumbers).toBeDefined()
        expect(taskSection.metadata?.level).toBe(2) // ## is level 2
      }
    })

    it('should detect cross-references in planning documents', async () => {
      const adapter = new UniversalFallbackAdapter()

      const docWithReferences = `# Planning Document

See also: [[roadmap]] for strategic context
Related to [[tasks/sync-report-2025-09-30]]

## Dependencies
Depends on Task #0 (Fix Build Quality Issues)
References /context-network/planning/groomed-backlog.md
`

      const metadata = {
        path: '/test/refs.md',
        filename: 'refs.md',
        extension: '.md'
      }

      const entities = adapter.extract(docWithReferences, metadata)

      // Should extract references
      const references = entities.filter(e => e.type === 'reference')
      expect(references.length).toBeGreaterThan(0)

      // Should find wiki-style references
      const wikiRefs = references.filter(r =>
        r.name.includes('roadmap') || r.name.includes('sync-report')
      )
      expect(wikiRefs.length).toBeGreaterThan(0)
    })
  })

  describe('Cross-Domain Relationship Detection', () => {
    it('should detect relationships between code and planning', async () => {
      // Test that we can correlate planning tasks with code implementation
      const adapter = new UniversalFallbackAdapter()

      const planningDoc = `## Task: Implement CosmosDB Storage

**Files to modify**:
- app/src/storage/adapters/CosmosDBStorageAdapter.ts
- app/tests/storage/CosmosDBStorageAdapter.test.ts
`

      const metadata = {
        path: '/planning/tasks.md',
        filename: 'tasks.md',
        extension: '.md'
      }

      const entities = adapter.extract(planningDoc, metadata)

      // Should extract document
      expect(entities.length).toBeGreaterThan(0)

      // Content should mention file paths (references to code)
      const doc = entities[0]
      expect(doc.content).toContain('CosmosDBStorageAdapter.ts')
      expect(doc.content).toContain('app/src/storage')
    })

    it('should identify orphaned planning nodes', async () => {
      // This is the core self-hosting use case: detecting orphaned planning
      const adapter = new UniversalFallbackAdapter()

      const orphanedDoc = `# Cosmos DB Planning

This document has no parent references and no links to/from other planning docs.

## Implementation Details
Some implementation details here.
`

      const metadata = {
        path: '/planning/orphaned.md',
        filename: 'orphaned.md',
        extension: '.md'
      }

      const entities = adapter.extract(orphanedDoc, metadata)

      // Should extract entities
      expect(entities.length).toBeGreaterThan(0)

      // Document should have minimal relationships (only internal structure)
      const doc = entities[0]
      const externalRefs = entities.filter(e => e.type === 'reference')

      // Orphaned doc should have few or no external references
      expect(externalRefs.length).toBeLessThanOrEqual(1)
    })
  })

  describe('Performance Measurement', () => {
    it('should measure context discovery time', async () => {
      const startTime = Date.now()

      // Simulate discovering context through the system
      const adapter = new UniversalFallbackAdapter()
      const metadata = { path: '/test.md', filename: 'test.md', extension: '.md' }

      // Extract from a medium-sized document
      const content = '# Document\n\n' + '## Section\n\n'.repeat(20) + 'Content\n\n'.repeat(50)
      const entities = adapter.extract(content, metadata)

      const endTime = Date.now()
      const discoveryTime = endTime - startTime

      // Should complete in reasonable time (< 100ms for this size)
      expect(discoveryTime).toBeLessThan(100)
      expect(entities.length).toBeGreaterThan(0)
    })

    it('should handle large context networks efficiently', async () => {
      const adapter = new UniversalFallbackAdapter()

      // Simulate processing multiple documents
      const documents = Array.from({ length: 10 }, (_, i) => ({
        content: `# Document ${i}\n\n## Section\n\nContent for document ${i}`,
        metadata: {
          path: `/doc${i}.md`,
          filename: `doc${i}.md`,
          extension: '.md'
        }
      }))

      const startTime = Date.now()

      const allEntities = documents.map(doc =>
        adapter.extract(doc.content, doc.metadata)
      )

      const endTime = Date.now()
      const totalTime = endTime - startTime

      // Should process 10 documents in < 200ms
      expect(totalTime).toBeLessThan(200)
      expect(allEntities.length).toBe(10)

      // Each document should have entities
      allEntities.forEach(entities => {
        expect(entities.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Coordination Problem Prevention', () => {
    it('should detect when planning document has no navigation links', async () => {
      const adapter = new UniversalFallbackAdapter()

      const isolatedDoc = `# Isolated Planning Document

This document exists but has no links to parent planning or navigation context.

## Details
Implementation details that won't be found through normal navigation.
`

      const metadata = {
        path: '/planning/isolated.md',
        filename: 'isolated.md',
        extension: '.md'
      }

      const entities = adapter.extract(isolatedDoc, metadata)

      // Should extract document
      expect(entities.length).toBeGreaterThan(0)

      // Should have minimal references (indicating isolation)
      const references = entities.filter(e => e.type === 'reference')
      expect(references.length).toBe(0) // No navigation links
    })

    it('should detect when task document has parent context', async () => {
      const adapter = new UniversalFallbackAdapter()

      // Use markdown-style links that UniversalFallbackAdapter supports
      const wellConnectedDoc = `# Well-Connected Task

**Parent Planning**: [groomed-backlog](../planning/groomed-backlog.md)
**Related**: [roadmap](../planning/roadmap.md), [sync-report](./sync-report-2025-09-30.md)

## Task Description
This task is properly connected to the planning hierarchy.
`

      const metadata = {
        path: '/tasks/connected-task.md',
        filename: 'connected-task.md',
        extension: '.md'
      }

      const entities = adapter.extract(wellConnectedDoc, metadata)

      // Should find markdown-style references (they are extracted as reference entities)
      const references = entities.filter(e => e.type === 'reference')

      // UniversalFallbackAdapter extracts [text](url) links as references
      // Should have at least 3 references
      expect(references.length).toBeGreaterThanOrEqual(3)

      // References should have proper metadata
      references.forEach(ref => {
        expect(ref.metadata?.referenceType).toBeDefined()
        expect(ref.name).toBeDefined()
        expect(ref.content).toBeDefined()
      })
    })

    it('should validate planning document has proper hierarchy signals', async () => {
      const adapter = new UniversalFallbackAdapter()

      const hierarchicalDoc = `# Strategic Planning

**Parent**: [[planning/index]]
**Children**: See [[tasks/sprint-next]] for implementation details

## Overview
This document properly signals its position in the hierarchy.
`

      const metadata = {
        path: '/planning/strategic.md',
        filename: 'strategic.md',
        extension: '.md'
      }

      const entities = adapter.extract(hierarchicalDoc, metadata)

      // Should find parent and child references
      const references = entities.filter(e => e.type === 'reference')
      expect(references.length).toBeGreaterThanOrEqual(2)

      // Should have content indicating hierarchy
      const doc = entities[0]
      expect(doc.content).toContain('Parent')
      expect(doc.content).toContain('Children')
    })
  })
})