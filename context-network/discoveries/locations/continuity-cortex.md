# Continuity Cortex Component Locations

## Main Orchestration Components

### ContinuityCortex (Main Orchestrator)
- **What**: Central orchestration component that coordinates file operation interception, similarity analysis, and decision making
- **Where**: `/workspaces/corticai/app/src/context/cortex/ContinuityCortex.ts:1-200`
- **Key Methods**: `start()`, `stop()`, `analyzeFile()`, `getRecommendation()`
- **Related**: [[cortex-types]], [[cortex-config]], [[orchestration-patterns]]

### Cortex Configuration System
- **What**: Configuration management for cortex behavior, thresholds, and performance settings
- **Where**: `/workspaces/corticai/app/src/context/cortex/config.ts:1-150`
- **Key Features**: Environment-specific configs, validation, defaults management
- **Related**: [[configuration-patterns]], [[cortex-types]]

### Cortex Type Definitions
- **What**: TypeScript type definitions for cortex interfaces, events, and data structures
- **Where**: `/workspaces/corticai/app/src/context/cortex/types.ts:1-200`
- **Key Types**: `ContinuityCortex`, `CortexConfig`, `CortexAnalysisResult`, `CortexRecommendation`
- **Related**: [[type-safety-patterns]], [[interface-design]]

## File Decision Engine Components

### FileDecisionEngine (Core Decision Logic)
- **What**: Rule-based decision engine that transforms similarity analysis into actionable recommendations
- **Where**: `/workspaces/corticai/app/src/context/engines/FileDecisionEngine.ts:1-200`
- **Key Methods**: `generateRecommendation()`, `analyzeThresholds()`, `applyRules()`
- **Related**: [[decision-engine-rules]], [[similarity-analysis]]

### Decision Engine Configuration
- **What**: Configuration system for decision thresholds, rules, and performance limits
- **Where**: `/workspaces/corticai/app/src/context/engines/config.ts:1-100`
- **Key Features**: Threshold management, timeout configuration, rule weighting
- **Related**: [[decision-thresholds]], [[performance-tuning]]

### Rule Engine Implementation
- **What**: Modular rule system for complex decision-making logic with business rule integration
- **Where**: `/workspaces/corticai/app/src/context/engines/rules.ts:1-300`
- **Key Features**: File type rules, project structure awareness, threshold evaluation
- **Related**: [[rule-based-systems]], [[business-logic-patterns]]

### Decision Engine Types
- **What**: Type definitions for decision engine interfaces, rules, and recommendation structures
- **Where**: `/workspaces/corticai/app/src/context/engines/types.ts:1-150`
- **Key Types**: `FileDecisionEngine`, `Recommendation`, `DecisionRules`, `ValidationError`
- **Related**: [[decision-types]], [[error-handling]]

### Engine Module Exports
- **What**: Central export point for all decision engine components and utilities
- **Where**: `/workspaces/corticai/app/src/context/engines/index.ts:1-30`
- **Purpose**: Clean module interface and dependency management
- **Related**: [[module-organization]]

## Similarity Analysis Components

### SimilarityAnalyzer (Multi-Layer Analysis)
- **What**: Orchestrates multiple analysis layers for comprehensive file similarity assessment
- **Where**: `/workspaces/corticai/app/src/context/analyzers/SimilarityAnalyzer.ts:1-250`
- **Key Features**: Layer coordination, caching, batch processing, performance optimization
- **Related**: [[filename-analyzer]], [[structure-analyzer]], [[semantic-analyzer]]

### FilenameAnalyzer Layer
- **What**: Specialized analyzer for filename pattern similarity and naming convention analysis
- **Where**: `/workspaces/corticai/app/src/context/analyzers/layers/FilenameAnalyzer.ts:1-200`
- **Key Features**: Pattern matching, extension analysis, naming convention detection
- **Related**: [[similarity-scoring]], [[pattern-matching]]

### StructureAnalyzer Layer
- **What**: Code structure and organization analysis for architectural similarity assessment
- **Where**: `/workspaces/corticai/app/src/context/analyzers/layers/StructureAnalyzer.ts:1-180`
- **Key Features**: AST analysis, import pattern detection, code organization assessment
- **Related**: [[ast-analysis]], [[code-structure-patterns]]

### SemanticAnalyzer Layer
- **What**: Content semantic similarity analysis using advanced text processing techniques
- **Where**: `/workspaces/corticai/app/src/context/analyzers/layers/SemanticAnalyzer.ts:1-160`
- **Key Features**: Semantic similarity scoring, content analysis, contextual understanding
- **Related**: [[semantic-analysis]], [[text-processing]]

