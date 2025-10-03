import { describe, it, expect, beforeEach } from 'vitest';
import { DebugLens } from '../../../src/context/lenses/DebugLens';
import type { ActivationContext, QueryContext, DeveloperAction } from '../../../src/context/lenses/types';
import type { Query } from '../../../src/query/types';
import { ContextDepth } from '../../../src/types/context';

describe('DebugLens', () => {
  let lens: DebugLens;
  let mockActivationContext: ActivationContext;
  let mockQueryContext: QueryContext;

  beforeEach(() => {
    lens = new DebugLens();

    mockActivationContext = {
      currentFiles: ['/src/app.ts', '/src/utils.ts'],
      recentActions: [],
      projectContext: {
        name: 'test-project',
        type: 'typescript',
        dependencies: ['vitest', 'typescript'],
        structure: {
          hasTests: true,
          hasComponents: true,
          hasDocs: true,
          hasConfig: true
        }
      }
    };

    mockQueryContext = {
      requestId: 'test-request-123',
      timestamp: new Date().toISOString(),
      activeLenses: ['debug'],
      performance: {
        startTime: Date.now(),
        hints: {}
      }
    };
  });

  describe('Construction', () => {
    it('should create DebugLens with correct id and name', () => {
      expect(lens.id).toBe('debug');
      expect(lens.name).toBe('Debug Lens');
    });

    it('should set appropriate priority', () => {
      expect(lens.priority).toBeGreaterThan(0);
      expect(lens.priority).toBeLessThanOrEqual(100);
    });

    it('should be enabled by default', () => {
      const config = lens.getConfig();
      expect(config.enabled).toBe(true);
    });
  });

  describe('Activation Detection', () => {
    describe('Keyword-based activation', () => {
      it('should activate for "error" keyword', () => {
        const context = {
          ...mockActivationContext,
          recentActions: [{
            type: 'error_occurrence' as const,
            timestamp: new Date().toISOString(),
            metadata: { message: 'TypeError: Cannot read property' }
          }]
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });

      it('should activate for "bug" keyword', () => {
        const context = {
          ...mockActivationContext,
          currentFiles: ['/src/bug-report.ts']
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });

      it('should activate for "debug" keyword', () => {
        const context = {
          ...mockActivationContext,
          recentActions: [{
            type: 'debugger_start' as const,
            timestamp: new Date().toISOString()
          }]
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });

      it('should activate for "crash" keyword', () => {
        const context = {
          ...mockActivationContext,
          recentActions: [{
            type: 'error_occurrence' as const,
            timestamp: new Date().toISOString(),
            metadata: { message: 'Application crash detected' }
          }]
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });

      it('should activate for "fail" keyword', () => {
        const context = {
          ...mockActivationContext,
          recentActions: [{
            type: 'test_run' as const,
            timestamp: new Date().toISOString(),
            metadata: { result: 'failed', failedTests: 3 }
          }]
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });

      it('should activate for "why" keyword', () => {
        const context = {
          ...mockActivationContext,
          currentFiles: ['/docs/why-is-this-failing.md']
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });
    });

    describe('Action-based activation', () => {
      it('should activate when debugger starts', () => {
        const action: DeveloperAction = {
          type: 'debugger_start',
          timestamp: new Date().toISOString()
        };

        const context = {
          ...mockActivationContext,
          recentActions: [action]
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });

      it('should activate when error occurs', () => {
        const action: DeveloperAction = {
          type: 'error_occurrence',
          timestamp: new Date().toISOString(),
          metadata: { severity: 'high' }
        };

        const context = {
          ...mockActivationContext,
          recentActions: [action]
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });

      it('should activate when test run fails', () => {
        const action: DeveloperAction = {
          type: 'test_run',
          timestamp: new Date().toISOString(),
          metadata: { result: 'failed' }
        };

        const context = {
          ...mockActivationContext,
          recentActions: [action]
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });
    });

    describe('File pattern activation', () => {
      it('should activate for test files', () => {
        const context = {
          ...mockActivationContext,
          currentFiles: ['/src/app.test.ts', '/src/utils.spec.ts']
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });

      it('should activate for error log files', () => {
        const context = {
          ...mockActivationContext,
          currentFiles: ['/logs/error.log']
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });

      it('should activate for debug files', () => {
        const context = {
          ...mockActivationContext,
          currentFiles: ['/src/debug-helper.ts']
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });
    });

    describe('Non-activation scenarios', () => {
      it('should not activate for normal development', () => {
        const context = {
          ...mockActivationContext,
          currentFiles: ['/src/app.ts'],
          recentActions: [{
            type: 'file_save' as const,
            timestamp: new Date().toISOString(),
            file: '/src/app.ts'
          }]
        };

        expect(lens.shouldActivate(context)).toBe(false);
      });

      it('should not activate for documentation work', () => {
        const context = {
          ...mockActivationContext,
          currentFiles: ['/docs/README.md'],
          recentActions: [{
            type: 'file_edit' as const,
            timestamp: new Date().toISOString(),
            file: '/docs/README.md'
          }]
        };

        expect(lens.shouldActivate(context)).toBe(false);
      });
    });

    describe('Manual override', () => {
      it('should activate when manually enabled', () => {
        const context = {
          ...mockActivationContext,
          manualOverride: 'debug'
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });

      it('should not activate with different manual override', () => {
        const context = {
          ...mockActivationContext,
          manualOverride: 'documentation'
        };

        expect(lens.shouldActivate(context)).toBe(false);
      });
    });
  });

  describe('Query Transformation', () => {
    let baseQuery: Query;

    beforeEach(() => {
      baseQuery = {
        conditions: [],
        ordering: [],
        pagination: { offset: 0, limit: 10 }
      };
    });

    it('should add error-related conditions to query', () => {
      const transformed = lens.transformQuery(baseQuery);

      expect(transformed.conditions.length).toBeGreaterThan(0);
    });

    it('should set depth to DETAILED for debugging', () => {
      const transformed = lens.transformQuery(baseQuery);

      expect(transformed.depth).toBe(ContextDepth.DETAILED);
    });

    it('should add ordering by recent modifications', () => {
      const transformed = lens.transformQuery(baseQuery);

      expect(transformed.ordering.length).toBeGreaterThan(0);
    });

    it('should preserve existing conditions', () => {
      const queryWithConditions = {
        ...baseQuery,
        conditions: [
          { field: 'type', operator: 'equals' as const, value: 'document' }
        ]
      };

      const transformed = lens.transformQuery(queryWithConditions);

      expect(transformed.conditions.length).toBeGreaterThanOrEqual(1);
      expect(transformed.conditions.some(c => c.field === 'type')).toBe(true);
    });

    it('should add performance hints for debugging', () => {
      const transformed = lens.transformQuery(baseQuery);

      expect(transformed.performanceHints).toBeDefined();
    });

    it('should increase pagination limit for comprehensive debugging', () => {
      const transformed = lens.transformQuery(baseQuery);

      expect(transformed.pagination?.limit).toBeGreaterThan(baseQuery.pagination!.limit);
    });
  });

  describe('Result Processing', () => {
    let mockResults: any[];

    beforeEach(() => {
      mockResults = [
        {
          id: '1',
          type: 'function',
          name: 'processData',
          content: 'function processData() { throw new Error(); }',
          metadata: { filename: 'app.ts', lineNumbers: [10, 15] }
        },
        {
          id: '2',
          type: 'function',
          name: 'validateInput',
          content: 'function validateInput(data) { return true; }',
          metadata: { filename: 'utils.ts', lineNumbers: [20, 25] }
        },
        {
          id: '3',
          type: 'class',
          name: 'ErrorHandler',
          content: 'class ErrorHandler { handle(error) {} }',
          metadata: { filename: 'error.ts', lineNumbers: [5, 30] }
        }
      ];
    });

    it('should add debug metadata to all results', () => {
      const processed = lens.processResults(mockResults, mockQueryContext);

      processed.forEach(result => {
        expect(result._lensMetadata).toBeDefined();
        expect(result._lensMetadata.appliedLens).toBe('debug');
      });
    });

    it('should highlight error-related results', () => {
      const processed = lens.processResults(mockResults, mockQueryContext);

      const errorRelated = processed.filter(r => r._debugMetadata?.isErrorRelated);
      expect(errorRelated.length).toBeGreaterThan(0);
    });

    it('should add error keyword detection', () => {
      const processed = lens.processResults(mockResults, mockQueryContext);

      const hasErrorKeywords = processed.some(r => r._debugMetadata?.hasErrorKeywords);
      expect(hasErrorKeywords).toBe(true);
    });

    it('should calculate relevance score for debugging', () => {
      const processed = lens.processResults(mockResults, mockQueryContext);

      processed.forEach(result => {
        expect(result._debugMetadata?.relevanceScore).toBeDefined();
        expect(result._debugMetadata?.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(result._debugMetadata?.relevanceScore).toBeLessThanOrEqual(100);
      });
    });

    it('should reorder results by debug relevance', () => {
      const processed = lens.processResults(mockResults, mockQueryContext);

      // Results with error keywords should come first
      const scores = processed.map(r => r._debugMetadata?.relevanceScore || 0);
      expect(scores[0]).toBeGreaterThanOrEqual(scores[scores.length - 1]);
    });

    it('should preserve original result data (reordered by relevance)', () => {
      const processed = lens.processResults(mockResults, mockQueryContext);

      // Results are reordered by relevance, but all original data should be present
      const processedIds = processed.map(r => r.id).sort();
      const originalIds = mockResults.map(r => r.id).sort();

      expect(processedIds).toEqual(originalIds);

      // Check that all original properties are preserved
      processed.forEach(result => {
        const original = mockResults.find(r => r.id === result.id);
        expect(original).toBeDefined();
        expect(result.name).toBe(original!.name);
        expect(result.type).toBe(original!.type);
      });
    });

    it('should add file modification timestamps when available', () => {
      const resultsWithModTime = mockResults.map(r => ({
        ...r,
        metadata: {
          ...r.metadata,
          lastModified: new Date(Date.now() - Math.random() * 86400000).toISOString()
        }
      }));

      const processed = lens.processResults(resultsWithModTime, mockQueryContext);

      processed.forEach(result => {
        expect(result._debugMetadata?.lastModified).toBeDefined();
      });
    });

    it('should handle empty results gracefully', () => {
      const processed = lens.processResults([], mockQueryContext);

      expect(processed).toEqual([]);
    });

    it('should handle results without metadata', () => {
      const minimalResults = [{ id: '1', name: 'test' }];

      expect(() => {
        lens.processResults(minimalResults, mockQueryContext);
      }).not.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should allow custom configuration', () => {
      const customConfig = {
        enabled: true,
        priority: 75,
        activationRules: [],
        queryModifications: [],
        resultTransformations: []
      };

      lens.configure(customConfig);

      const config = lens.getConfig();
      expect(config.priority).toBe(75);
    });

    it('should be able to disable lens', () => {
      lens.configure({
        enabled: false,
        priority: 50,
        activationRules: [],
        queryModifications: [],
        resultTransformations: []
      });

      expect(lens.shouldActivate(mockActivationContext)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null or undefined in activation context', () => {
      const partialContext = {
        ...mockActivationContext,
        recentActions: []
      };

      expect(() => {
        lens.shouldActivate(partialContext);
      }).not.toThrow();
    });

    it('should handle empty query', () => {
      const emptyQuery: Query = {
        conditions: [],
        ordering: []
      };

      expect(() => {
        lens.transformQuery(emptyQuery);
      }).not.toThrow();
    });

    it('should handle malformed results', () => {
      const malformedResults = [
        null,
        undefined,
        {},
        { id: '1' }
      ];

      expect(() => {
        lens.processResults(malformedResults.filter(Boolean), mockQueryContext);
      }).not.toThrow();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete debug workflow', () => {
      // Activate lens
      const activationContext = {
        ...mockActivationContext,
        recentActions: [{
          type: 'error_occurrence' as const,
          timestamp: new Date().toISOString(),
          metadata: { message: 'TypeError' }
        }]
      };

      expect(lens.shouldActivate(activationContext)).toBe(true);

      // Transform query
      const query: Query = {
        conditions: [],
        ordering: [],
        pagination: { offset: 0, limit: 10 }
      };

      const transformedQuery = lens.transformQuery(query);
      expect(transformedQuery.depth).toBe(ContextDepth.DETAILED);

      // Process results
      const results = [
        { id: '1', name: 'errorHandler', content: 'error handling code' }
      ];

      const processedResults = lens.processResults(results, mockQueryContext);
      expect(processedResults[0]._lensMetadata).toBeDefined();
    });

    it('should work with multiple recent actions', () => {
      const context = {
        ...mockActivationContext,
        recentActions: [
          {
            type: 'debugger_start' as const,
            timestamp: new Date(Date.now() - 5000).toISOString()
          },
          {
            type: 'error_occurrence' as const,
            timestamp: new Date(Date.now() - 3000).toISOString()
          },
          {
            type: 'test_run' as const,
            timestamp: new Date().toISOString(),
            metadata: { result: 'failed' }
          }
        ]
      };

      expect(lens.shouldActivate(context)).toBe(true);
    });
  });
});
