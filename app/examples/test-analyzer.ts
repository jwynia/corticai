/**
 * Example: Testing the TypeScript Dependency Analyzer
 * This demonstrates how to use the analyzer on the project itself
 */

import { TypeScriptDependencyAnalyzer } from '../src/analyzers/TypeScriptDependencyAnalyzer';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAnalysis() {
  console.log('🔍 TypeScript Dependency Analyzer - Demo\n');
  
  const analyzer = new TypeScriptDependencyAnalyzer({
    includeJavaScript: true,
    verbose: false
  });

  // Analyze the mastra directory as an example
  const targetDir = path.join(__dirname, '../src/mastra');
  console.log(`📁 Analyzing directory: ${targetDir}\n`);
  
  try {
    // Analyze the directory
    const projectAnalysis = await analyzer.analyzeDirectory(targetDir);
    console.log(`✅ Found ${projectAnalysis.files.length} TypeScript/JavaScript files`);
    console.log(`📦 Total imports: ${projectAnalysis.totalImports}`);
    console.log(`📤 Total exports: ${projectAnalysis.totalExports}\n`);
    
    // Build dependency graph
    const graph = analyzer.buildDependencyGraph(projectAnalysis.files);
    console.log(`🕸️  Graph contains ${graph.nodes.size} nodes`);
    console.log(`🔗 Graph contains ${Array.from(graph.edges.values()).flat().length} edges\n`);
    
    // Detect cycles
    const cycles = analyzer.detectCycles(graph);
    if (cycles.length > 0) {
      console.log(`⚠️  Found ${cycles.length} circular dependencies:`);
      cycles.forEach((cycle, i) => {
        console.log(`  Cycle ${i + 1}:`);
        cycle.nodes.forEach(node => {
          const fileName = path.basename(node);
          console.log(`    - ${fileName}`);
        });
      });
    } else {
      console.log('✅ No circular dependencies detected');
    }
    console.log();
    
    // Generate report
    const report = analyzer.generateReport(projectAnalysis);
    
    // Show most imported modules
    console.log('📊 Most imported modules:');
    report.mostImported.slice(0, 5).forEach(mod => {
      const fileName = path.basename(mod.path);
      console.log(`  - ${fileName}: imported ${mod.importCount} times`);
    });
    console.log();
    
    // Show unused exports
    if (report.unusedExports.length > 0) {
      console.log(`⚠️  Found ${report.unusedExports.length} potentially unused exports:`);
      report.unusedExports.slice(0, 5).forEach(exp => {
        console.log(`  - ${exp}`);
      });
    }
    console.log();
    
    // Export visualizations
    const jsonPath = path.join(__dirname, 'dependency-graph.json');
    const dotPath = path.join(__dirname, 'dependency-graph.dot');
    
    // Export JSON
    const jsonGraph = analyzer.exportToJSON(graph);
    console.log('💾 Exported graph to JSON (preview):');
    const preview = JSON.parse(jsonGraph);
    console.log(`  - Nodes: ${preview.nodes.length}`);
    console.log(`  - Edges: ${preview.edges.length}`);
    console.log(`  - Cycles: ${preview.cycles.length}\n`);
    
    // Export DOT format
    const dotGraph = analyzer.exportToDOT(graph);
    console.log('📈 Exported graph to DOT format for Graphviz');
    console.log('   You can visualize this using: https://dreampuf.github.io/GraphvizOnline/');
    console.log('\nDOT Preview (first 5 lines):');
    dotGraph.split('\n').slice(0, 5).forEach(line => console.log(`  ${line}`));
    
    // Write files
    const fs = await import('fs/promises');
    await fs.writeFile(jsonPath, jsonGraph);
    await fs.writeFile(dotPath, dotGraph);
    
    console.log('\n✅ Analysis complete!');
    console.log(`📁 Results saved to: ${path.dirname(jsonPath)}`);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

// Run the analysis
runAnalysis().catch(console.error);