# Continuity Cortex: Component Specifications

## Overview

This document provides detailed specifications for each component in the Continuity Cortex system, including interfaces, responsibilities, and implementation guidelines.

## 1. FileOperationInterceptor

### Purpose
Monitors file system operations in real-time and forwards relevant events to the Continuity Cortex agent for analysis.

### Interface Definition
```typescript
interface FileOperationInterceptor {
  // Core methods
  start(config: InterceptorConfig): Promise<void>;
  stop(): Promise<void>;
  addWatchPath(path: string): void;
  removeWatchPath(path: string): void;

  // Event handlers
  onFileOperation(handler: FileOperationHandler): void;
  offFileOperation(handler: FileOperationHandler): void;

  // Configuration
  updateConfig(config: Partial<InterceptorConfig>): void;
  getConfig(): InterceptorConfig;
}

interface InterceptorConfig {
  watchPaths: string[];
  ignorePatterns: string[];
  debounceMs: number;
  maxFileSize: number;
  enabledOperations: FileOperation[];
}

interface FileOperationEvent {
  operation: 'create' | 'write' | 'move' | 'delete';
  path: string;
  timestamp: Date;
  content?: string;
  contentHash?: string;
  metadata: FileMetadata;
}

interface FileMetadata {
  size: number;
  extension: string;
  mimeType: string;
  encoding?: string;
  lastModified: Date;
}

type FileOperationHandler = (event: FileOperationEvent) => Promise<void>;
```

### Implementation Specifications

#### Core Responsibilities
1. **File System Monitoring**
   - Use Chokidar for cross-platform file watching
   - Monitor configured paths with glob pattern support
   - Handle file system events efficiently

2. **Event Filtering**
   - Filter events by file type and operation
   - Apply ignore patterns (node_modules, .git, etc.)
   - Debounce rapid-fire events

3. **Content Extraction**
   - Read file content for analysis (respecting size limits)
   - Generate content hashes for caching
   - Extract basic metadata

4. **Event Forwarding**
   - Forward filtered events to registered handlers
   - Provide async event handling
   - Handle handler errors gracefully

#### Configuration Management
```typescript
class FileOperationInterceptor {
  private watcher: chokidar.FSWatcher | null = null;
  private config: InterceptorConfig;
  private handlers: Set<FileOperationHandler> = new Set();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  constructor(config: InterceptorConfig) {
    this.config = { ...defaultConfig, ...config };
  }

  async start(): Promise<void> {
    if (this.watcher) {
      throw new Error('Interceptor already started');
    }

    this.watcher = chokidar.watch(this.config.watchPaths, {
      ignored: this.config.ignorePatterns,
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      depth: 10
    });

    this.watcher.on('add', (path) => this.handleFileEvent('create', path));
    this.watcher.on('change', (path) => this.handleFileEvent('write', path));
    this.watcher.on('unlink', (path) => this.handleFileEvent('delete', path));
  }

  private async handleFileEvent(operation: FileOperation, path: string): Promise<void> {
    // Debouncing logic
    const existingTimer = this.debounceTimers.get(path);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.debounceTimers.set(path, setTimeout(async () => {
      try {
        const event = await this.createFileEvent(operation, path);
        if (this.shouldProcessEvent(event)) {
          await this.notifyHandlers(event);
        }
      } catch (error) {
        console.error(`Error processing file event for ${path}:`, error);
      } finally {
        this.debounceTimers.delete(path);
      }
    }, this.config.debounceMs));
  }
}
```

#### Performance Optimizations
- **Debouncing**: Prevent duplicate events for rapid file changes
- **Size Limits**: Skip analysis for very large files
- **Async Processing**: Non-blocking event handling
- **Memory Management**: Cleanup of temporary data and timers

## 2. ContinuityCortex Agent

### Purpose
The main intelligence component that receives file operation events, analyzes similarity, and provides recommendations.

