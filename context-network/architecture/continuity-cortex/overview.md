# Continuity Cortex Architecture Overview

## System Purpose

The Continuity Cortex is an intelligent file operation interceptor that prevents duplicate file creation and detects amnesia loops in AI agent workflows. It operates as a real-time prevention system rather than a post-hoc cleanup tool.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    File Operations                          │
│    (Agent writes, User creates, CLI commands)               │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│               FileOperationInterceptor                      │
│  ┌─────────────────┬─────────────────┬─────────────────┐   │
│  │  File Watcher   │  Event Filter   │  Operation      │   │
│  │  (Chokidar)     │                 │  Classifier     │   │
│  └─────────────────┴─────────────────┴─────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                 ContinuityCortex Agent                      │
│  ┌─────────────────┬─────────────────┬─────────────────┐   │
│  │  Similarity     │  Decision       │  Learning       │   │
│  │  Analyzer       │  Engine         │  System         │   │
│  └─────────────────┴─────────────────┴─────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                 Storage Layer                               │
│  ┌─────────────────┬─────────────────┬─────────────────┐   │
│  │  Graph DB       │  File Metadata  │  Pattern        │   │
│  │  (Kuzu)         │  Cache          │  Memory         │   │
│  └─────────────────┴─────────────────┴─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. File Operation Interceptor
**Purpose**: Detects and captures file operations in real-time
**Location**: `/app/src/context/interceptors/FileOperationInterceptor.ts`

**Responsibilities**:
- Monitor file system events using Chokidar
- Filter relevant operations (create, write, move)
- Extract operation context (path, content, intent)
- Forward to ContinuityCortex Agent for analysis

**Key Features**:
- Real-time file system watching
- Configurable path filtering
- Event debouncing and deduplication
- Operation context extraction

### 2. ContinuityCortex Agent
**Purpose**: Intelligent analysis and decision-making for file operations
**Location**: `/app/src/context/agents/ContinuityCortex.agent.ts`

**Responsibilities**:
- Receive file operation events
- Analyze similarity to existing files
- Make recommendations (create/update/merge)
- Learn from user decisions
- Provide explanations and reasoning

**Key Features**:
- Multi-layer similarity detection
- Rule-based decision engine
- User interaction and feedback
- Pattern learning and adaptation

### 3. Similarity Analyzer
**Purpose**: Multi-layer analysis to detect conceptually similar files
**Location**: `/app/src/context/analyzers/SimilarityAnalyzer.ts`

**Responsibilities**:
- Filename pattern analysis
- Content structure comparison
- Semantic content analysis
- Usage pattern evaluation
- Confidence scoring

**Key Features**:
- Multiple similarity dimensions
- Configurable weight and threshold
- Fast analysis (< 100ms target)
- Extensible analysis layers

### 4. Decision Engine
**Purpose**: Rule-based logic for recommendations
**Location**: `/app/src/context/engines/FileDecisionEngine.ts`

**Responsibilities**:
- Combine similarity scores
- Apply business rules
- Generate recommendations
- Determine confidence levels
- Handle edge cases

**Key Features**:
- Configurable rule sets
- Threshold-based decisions
- Multi-factor scoring
- Fallback strategies

### 5. Storage Integration
**Purpose**: Persistent storage of patterns, relationships, and learning
**Location**: Leverages existing KuzuStorageAdapter

**Responsibilities**:
- Store file relationships in graph database
- Cache similarity analysis results
- Track user decision patterns
- Maintain learning memory

**Key Features**:
- Graph-based relationship storage
- Efficient similarity lookup
- Pattern persistence
- Performance optimization

## Data Flow

### 1. File Operation Detection
```
File System Event → Interceptor → Filter → Context Extraction → Agent
```

### 2. Similarity Analysis
```
New File Info → Similarity Analyzer → Multi-layer Analysis → Confidence Scores
```

### 3. Decision Making
```
Similarity Scores → Decision Engine → Business Rules → Recommendation
```

### 4. User Interaction
```
Recommendation → User Interface → User Decision → Learning System
```

### 5. Learning Loop
```
User Decision → Pattern Storage → Decision Engine Update → Improved Recommendations
```

## Component Interactions

### Real-time Operation Flow
1. **File Operation Occurs** - User or agent attempts to create/write file
2. **Interception** - FileOperationInterceptor captures the event
3. **Analysis Request** - Event forwarded to ContinuityCortex Agent
4. **Similarity Analysis** - Multi-layer analysis of similar files
5. **Decision Generation** - Rule-based recommendation creation
6. **User Interaction** - Recommendation presented with options
7. **Action Execution** - User choice executed (create/update/merge)
8. **Learning Update** - Decision stored for future improvement

### Storage Interaction Flow
1. **File Metadata Storage** - Basic file info stored in graph database
2. **Relationship Tracking** - Similar files linked with edges
3. **Pattern Caching** - Similarity analysis results cached
4. **Learning Persistence** - User decisions stored for pattern learning

