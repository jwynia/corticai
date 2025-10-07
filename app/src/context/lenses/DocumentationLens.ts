/**
 * Documentation Lens - Emphasizes documentation and public API context
 *
 * This lens activates during documentation scenarios and emphasizes:
 * - Public/exported functions, classes, and interfaces
 * - JSDoc comments and documentation blocks
 * - README and markdown documentation files
 * - API entry points and public interfaces
 * - Type definitions and declaration files
 *
 * Activation triggers:
 * - Keywords: "document", "API", "public", "interface", "readme", "export"
 * - File patterns: README files, .md files, index.ts, .d.ts files
 * - Actions: Documentation generation, API exploration
 */

import { BaseLens } from './ContextLens';
import type { Query } from '../../query/types';
import type {
  ActivationContext,
  QueryContext,
  LensConfig
} from './types';
import { ContextDepth } from '../../types/context';

/**
 * Metadata added to results by DocumentationLens
 */
export interface DocumentationMetadata {
  /** Whether this entity is public/exported */
  isPublic: boolean;
  /** Whether this entity has JSDoc documentation */
  hasJSDoc: boolean;
  /** Whether this is exported from a module */
  isExported: boolean;
  /** Whether this is API-related content */
  isAPIRelated: boolean;
  /** Whether this is an entry point file */
  isEntryPoint: boolean;
  /** Relevance score for documentation (0-100) */
  relevanceScore: number;
  /** Documentation quality indicators */
  documentationQuality?: {
    hasDescription: boolean;
    hasExamples: boolean;
    hasParameters: boolean;
    hasReturnType: boolean;
  };
}

export class DocumentationLens extends BaseLens {
  // Documentation-related keywords to detect
  private static readonly DOCUMENTATION_KEYWORDS = [
    'document', 'api', 'public', 'interface', 'readme', 'export',
    'exported', 'documentation', 'docs', 'guide', 'tutorial'
  ];

  // Entry point file patterns
  private static readonly ENTRY_POINT_PATTERNS = [
    /index\.(ts|js|tsx|jsx)$/,
    /main\.(ts|js|tsx|jsx)$/,
    /app\.(ts|js|tsx|jsx)$/,
    /README\.md$/i,
    /API\.md$/i
  ];

