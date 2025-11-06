/**
 * Semantic Block Parser
 *
 * Parses semantic blocks from markdown content using the ::type{} syntax.
 * Supports decision, outcome, quote, theme, principle, example, and anti-pattern blocks.
 *
 * Example syntax:
 * ```
 * ::decision{id="use-postgresql" importance="critical"}
 * We decided to use PostgreSQL because...
 * ::
 * ```
 *
 * @see context-network/architecture/semantic-processing/write-time-enrichment.md
 * @see context-network/architecture/semantic-processing/projection-based-compression.md
 */

import type {
  SemanticBlock,
  SemanticBlockType,
  BlockImportance,
} from './types'

/**
 * Parse result for semantic blocks
 */
export interface ParseResult {
  /** Successfully parsed blocks */
  blocks: SemanticBlock[]

  /** Parse errors encountered */
  errors: ParseError[]
}

/**
 * Parse error details
 */
export interface ParseError {
  /** Error message */
  message: string

  /** Line number where error occurred */
  line?: number

  /** Raw block content that failed to parse */
  rawContent?: string
}

/**
 * Regular expression patterns for semantic block parsing
 */
const BLOCK_START_PATTERN = /^::([a-z-]+)\s*\{([^}]*)\}\s*$/
const BLOCK_END_PATTERN = /^::\s*$/
// ATTRIBUTE_PATTERN moved into parseAttributes() to avoid global flag lastIndex issues

/**
 * Valid semantic block types
 */
const VALID_BLOCK_TYPES: Set<string> = new Set([
  'decision',
  'outcome',
  'quote',
  'theme',
  'principle',
  'example',
  'anti-pattern',
])

/**
 * Valid importance levels
 */
const VALID_IMPORTANCE_LEVELS: Set<string> = new Set([
  'critical',
  'high',
  'medium',
  'low',
])

/**
 * Maximum size for a single semantic block (in characters)
 * Prevents memory exhaustion from unclosed blocks in large files
 */
const MAX_BLOCK_SIZE = 100000 // 100KB

/**
 * Generate a unique ID for a block
 */
function generateBlockId(type: string, parentId: string, index: number): string {
  return `${type}-${parentId}-${index}`
}

/**
 * Parse attributes from block header
 *
 * Extracts key="value" pairs from the block declaration
 * e.g., {id="decision-001" importance="high"}
 */
function parseAttributes(attributeString: string): Record<string, string> {
  const attributes: Record<string, string> = {}

  // Create new regex instance to avoid lastIndex issues with global flag
  const pattern = /(\w+)=["']([^"']*)["']/g

  let match: RegExpExecArray | null
  while ((match = pattern.exec(attributeString)) !== null) {
    const [, key, value] = match
    attributes[key] = value
  }

  return attributes
}

/**
 * Validate and normalize block importance
 */
function parseImportance(value: string | undefined): BlockImportance | undefined {
  if (!value) return undefined

  const normalized = value.toLowerCase()
  if (VALID_IMPORTANCE_LEVELS.has(normalized)) {
    return normalized as BlockImportance
  }

  return undefined
}

/**
 * Semantic Block Parser
 *
 * Extracts structured semantic blocks from markdown content
 */