### Interface Definition
```typescript
interface ContinuityCortexAgent extends Agent {
  // Core operations
  analyzeFileOperation(event: FileOperationEvent): Promise<AnalysisResult>;
  learnFromDecision(decision: UserDecision): Promise<void>;

  // Configuration
  updateSimilarityThresholds(thresholds: SimilarityThresholds): void;
  getInsights(): Promise<CortexInsights>;
}

interface AnalysisResult {
  recommendation: Recommendation;
  similarFiles: SimilarFile[];
  confidence: number;
  reasoning: string[];
  metadata: AnalysisMetadata;
}

interface Recommendation {
  action: 'create' | 'update' | 'merge' | 'warn';
  targetFile?: string;
  confidence: number;
  reasoning: string;
  alternatives: Alternative[];
  autoApply: boolean;
}

interface SimilarFile {
  path: string;
  similarity: number;
  matchingLayers: SimilarityLayer[];
  lastModified: Date;
  confidence: number;
}

interface Alternative {
  action: 'update' | 'merge' | 'rename';
  target: string;
  description: string;
  confidence: number;
}
```

### Agent Configuration
```typescript
const CORTEX_INSTRUCTIONS = `
You are the Continuity Cortex, an intelligent file operation analyst that prevents
duplicate file creation and detects amnesia loops.

Your primary responsibilities:
1. Analyze incoming file operations for potential duplicates
2. Identify files that serve similar purposes but have different names/formats
3. Recommend the best action: create new, update existing, or merge files
4. Learn from user decisions to improve future recommendations
5. Detect patterns that indicate "amnesia loops" where similar files are repeatedly created

When analyzing files, consider:
- Filename patterns and semantic meaning
- Content structure and organization
- Purpose and intent of the file
- Recent usage patterns and modifications
- Project context and conventions

Provide clear, actionable recommendations with confidence scores and reasoning.
Always err on the side of caution - when uncertain, ask the user rather than making assumptions.

Learn from user decisions:
- If they choose to create despite similarity warnings, understand why
- If they merge files, learn what constitutes good merging candidates
- If they ignore recommendations, analyze what made them different

Be concise but thorough in explanations. Focus on helping users maintain organized,
non-redundant file structures while respecting their creative process.
`;

class ContinuityCortexAgent extends Agent {
  private similarityAnalyzer: SimilarityAnalyzer;
  private decisionEngine: FileDecisionEngine;
  private learningSystem: LearningSystem;

  constructor(config: CortexConfig) {
    super({
      name: 'ContinuityCortex',
      instructions: CORTEX_INSTRUCTIONS,
      model: openRouter.chat('anthropic/claude-3.5-haiku'),
      tools: {
        analyzeFileSimilarity: analyzeSimilarityTool,
        findExistingFiles: findFilesTool,
        generateRecommendation: recommendationTool,
        storeDecision: decisionStorageTool,
        getFileContent: fileContentTool
      },
      memory: new Memory({ storage: config.memoryStore })
    });

    this.similarityAnalyzer = new SimilarityAnalyzer(config.similarity);
    this.decisionEngine = new FileDecisionEngine(config.decision);
    this.learningSystem = new LearningSystem(config.learning);
  }
}
```

