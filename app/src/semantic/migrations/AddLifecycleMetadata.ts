/**
 * Migration: Add Lifecycle Metadata to Existing Documents
 *
 * This migration script enriches existing documents in the context network
 * with lifecycle metadata and semantic block extraction.
 *
 * Usage:
 * ```bash
 * npm run migrate:lifecycle -- --path ./context-network
 * ```
 *
 * @see context-network/planning/semantic-processing-implementation/README.md
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import type { Entity } from '../../types/entity'
import { SemanticEnrichmentProcessor } from '../SemanticEnrichmentProcessor'
import type { EnrichmentResult } from '../SemanticEnrichmentProcessor'

/**
 * Migration configuration
 */
export interface MigrationConfig {
  /** Root directory to scan */
  rootPath: string

  /** File patterns to include (default: all markdown files) */
  includePatterns?: string[]

  /** Directories to exclude (default: node_modules and .git) */
  excludeDirs?: string[]

  /** Whether to write changes back to storage (default: false - dry run) */
  dryRun?: boolean

  /** Whether to overwrite existing lifecycle metadata (default: false) */
  overwrite?: boolean

  /** Whether to show verbose output (default: true) */
  verbose?: boolean

  /** Custom enrichment processor config */
  enrichmentConfig?: any
}

/**
 * Migration result summary
 */
export interface MigrationSummary {
  /** Total files scanned */
  filesScanned: number

  /** Files that were enriched */
  filesEnriched: number

  /** Files skipped (already enriched) */
  filesSkipped: number

  /** Files with errors */
  filesWithErrors: number

  /** Total lifecycle metadata added */
  lifecycleAdded: number

  /** Total semantic blocks extracted */
  blocksExtracted: number

  /** Lifecycle state distribution */
  lifecycleDistribution: Record<string, number>

  /** Total warnings */
  totalWarnings: number

  /** Error details */
  errors: Array<{ file: string; error: string }>

  /** Warnings */
  warnings: Array<{ file: string; warning: string }>
}

/**
 * Lifecycle Metadata Migration
 *
 * Scans existing documents and enriches them with lifecycle metadata
 * and semantic block extraction.
 */
export class LifecycleMetadataMigration {
  private processor: SemanticEnrichmentProcessor
  private config: Required<MigrationConfig>

  constructor(config: MigrationConfig) {
    this.processor = new SemanticEnrichmentProcessor(config.enrichmentConfig)

    this.config = {
      rootPath: config.rootPath,
      includePatterns: config.includePatterns || ['**/*.md'],
      excludeDirs: config.excludeDirs || ['node_modules', '.git', 'dist', 'build'],
      dryRun: config.dryRun ?? true, // Default to dry run for safety
      overwrite: config.overwrite ?? false,
      verbose: config.verbose ?? true,
      enrichmentConfig: config.enrichmentConfig,
    }
  }

  /**
   * Run the migration
   *
   * @returns Migration summary
   */
  async run(): Promise<MigrationSummary> {
    const summary: MigrationSummary = {
      filesScanned: 0,
      filesEnriched: 0,
      filesSkipped: 0,
      filesWithErrors: 0,
      lifecycleAdded: 0,
      blocksExtracted: 0,
      lifecycleDistribution: {},
      totalWarnings: 0,
      errors: [],
      warnings: [],
    }

    this.log('Starting lifecycle metadata migration...')
    this.log(`Root path: ${this.config.rootPath}`)
    this.log(`Dry run: ${this.config.dryRun}`)
    this.log('')

    try {
      const files = await this.scanDirectory(this.config.rootPath)
      this.log(`Found ${files.length} markdown files\n`)

      for (const file of files) {
        try {
          const result = await this.processFile(file)

          if (result) {
            summary.filesEnriched++

            if (result.hasLifecycle) {
              summary.lifecycleAdded++

              const state = result.entity.metadata?.lifecycle?.state
              if (state) {
                summary.lifecycleDistribution[state] =
                  (summary.lifecycleDistribution[state] || 0) + 1
              }
            }

            if (result.hasSemanticBlocks) {
              summary.blocksExtracted += result.blockCount
            }

            summary.totalWarnings += result.warnings.length

            result.warnings.forEach(warning => {
              summary.warnings.push({ file, warning })
            })
          } else {
            summary.filesSkipped++
          }

          summary.filesScanned++
        } catch (error) {
          summary.filesWithErrors++
          summary.errors.push({
            file,
            error: error instanceof Error ? error.message : String(error),
          })

          this.log(`  ERROR: ${error instanceof Error ? error.message : error}`, 'error')
        }
      }
    } catch (error) {
      this.log(`\nMigration failed: ${error}`, 'error')
      throw error
    }

    this.log('\n' + '='.repeat(60))
    this.log('Migration Summary')
    this.log('='.repeat(60))
    this.log(`Files scanned: ${summary.filesScanned}`)
    this.log(`Files enriched: ${summary.filesEnriched}`)
    this.log(`Files skipped: ${summary.filesSkipped}`)
    this.log(`Files with errors: ${summary.filesWithErrors}`)
    this.log(`Lifecycle metadata added: ${summary.lifecycleAdded}`)
    this.log(`Semantic blocks extracted: ${summary.blocksExtracted}`)
    this.log(`Total warnings: ${summary.totalWarnings}`)
    this.log('')
    this.log('Lifecycle Distribution:')

    Object.entries(summary.lifecycleDistribution)
      .sort((a, b) => b[1] - a[1])
      .forEach(([state, count]) => {
        this.log(`  ${state}: ${count}`)
      })

    if (summary.errors.length > 0) {
      this.log('\nErrors:')
      summary.errors.forEach(({ file, error }) => {
        this.log(`  ${file}: ${error}`, 'error')
      })
    }

    if (this.config.dryRun) {
      this.log('\n⚠️  DRY RUN - No changes were written')
      this.log('Run with --no-dry-run to apply changes')
    }

    return summary
  }