  // Export detection patterns
  private static readonly EXPORT_PATTERNS = [
    /export\s+(function|class|interface|type|const|let|var|enum|namespace)/,
    /export\s+default/,
    /export\s*\{/
  ];

  // JSDoc detection pattern
  private static readonly JSDOC_PATTERN = /\/\*\*[\s\S]*?\*\//;

  constructor() {
    super('documentation', 'Documentation Lens', 75);
  }

  /**
   * Determine if this lens should activate
   */
  shouldActivate(context: ActivationContext): boolean {
    // Check manual override first
    if (context.manualOverride === 'documentation') {
      return true;
    }

    // If a different lens is manually overridden, don't activate
    if (context.manualOverride && context.manualOverride !== 'documentation') {
      return false;
    }

    // Check if lens is enabled
    if (!this.config.enabled) {
      return false;
    }

    // Check for documentation-related files
    if (this.hasDocumentationRelatedFiles(context.currentFiles)) {
      return true;
    }

    return false;
  }

  /**
   * Transform query to emphasize documentation-relevant context
   */
  transformQuery<T>(query: Query<T>): Query<T> {
    const transformed = { ...query };

    // Set depth to DETAILED for comprehensive documentation
    transformed.depth = ContextDepth.DETAILED;

    // Add public/exported entity conditions
    if (!transformed.conditions) {
      transformed.conditions = [];
    }

    // Add condition to include public/exported content
    transformed.conditions.push({
      type: 'pattern' as const,
      field: 'content' as any,
      operator: 'contains' as const,
      value: 'export'
    });

    // Add ordering to prioritize documented entities
    if (!transformed.ordering) {
      transformed.ordering = [];
    }

    // Prioritize files with documentation
    transformed.ordering.push({
      field: 'hasDocumentation' as any,
      direction: 'desc' as const
    });

    // Set appropriate pagination for documentation browsing
    if (transformed.pagination) {
      transformed.pagination = {
        ...transformed.pagination,
        limit: Math.max(transformed.pagination.limit || 10, 30)
      };
    } else {
      transformed.pagination = {
        offset: 0,
        limit: 30
      };
    }

    // Add performance hints
    transformed.performanceHints = {
      expectedMemoryReduction: false, // We want full details for documentation
      estimatedMemoryFactor: 1.2, // Slightly more memory for complete docs
      optimizedFields: ['content', 'metadata', 'exports', 'documentation'],
      cacheStrategy: 'moderate' // Documentation doesn't change as frequently
    };

    return transformed;
  }

  /**
   * Process results to add documentation-specific metadata
   */
  processResults<T>(results: T[], context: QueryContext): T[] {
    if (results.length === 0) {
      return results;
    }

    // Process each result with documentation metadata
    const processed = results.map(result => {
      const docMetadata = this.calculateDocumentationMetadata(result);
      return {
        ...result,
        _documentationMetadata: docMetadata,
        _lensMetadata: {
          appliedLens: this.id,
          processedAt: new Date().toISOString(),
          contextId: context.requestId
        }
      };
    });

    // Sort by documentation relevance score (highest first)
    processed.sort((a: any, b: any) => {
      const scoreA = a._documentationMetadata?.relevanceScore || 0;
      const scoreB = b._documentationMetadata?.relevanceScore || 0;
      return scoreB - scoreA;
    });

    return processed;
  }

  /**
   * Calculate documentation-specific metadata for a result
   */
  private calculateDocumentationMetadata(result: any): DocumentationMetadata {
    const content = result.content || '';
    const filename = result.metadata?.filename || '';
    const name = result.name || '';

    // Check if entity is public/exported
    const isPublic = this.isPublicEntity(content, result.metadata);
    const isExported = this.isExportedEntity(content);
    const hasJSDoc = this.hasJSDocComment(content);
    const isAPIRelated = this.isAPIRelatedContent(content, filename, name);
    const isEntryPoint = this.isEntryPointFile(filename);

    // Analyze documentation quality
    const documentationQuality = hasJSDoc ? this.analyzeDocumentationQuality(content) : undefined;

    // Calculate relevance score
    const relevanceScore = this.calculateRelevanceScore({
      isPublic,
      isExported,
      hasJSDoc,
      isAPIRelated,
      isEntryPoint,
      documentationQuality,
      filename,
      content
    });

    return {
      isPublic,
      hasJSDoc,
      isExported,
      isAPIRelated,
      isEntryPoint,
      relevanceScore,
      documentationQuality
    };
  }

  /**
   * Calculate relevance score for documentation (0-100)
   */
  private calculateRelevanceScore(factors: {
    isPublic: boolean;
    isExported: boolean;
    hasJSDoc: boolean;
    isAPIRelated: boolean;
    isEntryPoint: boolean;
    documentationQuality?: any;
    filename: string;
    content: string;
  }): number {
    let score = 0;

    // Base score for public/exported entities
    if (factors.isPublic || factors.isExported) {
      score += 30;
    }

    // High score for JSDoc presence
    if (factors.hasJSDoc) {
      score += 25;
    }

    // Additional score for documentation quality
    if (factors.documentationQuality) {
      if (factors.documentationQuality.hasDescription) score += 10;
      if (factors.documentationQuality.hasExamples) score += 10;
      if (factors.documentationQuality.hasParameters) score += 5;
      if (factors.documentationQuality.hasReturnType) score += 5;
    }

    // Score for API-related content
    if (factors.isAPIRelated) {
      score += 15;
    }

    // High score for entry point files
    if (factors.isEntryPoint) {
      score += 20;
    }

    // Score for README and documentation files
    if (factors.filename.match(/README|DOCUMENTATION|API|GUIDE/i)) {
      score += 25;
    }

    // Score for markdown files
    if (factors.filename.endsWith('.md')) {
      score += 15;
    }

    // Score for declaration files
    if (factors.filename.endsWith('.d.ts')) {
      score += 20;
    }

    // Cap at 100
    return Math.min(score, 100);
  }

  /**
   * Check if current files are documentation-related
   */
  private hasDocumentationRelatedFiles(files: string[]): boolean {
    if (!files || files.length === 0) {
      return false;
    }

    return files.some(file => {
      // README files
      if (file.match(/README\.md$/i)) {
        return true;
      }

      // Documentation directories and files
      if (file.includes('/docs/') || file.match(/\.md$/)) {
        return true;
      }

      // Entry point files
      if (this.isEntryPointFile(file)) {
        return true;
      }

      // Declaration files
      if (file.endsWith('.d.ts')) {
        return true;
      }

      // Files with documentation-related keywords
      if (this.containsDocumentationKeywords(file)) {
        return true;
      }

      return false;
    });
  }

  /**
   * Check if text contains documentation keywords
   */
  private containsDocumentationKeywords(text: string): boolean {
    const lowerText = text.toLowerCase();
    return DocumentationLens.DOCUMENTATION_KEYWORDS.some(keyword =>
      lowerText.includes(keyword)
    );
  }

  /**
   * Check if entity is public or exported
   */
  private isPublicEntity(content: string, metadata?: any): boolean {
    // Check metadata first if available
    if (metadata?.isPublic !== undefined) {
      return metadata.isPublic;
    }

    // Check for export keywords
    if (this.isExportedEntity(content)) {
      return true;
    }

    // Check for public modifier
    if (content.includes('public ')) {
      return true;
    }

    return false;
  }

  /**
   * Check if entity is exported
   */
  private isExportedEntity(content: string): boolean {
    return DocumentationLens.EXPORT_PATTERNS.some(pattern =>
      pattern.test(content)
    );
  }

  /**
   * Check if content has JSDoc comments
   */
  private hasJSDocComment(content: string): boolean {
    return DocumentationLens.JSDOC_PATTERN.test(content);
  }

  /**
   * Check if content is API-related
   */
  private isAPIRelatedContent(content: string, filename: string, name: string): boolean {
    const lowerContent = content.toLowerCase();
    const lowerFilename = filename.toLowerCase();
    const lowerName = name.toLowerCase();

    const apiKeywords = ['api', 'endpoint', 'route', 'handler', 'controller', 'service'];

    return apiKeywords.some(keyword =>
      lowerContent.includes(keyword) ||
      lowerFilename.includes(keyword) ||
      lowerName.includes(keyword)
    );
  }

  /**
   * Check if file is an entry point
   */
  private isEntryPointFile(filename: string): boolean {
    return DocumentationLens.ENTRY_POINT_PATTERNS.some(pattern =>
      pattern.test(filename)
    );
  }

  /**
   * Analyze documentation quality from JSDoc
   */
  private analyzeDocumentationQuality(content: string): {
    hasDescription: boolean;
    hasExamples: boolean;
    hasParameters: boolean;
    hasReturnType: boolean;
  } {
    return {
      hasDescription: content.includes('*') && content.split('\n').length > 2,
      hasExamples: content.includes('@example'),
      hasParameters: content.includes('@param'),
      hasReturnType: content.includes('@returns') || content.includes('@return')
    };
  }
}
