/**
 * Self-Hosting Example
 *
 * Demonstrates how to configure CorticAI to manage its own development context,
 * validating the system's meta-capabilities and preventing coordination problems.
 *
 * This is a practical example of using CorticAI to solve the exact problems
 * it was designed to address - managing complex, distributed context across
 * planning documents, code, and task tracking.
 */

import * as path from 'path'
import * as fs from 'fs/promises'
import { ContextInitializer } from '../context/ContextInitializer'
import { UniversalFallbackAdapter } from '../adapters/UniversalFallbackAdapter'
import type { Entity } from '../types/entity'

/**
 * Configuration for self-hosting CorticAI
 */
export interface SelfHostingConfig {
  /** Path to the context network directory */
  contextNetworkPath: string
  /** Path where CorticAI's .context will be created */
  projectRoot: string
  /** Whether to include code files in analysis */
  includeCode: boolean
  /** Whether to include planning documents */
  includePlanning: boolean
  /** Whether to include task documents */
  includeTasks: boolean
}

/**
 * Self-Hosting Manager
 *
 * Manages the configuration and execution of CorticAI analyzing its own
 * development context.
 */
export class SelfHostingManager {
  private config: SelfHostingConfig
  private adapter: UniversalFallbackAdapter

  constructor(config: Partial<SelfHostingConfig> = {}) {
    const projectRoot = process.cwd()

    this.config = {
      contextNetworkPath: path.join(projectRoot, '../context-network'),
      projectRoot: projectRoot,
      includeCode: true,
      includePlanning: true,
      includeTasks: true,
      ...config
    }

    this.adapter = new UniversalFallbackAdapter()
  }

  /**
   * Initialize CorticAI for self-hosting
   */
  async initialize(): Promise<void> {
    const initializer = new ContextInitializer()
    await initializer.initialize(this.config.projectRoot)
    console.log('✅ CorticAI initialized for self-hosting')
  }

  /**
   * Analyze planning documents in the context network
   */
  async analyzePlanningDocuments(): Promise<Entity[]> {
    if (!this.config.includePlanning) {
      return []
    }

    const planningDir = path.join(this.config.contextNetworkPath, 'planning')
    const allEntities: Entity[] = []

    try {
      const files = await fs.readdir(planningDir)
      const mdFiles = files.filter(f => f.endsWith('.md'))

      console.log(`📄 Found ${mdFiles.length} planning documents`)

      for (const file of mdFiles) {
        const filePath = path.join(planningDir, file)
        const content = await fs.readFile(filePath, 'utf-8')

        const entities = this.adapter.extract(content, {
          path: filePath,
          filename: file,
          extension: '.md',
          size: content.length
        })

        allEntities.push(...entities)
        console.log(`  ✓ ${file}: ${entities.length} entities extracted`)
      }

      return allEntities
    } catch (error) {
      console.warn(`⚠️  Planning directory not found: ${planningDir}`)
      return []
    }
  }

  /**
   * Analyze task documents in the context network
   */
  async analyzeTaskDocuments(): Promise<Entity[]> {
    if (!this.config.includeTasks) {
      return []
    }

    const tasksDir = path.join(this.config.contextNetworkPath, 'tasks')
    const allEntities: Entity[] = []

    try {
      const files = await fs.readdir(tasksDir, { recursive: true })
      const mdFiles = files.filter(f => typeof f === 'string' && f.endsWith('.md')) as string[]

      console.log(`📋 Found ${mdFiles.length} task documents`)

      for (const file of mdFiles) {
        const filePath = path.join(tasksDir, file)

        try {
          const stats = await fs.stat(filePath)
          if (!stats.isFile()) continue

          const content = await fs.readFile(filePath, 'utf-8')

          const entities = this.adapter.extract(content, {
            path: filePath,
            filename: path.basename(file),
            extension: '.md',
            size: content.length
          })

          allEntities.push(...entities)
          console.log(`  ✓ ${file}: ${entities.length} entities extracted`)
        } catch (err) {
          // Skip files that can't be read
          continue
        }
      }

      return allEntities
    } catch (error) {
      console.warn(`⚠️  Tasks directory not found: ${tasksDir}`)
      return []
    }
  }