### Tool Implementations
```typescript
// File Similarity Analysis Tool
export const analyzeSimilarityTool = createTool({
  id: 'analyzeFileSimilarity',
  description: 'Analyze similarity between a new file and existing files',
  parameters: z.object({
    newFile: z.object({
      path: z.string(),
      content: z.string(),
      intent: z.string().optional()
    }),
    existingFiles: z.array(z.object({
      path: z.string(),
      lastModified: z.string()
    }))
  }),
  execute: async ({ newFile, existingFiles }) => {
    const analyzer = new SimilarityAnalyzer();
    const results = [];

    for (const existing of existingFiles) {
      const existingContent = await readFileContent(existing.path);
      const similarity = await analyzer.analyzeSimilarity(
        newFile,
        { ...existing, content: existingContent }
      );

      if (similarity.overall > 0.3) { // Only include meaningful similarities
        results.push({
          file: existing.path,
          similarity: similarity.overall,
          layers: similarity.layers,
          confidence: similarity.confidence
        });
      }
    }

    return {
      similarFiles: results.sort((a, b) => b.similarity - a.similarity),
      analysisTime: Date.now()
    };
  }
});

// Recommendation Generation Tool
export const recommendationTool = createTool({
  id: 'generateRecommendation',
  description: 'Generate action recommendation based on similarity analysis',
  parameters: z.object({
    newFile: z.object({
      path: z.string(),
      content: z.string(),
      intent: z.string().optional()
    }),
    similarFiles: z.array(z.object({
      path: z.string(),
      similarity: z.number(),
      layers: z.array(z.string())
    }))
  }),
  execute: async ({ newFile, similarFiles }) => {
    const engine = new FileDecisionEngine();
    const recommendation = await engine.generateRecommendation(newFile, similarFiles);

    return {
      action: recommendation.action,
      targetFile: recommendation.targetFile,
      confidence: recommendation.confidence,
      reasoning: recommendation.reasoning,
      alternatives: recommendation.alternatives,
      autoApply: recommendation.autoApply
    };
  }
});
```

## 3. SimilarityAnalyzer

### Purpose
Multi-layer analysis engine that detects conceptual similarity between files beyond simple text matching.

### Interface Definition
```typescript
interface SimilarityAnalyzer {
  analyzeSimilarity(file1: FileInfo, file2: FileInfo): Promise<SimilarityResult>;
  analyzeBatch(newFile: FileInfo, existingFiles: FileInfo[]): Promise<BatchSimilarityResult>;

  // Configuration
  updateWeights(weights: SimilarityWeights): void;
  updateThresholds(thresholds: SimilarityThresholds): void;
}

interface SimilarityResult {
  overall: number;
  confidence: number;
  layers: LayerAnalysis[];
  metadata: AnalysisMetadata;
}

interface LayerAnalysis {
  layer: SimilarityLayer;
  score: number;
  confidence: number;
  details: LayerDetails;
}

type SimilarityLayer = 'filename' | 'structure' | 'content' | 'semantic' | 'usage';

interface SimilarityWeights {
  filename: number;
  structure: number;
  content: number;
  semantic: number;
  usage: number;
}
```

### Layer Implementations

#### 1. Filename Pattern Analysis
```typescript
class FilenameAnalyzer {
  analyze(file1: FileInfo, file2: FileInfo): LayerAnalysis {
    const name1 = this.extractStem(file1.name);
    const name2 = this.extractStem(file2.name);

    // Exact match
    if (name1 === name2) {
      return { score: 1.0, confidence: 0.95, details: { type: 'exact' } };
    }

    // Stem variations (todo/todos, plan/planning)
    const stemSimilarity = this.analyzeStemSimilarity(name1, name2);
    if (stemSimilarity > 0.8) {
      return { score: stemSimilarity, confidence: 0.8, details: { type: 'stem_variant' } };
    }

    // Semantic name similarity (task/todo, plan/roadmap)
    const semanticSimilarity = this.analyzeSemanticSimilarity(name1, name2);
    return { score: semanticSimilarity, confidence: 0.6, details: { type: 'semantic' } };
  }

  private extractStem(filename: string): string {
    // Remove extension and common prefixes/suffixes
    return filename
      .replace(/\.(md|txt|yaml|json|ts|js)$/i, '')
      .replace(/^(new_|old_|temp_|draft_)/i, '')
      .replace(/(_new|_old|_temp|_draft|_backup)$/i, '')
      .toLowerCase();
  }

  private analyzeStemSimilarity(stem1: string, stem2: string): number {
    // Check for common variations
    const variations = {
      'todo': ['todos', 'task', 'tasks', 'to-do', 'to_do'],
      'plan': ['planning', 'plans', 'roadmap', 'strategy'],
      'doc': ['docs', 'documentation', 'readme'],
      'config': ['configuration', 'settings', 'options']
    };

    for (const [base, variants] of Object.entries(variations)) {
      if ((stem1 === base && variants.includes(stem2)) ||
          (stem2 === base && variants.includes(stem1)) ||
          (variants.includes(stem1) && variants.includes(stem2))) {
        return 0.9;
      }
    }

    // Levenshtein distance for general similarity
    const distance = this.levenshteinDistance(stem1, stem2);
    const maxLength = Math.max(stem1.length, stem2.length);
    return Math.max(0, 1 - (distance / maxLength));
  }
}
```

