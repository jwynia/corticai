import { describe, it, expect } from 'vitest';
import { TSDependencyGraph } from '../../../src/analyzers/TSDependencyGraph';
import type { FileAnalysis, DependencyGraph, Cycle } from '../../../src/analyzers/types';

describe('TSDependencyGraph', () => {
  let graphBuilder: TSDependencyGraph;

  beforeEach(() => {
    graphBuilder = new TSDependencyGraph();
  });

  describe('buildGraph', () => {
    it('should build graph from file analyses', () => {
      // Arrange
      const files: FileAnalysis[] = [
        {
          path: '/project/a.ts',
          imports: [{ source: './b', type: 'named', specifiers: ['something'] }],
          exports: [],
          dependencies: ['/project/b.ts'],
          dependents: []
        },
        {
          path: '/project/b.ts',
          imports: [],
          exports: [{ name: 'something', type: 'named' }],
          dependencies: [],
          dependents: ['/project/a.ts']
        }
      ];

      // Act
      const graph = graphBuilder.buildGraph(files);

      // Assert
      expect(graph.nodes.size).toBe(2);
      expect(graph.nodes.has('/project/a.ts')).toBe(true);
      expect(graph.nodes.has('/project/b.ts')).toBe(true);
      expect(graph.edges.get('/project/a.ts')).toHaveLength(1);
      expect(graph.edges.get('/project/a.ts')?.[0]).toMatchObject({
        from: '/project/a.ts',
        to: '/project/b.ts',
        type: 'import'
      });
    });

    it('should handle multiple dependencies', () => {
      // Arrange
      const files: FileAnalysis[] = [
        {
          path: '/project/main.ts',
          imports: [
            { source: './utils', type: 'named', specifiers: ['util1'] },
            { source: './helpers', type: 'named', specifiers: ['help1'] }
          ],
          exports: [],
          dependencies: ['/project/utils.ts', '/project/helpers.ts'],
          dependents: []
        },
        {
          path: '/project/utils.ts',
          imports: [],
          exports: [{ name: 'util1', type: 'named' }],
          dependencies: [],
          dependents: ['/project/main.ts']
        },
        {
          path: '/project/helpers.ts',
          imports: [],
          exports: [{ name: 'help1', type: 'named' }],
          dependencies: [],
          dependents: ['/project/main.ts']
        }
      ];

      // Act
      const graph = graphBuilder.buildGraph(files);

      // Assert
      expect(graph.edges.get('/project/main.ts')).toHaveLength(2);
      expect(graph.nodes.size).toBe(3);
    });

    it('should build empty graph for no files', () => {
      // Arrange
      const files: FileAnalysis[] = [];

      // Act
      const graph = graphBuilder.buildGraph(files);

      // Assert
      expect(graph.nodes.size).toBe(0);
      expect(graph.edges.size).toBe(0);
      expect(graph.cycles).toHaveLength(0);
    });

    it('should handle files with no dependencies', () => {
      // Arrange
      const files: FileAnalysis[] = [
        {
          path: '/project/standalone.ts',
          imports: [],
          exports: [{ name: 'x', type: 'named' }],
          dependencies: [],
          dependents: []
        }
      ];

      // Act
      const graph = graphBuilder.buildGraph(files);

      // Assert
      expect(graph.nodes.size).toBe(1);
      expect(graph.edges.size).toBe(0);
    });

    it('should update dependents arrays', () => {
      // Arrange
      const fileB: FileAnalysis = {
        path: '/project/b.ts',
        imports: [],
        exports: [{ name: 'x', type: 'named' }],
        dependencies: [],
        dependents: []
      };

      const fileA: FileAnalysis = {
        path: '/project/a.ts',
        imports: [{ source: './b', type: 'named', specifiers: ['x'] }],
        exports: [],
        dependencies: ['/project/b.ts'],
        dependents: []
      };

      const files = [fileA, fileB];

      // Act
      graphBuilder.buildGraph(files);

      // Assert
      expect(fileB.dependents).toContain('/project/a.ts');
    });
  });

  describe('detectCycles', () => {
    it('should detect simple circular dependency', () => {
      // Arrange
      const graph: DependencyGraph = {
        nodes: new Map([
          ['/a.ts', { path: '/a.ts', imports: 1, exports: 0 }],
          ['/b.ts', { path: '/b.ts', imports: 1, exports: 0 }]
        ]),
        edges: new Map([
          ['/a.ts', [{ from: '/a.ts', to: '/b.ts', type: 'import' }]],
          ['/b.ts', [{ from: '/b.ts', to: '/a.ts', type: 'import' }]]
        ]),
        cycles: []
      };

      // Act
      const cycles = graphBuilder.detectCycles(graph);

      // Assert
      expect(cycles).toHaveLength(1);
      expect(cycles[0].nodes).toContain('/a.ts');
      expect(cycles[0].nodes).toContain('/b.ts');
    });

    it('should detect complex 3-way circular dependency', () => {
      // Arrange
      const graph: DependencyGraph = {
        nodes: new Map([
          ['/a.ts', { path: '/a.ts', imports: 1, exports: 0 }],
          ['/b.ts', { path: '/b.ts', imports: 1, exports: 0 }],
          ['/c.ts', { path: '/c.ts', imports: 1, exports: 0 }]
        ]),
        edges: new Map([
          ['/a.ts', [{ from: '/a.ts', to: '/b.ts', type: 'import' }]],
          ['/b.ts', [{ from: '/b.ts', to: '/c.ts', type: 'import' }]],
          ['/c.ts', [{ from: '/c.ts', to: '/a.ts', type: 'import' }]]
        ]),
        cycles: []
      };

      // Act
      const cycles = graphBuilder.detectCycles(graph);

      // Assert
      expect(cycles).toHaveLength(1);
      expect(cycles[0].nodes).toHaveLength(3);
      expect(cycles[0].nodes).toContain('/a.ts');
      expect(cycles[0].nodes).toContain('/b.ts');
      expect(cycles[0].nodes).toContain('/c.ts');
    });

    it('should handle no cycles', () => {
      // Arrange
      const graph: DependencyGraph = {
        nodes: new Map([
          ['/a.ts', { path: '/a.ts', imports: 1, exports: 0 }],
          ['/b.ts', { path: '/b.ts', imports: 1, exports: 0 }],
          ['/c.ts', { path: '/c.ts', imports: 0, exports: 2 }]
        ]),
        edges: new Map([
          ['/a.ts', [{ from: '/a.ts', to: '/c.ts', type: 'import' }]],
          ['/b.ts', [{ from: '/b.ts', to: '/c.ts', type: 'import' }]]
        ]),
        cycles: []
      };

      // Act
      const cycles = graphBuilder.detectCycles(graph);

      // Assert
      expect(cycles).toHaveLength(0);
    });

    it('should detect multiple independent cycles', () => {
      // Arrange
      const graph: DependencyGraph = {
        nodes: new Map([
          ['/a.ts', { path: '/a.ts', imports: 1, exports: 0 }],
          ['/b.ts', { path: '/b.ts', imports: 1, exports: 0 }],
          ['/c.ts', { path: '/c.ts', imports: 1, exports: 0 }],
          ['/d.ts', { path: '/d.ts', imports: 1, exports: 0 }]
        ]),
        edges: new Map([
          ['/a.ts', [{ from: '/a.ts', to: '/b.ts', type: 'import' }]],
          ['/b.ts', [{ from: '/b.ts', to: '/a.ts', type: 'import' }]],
          ['/c.ts', [{ from: '/c.ts', to: '/d.ts', type: 'import' }]],
          ['/d.ts', [{ from: '/d.ts', to: '/c.ts', type: 'import' }]]
        ]),
        cycles: []
      };

      // Act
      const cycles = graphBuilder.detectCycles(graph);

      // Assert
      expect(cycles).toHaveLength(2);
      expect(cycles.some((c) => c.nodes.includes('/a.ts') && c.nodes.includes('/b.ts'))).toBe(true);
      expect(cycles.some((c) => c.nodes.includes('/c.ts') && c.nodes.includes('/d.ts'))).toBe(true);
    });

    it('should handle empty graph', () => {
      // Arrange
      const graph: DependencyGraph = {
        nodes: new Map(),
        edges: new Map(),
        cycles: []
      };

      // Act
      const cycles = graphBuilder.detectCycles(graph);

      // Assert
      expect(cycles).toHaveLength(0);
    });

    it('should not report duplicate cycles', () => {
      // Arrange
      const graph: DependencyGraph = {
        nodes: new Map([
          ['/a.ts', { path: '/a.ts', imports: 1, exports: 1 }],
          ['/b.ts', { path: '/b.ts', imports: 1, exports: 1 }]
        ]),
        edges: new Map([
          ['/a.ts', [{ from: '/a.ts', to: '/b.ts', type: 'import' }]],
          ['/b.ts', [{ from: '/b.ts', to: '/a.ts', type: 'import' }]]
        ]),
        cycles: []
      };

      // Act - Run detection multiple times
      const cycles1 = graphBuilder.detectCycles(graph);
      const cycles2 = graphBuilder.detectCycles(graph);

      // Assert
      expect(cycles1).toHaveLength(1);
      expect(cycles2).toHaveLength(1);
      expect(cycles1[0].nodes.sort()).toEqual(cycles2[0].nodes.sort());
    });

    it('should build cycle edges correctly', () => {
      // Arrange
      const graph: DependencyGraph = {
        nodes: new Map([
          ['/a.ts', { path: '/a.ts', imports: 1, exports: 0 }],
          ['/b.ts', { path: '/b.ts', imports: 1, exports: 0 }]
        ]),
        edges: new Map([
          ['/a.ts', [{ from: '/a.ts', to: '/b.ts', type: 'import' }]],
          ['/b.ts', [{ from: '/b.ts', to: '/a.ts', type: 'import' }]]
        ]),
        cycles: []
      };

      // Act
      const cycles = graphBuilder.detectCycles(graph);

      // Assert
      expect(cycles[0].edges).toHaveLength(2);
      expect(cycles[0].edges).toContainEqual(
        expect.objectContaining({ from: '/a.ts', to: '/b.ts', type: 'import' })
      );
      expect(cycles[0].edges).toContainEqual(
        expect.objectContaining({ from: '/b.ts', to: '/a.ts', type: 'import' })
      );
    });

    it('should handle self-referencing file', () => {
      // Arrange
      const graph: DependencyGraph = {
        nodes: new Map([['/a.ts', { path: '/a.ts', imports: 1, exports: 0 }]]),
        edges: new Map([['/a.ts', [{ from: '/a.ts', to: '/a.ts', type: 'import' }]]]),
        cycles: []
      };

      // Act
      const cycles = graphBuilder.detectCycles(graph);

      // Assert
      expect(cycles).toHaveLength(1);
      expect(cycles[0].nodes).toContain('/a.ts');
    });
  });

  describe('integration', () => {
    it('should build graph and detect cycles in one flow', () => {
      // Arrange - Create files with circular dependency
      const files: FileAnalysis[] = [
        {
          path: '/project/moduleA.ts',
          imports: [{ source: './moduleB', type: 'named', specifiers: ['functionB'] }],
          exports: [{ name: 'functionA', type: 'named' }],
          dependencies: ['/project/moduleB.ts'],
          dependents: []
        },
        {
          path: '/project/moduleB.ts',
          imports: [{ source: './moduleA', type: 'named', specifiers: ['functionA'] }],
          exports: [{ name: 'functionB', type: 'named' }],
          dependencies: ['/project/moduleA.ts'],
          dependents: []
        }
      ];

      // Act
      const graph = graphBuilder.buildGraph(files);
      const cycles = graphBuilder.detectCycles(graph);

      // Assert
      expect(graph.nodes.size).toBe(2);
      expect(cycles).toHaveLength(1);
      expect(cycles[0].nodes).toHaveLength(2);
    });

    it('should handle complex project structure', () => {
      // Arrange
      const files: FileAnalysis[] = [
        {
          path: '/project/index.ts',
          imports: [
            { source: './services/api', type: 'named', specifiers: ['api'] },
            { source: './components/App', type: 'default', specifiers: ['App'] }
          ],
          exports: [],
          dependencies: ['/project/services/api.ts', '/project/components/App.ts'],
          dependents: []
        },
        {
          path: '/project/services/api.ts',
          imports: [{ source: '../utils/format', type: 'named', specifiers: ['format'] }],
          exports: [{ name: 'api', type: 'named' }],
          dependencies: ['/project/utils/format.ts'],
          dependents: ['/project/index.ts']
        },
        {
          path: '/project/components/App.ts',
          imports: [
            { source: '../services/api', type: 'named', specifiers: ['api'] },
            { source: '../utils/format', type: 'named', specifiers: ['format'] }
          ],
          exports: [{ name: 'default', type: 'default' }],
          dependencies: ['/project/services/api.ts', '/project/utils/format.ts'],
          dependents: ['/project/index.ts']
        },
        {
          path: '/project/utils/format.ts',
          imports: [],
          exports: [{ name: 'format', type: 'named' }],
          dependencies: [],
          dependents: ['/project/services/api.ts', '/project/components/App.ts']
        }
      ];

      // Act
      const graph = graphBuilder.buildGraph(files);
      const cycles = graphBuilder.detectCycles(graph);

      // Assert
      expect(graph.nodes.size).toBe(4);
      expect(cycles).toHaveLength(0); // No cycles in this structure
      expect(graph.edges.size).toBe(3); // 3 files have dependencies

      // Verify most imported (format.ts)
      const formatNode = graph.nodes.get('/project/utils/format.ts');
      expect(formatNode).toBeDefined();

      // Verify dependents are updated
      const formatFile = files.find((f) => f.path === '/project/utils/format.ts');
      expect(formatFile?.dependents).toHaveLength(2);
    });
  });
});
