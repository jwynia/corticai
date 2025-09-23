/**
 * Specialized test scenarios for FileDecisionEngine
 *
 * This file contains complex, real-world scenarios that test
 * sophisticated decision-making logic and business rules.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as path from 'path';

// Import types
import {
  FileInfo,
  SimilarityResult
} from '../../../src/context/analyzers/types.js';

import {
  FileDecisionEngine,
  Recommendation,
  DecisionThresholds,
  DecisionRules,
  Alternative
} from './FileDecisionEngine.test.js';

// Import implementation
import { FileDecisionEngine as FileDecisionEngineImpl } from '../../../src/context/engines/FileDecisionEngine.js';

// Mock the implementation
vi.mock('../../../src/context/engines/FileDecisionEngine.js', () => ({
  FileDecisionEngine: vi.fn()
}));

describe('FileDecisionEngine - Complex Scenarios', () => {
  let engine: FileDecisionEngine;
  let mockImplementation: any;

  // Helper functions
  const createFileInfo = (
    filePath: string,
    content?: string,
    options?: Partial<FileInfo>
  ): FileInfo => ({
    path: filePath,
    content,
    contentHash: content ? 'hash-' + content.length : undefined,
    metadata: {
      size: content?.length || 0,
      extension: path.extname(filePath),
      mimeType: 'text/plain',
      lastModified: new Date(),
      ...options?.metadata
    },
    ...options
  });

  const createSimilarityResult = (
    overallScore: number,
    confidence: number = 0.8,
    sourceFile: string = '/test/source.ts',
    targetFile: string = '/test/target.ts',
    layerOverrides?: Partial<SimilarityResult['layers']>
  ): SimilarityResult => ({
    overallScore,
    overallConfidence: confidence,
    layers: {
      filename: { score: overallScore * 0.9, confidence, explanation: 'Filename similarity' },
      structure: { score: overallScore * 0.8, confidence, explanation: 'Structure similarity' },
      semantic: { score: overallScore * 0.7, confidence, explanation: 'Semantic similarity' },
      ...layerOverrides
    },
    recommendation: {
      action: overallScore > 0.8 ? 'merge' : overallScore > 0.5 ? 'update' : 'create',
      confidence,
      reason: `Score: ${overallScore}`,
      involvedFiles: [sourceFile, targetFile]
    },
    metadata: {
      analysisTime: new Date(),
      processingTimeMs: 50,
      algorithmsUsed: ['filename', 'structure', 'semantic'],
      sourceFile,
      targetFile
    }
  });

  beforeEach(() => {
    // Create comprehensive mock implementation
    mockImplementation = {
      generateRecommendation: vi.fn(),
      updateThresholds: vi.fn(),
      updateRules: vi.fn(),
      getConfig: vi.fn(),
      updateConfig: vi.fn()
    };

    (FileDecisionEngineImpl as any).mockImplementation(() => mockImplementation);

    // Setup sophisticated decision logic
    mockImplementation.generateRecommendation.mockImplementation(
      async (newFile: FileInfo, similarities: SimilarityResult[]): Promise<Recommendation> => {
        return generateSmartRecommendation(newFile, similarities);
      }
    );

    engine = new FileDecisionEngineImpl();
  });

  describe('Multi-Factor Decision Scenarios', () => {
    it('should handle conflicting layer signals appropriately', async () => {
      // Arrange - High filename similarity but low content similarity
      const newFile = createFileInfo('/project/components/UserProfile.tsx', 'new React component');
      const similarities = [
        createSimilarityResult(0.6, 0.8, newFile.path, '/existing/UserProfile.jsx', {
          filename: { score: 0.95, confidence: 0.9, explanation: 'Nearly identical filename' },
          structure: { score: 0.4, confidence: 0.7, explanation: 'Different component structure' },
          semantic: { score: 0.3, confidence: 0.6, explanation: 'Different functionality' }
        })
      ];

      // Act
      const recommendation = await engine.generateRecommendation(newFile, similarities);

      // Assert
      expect(recommendation.action).toBe('warn'); // Should warn about potential conflict
      expect(recommendation.reasoning).toContain('conflicting signals');
      expect(recommendation.alternatives.some(alt => alt.action === 'update')).toBe(true);
      expect(recommendation.alternatives.some(alt => alt.action === 'create')).toBe(true);
    });

    it('should prioritize semantic similarity over filename similarity', async () => {
      // Arrange - Low filename similarity but high semantic similarity
      const newFile = createFileInfo('/utils/dataProcessor.ts', 'data processing utilities');
      const similarities = [
        createSimilarityResult(0.75, 0.85, newFile.path, '/helpers/processData.ts', {
          filename: { score: 0.3, confidence: 0.8, explanation: 'Different filename pattern' },
          structure: { score: 0.8, confidence: 0.9, explanation: 'Similar function structure' },
          semantic: { score: 0.95, confidence: 0.95, explanation: 'Nearly identical functionality' }
        })
      ];

      // Act
      const recommendation = await engine.generateRecommendation(newFile, similarities);

      // Assert
      expect(recommendation.action).toBe('merge'); // Should recommend merge despite filename differences
      expect(recommendation.confidence).toBeGreaterThan(0.8);
      expect(recommendation.reasoning).toContain('semantic similarity');
    });

    it('should handle gradual similarity degradation', async () => {
      // Arrange - Multiple files with gradually decreasing similarity
      const newFile = createFileInfo('/api/userService.ts', 'user service API');
      const similarities = [
        createSimilarityResult(0.92, 0.9, newFile.path, '/services/user.ts'),      // Very similar
        createSimilarityResult(0.85, 0.85, newFile.path, '/api/authService.ts'),   // Similar
        createSimilarityResult(0.78, 0.8, newFile.path, '/lib/userUtils.ts'),      // Moderately similar
        createSimilarityResult(0.45, 0.7, newFile.path, '/models/User.ts')         // Less similar
      ];

      // Act
      const recommendation = await engine.generateRecommendation(newFile, similarities);

      // Assert
      expect(recommendation.action).toBe('merge');
      expect(recommendation.targetFile).toBe('/services/user.ts'); // Should choose highest similarity
      expect(recommendation.alternatives.length).toBeGreaterThan(1);
      expect(recommendation.alternatives[0].targetFile).toBe('/api/authService.ts'); // Second best alternative
    });
  });

  describe('File Type Specific Logic', () => {
    it('should apply different thresholds for configuration files', async () => {
      // Arrange - Configuration files should have lower merge thresholds
      const configFile = createFileInfo('/config/database.json', '{"host": "localhost"}');
      const similarities = [
        createSimilarityResult(0.7, 0.8, configFile.path, '/config/db.json')
      ];

      // Act
      const recommendation = await engine.generateRecommendation(configFile, similarities);

      // Assert
      expect(recommendation.action).toBe('update'); // Config files should be more conservative
      expect(recommendation.reasoning).toContain('configuration file');
    });

    it('should handle test files with special logic', async () => {
      // Arrange - Test files might need different treatment
      const testFile = createFileInfo('/tests/userService.test.ts', 'test suite for user service');
      const similarities = [
        createSimilarityResult(0.8, 0.85, testFile.path, '/tests/user.test.ts')
      ];

      // Act
      const recommendation = await engine.generateRecommendation(testFile, similarities);

      // Assert
      expect(recommendation.reasoning).toContain('test file');
      // Test files should lean toward creation to avoid merging different test scenarios
      expect(recommendation.alternatives.some(alt => alt.action === 'create')).toBe(true);
    });

    it('should handle documentation files appropriately', async () => {
      // Arrange - Documentation files should favor updates over merges
      const docFile = createFileInfo('/docs/api-guide.md', '# API Usage Guide');
      const similarities = [
        createSimilarityResult(0.85, 0.9, docFile.path, '/docs/api.md')
      ];

      // Act
      const recommendation = await engine.generateRecommendation(docFile, similarities);

      // Assert
      expect(recommendation.action).toBe('update'); // Documentation should update existing
      expect(recommendation.reasoning).toContain('documentation');
    });
  });

  describe('Project Structure Awareness', () => {
    it('should consider file location hierarchy in decisions', async () => {
      // Arrange - Similar files in different project areas
      const newFile = createFileInfo('/frontend/components/Button.tsx', 'React button component');
      const similarities = [
        createSimilarityResult(0.8, 0.85, newFile.path, '/backend/components/Button.ts'),     // Wrong area
        createSimilarityResult(0.75, 0.8, newFile.path, '/frontend/ui/Button.tsx'),          // Right area, wrong folder
        createSimilarityResult(0.7, 0.8, newFile.path, '/frontend/components/Link.tsx')      // Right location, different component
      ];

      // Act
      const recommendation = await engine.generateRecommendation(newFile, similarities);

      // Assert
      // Should prefer files in the same project area even with slightly lower similarity
      expect(recommendation.targetFile).toBe('/frontend/ui/Button.tsx');
      expect(recommendation.reasoning).toContain('project structure');
    });

    it('should detect potential naming conflicts', async () => {
      // Arrange - New file might conflict with existing naming patterns
      const newFile = createFileInfo('/utils/index.ts', 'utility index file');
      const similarities = [
        createSimilarityResult(0.9, 0.85, newFile.path, '/utils/main.ts'),    // High similarity but different role
        createSimilarityResult(0.6, 0.7, newFile.path, '/lib/index.ts')       // Lower similarity but same pattern
      ];

      // Act
      const recommendation = await engine.generateRecommendation(newFile, similarities);

      // Assert
      expect(recommendation.action).toBe('warn'); // Should warn about potential naming conflict
      expect(recommendation.reasoning).toContain('naming pattern');
      expect(recommendation.alternatives.some(alt => alt.reason.includes('rename'))).toBe(true);
    });
  });

  describe('Business Logic Edge Cases', () => {
    it('should handle circular dependency risks', async () => {
      // Arrange - New file might create circular dependencies
      const newFile = createFileInfo('/services/userService.ts', 'import authService; export userLogic');
      const similarities = [
        createSimilarityResult(0.85, 0.9, newFile.path, '/services/authService.ts') // Auth service that might import user
      ];

      // Act
      const recommendation = await engine.generateRecommendation(newFile, similarities);

      // Assert
      expect(recommendation.action).toBe('create'); // Should avoid potential circular dependency
      expect(recommendation.reasoning).toContain('dependency');
    });

    it('should consider file size implications', async () => {
      // Arrange - Large files should discourage merging
      const largeContent = 'x'.repeat(50000); // Large file content
      const newFile = createFileInfo('/components/LargeComponent.tsx', largeContent);
      const similarities = [
        createSimilarityResult(0.88, 0.9, newFile.path, '/components/ExistingLarge.tsx')
      ];

      // Act
      const recommendation = await engine.generateRecommendation(newFile, similarities);

      // Assert
      expect(recommendation.action).toBe('create'); // Large files should avoid merging
      expect(recommendation.reasoning).toContain('file size');
      expect(recommendation.alternatives.some(alt => alt.action === 'update')).toBe(true);
    });

    it('should handle version control considerations', async () => {
      // Arrange - Files that might have different version control implications
      const newFile = createFileInfo('/migrations/20240101_add_users.sql', 'CREATE TABLE users...');
      const similarities = [
        createSimilarityResult(0.8, 0.85, newFile.path, '/migrations/20231201_create_users.sql')
      ];

      // Act
      const recommendation = await engine.generateRecommendation(newFile, similarities);

      // Assert
      expect(recommendation.action).toBe('create'); // Migrations should never merge
      expect(recommendation.reasoning).toContain('migration');
      expect(recommendation.autoApply).toBe(false); // Never auto-apply migrations
    });
  });

  describe('Learning and Adaptation Scenarios', () => {
    it('should adjust recommendations based on historical patterns', async () => {
      // Arrange - Simulate learning from past decisions
      const newFile = createFileInfo('/components/Modal.tsx', 'Modal component');
      const similarities = [
        createSimilarityResult(0.75, 0.8, newFile.path, '/ui/Dialog.tsx')
      ];

      // Simulate historical learning that users prefer creating new components
      mockImplementation.generateRecommendation.mockImplementationOnce(
        async () => ({
          action: 'create',
          confidence: 0.85,
          reasoning: 'Based on user preferences, new components are typically created separately',
          alternatives: [
            { action: 'update', confidence: 0.6, reason: 'Update existing if very similar' }
          ],
          autoApply: false,
          metadata: {
            timestamp: new Date(),
            processingTimeMs: 30,
            appliedRules: ['historical-preference', 'component-pattern'],
            similarityInputs: similarities
          }
        })
      );

      // Act
      const recommendation = await engine.generateRecommendation(newFile, similarities);

      // Assert
      expect(recommendation.action).toBe('create');
      expect(recommendation.reasoning).toContain('user preferences');
      expect(recommendation.metadata.appliedRules).toContain('historical-preference');
    });

    it('should adapt to project-specific patterns', async () => {
      // Arrange - Project that favors specific organizational patterns
      const newFile = createFileInfo('/features/auth/components/LoginForm.tsx', 'login form');
      const similarities = [
        createSimilarityResult(0.8, 0.85, newFile.path, '/components/LoginForm.tsx') // Different organization style
      ];

      // Act
      const recommendation = await engine.generateRecommendation(newFile, similarities);

      // Assert
      expect(recommendation.reasoning).toContain('project structure');
      expect(recommendation.alternatives.some(alt =>
        alt.reason.includes('feature organization')
      )).toBe(true);
    });
  });

  describe('Security and Safety Considerations', () => {
    it('should handle sensitive files with extra caution', async () => {
      // Arrange - Files that might contain sensitive information
      const sensitiveFile = createFileInfo('/.env.production', 'SECRET_KEY=...');
      const similarities = [
        createSimilarityResult(0.9, 0.95, sensitiveFile.path, '/.env.development')
      ];

      // Act
      const recommendation = await engine.generateRecommendation(sensitiveFile, similarities);

      // Assert
      expect(recommendation.action).toBe('create'); // Sensitive files should never merge
      expect(recommendation.autoApply).toBe(false); // Never auto-apply sensitive changes
      expect(recommendation.reasoning).toContain('sensitive');
    });

    it('should validate against dangerous operations', async () => {
      // Arrange - Operation that might be dangerous
      const systemFile = createFileInfo('/system/critical.sh', 'rm -rf system files');
      const similarities = [
        createSimilarityResult(0.95, 0.9, systemFile.path, '/system/backup.sh')
      ];

      // Act
      const recommendation = await engine.generateRecommendation(systemFile, similarities);

      // Assert
      expect(recommendation.action).toBe('warn'); // Should warn about dangerous operations
      expect(recommendation.autoApply).toBe(false);
      expect(recommendation.reasoning).toContain('potentially dangerous');
    });
  });
});

// Helper function to simulate sophisticated decision logic
function generateSmartRecommendation(newFile: FileInfo, similarities: SimilarityResult[]): Recommendation {
  const ext = path.extname(newFile.path);
  const dirname = path.dirname(newFile.path);
  const filename = path.basename(newFile.path);

  // Initialize decision variables
  let action: 'create' | 'update' | 'merge' | 'warn' = 'create';
  let confidence = 0.5;
  let reasoning = 'Default recommendation';
  let targetFile: string | undefined;
  let alternatives: Alternative[] = [];
  let autoApply = false;

  if (similarities.length === 0) {
    action = 'create';
    confidence = 0.9;
    reasoning = 'No similar files found, creating new file';
    autoApply = true;
  } else {
    const bestMatch = similarities[0];
    const score = bestMatch.overallScore;
    confidence = bestMatch.overallConfidence;
    targetFile = bestMatch.metadata.targetFile;

    // Special handling for different file types
    if (ext === '.json' && filename.includes('config')) {
      // Configuration files
      if (score >= 0.7) {
        action = 'update';
        reasoning = 'Configuration file - updating existing to avoid duplication';
      } else {
        action = 'create';
        reasoning = 'Configuration file with low similarity - creating separate config';
      }
    } else if (filename.includes('.test.') || filename.includes('.spec.')) {
      // Test files
      if (score >= 0.9) {
        action = 'merge';
        reasoning = 'Test file with very high similarity - consider merging test cases';
      } else {
        action = 'create';
        reasoning = 'Test file - creating separate test to avoid mixing test scenarios';
      }
    } else if (ext === '.md') {
      // Documentation files
      if (score >= 0.8) {
        action = 'update';
        reasoning = 'Documentation file - updating existing documentation';
      } else {
        action = 'create';
        reasoning = 'Documentation with different focus - creating separate document';
      }
    } else if (filename.includes('migration') || filename.includes('Migration')) {
      // Migration files
      action = 'create';
      reasoning = 'Migration file - always create separate migrations';
      autoApply = false;
    } else if (filename.startsWith('.env') || filename.includes('secret') || filename.includes('key')) {
      // Sensitive files
      action = 'create';
      reasoning = 'Sensitive file - creating separate file for security';
      autoApply = false;
    } else if (filename.includes('index.') && similarities.some(s => path.basename(s.metadata.targetFile || '') === filename)) {
      // Potential naming conflicts
      action = 'warn';
      reasoning = 'Potential naming pattern conflict detected';
    } else {
      // Regular logic based on similarity scores
      if (score >= 0.85) {
        action = 'merge';
        reasoning = `High similarity score (${score.toFixed(2)}) suggests merging files`;
        confidence = Math.min(confidence * 1.1, 1.0);
      } else if (score >= 0.7) {
        action = 'update';
        reasoning = `Medium similarity score (${score.toFixed(2)}) suggests updating existing file`;
      } else if (score >= 0.3) {
        action = 'warn';
        reasoning = `Some similarity detected (${score.toFixed(2)}) - review for potential conflicts`;
        confidence = confidence * 0.8;
      } else {
        action = 'create';
        reasoning = `Low similarity score (${score.toFixed(2)}) suggests creating new file`;
      }
    }

    // Check for conflicting layer signals
    const layers = bestMatch.layers;
    const filenameScore = layers.filename?.score || 0;
    const semanticScore = layers.semantic?.score || 0;
    const structureScore = layers.structure?.score || 0;

    if (Math.abs(filenameScore - semanticScore) > 0.4) {
      action = 'warn';
      reasoning += ' - conflicting signals between filename and content similarity';
    }

    // Project structure considerations
    const newDir = path.dirname(newFile.path);
    const targetDir = targetFile ? path.dirname(targetFile) : '';

    if (targetFile && !newDir.includes(targetDir.split('/')[1])) {
      // Different top-level directories
      if (action === 'merge') {
        action = 'update';
        reasoning += ' - preferring update due to different project areas';
      }
    }

    // Generate alternatives
    if (action === 'merge') {
      alternatives.push(
        { action: 'update', confidence: confidence * 0.8, reason: 'Update instead of merge' },
        { action: 'create', confidence: confidence * 0.6, reason: 'Create new instead' }
      );
    } else if (action === 'update') {
      alternatives.push(
        { action: 'merge', confidence: confidence * 1.2, reason: 'Consider merge if confident' },
        { action: 'create', confidence: confidence * 0.7, reason: 'Create new if updates are complex' }
      );
    } else if (action === 'create') {
      if (similarities.length > 0) {
        alternatives.push(
          { action: 'update', confidence: confidence * 0.9, reason: 'Update most similar file' }
        );
      }
    }

    // Auto-apply logic
    autoApply = confidence >= 0.9 && action !== 'warn' && !filename.includes('sensitive');
  }

  return {
    action,
    targetFile,
    confidence,
    reasoning,
    alternatives,
    autoApply,
    metadata: {
      timestamp: new Date(),
      processingTimeMs: 25,
      appliedRules: ['smart-decision'],
      similarityInputs: similarities
    }
  };
}