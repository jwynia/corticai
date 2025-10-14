import * as path from 'path';
import * as fs from 'fs/promises';
import {
  FileAnalysis,
  DependencyGraph,
  ProjectAnalysis,
  Report,
  ModuleImportInfo,
  AnalyzerOptions
} from './types';
import { TSImportResolver } from './TSImportResolver';
import { TSASTParser } from './TSASTParser';
import { TSDependencyGraph } from './TSDependencyGraph';

// Constants
const DEFAULT_MAX_DEPTH = 10;
const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const DEFAULT_EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build'];

/**
 * TypeScript Dependency Analyzer
 *
 * Main orchestrator for TypeScript dependency analysis.
 * Coordinates between specialized modules to analyze TypeScript projects.
 *
 * Architecture:
 * - TSImportResolver: Resolves import paths to absolute file paths
 * - TSASTParser: Parses TypeScript AST to extract imports/exports
 * - TSDependencyGraph: Builds dependency graphs and detects cycles
 *
 * This class handles:
 * - Directory scanning and file discovery
 * - Coordination between modules
 * - Report generation and export formats
 */
export class TypeScriptDependencyAnalyzer {
  private options: AnalyzerOptions;
  private importResolver: TSImportResolver;
  private astParser: TSASTParser;
  private graphBuilder: TSDependencyGraph;

  constructor(options: AnalyzerOptions = {}) {
    this.options = {
      includeJavaScript: true,
      includeNodeModules: false,
      extensions: DEFAULT_EXTENSIONS,
      excludeDirs: DEFAULT_EXCLUDE_DIRS,
      maxDepth: DEFAULT_MAX_DEPTH,
      verbose: false,
      ...options
    };

    // Initialize modules with dependency injection
    this.importResolver = new TSImportResolver();
    this.astParser = new TSASTParser({
      importResolver: this.importResolver,
      log: this.options.verbose ? (msg: string) => console.log(msg) : undefined
    });
    this.graphBuilder = new TSDependencyGraph();
  }

  /**
   * Analyze a single TypeScript file
   *
   * Delegates to TSASTParser for AST parsing and analysis
   */
  async analyzeFile(filePath: string): Promise<FileAnalysis> {
    return await this.astParser.parseFile(filePath);
  }

  /**
   * Analyze all TypeScript files in a directory
   */
  async analyzeDirectory(dirPath: string): Promise<ProjectAnalysis> {
    // Validate input
    if (dirPath === null || dirPath === undefined) {
      throw new Error('Invalid directory path: must be a string');
    }
    if (typeof dirPath !== 'string') {
      throw new Error('Invalid directory path: must be a string');
    }
    if (dirPath === '') {
      throw new Error('Invalid directory path: must be a string');
    }
    
    const files: FileAnalysis[] = [];
    const allFiles = await this.findTypeScriptFiles(dirPath);
    
    for (const filePath of allFiles) {
      try {
        const analysis = await this.analyzeFile(filePath);
        files.push(analysis);
      } catch (error) {
        // Skip files that can't be analyzed, logging is handled by verbose option
        if (this.options.verbose) {
          // In production, errors should be handled by the caller or a logging service
          // For now, we silently skip files that can't be analyzed
        }
      }
    }

    // Calculate totals
    const totalImports = files.reduce((sum, f) => sum + f.imports.length, 0);
    const totalExports = files.reduce((sum, f) => sum + f.exports.length, 0);

    // Build dependency graph
    const graph = this.buildDependencyGraph(files);

    return {
      rootPath: dirPath,
      files,
      totalImports,
      totalExports,
      graph,
      timestamp: new Date()
    };
  }