  /**
   * Process a single file
   */
  private async processFile(filePath: string): Promise<EnrichmentResult | null> {
    this.log(`Processing: ${filePath}`)

    // Read file content
    const content = await fs.readFile(filePath, 'utf-8')

    // Create entity from file
    const entity: Entity = {
      id: this.getEntityIdFromPath(filePath),
      type: 'document',
      name: path.basename(filePath, '.md'),
      content,
      metadata: {
        filename: path.basename(filePath),
        format: 'markdown',
      },
    }

    // Check if enrichment is needed
    if (!this.config.overwrite && !this.processor.needsEnrichment(entity)) {
      this.log(`  ↳ Skipped (already enriched)`)
      return null
    }

    // Enrich entity
    const result = this.processor.enrich(entity)

    // Log results
    if (result.hasLifecycle) {
      const state = result.entity.metadata?.lifecycle?.state
      const confidence = result.entity.metadata?.lifecycle?.confidence
      this.log(`  ↳ Lifecycle: ${state} (${confidence} confidence)`)
    }

    if (result.hasSemanticBlocks) {
      this.log(`  ↳ Extracted ${result.blockCount} semantic blocks`)
    }

    if (result.warnings.length > 0) {
      result.warnings.forEach(warning => {
        this.log(`  ⚠️  ${warning}`, 'warning')
      })
    }

    // Write back if not dry run
    if (!this.config.dryRun) {
      await this.writeEntity(filePath, result.entity)
      this.log(`  ✓ Changes written`)
    }

    return result
  }

