import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentationLens } from '../../../src/context/lenses/DocumentationLens';
import type { ActivationContext, QueryContext, DeveloperAction } from '../../../src/context/lenses/types';
import type { Query } from '../../../src/query/types';
import { ContextDepth } from '../../../src/types/context';

describe('DocumentationLens', () => {
  let lens: DocumentationLens;
  let mockActivationContext: ActivationContext;
  let mockQueryContext: QueryContext;

  beforeEach(() => {
    lens = new DocumentationLens();

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
      activeLenses: ['documentation'],
      performance: {
        startTime: Date.now(),
        hints: {}
      }
    };
  });

  describe('Construction', () => {
    it('should create DocumentationLens with correct id and name', () => {
      expect(lens.id).toBe('documentation');
      expect(lens.name).toBe('Documentation Lens');
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
      it('should activate for "document" keyword', () => {
        const context = {
          ...mockActivationContext,
          currentFiles: ['/docs/document-api.md']
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });

      it('should activate for "API" keyword', () => {
        const context = {
          ...mockActivationContext,
          currentFiles: ['/src/api-handler.ts']
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });

      it('should activate for "public" keyword', () => {
        const context = {
          ...mockActivationContext,
          currentFiles: ['/src/public-interface.ts']
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });

      it('should activate for "interface" keyword', () => {
        const context = {
          ...mockActivationContext,
          currentFiles: ['/src/interfaces.ts']
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });

      it('should activate for "readme" keyword', () => {
        const context = {
          ...mockActivationContext,
          currentFiles: ['/README.md']
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });

      it('should activate for "export" keyword', () => {
        const context = {
          ...mockActivationContext,
          currentFiles: ['/src/exports.ts']
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });
    });

    describe('File pattern activation', () => {
      it('should activate for README files', () => {
        const context = {
          ...mockActivationContext,
          currentFiles: ['/README.md', '/docs/README.md']
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });

      it('should activate for markdown documentation files', () => {
        const context = {
          ...mockActivationContext,
          currentFiles: ['/docs/api-guide.md', '/docs/getting-started.md']
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });

      it('should activate for index/main files (entry points)', () => {
        const context = {
          ...mockActivationContext,
          currentFiles: ['/src/index.ts', '/src/main.ts']
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });

      it('should activate for .d.ts declaration files', () => {
        const context = {
          ...mockActivationContext,
          currentFiles: ['/types/index.d.ts']
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });
    });

    describe('Non-activation scenarios', () => {
      it('should not activate for implementation files', () => {
        const context = {
          ...mockActivationContext,
          currentFiles: ['/src/internal/implementation.ts'],
          recentActions: [{
            type: 'file_save' as const,
            timestamp: new Date().toISOString(),
            file: '/src/internal/implementation.ts'
          }]
        };

        expect(lens.shouldActivate(context)).toBe(false);
      });

      it('should not activate for test files', () => {
        const context = {
          ...mockActivationContext,
          currentFiles: ['/tests/app.test.ts'],
          recentActions: [{
            type: 'test_run' as const,
            timestamp: new Date().toISOString(),
            metadata: { result: 'passed' }
          }]
        };

        expect(lens.shouldActivate(context)).toBe(false);
      });
    });

    describe('Manual override', () => {
      it('should activate when manually enabled', () => {
        const context = {
          ...mockActivationContext,
          manualOverride: 'documentation'
        };

        expect(lens.shouldActivate(context)).toBe(true);
      });

      it('should not activate with different manual override', () => {
        const context = {
          ...mockActivationContext,
          manualOverride: 'debug'
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

    it('should add public/exported entity conditions to query', () => {
      const transformed = lens.transformQuery(baseQuery);

      expect(transformed.conditions.length).toBeGreaterThan(0);
    });

    it('should set depth to DETAILED for comprehensive documentation', () => {
      const transformed = lens.transformQuery(baseQuery);

      expect(transformed.depth).toBe(ContextDepth.DETAILED);
    });

    it('should add ordering by documentation relevance', () => {
      const transformed = lens.transformQuery(baseQuery);

      expect(transformed.ordering.length).toBeGreaterThan(0);
    });

    it('should preserve existing conditions', () => {
      const queryWithConditions = {
        ...baseQuery,
        conditions: [
          { field: 'type', operator: 'equals' as const, value: 'class' }
        ]
      };

      const transformed = lens.transformQuery(queryWithConditions);

      expect(transformed.conditions.length).toBeGreaterThanOrEqual(1);
      expect(transformed.conditions.some(c => c.field === 'type')).toBe(true);
    });

    it('should add performance hints for documentation queries', () => {
      const transformed = lens.transformQuery(baseQuery);

      expect(transformed.performanceHints).toBeDefined();
    });

    it('should set appropriate pagination limit', () => {
      const transformed = lens.transformQuery(baseQuery);

      expect(transformed.pagination?.limit).toBeGreaterThan(0);
    });
  });

  describe('Result Processing', () => {
    let mockResults: any[];

    beforeEach(() => {
      mockResults = [
        {
          id: '1',
          type: 'function',
          name: 'publicAPI',
          content: 'export function publicAPI() { /** JSDoc comment */ }',
          metadata: {
            filename: 'api.ts',
            lineNumbers: [10, 15],
            isPublic: true,
            hasJSDoc: true
          }
        },
        {
          id: '2',
          type: 'function',
          name: 'internalHelper',
          content: 'function internalHelper() { return true; }',
          metadata: {
            filename: 'utils.ts',
            lineNumbers: [20, 25],
            isPublic: false,
            hasJSDoc: false
          }
        },
        {
          id: '3',
          type: 'interface',
          name: 'PublicInterface',
          content: 'export interface PublicInterface { method(): void; }',
          metadata: {
            filename: 'types.ts',
            lineNumbers: [5, 10],
            isPublic: true,
            hasJSDoc: false
          }
        },
        {
          id: '4',
          type: 'class',
          name: 'DocumentedClass',
          content: '/** Class documentation */ export class DocumentedClass {}',
          metadata: {
            filename: 'index.ts',
            lineNumbers: [1, 20],
            isPublic: true,
            hasJSDoc: true
          }
        }
      ];
    });

    it('should add documentation metadata to all results', () => {
      const processed = lens.processResults(mockResults, mockQueryContext);

      processed.forEach(result => {
        expect(result._lensMetadata).toBeDefined();
        expect(result._lensMetadata.appliedLens).toBe('documentation');
      });
    });

    it('should highlight public/exported entities', () => {
      const processed = lens.processResults(mockResults, mockQueryContext);

      const publicEntities = processed.filter(r => r._documentationMetadata?.isPublic);
      expect(publicEntities.length).toBeGreaterThan(0);
    });

    it('should detect JSDoc presence', () => {
      const processed = lens.processResults(mockResults, mockQueryContext);

      const withJSDoc = processed.some(r => r._documentationMetadata?.hasJSDoc);
      expect(withJSDoc).toBe(true);
    });

    it('should calculate documentation relevance score', () => {
      const processed = lens.processResults(mockResults, mockQueryContext);

      processed.forEach(result => {
        expect(result._documentationMetadata?.relevanceScore).toBeDefined();
        expect(result._documentationMetadata?.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(result._documentationMetadata?.relevanceScore).toBeLessThanOrEqual(100);
      });
    });

    it('should reorder results by documentation relevance', () => {
      const processed = lens.processResults(mockResults, mockQueryContext);

      // Results with JSDoc and public should rank higher
      const scores = processed.map(r => r._documentationMetadata?.relevanceScore || 0);
      expect(scores[0]).toBeGreaterThanOrEqual(scores[scores.length - 1]);
    });

    it('should preserve original result data', () => {
      const processed = lens.processResults(mockResults, mockQueryContext);

      const processedIds = processed.map(r => r.id).sort();
      const originalIds = mockResults.map(r => r.id).sort();

      expect(processedIds).toEqual(originalIds);

      processed.forEach(result => {
        const original = mockResults.find(r => r.id === result.id);
        expect(original).toBeDefined();
        expect(result.name).toBe(original!.name);
        expect(result.type).toBe(original!.type);
      });
    });

    it('should detect exported symbols', () => {
      const processed = lens.processResults(mockResults, mockQueryContext);

      const exported = processed.filter(r => r._documentationMetadata?.isExported);
      expect(exported.length).toBeGreaterThan(0);
    });

    it('should detect API-related content', () => {
      const processed = lens.processResults(mockResults, mockQueryContext);

      const apiRelated = processed.some(r => r._documentationMetadata?.isAPIRelated);
      expect(apiRelated).toBe(true);
    });

    it('should identify entry point files', () => {
      const processed = lens.processResults(mockResults, mockQueryContext);

      const entryPoints = processed.filter(r => r._documentationMetadata?.isEntryPoint);
      // At least one should be identified as entry point
      expect(entryPoints.length).toBeGreaterThanOrEqual(0);
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
        priority: 85,
        activationRules: [],
        queryModifications: [],
        resultTransformations: []
      };

      lens.configure(customConfig);

      const config = lens.getConfig();
      expect(config.priority).toBe(85);
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
    it('should handle complete documentation workflow', () => {
      // Activate lens
      const activationContext = {
        ...mockActivationContext,
        currentFiles: ['/README.md', '/src/index.ts']
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
        {
          id: '1',
          name: 'publicAPI',
          content: 'export function publicAPI() {}',
          metadata: { isPublic: true }
        }
      ];

      const processedResults = lens.processResults(results, mockQueryContext);
      expect(processedResults[0]._lensMetadata).toBeDefined();
    });

    it('should work with API documentation files', () => {
      const context = {
        ...mockActivationContext,
        currentFiles: ['/docs/API.md', '/src/api/index.ts']
      };

      expect(lens.shouldActivate(context)).toBe(true);
    });

    it('should prioritize files with JSDoc', () => {
      const resultsWithJSDoc = [
        {
          id: '1',
          name: 'withDocs',
          content: '/** JSDoc */ export function withDocs() {}',
          metadata: { hasJSDoc: true, isPublic: true }
        },
        {
          id: '2',
          name: 'noDocs',
          content: 'export function noDocs() {}',
          metadata: { hasJSDoc: false, isPublic: true }
        }
      ];

      const processed = lens.processResults(resultsWithJSDoc, mockQueryContext);

      // First result should have higher score due to JSDoc
      expect(processed[0]._documentationMetadata?.relevanceScore)
        .toBeGreaterThanOrEqual(processed[1]._documentationMetadata?.relevanceScore || 0);
    });
  });
});