  /**
   * Detect orphaned planning nodes
   *
   * Finds planning documents that have no navigation links to/from other
   * planning documents, which can lead to coordination failures.
   */
  detectOrphanedNodes(entities: Entity[]): Entity[] {
    const documents = entities.filter(e => e.type === 'document')
    const orphaned: Entity[] = []

    for (const doc of documents) {
      // Find references in this document
      const docEntities = entities.filter(e =>
        e.relationships?.some(r => r.target === doc.id)
      )

      const references = docEntities.filter(e => e.type === 'reference')

      // If document has few or no references, it might be orphaned
      if (references.length === 0) {
        orphaned.push(doc)
      }
    }

    return orphaned
  }

  /**
   * Generate self-hosting report
   */
  async generateReport(): Promise<string> {
    const planningEntities = await this.analyzePlanningDocuments()
    const taskEntities = await this.analyzeTaskDocuments()
    const allEntities = [...planningEntities, ...taskEntities]

    const orphanedNodes = this.detectOrphanedNodes(allEntities)

    const report = `
# CorticAI Self-Hosting Validation Report

## Summary
- **Planning Documents Analyzed**: ${planningEntities.filter(e => e.type === 'document').length}
- **Task Documents Analyzed**: ${taskEntities.filter(e => e.type === 'document').length}
- **Total Entities Extracted**: ${allEntities.length}
- **Sections**: ${allEntities.filter(e => e.type === 'section').length}
- **References**: ${allEntities.filter(e => e.type === 'reference').length}
- **Orphaned Nodes Detected**: ${orphanedNodes.length}

## Orphaned Planning Nodes

${orphanedNodes.length === 0
  ? '✅ No orphaned nodes detected - excellent navigation structure!'
  : orphanedNodes.map(n => `- ⚠️  ${n.name} (no navigation links)`).join('\n')
}

## Entity Type Distribution

${this.generateEntityDistribution(allEntities)}

## Coordination Problem Prevention

${orphanedNodes.length === 0
  ? '✅ CorticAI successfully prevents the orphaned planning problem it was designed to solve.'
  : `⚠️ Found ${orphanedNodes.length} orphaned nodes that could lead to coordination failures.`
}

## Recommendations

${this.generateRecommendations(orphanedNodes)}

---
Generated: ${new Date().toISOString()}
`

    return report
  }

  private generateEntityDistribution(entities: Entity[]): string {
    const distribution: Record<string, number> = {}

    for (const entity of entities) {
      distribution[entity.type] = (distribution[entity.type] || 0) + 1
    }

    return Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `- **${type}**: ${count}`)
      .join('\n')
  }

  private generateRecommendations(orphanedNodes: Entity[]): string {
    if (orphanedNodes.length === 0) {
      return `
✅ Current planning structure is well-connected:
- All documents have proper navigation links
- Hierarchy is properly signaled
- Fresh agents can discover context through navigation
`
    }

    return `
⚠️ To prevent coordination failures:
1. Add navigation links to orphaned documents
2. Establish parent-child relationships
3. Update planning indexes to reference orphaned content
4. Ensure discoverable through normal navigation hierarchy

Orphaned documents found:
${orphanedNodes.map(n => `- ${n.name}`).join('\n')}
`
  }
}

/**
 * Example: Run self-hosting validation
 */
export async function runSelfHostingValidation() {
  console.log('🚀 Starting CorticAI Self-Hosting Validation\n')

  const manager = new SelfHostingManager()

  // Initialize CorticAI
  await manager.initialize()

  // Generate validation report
  const report = await manager.generateReport()

  console.log('\n' + report)

  return report
}

// Allow running directly
if (require.main === module) {
  runSelfHostingValidation().catch(console.error)
}