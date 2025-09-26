/**
 * Semantic content similarity analysis layer
 */

import { AnalysisLayer, FileInfo, SimilarityDetails } from '../types';
import { extractKeywords, jaccardSimilarity, normalizeText } from '../utils';

export class SemanticAnalyzer implements AnalysisLayer {
  public readonly name = 'semantic';
  private lastDetails: SimilarityDetails = {};

  async analyze(file1: FileInfo, file2: FileInfo): Promise<number> {
    // Reset details
    this.lastDetails = { sharedKeywords: [] };

    // Identical content
    if (file1.content === file2.content) {
      return 1.0;
    }

    // Handle missing content
    if (!file1.content || !file2.content) {
      return 0.0;
    }

    // Empty files
    if (file1.content.trim() === '' && file2.content.trim() === '') {
      return 1.0;
    }

    // Extract and compare keywords
    const keywords1 = this.extractEnhancedKeywords(file1.content, file1.extension);
    const keywords2 = this.extractEnhancedKeywords(file2.content, file2.extension);

    // Calculate Jaccard similarity of keywords
    const keywordSimilarity = jaccardSimilarity(keywords1, keywords2);

    // Find shared keywords for details
    const shared: string[] = [];
    for (const keyword of keywords1) {
      if (keywords2.has(keyword)) {
        shared.push(keyword);
      }
    }
    this.lastDetails.sharedKeywords = shared.sort();

    // Extract and compare semantic patterns
    const patterns1 = this.extractSemanticPatterns(file1.content!, file1.extension);
    const patterns2 = this.extractSemanticPatterns(file2.content!, file2.extension);

    const patternSimilarity = jaccardSimilarity(patterns1, patterns2);

    // Extract and compare code-specific semantics if applicable
    let codeSimilarity = 0;
    if (this.isCodeFile(file1.extension) && this.isCodeFile(file2.extension)) {
      codeSimilarity = this.analyzeCodeSemantics(file1.content!, file2.content!);
    }

    // Weight the different aspects
    let score = keywordSimilarity * 0.5 + patternSimilarity * 0.3;

    if (codeSimilarity > 0) {
      score = score * 0.7 + codeSimilarity * 0.3;
    } else {
      score = score / 0.8; // Normalize when code similarity not applicable
    }

    return Math.min(1.0, score);
  }