### Analyzer Type Definitions
- **What**: Comprehensive type system for all analyzer components and interfaces
- **Where**: `/workspaces/corticai/app/src/context/analyzers/types.ts:1-200`
- **Key Types**: `FileInfo`, `SimilarityResult`, `BatchSimilarityResult`, `SimilarityConfig`
- **Related**: [[analyzer-interfaces]], [[similarity-types]]

### Analyzer Utilities
- **What**: Shared utility functions for analyzers including caching and performance helpers
- **Where**: `/workspaces/corticai/app/src/context/analyzers/utils.ts:1-100`
- **Key Features**: Cache key generation, performance measurement, common calculations
- **Related**: [[utility-patterns]], [[performance-optimization]]

## File Operation Interception

### FileOperationInterceptor
- **What**: Monitors file system operations to trigger intelligence analysis and prevent duplicates
- **Where**: `/workspaces/corticai/app/src/context/interceptors/FileOperationInterceptor.ts:1-300`
- **Key Features**: File operation detection, event emission, path filtering
- **Related**: [[file-system-monitoring]], [[event-driven-architecture]]

### Interceptor Type Definitions
- **What**: Type definitions for file operation events and metadata structures
- **Where**: `/workspaces/corticai/app/src/context/interceptors/types.ts:1-100`
- **Key Types**: `FileOperationEvent`, `FileMetadata`, `OperationType`
- **Related**: [[event-types]], [[file-system-types]]

## Test Infrastructure

### Cortex Integration Tests
- **What**: Complete integration testing for cortex orchestration and component interaction
- **Where**: `/workspaces/corticai/app/tests/context/cortex/ContinuityCortex.test.ts:1-400`
- **Coverage**: End-to-end workflows, error scenarios, configuration testing
- **Related**: [[integration-testing]], [[cortex-testing-patterns]]

### Decision Engine Unit Tests
- **What**: Comprehensive unit testing for decision engine logic and rule evaluation
- **Where**: `/workspaces/corticai/app/tests/context/engines/FileDecisionEngine.test.ts:1-800`
- **Coverage**: Rule testing, threshold validation, error handling, performance testing
- **Related**: [[unit-testing]], [[decision-testing-patterns]]

### Decision Scenario Tests
- **What**: Specialized tests for complex decision scenarios and edge cases
- **Where**: `/workspaces/corticai/app/tests/context/engines/decision-scenarios.test.ts:1-500`
- **Coverage**: Multi-factor decisions, file type logic, project structure awareness
- **Related**: [[scenario-testing]], [[edge-case-validation]]

### Simple Decision Engine Tests
- **What**: Basic functionality tests for decision engine core operations
- **Where**: `/workspaces/corticai/app/tests/context/engines/FileDecisionEngine.simple.test.ts:1-300`
- **Coverage**: Basic decision logic, simple scenarios, sanity checks
- **Related**: [[smoke-testing]], [[basic-functionality]]

### SimilarityAnalyzer Tests
- **What**: Complete test suite for similarity analysis components and layer integration
- **Where**: `/workspaces/corticai/app/tests/context/analyzers/SimilarityAnalyzer.test.ts:1-600`
- **Coverage**: Layer testing, caching validation, performance verification
- **Related**: [[analyzer-testing]], [[layer-testing-patterns]]

### FilenameAnalyzer Tests
- **What**: Focused testing for filename analysis patterns and edge cases
- **Where**: `/workspaces/corticai/app/tests/context/analyzers/layers/FilenameAnalyzer.test.ts:1-400`
- **Coverage**: Pattern matching, extension handling, naming convention detection
- **Related**: [[filename-testing]], [[pattern-testing]]

## Test Support Files

### Corrupted Test Data
- **What**: Deliberately corrupted JSON file for testing error handling in indexing processes
- **Where**: `/workspaces/corticai/app/tests/indexes/corrupted-test.json:1-5`
- **Purpose**: Validates graceful handling of malformed data during analysis
- **Related**: [[error-testing]], [[data-validation]]

## Entry Points and Integration

### Context Module Root
- **What**: Primary entry point for all context-related functionality and component access
- **Where**: `/workspaces/corticai/app/src/context/` directory structure
- **Organization**: Clear separation between cortex/, engines/, analyzers/, interceptors/
- **Related**: [[module-architecture]], [[component-organization]]

### Tool Integration Points
- **What**: Mastra framework tool integrations for external system access
- **Where**: `/workspaces/corticai/app/src/context/tools/` directory
- **Components**: `analyze.tool.ts`, `query.tool.ts`, `store.tool.ts`
- **Related**: [[tool-integration]], [[external-interfaces]]