#### 2. Content Structure Analysis
```typescript
class StructureAnalyzer {
  analyze(file1: FileInfo, file2: FileInfo): LayerAnalysis {
    const struct1 = this.extractStructure(file1);
    const struct2 = this.extractStructure(file2);

    // Format compatibility
    if (struct1.format !== struct2.format) {
      // Different formats can still be similar (MD vs TXT)
      if (!this.areFormatsCompatible(struct1.format, struct2.format)) {
        return { score: 0.1, confidence: 0.8, details: { reason: 'incompatible_formats' } };
      }
    }

    // Section similarity
    const sectionSimilarity = this.compareSections(struct1.sections, struct2.sections);

    // List structure similarity
    const listSimilarity = this.compareListStructure(struct1.lists, struct2.lists);

    // Overall structure score
    const overallScore = (sectionSimilarity * 0.6) + (listSimilarity * 0.4);

    return {
      score: overallScore,
      confidence: 0.7,
      details: {
        sectionSimilarity,
        listSimilarity,
        format1: struct1.format,
        format2: struct2.format
      }
    };
  }

  private extractStructure(file: FileInfo): FileStructure {
    const content = file.content;

    if (file.extension === '.md') {
      return this.parseMarkdownStructure(content);
    } else if (file.extension === '.json') {
      return this.parseJsonStructure(content);
    } else if (file.extension === '.yaml' || file.extension === '.yml') {
      return this.parseYamlStructure(content);
    } else {
      return this.parseTextStructure(content);
    }
  }

  private parseMarkdownStructure(content: string): FileStructure {
    const sections = [];
    const lists = [];

    // Extract headers
    const headerRegex = /^(#{1,6})\s+(.+)$/gm;
    let match;
    while ((match = headerRegex.exec(content)) !== null) {
      sections.push({
        level: match[1].length,
        title: match[2].trim(),
        content: ''
      });
    }

    // Extract list structures
    const listRegex = /^(\s*[-*+]\s+.+)$/gm;
    const listMatches = content.match(listRegex) || [];
    lists.push({
      type: 'unordered',
      items: listMatches.length,
      nested: this.detectNestedLists(listMatches)
    });

    return {
      format: 'markdown',
      sections,
      lists,
      complexity: sections.length + lists.length
    };
  }
}
```

#### 3. Semantic Content Analysis
```typescript
class SemanticAnalyzer {
  private readonly PURPOSE_KEYWORDS = {
    planning: ['plan', 'roadmap', 'strategy', 'goal', 'milestone', 'timeline', 'schedule'],
    tracking: ['todo', 'task', 'progress', 'status', 'checklist', 'item', 'complete'],
    documentation: ['readme', 'guide', 'manual', 'documentation', 'help', 'instruction'],
    configuration: ['config', 'setting', 'option', 'parameter', 'property', 'environment']
  };

  analyze(file1: FileInfo, file2: FileInfo): LayerAnalysis {
    const purpose1 = this.detectPurpose(file1);
    const purpose2 = this.detectPurpose(file2);

    // Purpose similarity
    const purposeSimilarity = this.comparePurposes(purpose1, purpose2);

    // Topic similarity
    const topics1 = this.extractTopics(file1.content);
    const topics2 = this.extractTopics(file2.content);
    const topicSimilarity = this.compareTopics(topics1, topics2);

    // Temporal similarity (current vs historical)
    const temporalSimilarity = this.analyzeTemporal(file1, file2);

    const overallScore = (purposeSimilarity * 0.5) + (topicSimilarity * 0.3) + (temporalSimilarity * 0.2);

    return {
      score: overallScore,
      confidence: 0.6,
      details: {
        purpose1: purpose1.type,
        purpose2: purpose2.type,
        purposeConfidence: Math.min(purpose1.confidence, purpose2.confidence),
        sharedTopics: this.findSharedTopics(topics1, topics2),
        temporal: { file1: this.classifyTemporal(file1), file2: this.classifyTemporal(file2) }
      }
    };
  }

  private detectPurpose(file: FileInfo): { type: string; confidence: number } {
    const content = file.content.toLowerCase();
    const filename = file.name.toLowerCase();

    let bestPurpose = 'unknown';
    let bestScore = 0;

    for (const [purpose, keywords] of Object.entries(this.PURPOSE_KEYWORDS)) {
      let score = 0;

      // Check filename
      for (const keyword of keywords) {
        if (filename.includes(keyword)) {
          score += 0.3;
        }
      }

      // Check content
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = content.match(regex) || [];
        score += matches.length * 0.1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestPurpose = purpose;
      }
    }

    return {
      type: bestPurpose,
      confidence: Math.min(bestScore, 1.0)
    };
  }
}
```