  private extractEnhancedKeywords(content: string, extension: string): Set<string> {
    // Start with basic keyword extraction
    const keywords = extractKeywords(content, 3);

    // Add technical terms based on file type
    if (this.isCodeFile(extension)) {
      // Extract function/method names
      const funcMatches = content.match(/function\s+(\w+)/g) || [];
      funcMatches.forEach(match => {
        const name = match.replace('function ', '').toLowerCase();
        if (name.length > 2) keywords.add(name);
      });

      // Extract class names
      const classMatches = content.match(/class\s+(\w+)/g) || [];
      classMatches.forEach(match => {
        const name = match.replace('class ', '').toLowerCase();
        if (name.length > 2) keywords.add(name);
      });

      // Extract important technical keywords
      const techKeywords = [
        'react', 'vue', 'angular', 'express', 'mongoose',
        'async', 'await', 'promise', 'observable',
        'component', 'service', 'controller', 'module',
        'useState', 'useEffect', 'useCallback', 'useMemo',
        'import', 'export', 'interface', 'type', 'enum',
        'test', 'describe', 'expect', 'mock',
        'get', 'post', 'put', 'delete', 'patch',
        'select', 'insert', 'update', 'where', 'join',
        'try', 'catch', 'throw', 'error',
        'console', 'log', 'debug', 'warn',
        'TODO', 'FIXME', 'HACK', 'NOTE',
      ];

      for (const tech of techKeywords) {
        if (content.toLowerCase().includes(tech.toLowerCase())) {
          keywords.add(tech);
        }
      }
    }

    // Extract file-specific meaningful terms
    if (extension === '.md' || extension === '.mdx') {
      // Extract header text
      const headers = content.match(/^#{1,6}\s+(.+)$/gm) || [];
      headers.forEach(h => {
        const text = h.replace(/^#{1,6}\s+/, '').toLowerCase();
        const words = text.split(/\s+/).filter(w => w.length > 3);
        words.forEach(w => keywords.add(w));
      });
    }

    return keywords;
  }

  private extractSemanticPatterns(content: string, extension: string): Set<string> {
    const patterns = new Set<string>();

    // Common programming patterns
    if (this.isCodeFile(extension)) {
      // Error handling patterns
      if (content.includes('try') && content.includes('catch')) {
        patterns.add('error-handling');
      }

      // Validation patterns
      if (content.match(/validat|check|verify|confirm/i)) {
        patterns.add('validation');
      }

      // Authentication/authorization
      if (content.match(/auth|login|logout|session|token|jwt/i)) {
        patterns.add('authentication');
      }

      // Data fetching
      if (content.match(/fetch|axios|request|get|post|api/i)) {
        patterns.add('data-fetching');
      }

      // State management
      if (content.match(/state|store|redux|mobx|context/i)) {
        patterns.add('state-management');
      }

      // Testing
      if (content.match(/test|spec|describe|it\(|expect|assert/i)) {
        patterns.add('testing');
      }

      // Database operations
      if (content.match(/database|query|insert|update|delete|select/i)) {
        patterns.add('database-ops');
      }

      // Event handling
      if (content.match(/addEventListener|on[A-Z]\w+|emit|dispatch/i)) {
        patterns.add('event-handling');
      }
    }

    // Configuration patterns
    if (['.json', '.yml', '.yaml', '.env'].includes(extension)) {
      if (content.match(/database|db|host|port|connection/i)) {
        patterns.add('database-config');
      }
      if (content.match(/api|endpoint|url|base/i)) {
        patterns.add('api-config');
      }
      if (content.match(/secret|key|token|password|credential/i)) {
        patterns.add('security-config');
      }
    }

    // Documentation patterns
    if (['.md', '.mdx', '.txt'].includes(extension)) {
      if (content.match(/install|setup|configure|requirements/i)) {
        patterns.add('setup-docs');
      }
      if (content.match(/usage|example|tutorial|guide/i)) {
        patterns.add('usage-docs');
      }
      if (content.match(/api|reference|methods|functions/i)) {
        patterns.add('api-docs');
      }
    }

    return patterns;
  }

  private analyzeCodeSemantics(content1: string, content2: string): number {
    let score = 0;
    let weights = 0;

    // Compare function/method purposes
    const purposes1 = this.extractCodePurposes(content1);
    const purposes2 = this.extractCodePurposes(content2);

    if (purposes1.size > 0 && purposes2.size > 0) {
      score += jaccardSimilarity(purposes1, purposes2) * 0.4;
      weights += 0.4;
    }

    // Compare variable naming patterns
    const varPatterns1 = this.extractVariablePatterns(content1);
    const varPatterns2 = this.extractVariablePatterns(content2);

    if (varPatterns1.size > 0 && varPatterns2.size > 0) {
      score += jaccardSimilarity(varPatterns1, varPatterns2) * 0.2;
      weights += 0.2;
    }

    // Compare comment content
    const comments1 = this.extractComments(content1);
    const comments2 = this.extractComments(content2);

    if (comments1.size > 0 && comments2.size > 0) {
      score += jaccardSimilarity(comments1, comments2) * 0.2;
      weights += 0.2;
    }

    // Compare import/dependency patterns
    const deps1 = this.extractDependencies(content1);
    const deps2 = this.extractDependencies(content2);

    if (deps1.size > 0 && deps2.size > 0) {
      score += jaccardSimilarity(deps1, deps2) * 0.2;
      weights += 0.2;
    }

    return weights > 0 ? score / weights : 0;
  }

  private extractCodePurposes(content: string): Set<string> {
    const purposes = new Set<string>();

    // Function names often indicate purpose
    const funcMatches = content.match(/function\s+(\w+)|const\s+(\w+)\s*=.*=>|(\w+)\s*\([^)]*\)\s*{/g) || [];

    for (const match of funcMatches) {
      const cleaned = match.toLowerCase();

      // Extract purpose keywords
      if (cleaned.includes('validate')) purposes.add('validation');
      if (cleaned.includes('auth')) purposes.add('authentication');
      if (cleaned.includes('fetch') || cleaned.includes('get') || cleaned.includes('load')) purposes.add('data-retrieval');
      if (cleaned.includes('save') || cleaned.includes('update') || cleaned.includes('set')) purposes.add('data-mutation');
      if (cleaned.includes('handle') || cleaned.includes('process')) purposes.add('event-processing');
      if (cleaned.includes('render') || cleaned.includes('display')) purposes.add('presentation');
      if (cleaned.includes('calculate') || cleaned.includes('compute')) purposes.add('computation');
      if (cleaned.includes('convert') || cleaned.includes('transform')) purposes.add('transformation');
      if (cleaned.includes('test') || cleaned.includes('check')) purposes.add('testing');
    }

    return purposes;
  }

  private extractVariablePatterns(content: string): Set<string> {
    const patterns = new Set<string>();

    // Common variable naming patterns
    const varMatches = content.match(/(?:const|let|var)\s+(\w+)/g) || [];

    for (const match of varMatches) {
      const varName = match.replace(/(?:const|let|var)\s+/, '').toLowerCase();

      // Categorize by pattern
      if (varName.startsWith('is') || varName.startsWith('has') || varName.startsWith('can')) {
        patterns.add('boolean-flag');
      }
      if (varName.endsWith('list') || varName.endsWith('array') || varName.endsWith('items')) {
        patterns.add('collection');
      }
      if (varName.includes('config') || varName.includes('option') || varName.includes('setting')) {
        patterns.add('configuration');
      }
      if (varName.includes('error') || varName.includes('exception')) {
        patterns.add('error-handling');
      }
      if (varName.includes('result') || varName.includes('response') || varName.includes('data')) {
        patterns.add('data-container');
      }
    }

    return patterns;
  }

  private extractComments(content: string): Set<string> {
    const comments = new Set<string>();

    // Single-line comments
    const singleLine = content.match(/\/\/.*$/gm) || [];
    for (const comment of singleLine) {
      const text = normalizeText(comment.replace(/^\/\/\s*/, ''));
      if (text.length > 5) {
        const words = text.split(/\s+/).filter(w => w.length > 3);
        words.forEach(w => comments.add(w));
      }
    }

    // Multi-line comments
    const multiLine = content.match(/\/\*[\s\S]*?\*\//g) || [];
    for (const comment of multiLine) {
      const text = normalizeText(comment.replace(/\/\*|\*\//g, '').replace(/\*/g, ''));
      if (text.length > 5) {
        const words = text.split(/\s+/).filter(w => w.length > 3);
        words.forEach(w => comments.add(w));
      }
    }

    // JSDoc comments - extract purpose
    const jsdoc = content.match(/@\w+\s+[^@\n]+/g) || [];
    for (const doc of jsdoc) {
      const text = normalizeText(doc.replace(/@\w+\s+/, ''));
      const words = text.split(/\s+/).filter(w => w.length > 3);
      words.forEach(w => comments.add(w));
    }

    return comments;
  }

  private extractDependencies(content: string): Set<string> {
    const deps = new Set<string>();

    // ES6 imports
    const es6Imports = content.match(/import\s+.*from\s+['"]([^'"]+)['"]/g) || [];
    for (const imp of es6Imports) {
      const match = imp.match(/from\s+['"]([^'"]+)['"]/);
      if (match) {
        const dep = match[1].toLowerCase();
        // Extract package name (first part if scoped)
        const pkgName = dep.startsWith('@') ? dep.split('/').slice(0, 2).join('/') : dep.split('/')[0];
        deps.add(pkgName);
      }
    }

    // CommonJS requires
    const requires = content.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g) || [];
    for (const req of requires) {
      const match = req.match(/['"]([^'"]+)['"]/);
      if (match) {
        const dep = match[1].toLowerCase();
        const pkgName = dep.startsWith('@') ? dep.split('/').slice(0, 2).join('/') : dep.split('/')[0];
        deps.add(pkgName);
      }
    }

    return deps;
  }

  private isCodeFile(extension: string): boolean {
    return ['.ts', '.tsx', '.js', '.jsx', '.vue', '.py', '.java', '.c', '.cpp', '.cs', '.go', '.rs', '.php', '.rb', '.swift'].includes(extension);
  }

  getDetails(): SimilarityDetails {
    return this.lastDetails;
  }
}