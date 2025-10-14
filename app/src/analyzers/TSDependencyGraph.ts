import type { FileAnalysis, DependencyGraph, Cycle, Node, Edge } from './types';

/**
 * TSDependencyGraph
 *
 * Responsible for building dependency graphs and detecting circular dependencies.
 * Uses depth-first search (DFS) algorithm for cycle detection.
 *
 * Key responsibilities:
 * - Build dependency graphs from file analyses
 * - Create nodes and edges representing file dependencies
 * - Detect circular dependencies using DFS with recursion stack
 * - Identify all cycles in the dependency graph
 *
 * Design: Pure graph algorithms with no external dependencies
 */
export class TSDependencyGraph {
  /**
   * Build dependency graph from file analyses
   *
   * Creates a graph where:
   * - Nodes represent files (with import/export counts)
   * - Edges represent dependencies (who imports whom)
   * - Dependents arrays are updated bidirectionally
   *
   * @param files - Array of file analyses
   * @returns Complete dependency graph with nodes, edges, and detected cycles
   */
  buildGraph(files: FileAnalysis[]): DependencyGraph {
    // Validate input
    if (!Array.isArray(files)) {
      throw new Error('Files must be an array');
    }

    const nodes = new Map<string, Node>();
    const edges = new Map<string, Edge[]>();

    // Create nodes
    for (const file of files) {
      // Validate file object structure
      if (!file || typeof file !== 'object') {
        continue; // Skip invalid files
      }
      if (!file.path || typeof file.path !== 'string') {
        continue; // Skip files without valid paths
      }
      if (!Array.isArray(file.imports)) {
        continue; // Skip files with invalid imports
      }
      if (!Array.isArray(file.exports)) {
        continue; // Skip files with invalid exports
      }

      nodes.set(file.path, {
        path: file.path,
        imports: file.imports.length,
        exports: file.exports.length
      });
    }

    // Create edges and update dependents
    for (const file of files) {
      const fileEdges: Edge[] = [];

      for (const dep of file.dependencies) {
        // Find the dependent file in our analysis
        // Need to handle path matching with/without extensions
        const dependentFile = files.find((f) => {
          // Exact match
          if (f.path === dep) return true;
          // Match without extension
          const depWithoutExt = dep.replace(/\.(ts|tsx|js|jsx)$/, '');
          const fPathWithoutExt = f.path.replace(/\.(ts|tsx|js|jsx)$/, '');
          return depWithoutExt === fPathWithoutExt;
        });

        if (dependentFile) {
          // Update dependents array
          if (!dependentFile.dependents.includes(file.path)) {
            dependentFile.dependents.push(file.path);
          }

          // Add edge to the actual file path
          fileEdges.push({
            from: file.path,
            to: dependentFile.path,
            type: 'import'
          });

          // Also add this file as a node if it doesn't exist
          if (!nodes.has(dependentFile.path)) {
            nodes.set(dependentFile.path, {
              path: dependentFile.path,
              imports: dependentFile.imports.length,
              exports: dependentFile.exports.length
            });
          }
        }
      }

      if (fileEdges.length > 0) {
        edges.set(file.path, fileEdges);
      }
    }

    // Detect cycles
    const cycles = this.detectCycles({ nodes, edges, cycles: [] });

    return { nodes, edges, cycles };
  }

  /**
   * Detect circular dependencies using depth-first search (DFS)
   *
   * Algorithm:
   * 1. Maintain visited set (nodes we've seen)
   * 2. Maintain recursion stack (current DFS path)
   * 3. When we visit a node already in recursion stack, we found a cycle
   * 4. Extract the cycle from the path stack
   * 5. Avoid duplicate cycles (same nodes in different order)
   *
   * Time complexity: O(V + E) where V = nodes, E = edges
   * Space complexity: O(V) for visited set and recursion stack
   *
   * @param graph - The dependency graph to analyze
   * @returns Array of detected cycles
   */
  detectCycles(graph: DependencyGraph): Cycle[] {
    const cycles: Cycle[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const pathStack: string[] = [];

    /**
     * Depth-first search to detect cycles
     *
     * @param node - Current node path
     */
    const dfs = (node: string) => {
      visited.add(node);
      recursionStack.add(node);
      pathStack.push(node);

      const nodeEdges = graph.edges.get(node) || [];
      for (const edge of nodeEdges) {
        if (!visited.has(edge.to)) {
          // Continue DFS
          dfs(edge.to);
        } else if (recursionStack.has(edge.to)) {
          // Found a cycle!
          const cycleStartIndex = pathStack.indexOf(edge.to);
          const cycleNodes = pathStack.slice(cycleStartIndex);

          // Build cycle edges
          const cycleEdges: Edge[] = [];
          for (let i = 0; i < cycleNodes.length; i++) {
            const from = cycleNodes[i];
            const to = cycleNodes[(i + 1) % cycleNodes.length];
            cycleEdges.push({ from, to, type: 'import' });
          }

          // Check if this cycle is already recorded (in different order)
          const cycleSet = new Set(cycleNodes);
          const isNewCycle = !cycles.some(
            (c) => c.nodes.length === cycleNodes.length && c.nodes.every((n) => cycleSet.has(n))
          );

          if (isNewCycle) {
            cycles.push({ nodes: cycleNodes, edges: cycleEdges });
          }
        }
      }

      recursionStack.delete(node);
      pathStack.pop();
    };

    // Run DFS from each unvisited node
    for (const node of graph.nodes.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }
}