  /**
   * Find all TypeScript files in directory recursively
   */
  private async findTypeScriptFiles(dirPath: string, depth = 0): Promise<string[]> {
    if (depth > (this.options.maxDepth || 10)) {
      return [];
    }

    const files: string[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Skip excluded directories
        if (this.options.excludeDirs?.includes(entry.name)) {
          continue;
        }
        
        const subFiles = await this.findTypeScriptFiles(fullPath, depth + 1);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (this.options.extensions?.includes(ext)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * Build dependency graph from file analyses
   *
   * Delegates to TSDependencyGraph for graph construction and cycle detection
   */
  buildDependencyGraph(files: FileAnalysis[]): DependencyGraph {
    return this.graphBuilder.buildGraph(files);
  }

  /**
   * Detect circular dependencies
   *
   * Delegates to TSDependencyGraph for cycle detection using DFS
   */
  detectCycles(graph: DependencyGraph): typeof graph.cycles {
    return this.graphBuilder.detectCycles(graph);
  }

  /**
   * Export graph as JSON
   */
  exportToJSON(graph: DependencyGraph): string {
    // Validate input
    if (!graph || typeof graph !== 'object') {
      throw new Error('Graph must be a valid object');
    }
    if (!(graph.nodes instanceof Map) || !(graph.edges instanceof Map)) {
      throw new Error('Graph must contain valid nodes and edges Maps');
    }
    
    const jsonGraph = {
      nodes: Array.from(graph.nodes.entries()).map(([filePath, node]) => ({
        ...node,
        path: filePath
      })),
      edges: Array.from(graph.edges.entries()).flatMap(([from, edges]) =>
        edges.map(edge => ({ from, to: edge.to, type: edge.type }))
      ),
      cycles: graph.cycles
    };

    try {
      return JSON.stringify(jsonGraph, null, 2);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('circular')) {
        throw new Error('Cannot export graph with circular references');
      }
      throw error;
    }
  }

  /**
   * Export graph in DOT format for Graphviz
   */
  exportToDOT(graph: DependencyGraph): string {
    // Validate input
    if (!graph || typeof graph !== 'object') {
      throw new Error('Graph must be a valid object');
    }
    if (!(graph.nodes instanceof Map) || !(graph.edges instanceof Map)) {
      throw new Error('Graph must contain valid nodes and edges Maps');
    }
    
    const lines: string[] = ['digraph dependencies {'];
    lines.push('  rankdir=LR;');
    lines.push('  node [shape=box];');
    
    // Create a set of nodes involved in cycles
    const cycleNodes = new Set<string>();
    if (graph.cycles && Array.isArray(graph.cycles)) {
      graph.cycles.forEach(cycle => {
        if (cycle && Array.isArray(cycle.nodes)) {
          cycle.nodes.forEach(node => cycleNodes.add(node));
        }
      });
    }

    // Add nodes
    for (const [path, node] of graph.nodes) {
      const fileName = path.split('/').pop() || path;
      const color = cycleNodes.has(path) ? ', fillcolor=red, style=filled' : '';
      lines.push(`  "${path}" [label="${fileName}"${color}];`);
    }

    // Add edges
    for (const [from, edges] of graph.edges) {
      for (const edge of edges) {
        // Check if this edge is part of a cycle
        const isInCycle = graph.cycles.some(cycle =>
          cycle.edges.some(e => e.from === from && e.to === edge.to)
        );
        const color = isInCycle ? ' [color=red]' : '';
        lines.push(`  "${from}" -> "${edge.to}"${color};`);
      }
    }

    lines.push('}');
    return lines.join('\n');
  }

  /**
   * Generate comprehensive report from project analysis
   */
  generateReport(analysis: ProjectAnalysis): Report {
    // Calculate most imported modules
    const importCounts = new Map<string, { count: number; importedBy: string[] }>();
    
    for (const file of analysis.files) {
      for (const dep of file.dependencies) {
        const existing = importCounts.get(dep) || { count: 0, importedBy: [] };
        existing.count++;
        existing.importedBy.push(file.path);
        importCounts.set(dep, existing);
      }
    }

    const mostImported: ModuleImportInfo[] = Array.from(importCounts.entries())
      .map(([path, info]) => ({
        path,
        importCount: info.count,
        importedBy: info.importedBy
      }))
      .sort((a, b) => b.importCount - a.importCount)
      .slice(0, 10);

    // Find unused exports
    const allImportedItems = new Set<string>();
    for (const file of analysis.files) {
      for (const imp of file.imports) {
        imp.specifiers.forEach(spec => allImportedItems.add(spec));
      }
    }

    const unusedExports: string[] = [];
    for (const file of analysis.files) {
      for (const exp of file.exports) {
        if (!allImportedItems.has(exp.name) && exp.name !== 'default' && exp.name !== '*') {
          unusedExports.push(exp.name);
        }
      }
    }

    // Find isolated files
    const isolatedFiles = analysis.files
      .filter(f => f.imports.length === 0 && f.exports.length === 0)
      .map(f => f.path);

    return {
      summary: {
        totalFiles: analysis.files.length,
        totalImports: analysis.totalImports,
        totalExports: analysis.totalExports,
        totalCycles: analysis.graph?.cycles.length || 0
      },
      mostImported,
      unusedExports,
      circularDependencies: analysis.graph?.cycles || [],
      isolatedFiles,
      timestamp: new Date()
    };
  }
}