  /**
   * Scan directory for markdown files
   */
  private async scanDirectory(dirPath: string): Promise<string[]> {
    const files: string[] = []
    const MAX_DEPTH = 50

    async function scan(
      dir: string,
      excludeDirs: string[],
      depth = 0
    ): Promise<void> {
      // Prevent stack overflow from deeply nested or circular directories
      if (depth > MAX_DEPTH) {
        console.warn(`Skipping directory beyond max depth (${MAX_DEPTH}): ${dir}`)
        return
      }

      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          // Skip excluded directories
          if (excludeDirs.includes(entry.name)) {
            continue
          }

          await scan(fullPath, excludeDirs, depth + 1)
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath)
        }
      }
    }

    await scan(dirPath, this.config.excludeDirs)

    return files.sort()
  }

  /**
   * Generate entity ID from file path
   */
  private getEntityIdFromPath(filePath: string): string {
    const relativePath = path.relative(this.config.rootPath, filePath)

    // Detect path traversal attempts
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error(
        `Security: File path is outside root directory: ${filePath}`
      )
    }

    return relativePath.replace(/\\/g, '/').replace(/\.md$/, '')
  }

  /**
   * Check if content already has YAML frontmatter
   */
  private hasFrontmatter(content: string): boolean {
    return content.trimStart().startsWith('---')
  }

  /**
   * Merge lifecycle metadata with existing frontmatter
   */
  private mergeFrontmatter(content: string, lifecycle: any): string {
    // Find the end of existing frontmatter
    const lines = content.split('\n')
    let frontmatterEnd = -1

    if (lines[0].trim() === '---') {
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '---') {
          frontmatterEnd = i
          break
        }
      }
    }

    if (frontmatterEnd === -1) {
      // Malformed frontmatter, treat as no frontmatter
      return content
    }

    // Extract existing frontmatter lines (excluding --- markers)
    const existingLines = lines.slice(1, frontmatterEnd)

    // Filter out existing lifecycle keys to avoid duplication
    const filteredLines = existingLines.filter(
      line =>
        !line.startsWith('lifecycle:') &&
        !line.startsWith('lifecycle_confidence:') &&
        !line.startsWith('lifecycle_manual:') &&
        !line.startsWith('superseded_by:') &&
        !line.startsWith('lifecycle_reason:')
    )

    // Add new lifecycle metadata
    const newLines = ['---', ...filteredLines]

    if (lifecycle) {
      newLines.push(`lifecycle: ${lifecycle.state}`)
      if (lifecycle.confidence) {
        newLines.push(`lifecycle_confidence: ${lifecycle.confidence}`)
      }
      if (lifecycle.manual) {
        newLines.push('lifecycle_manual: true')
      }
      if (lifecycle.supersededBy) {
        const escaped = this.escapeYamlString(lifecycle.supersededBy)
        newLines.push(`superseded_by: "${escaped}"`)
      }
      if (lifecycle.reason) {
        const escaped = this.escapeYamlString(lifecycle.reason)
        newLines.push(`lifecycle_reason: "${escaped}"`)
      }
    }

    newLines.push('---')

    // Reconstruct the file
    const remainingContent = lines.slice(frontmatterEnd + 1).join('\n')
    return newLines.join('\n') + '\n' + remainingContent
  }

  /**
   * Write enriched entity back to file
   *
   * Note: This is a simplified implementation. In a real system, this would
   * integrate with the storage adapter to persist metadata properly.
   */
  private async writeEntity(filePath: string, entity: Entity): Promise<void> {
    // For markdown files, we would typically:
    // 1. Add frontmatter with lifecycle metadata
    // 2. Keep semantic blocks in-place (they're part of content)
    // 3. Optionally add metadata comments

    const content = entity.content || ''

    // Check if file already has frontmatter
    if (this.hasFrontmatter(content)) {
      // Merge with existing frontmatter
      const merged = this.mergeFrontmatter(content, entity.metadata?.lifecycle)
      await fs.writeFile(filePath, merged, 'utf-8')
    } else {
      // Add new frontmatter
      const frontmatter = this.generateFrontmatter(entity)
      const fullContent = frontmatter ? `${frontmatter}\n\n${content}` : content
      await fs.writeFile(filePath, fullContent, 'utf-8')
    }
  }

  /**
   * Escape YAML special characters to prevent injection
   */
  private escapeYamlString(value: string): string {
    return value
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/"/g, '\\"')     // Escape double quotes
      .replace(/\n/g, '\\n')    // Escape newlines
      .replace(/\r/g, '\\r')    // Escape carriage returns
      .replace(/\t/g, '\\t')    // Escape tabs
  }

  /**
   * Generate YAML frontmatter with lifecycle metadata
   */
  private generateFrontmatter(entity: Entity): string | null {
    if (!entity.metadata?.lifecycle) {
      return null
    }

    const { state, confidence, manual, supersededBy, reason } = entity.metadata.lifecycle

    const lines = ['---', `lifecycle: ${state}`]

    if (confidence) {
      lines.push(`lifecycle_confidence: ${confidence}`)
    }

    if (manual) {
      lines.push('lifecycle_manual: true')
    }

    if (supersededBy) {
      const escaped = this.escapeYamlString(supersededBy)
      lines.push(`superseded_by: "${escaped}"`)
    }

    if (reason) {
      const escaped = this.escapeYamlString(reason)
      lines.push(`lifecycle_reason: "${escaped}"`)
    }

    lines.push('---')

    return lines.join('\n')
  }

  /**
   * Log message (respects verbose setting)
   */
  private log(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (!this.config.verbose && level === 'info') {
      return
    }

    const prefix = level === 'error' ? '❌' : level === 'warning' ? '⚠️ ' : ''
    console.log(`${prefix}${message}`)
  }
}

/**
 * CLI entry point
 */
export async function runMigration(args: string[] = process.argv.slice(2)): Promise<void> {
  const config: MigrationConfig = {
    rootPath: process.cwd(),
    dryRun: true,
  }

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '--path':
        config.rootPath = args[++i]
        break
      case '--no-dry-run':
        config.dryRun = false
        break
      case '--overwrite':
        config.overwrite = true
        break
      case '--quiet':
        config.verbose = false
        break
      case '--help':
        printHelp()
        process.exit(0)
        break
    }
  }

  const migration = new LifecycleMetadataMigration(config)

  try {
    const summary = await migration.run()

    // Exit with error code if there were errors
    if (summary.filesWithErrors > 0) {
      process.exit(1)
    }
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

/**
 * Print CLI help
 */
function printHelp(): void {
  console.log(`
Lifecycle Metadata Migration

Enriches existing documents with lifecycle metadata and semantic block extraction.

Usage:
  npm run migrate:lifecycle -- [options]

Options:
  --path <path>       Root directory to scan (default: current directory)
  --no-dry-run        Actually write changes (default: dry run only)
  --overwrite         Overwrite existing lifecycle metadata (default: false)
  --quiet             Suppress verbose output
  --help              Show this help message

Examples:
  # Dry run (preview changes)
  npm run migrate:lifecycle -- --path ./context-network

  # Apply changes
  npm run migrate:lifecycle -- --path ./context-network --no-dry-run

  # Force overwrite existing metadata
  npm run migrate:lifecycle -- --path ./context-network --no-dry-run --overwrite
  `)
}

// Run migration if called directly
if (require.main === module) {
  runMigration().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}
