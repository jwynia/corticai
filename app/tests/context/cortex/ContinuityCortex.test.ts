/**
 * Integration tests for ContinuityCortex
 *
 * Tests the complete orchestration of FileOperationInterceptor,
 * SimilarityAnalyzer, and FileDecisionEngine components.
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

import { ContinuityCortex } from '../../../src/context/cortex/ContinuityCortex.js';
import {
  CortexConfig,
  DEFAULT_CORTEX_CONFIG,
  CortexAnalysisResult,
  CortexRecommendation,
  CortexStatus,
  CortexEventListener
} from '../../../src/context/cortex/types.js';
import { FileInfo } from '../../../src/context/analyzers/types.js';

describe('ContinuityCortex Integration', () => {
  let cortex: ContinuityCortex;
  let tempDir: string;
  let testFiles: string[] = [];

  beforeAll(async () => {
    // Create temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cortex-test-'));
  });

  afterAll(async () => {
    // Clean up temporary directory
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Create fresh cortex instance for each test
    const config: Partial<CortexConfig> = {
      monitoring: {
        ...DEFAULT_CORTEX_CONFIG.monitoring,
        watchPaths: [tempDir],
        debounceMs: 50, // Faster for tests
        maxFileSize: 10000
      },
      analysis: {
        ...DEFAULT_CORTEX_CONFIG.analysis,
        analysisTimeoutMs: 2000
      },
      performance: {
        ...DEFAULT_CORTEX_CONFIG.performance,
        maxConcurrentAnalyses: 1,
        cacheTTL: 1000 // Short TTL for tests
      }
    };

    cortex = new ContinuityCortex(config);
    testFiles = [];
  });

  afterEach(async () => {
    // Stop cortex and clean up test files
    await cortex.stop();

    for (const file of testFiles) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // File might already be deleted
      }
    }
  });

  describe('Initialization and Configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultCortex = new ContinuityCortex();
      const config = defaultCortex.getConfig();

      expect(config).toMatchObject({
        monitoring: expect.objectContaining({
          watchPaths: expect.arrayContaining([process.cwd()]),
          debounceMs: 300
        }),
        analysis: expect.objectContaining({
          enabled: true,
          similarityThreshold: 0.7
        }),
        decisions: expect.objectContaining({
          enabled: true,
          autoApplyThreshold: 0.9
        })
      });
    });

    it('should initialize with custom configuration', () => {
      const customConfig: Partial<CortexConfig> = {
        analysis: {
          enabled: false,
          similarityThreshold: 0.8,
          confidenceThreshold: 0.7,
          maxComparisonFiles: 50,
          analysisTimeoutMs: 3000
        }
      };

      const customCortex = new ContinuityCortex(customConfig);
      const config = customCortex.getConfig();

      expect(config.analysis.enabled).toBe(false);
      expect(config.analysis.similarityThreshold).toBe(0.8);
      expect(config.analysis.confidenceThreshold).toBe(0.7);
    });

    it('should update configuration at runtime', () => {
      const updates: Partial<CortexConfig> = {
        decisions: {
          enabled: false,
          autoApplyThreshold: 0.95,
          maxAlternatives: 5,
          enableExplanations: false
        }
      };

      cortex.updateConfig(updates);
      const config = cortex.getConfig();

      expect(config.decisions.enabled).toBe(false);
      expect(config.decisions.autoApplyThreshold).toBe(0.95);
      expect(config.decisions.maxAlternatives).toBe(5);
    });

    it('should validate configuration on update', () => {
      expect(() => {
        cortex.updateConfig({
          analysis: {
            enabled: true,
            similarityThreshold: -0.5, // Invalid: negative threshold
            confidenceThreshold: 0.6,
            maxComparisonFiles: 100,
            analysisTimeoutMs: 5000
          }
        });
      }).toThrow('similarityThreshold must be between 0 and 1');
    });
  });

  describe('System Lifecycle', () => {
    it('should start successfully', async () => {
      await cortex.start();
      const status = cortex.getStatus();

      expect(status.status).toBe('running');
      expect(status.components.interceptor).toBe('running');
      expect(status.components.analyzer).toBe('running');
      expect(status.components.decisionEngine).toBe('running');
    });

    it('should stop successfully', async () => {
      await cortex.start();
      await cortex.stop();
      const status = cortex.getStatus();

      expect(status.status).toBe('stopped');
    });

    it('should handle multiple start calls gracefully', async () => {
      await cortex.start();
      await cortex.start(); // Should not throw

      const status = cortex.getStatus();
      expect(status.status).toBe('running');
    });

    it('should handle stop before start gracefully', async () => {
      await cortex.stop(); // Should not throw

      const status = cortex.getStatus();
      expect(status.status).toBe('stopped');
    });

    it('should provide accurate status information', async () => {
      const initialStatus = cortex.getStatus();
      expect(initialStatus.status).toBe('stopped');

      await cortex.start();
      const runningStatus = cortex.getStatus();

      expect(runningStatus.status).toBe('running');
      expect(runningStatus.monitoredPaths).toEqual([tempDir]);
      expect(runningStatus.uptimeMs).toBeGreaterThanOrEqual(0); // Changed to >= 0 for fast tests
      expect(runningStatus.activeAnalyses).toBe(0);
    });
  });

  describe('File Operation Monitoring', () => {
    it('should detect file creation events', async () => {
      const events: any[] = [];
      const listener: CortexEventListener = {
        onFileOperation: (event) => events.push(event)
      };

      cortex.addEventListener(listener);
      await cortex.start();

      // Create a test file
      const testFile = path.join(tempDir, 'test-creation.md');
      testFiles.push(testFile);
      await fs.writeFile(testFile, '# Test File\n\nThis is a test file.');

      // Wait for debounce and processing
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(events).toHaveLength(1);
      expect(events[0].operation).toBe('create');
      expect(events[0].path).toBe(testFile);
    });

    it('should detect file modification events', async () => {
      const events: any[] = [];
      const listener: CortexEventListener = {
        onFileOperation: (event) => events.push(event)
      };

      // Create file first
      const testFile = path.join(tempDir, 'test-modification.md');
      testFiles.push(testFile);
      await fs.writeFile(testFile, '# Initial Content');

      cortex.addEventListener(listener);
      await cortex.start();

      // Wait for initial detection to settle
      await new Promise(resolve => setTimeout(resolve, 100));
      events.length = 0; // Clear initial events

      // Modify the file
      await fs.writeFile(testFile, '# Modified Content\n\nAdded more content.');

      // Wait for debounce and processing
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(events).toHaveLength(1);
      expect(events[0].operation).toBe('write');
      expect(events[0].path).toBe(testFile);
    });

    it('should respect ignore patterns', async () => {
      const events: any[] = [];
      const listener: CortexEventListener = {
        onFileOperation: (event) => events.push(event)
      };

      cortex.addEventListener(listener);
      await cortex.start();

      // Create a file that should be ignored
      const logFile = path.join(tempDir, 'test.log');
      await fs.writeFile(logFile, 'Log content');

      // Create a file that should not be ignored
      const mdFile = path.join(tempDir, 'test.md');
      testFiles.push(mdFile);
      await fs.writeFile(mdFile, '# Markdown content');

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should only detect the markdown file, not the log file
      expect(events).toHaveLength(1);
      expect(events[0].path).toBe(mdFile);

      // Clean up
      await fs.unlink(logFile);
    });
  });

  describe('Similarity Analysis Integration', () => {
    it('should analyze file similarity automatically', async () => {
      const analyses: CortexAnalysisResult[] = [];
      const listener: CortexEventListener = {
        onAnalysisComplete: (result) => analyses.push(result)
      };

      cortex.addEventListener(listener);
      await cortex.start();

      // Create first file
      const file1 = path.join(tempDir, 'original.md');
      testFiles.push(file1);
      await fs.writeFile(file1, '# Original Document\n\nThis is the original content.');

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Create similar file
      const file2 = path.join(tempDir, 'similar.md');
      testFiles.push(file2);
      await fs.writeFile(file2, '# Similar Document\n\nThis is very similar content.');

      // Wait for analysis
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(analyses).toHaveLength(2); // One for each file

      const analysis = analyses.find(a => a.targetFile.path === file2);
      expect(analysis).toBeDefined();
      expect(analysis!.similarities.similarities).toHaveLength(1); // Should find one similar file
      expect(analysis!.similarities.bestMatch).toBeDefined();
      expect(analysis!.similarities.bestMatch!.overallScore).toBeGreaterThan(0.5);
    });

    it('should handle manual file analysis', async () => {
      await cortex.start();

      // Create test files manually
      const file1 = path.join(tempDir, 'manual1.md');
      const file2 = path.join(tempDir, 'manual2.md');
      testFiles.push(file1, file2);

      await fs.writeFile(file1, '# Manual Test 1\n\nFirst file content.');
      await fs.writeFile(file2, '# Manual Test 2\n\nSecond file content.');

      // Manually analyze file2 against existing files
      const file2Info: FileInfo = {
        path: file2,
        content: '# Manual Test 2\n\nSecond file content.',
        metadata: {
          size: 42,
          extension: '.md',
          mimeType: 'text/markdown',
          encoding: 'utf8',
          lastModified: new Date()
        }
      };

      const result = await cortex.analyzeFileOperation(file2Info);

      expect(result).toBeDefined();
      expect(result.targetFile.path).toBe(file2);
      expect(result.similarities).toBeDefined();
      expect(result.recommendation).toBeDefined();
      expect(result.metadata.processingTimeMs).toBeGreaterThan(0);
    });
  });

  describe('Decision Generation', () => {
    it('should generate recommendations for similar files', async () => {
      const recommendations: CortexRecommendation[] = [];
      const listener: CortexEventListener = {
        onRecommendation: (rec) => recommendations.push(rec)
      };

      cortex.addEventListener(listener);
      await cortex.start();

      // Create original file
      const original = path.join(tempDir, 'readme.md');
      testFiles.push(original);
      await fs.writeFile(original, '# Project README\n\n## Installation\n\nRun npm install.');

      await new Promise(resolve => setTimeout(resolve, 200));

      // Create very similar file (potential duplicate)
      const duplicate = path.join(tempDir, 'readme-copy.md');
      testFiles.push(duplicate);
      await fs.writeFile(duplicate, '# Project README\n\n## Installation\n\nRun npm install.\n\n## Extra Info');

      // Wait for analysis and recommendation
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(recommendations).toHaveLength(2); // One for each file

      const dupRecommendation = recommendations.find(r =>
        r.supportingData.bestMatch?.sourceFile === duplicate ||
        r.supportingData.bestMatch?.targetFile === duplicate
      );

      expect(dupRecommendation).toBeDefined();
      expect(['merge', 'warn', 'update']).toContain(dupRecommendation!.action);
      expect(dupRecommendation!.confidence).toBeGreaterThan(0.6);
      expect(dupRecommendation!.reason).toContain('similar');
    });

    it('should recommend create for dissimilar files', async () => {
      const recommendations: CortexRecommendation[] = [];
      const listener: CortexEventListener = {
        onRecommendation: (rec) => recommendations.push(rec)
      };

      cortex.addEventListener(listener);
      await cortex.start();

      // Create original file
      const original = path.join(tempDir, 'code.ts');
      testFiles.push(original);
      await fs.writeFile(original, 'export function add(a: number, b: number) { return a + b; }');

      await new Promise(resolve => setTimeout(resolve, 200));

      // Create dissimilar file
      const different = path.join(tempDir, 'config.json');
      testFiles.push(different);
      await fs.writeFile(different, '{"name": "test", "version": "1.0.0"}');

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(recommendations).toHaveLength(2);

      const configRecommendation = recommendations.find(r =>
        r.supportingData.bestMatch === undefined ||
        r.supportingData.bestMatch.overallScore < 0.5
      );

      expect(configRecommendation).toBeDefined();
      expect(configRecommendation!.action).toBe('create');
    });

    it('should provide alternatives in recommendations', async () => {
      const recommendations: CortexRecommendation[] = [];
      const listener: CortexEventListener = {
        onRecommendation: (rec) => recommendations.push(rec)
      };

      cortex.addEventListener(listener);
      await cortex.start();

      // Create files that might trigger alternative suggestions
      const file1 = path.join(tempDir, 'component.tsx');
      testFiles.push(file1);
      await fs.writeFile(file1, 'import React from "react"; export function Button() { return <button>Click</button>; }');

      await new Promise(resolve => setTimeout(resolve, 200));

      const file2 = path.join(tempDir, 'component-v2.tsx');
      testFiles.push(file2);
      await fs.writeFile(file2, 'import React from "react"; export function Button() { return <button className="btn">Click Me</button>; }');

      await new Promise(resolve => setTimeout(resolve, 500));

      const recommendation = recommendations.find(r => r.alternatives.length > 0);
      expect(recommendation).toBeDefined();
      expect(recommendation!.alternatives.length).toBeGreaterThan(0);

      for (const alt of recommendation!.alternatives) {
        expect(alt.action).toMatch(/^(create|update|merge|warn|ignore)$/);
        expect(alt.confidence).toBeGreaterThanOrEqual(0);
        expect(alt.confidence).toBeLessThanOrEqual(1);
        expect(alt.reason).toBeTruthy();
      }
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle analysis timeout gracefully', async () => {
      // Configure very short timeout
      cortex.updateConfig({
        analysis: {
          enabled: true,
          similarityThreshold: 0.7,
          confidenceThreshold: 0.6,
          maxComparisonFiles: 100,
          analysisTimeoutMs: 1 // Very short timeout
        }
      });

      const errors: any[] = [];
      const listener: CortexEventListener = {
        onError: (error) => errors.push(error)
      };

      cortex.addEventListener(listener);
      await cortex.start();

      const testFile = path.join(tempDir, 'timeout-test.md');
      testFiles.push(testFile);
      await fs.writeFile(testFile, '# Timeout Test\n\nThis should timeout quickly.');

      await new Promise(resolve => setTimeout(resolve, 200));

      // Should have received a timeout error
      expect(errors.length).toBeGreaterThan(0);
      const timeoutError = errors.find(e => e.code === 'TIMEOUT_ERROR');
      expect(timeoutError).toBeDefined();
    });

    it('should provide performance metrics', async () => {
      await cortex.start();

      // Create some files to trigger analysis
      const file1 = path.join(tempDir, 'metrics1.md');
      const file2 = path.join(tempDir, 'metrics2.md');
      testFiles.push(file1, file2);

      await fs.writeFile(file1, '# Metrics Test 1');
      await fs.writeFile(file2, '# Metrics Test 2');

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 300));

      const metrics = cortex.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.interception.eventsProcessed).toBeGreaterThan(0);
      expect(metrics.analysis.analysesPerformed).toBeGreaterThan(0);
      expect(metrics.decisions.recommendationsGenerated).toBeGreaterThan(0);
    });

    it('should respect concurrent analysis limits', async () => {
      // Set low concurrency limit
      cortex.updateConfig({
        performance: {
          enableCache: false, // Disable cache to ensure all analyses run
          cacheTTL: 5000,
          maxConcurrentAnalyses: 1,
          enableMetrics: true
        }
      });

      await cortex.start();

      // Create multiple files and manually trigger analyses
      const files = [];
      const analysisPromises = [];

      for (let i = 0; i < 5; i++) {
        const file = path.join(tempDir, `concurrent-${i}.md`);
        files.push(file);
        testFiles.push(file);
        await fs.writeFile(file, `# File ${i}\n\nContent for file ${i}.`);

        // Create FileInfo manually and trigger analysis
        const fileInfo: FileInfo = {
          path: file,
          content: `# File ${i}\n\nContent for file ${i}.`,
          metadata: {
            size: 42,
            extension: '.md',
            mimeType: 'text/markdown',
            encoding: 'utf8',
            lastModified: new Date()
          }
        };

        // Trigger analysis (should respect concurrency limit)
        analysisPromises.push(cortex.analyzeFileOperation(fileInfo));
      }

      // Wait for all analyses to complete (some may fail due to concurrency limit)
      const results = await Promise.allSettled(analysisPromises);

      const status = cortex.getStatus();
      expect(status.activeAnalyses).toBe(0); // Should be back to 0 after completion

      const metrics = cortex.getMetrics();

      // Due to concurrency limit of 1, some analyses will be rejected
      // At least 1 should succeed, others should be rejected
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      expect(successful).toBeGreaterThan(0); // At least one should succeed
      expect(failed).toBeGreaterThan(0); // Some should be rejected due to concurrency limit
      expect(successful + failed).toBe(5); // Total should be 5

      // Metrics should only count successful analyses
      expect(metrics.analysis.analysesPerformed).toBe(successful);
    });
  });

  describe('Event System', () => {
    it('should support adding and removing event listeners', () => {
      const listener1: CortexEventListener = {
        onFileOperation: vi.fn()
      };

      const listener2: CortexEventListener = {
        onAnalysisComplete: vi.fn()
      };

      cortex.addEventListener(listener1);
      cortex.addEventListener(listener2);
      cortex.removeEventListener(listener1);

      // Hard to test without triggering events, but at least verify no errors
      expect(() => cortex.removeEventListener(listener2)).not.toThrow();
    });

    it('should handle errors in event listeners gracefully', async () => {
      const faultyListener: CortexEventListener = {
        onFileOperation: () => {
          throw new Error('Listener error');
        }
      };

      const goodListener: CortexEventListener = {
        onFileOperation: vi.fn()
      };

      cortex.addEventListener(faultyListener);
      cortex.addEventListener(goodListener);
      await cortex.start();

      // Create file to trigger events
      const testFile = path.join(tempDir, 'listener-test.md');
      testFiles.push(testFile);
      await fs.writeFile(testFile, '# Listener Test');

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Good listener should still have been called despite faulty listener
      expect(goodListener.onFileOperation).toHaveBeenCalled();
    });
  });

  describe('Monitoring Control', () => {
    it('should enable/disable monitoring for specific paths', async () => {
      await cortex.start();

      const initialStatus = cortex.getStatus();
      expect(initialStatus.monitoredPaths).toEqual([tempDir]);

      // Disable monitoring
      cortex.setMonitoringEnabled(false);

      const disabledStatus = cortex.getStatus();
      expect(disabledStatus.components.interceptor).toBe('stopped');

      // Re-enable monitoring
      cortex.setMonitoringEnabled(true, [tempDir]);

      const enabledStatus = cortex.getStatus();
      expect(enabledStatus.components.interceptor).toBe('running');
      expect(enabledStatus.monitoredPaths).toEqual([tempDir]);
    });
  });

  describe('Reset and Cleanup', () => {
    it('should reset state and clear caches', async () => {
      await cortex.start();

      // Create some files to populate caches
      const file1 = path.join(tempDir, 'reset-test.md');
      testFiles.push(file1);
      await fs.writeFile(file1, '# Reset Test');

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      const preResetMetrics = cortex.getMetrics();
      expect(preResetMetrics.analysis.analysesPerformed).toBeGreaterThan(0);

      await cortex.reset();

      const postResetMetrics = cortex.getMetrics();
      expect(postResetMetrics.analysis.analysesPerformed).toBe(0);
      expect(postResetMetrics.interception.eventsProcessed).toBe(0);
      expect(postResetMetrics.decisions.recommendationsGenerated).toBe(0);
    });
  });
});