#### 4. Usage Pattern Analysis
```typescript
class UsageAnalyzer {
  async analyze(file1: FileInfo, file2: FileInfo): Promise<LayerAnalysis> {
    const stats1 = await this.getFileStats(file1.path);
    const stats2 = await this.getFileStats(file2.path);

    // Modification frequency similarity
    const freqSimilarity = this.compareModificationFrequency(stats1, stats2);

    // Access pattern similarity
    const accessSimilarity = this.compareAccessPatterns(stats1, stats2);

    // Age similarity (both recent, both old)
    const ageSimilarity = this.compareAge(stats1, stats2);

    const overallScore = (freqSimilarity * 0.4) + (accessSimilarity * 0.3) + (ageSimilarity * 0.3);

    return {
      score: overallScore,
      confidence: 0.5, // Lower confidence as usage patterns can be misleading
      details: {
        file1Pattern: this.classifyAccessPattern(stats1),
        file2Pattern: this.classifyAccessPattern(stats2),
        ageDifference: Math.abs(stats1.age - stats2.age)
      }
    };
  }

  private classifyAccessPattern(stats: FileStats): string {
    if (stats.modifications < 2) return 'write-once';
    if (stats.modifications > 10 && stats.daysSinceCreation < 30) return 'frequently-updated';
    if (stats.modifications > 5) return 'regularly-updated';
    return 'append-only';
  }
}
```

### Overall Similarity Calculation
```typescript
class SimilarityCalculator {
  calculateOverallSimilarity(layers: LayerAnalysis[], weights: SimilarityWeights): SimilarityResult {
    let totalScore = 0;
    let totalWeight = 0;
    let minConfidence = 1.0;

    for (const layer of layers) {
      const weight = weights[layer.layer];
      totalScore += layer.score * weight;
      totalWeight += weight;
      minConfidence = Math.min(minConfidence, layer.confidence);
    }

    const overall = totalWeight > 0 ? totalScore / totalWeight : 0;

    // Adjust confidence based on layer agreement
    const layerAgreement = this.calculateLayerAgreement(layers);
    const adjustedConfidence = minConfidence * layerAgreement;

    return {
      overall,
      confidence: adjustedConfidence,
      layers,
      metadata: {
        calculatedAt: new Date(),
        layerCount: layers.length,
        layerAgreement
      }
    };
  }

  private calculateLayerAgreement(layers: LayerAnalysis[]): number {
    if (layers.length < 2) return 1.0;

    const scores = layers.map(l => l.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Lower standard deviation means better agreement
    // Convert to agreement score (0-1, where 1 is perfect agreement)
    return Math.max(0, 1 - (stdDev / 0.5)); // Normalize by expected max stddev
  }
}
```

This component specification provides the detailed implementation guide for the core similarity detection system. The multi-layer approach ensures robust detection of conceptually similar files while maintaining good performance and accuracy.