## Integration Points

### Mastra Framework Integration
```typescript
// Agent Integration Pattern
export class ContinuityCortexAgent extends Agent {
  constructor(config: CortexConfig) {
    super({
      name: 'ContinuityCortex',
      instructions: CORTEX_INSTRUCTIONS,
      model: openRouter.chat('anthropic/claude-3.5-haiku'),
      tools: {
        interceptFile: fileInterceptTool,
        analyzeSimilarity: similarityAnalysisTool,
        makeRecommendation: recommendationTool,
        learnFromDecision: learningTool
      },
      memory: new Memory({ storage: memoryStore })
    });
  }
}
```

### Storage Layer Integration
```typescript
// Graph Database Integration
class FileRelationshipTracker {
  constructor(private storage: KuzuStorageAdapter) {}

  async storeFileNode(file: FileInfo): Promise<void> {
    await this.storage.addNode({
      id: file.path,
      type: 'File',
      properties: {
        name: file.name,
        type: file.type,
        size: file.size,
        created: file.created,
        hash: file.contentHash
      }
    });
  }

  async storeSimilarityEdge(file1: string, file2: string, similarity: number): Promise<void> {
    await this.storage.addEdge({
      from: file1,
      to: file2,
      type: 'SIMILAR_TO',
      properties: { similarity, analyzed: new Date() }
    });
  }
}
```

### Tool Integration Pattern
```typescript
// Mastra Tool Pattern for File Operations
export const fileInterceptTool = createTool({
  id: 'interceptFileOperation',
  description: 'Analyze file operation for potential duplicates',
  parameters: z.object({
    operation: z.enum(['create', 'write', 'move']),
    path: z.string(),
    content: z.string().optional(),
    intent: z.string().optional()
  }),
  execute: async ({ operation, path, content, intent }) => {
    const analyzer = new SimilarityAnalyzer();
    const existingFiles = await findSimilarFiles(path);
    const analysis = await analyzer.analyze(path, content, existingFiles);

    const engine = new FileDecisionEngine();
    const recommendation = await engine.makeRecommendation(analysis);

    return {
      recommendation,
      similar_files: analysis.matches,
      confidence: recommendation.confidence,
      reasoning: recommendation.reasoning
    };
  }
});
```

## Performance Considerations

### Real-time Requirements
- **Analysis Time**: < 100ms for interactive operations
- **File Watching**: Minimal overhead on file system performance
- **Memory Usage**: Efficient caching with LRU eviction
- **CPU Usage**: Asynchronous processing to avoid blocking

### Optimization Strategies
```typescript
// Caching Strategy
class AnalysisCache {
  private cache = new Map<string, CachedAnalysis>();
  private maxSize = 1000;

  async getCachedAnalysis(fileHash: string): Promise<SimilarityAnalysis | null> {
    const cached = this.cache.get(fileHash);
    if (cached && !this.isStale(cached)) {
      return cached.analysis;
    }
    return null;
  }

  async cacheAnalysis(fileHash: string, analysis: SimilarityAnalysis): Promise<void> {
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    this.cache.set(fileHash, {
      analysis,
      timestamp: Date.now(),
      accessCount: 1
    });
  }
}
```

### Scalability Design
- **Asynchronous Processing**: All analysis operations non-blocking
- **Worker Thread Option**: CPU-intensive analysis can be offloaded
- **Incremental Analysis**: Analyze only changed portions of files
- **Configurable Depth**: Adjust analysis thoroughness based on needs

## Security and Privacy

### Data Protection
- **Content Privacy**: Analysis happens locally, no external API calls
- **File Access**: Read-only access to file content for analysis
- **Storage Security**: Encrypted storage of sensitive patterns
- **Access Control**: Integration with existing permission systems

### Attack Surface Analysis
- **File System Access**: Limited to configured directories
- **Code Injection**: Input validation and sanitization
- **Resource Exhaustion**: Rate limiting and resource quotas
- **Information Disclosure**: Careful handling of file content and paths

## Configuration and Customization

### Configuration Structure
```yaml
# continuity-cortex.config.yaml
cortex:
  enabled: true
  watch_paths:
    - "src/**/*"
    - "docs/**/*"
    - "context-network/**/*"
  ignore_patterns:
    - "node_modules/**"
    - ".git/**"
    - "*.log"

  similarity:
    name_weight: 0.3
    structure_weight: 0.4
    content_weight: 0.2
    usage_weight: 0.1
    threshold: 0.7

  behavior:
    auto_apply_threshold: 0.95
    prompt_threshold: 0.5
    learning_enabled: true
    feedback_required: false
```

### Extensibility Points
- **Custom Analyzers**: Plugin architecture for domain-specific analysis
- **Rule Extensions**: User-defined business rules
- **Integration Hooks**: Pre/post operation callbacks
- **UI Customization**: Configurable recommendation presentation

This architecture provides a solid foundation for the Continuity Cortex implementation while maintaining flexibility for future enhancements and customizations.