export class SemanticBlockParser {
  /**
   * Parse semantic blocks from content
   *
   * @param content Markdown content to parse
   * @param parentId ID of the parent entity/document
   * @returns Parse result with blocks and errors
   */
  parse(content: string, parentId: string): ParseResult {
    const blocks: SemanticBlock[] = []
    const errors: ParseError[] = []

    const lines = content.split('\n')
    let currentBlock: Partial<SemanticBlock> | null = null
    let blockContent: string[] = []
    let blockContentSize = 0
    let blockStartLine = 0
    let blockIndex = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Check for block start
      const startMatch = line.match(BLOCK_START_PATTERN)
      if (startMatch) {
        if (currentBlock) {
          errors.push({
            message: 'Nested semantic blocks are not allowed',
            line: lineNumber,
            rawContent: line,
          })
          continue
        }

        const [, blockType, attributeString] = startMatch

        // Validate block type
        if (!VALID_BLOCK_TYPES.has(blockType)) {
          errors.push({
            message: `Invalid semantic block type: ${blockType}`,
            line: lineNumber,
            rawContent: line,
          })
          continue
        }

        // Parse attributes
        const attributes = parseAttributes(attributeString)

        // Start new block
        currentBlock = {
          type: blockType as SemanticBlockType,
          attributes,
          parentId,
          location: [lineNumber, lineNumber], // Will update end line later
        }

        blockStartLine = lineNumber
        blockContent = []
        blockContentSize = 0
        continue
      }

      // Check for block end
      const endMatch = line.match(BLOCK_END_PATTERN)
      if (endMatch) {
        if (!currentBlock) {
          errors.push({
            message: 'Block end marker without matching start',
            line: lineNumber,
            rawContent: line,
          })
          continue
        }

        // Finalize block
        const content = blockContent.join('\n').trim()

        if (content.length === 0) {
          errors.push({
            message: 'Semantic block has no content',
            line: blockStartLine,
          })
        } else {
          const blockId =
            currentBlock.attributes?.id ||
            generateBlockId(
              currentBlock.type as string,
              parentId,
              blockIndex++
            )

          const importance = parseImportance(currentBlock.attributes?.importance)

          blocks.push({
            id: blockId,
            type: currentBlock.type!,
            content,
            importance,
            attributes: currentBlock.attributes!,
            location: [blockStartLine, lineNumber] as [number, number],
            parentId,
          })
        }

        // Reset state
        currentBlock = null
        blockContent = []
        blockContentSize = 0
        continue
      }

      // Accumulate block content
      if (currentBlock) {
        // Check block size limit to prevent memory exhaustion
        const lineSize = line.length + 1 // +1 for newline
        if (blockContentSize + lineSize > MAX_BLOCK_SIZE) {
          errors.push({
            message: `Semantic block exceeds maximum size (${MAX_BLOCK_SIZE} characters)`,
            line: blockStartLine,
          })
          // Reset block state to prevent further accumulation
          currentBlock = null
          blockContent = []
          blockContentSize = 0
          continue
        }

        blockContent.push(line)
        blockContentSize += lineSize
      }
    }

    // Check for unclosed block
    if (currentBlock) {
      errors.push({
        message: 'Unclosed semantic block at end of document',
        line: blockStartLine,
      })
    }

    return { blocks, errors }
  }

  /**
   * Extract only blocks of specific types
   *
   * @param content Markdown content
   * @param parentId Parent entity ID
   * @param types Block types to extract
   * @returns Filtered parse result
   */
  parseTypes(
    content: string,
    parentId: string,
    types: SemanticBlockType[]
  ): ParseResult {
    const result = this.parse(content, parentId)
    const typeSet = new Set(types)

    return {
      blocks: result.blocks.filter(block => typeSet.has(block.type)),
      errors: result.errors,
    }
  }

  /**
   * Check if content contains any semantic blocks
   *
   * @param content Content to check
   * @returns True if semantic blocks are present
   */
  hasSemanticBlocks(content: string): boolean {
    return BLOCK_START_PATTERN.test(content)
  }

  /**
   * Get block by ID from parsed results
   *
   * @param blocks Parsed blocks
   * @param id Block ID to find
   * @returns Block or undefined
   */
  findBlockById(blocks: SemanticBlock[], id: string): SemanticBlock | undefined {
    return blocks.find(block => block.id === id)
  }

  /**
   * Get blocks by type from parsed results
   *
   * @param blocks Parsed blocks
   * @param type Block type to filter
   * @returns Blocks matching type
   */
  findBlocksByType(
    blocks: SemanticBlock[],
    type: SemanticBlockType
  ): SemanticBlock[] {
    return blocks.filter(block => block.type === type)
  }

  /**
   * Get blocks by importance level
   *
   * @param blocks Parsed blocks
   * @param importance Importance level to filter
   * @returns Blocks matching importance
   */
  findBlocksByImportance(
    blocks: SemanticBlock[],
    importance: BlockImportance
  ): SemanticBlock[] {
    return blocks.filter(block => block.importance === importance)
  }
}

/**
 * Default parser instance
 */
export const defaultSemanticBlockParser = new SemanticBlockParser()

/**
 * Convenience function for quick semantic block parsing
 *
 * @param content Content to parse
 * @param parentId Parent entity ID
 * @returns Parse result
 */
export function parseSemanticBlocks(
  content: string,
  parentId: string
): ParseResult {
  return defaultSemanticBlockParser.parse(content, parentId)
}

/**
 * Convenience function to check for semantic blocks
 *
 * @param content Content to check
 * @returns True if blocks are present
 */
export function hasSemanticBlocks(content: string): boolean {
  return defaultSemanticBlockParser.hasSemanticBlocks(content)
}
