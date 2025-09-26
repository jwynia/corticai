/**
 * Document structure similarity analysis layer
 */

import { AnalysisLayer, FileInfo, SimilarityDetails } from '../types';
import { extractStructuralTokens, jaccardSimilarity, levenshteinSimilarity } from '../utils';

export class StructureAnalyzer implements AnalysisLayer {
  public readonly name = 'structure';
  private lastDetails: SimilarityDetails = {};

  async analyze(file1: FileInfo, file2: FileInfo): Promise<number> {
    // Reset details
    this.lastDetails = { commonStructures: [] };

    // Handle missing content
    if (!file1.content || !file2.content) {
      return 0.0;
    }

    // Empty files have identical structure
    if (file1.content.trim() === '' && file2.content.trim() === '') {
      return 1.0;
    }

    // Different extensions might indicate different structure expectations
    const extensionMultiplier = file1.extension === file2.extension ? 1.0 : 0.9;

    let score = 0.0;

    // Analyze based on file type
    if (['.ts', '.tsx', '.js', '.jsx'].includes(file1.extension) ||
        ['.ts', '.tsx', '.js', '.jsx'].includes(file2.extension)) {
      score = this.analyzeCodeStructure(file1.content!, file2.content!, file1.extension, file2.extension);
    } else if (['.md', '.mdx'].includes(file1.extension) ||
               ['.md', '.mdx'].includes(file2.extension)) {
      score = this.analyzeMarkdownStructure(file1.content!, file2.content!);
    } else if (['.json', '.jsonc'].includes(file1.extension) ||
               ['.json', '.jsonc'].includes(file2.extension)) {
      score = this.analyzeJsonStructure(file1.content!, file2.content!);
    } else if (['.yml', '.yaml'].includes(file1.extension) ||
               ['.yml', '.yaml'].includes(file2.extension)) {
      score = this.analyzeYamlStructure(file1.content!, file2.content!);
    } else {
      score = this.analyzeGenericStructure(file1.content, file2.content);
    }

    return Math.min(1.0, score * extensionMultiplier);
  }

  private analyzeCodeStructure(
    content1: string,
    content2: string,
    ext1: string,
    ext2: string
  ): number {
    // Extract structural tokens
    const tokens1 = extractStructuralTokens(content1, ext1);
    const tokens2 = extractStructuralTokens(content2, ext2);

    // Compare token patterns
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);

    // Check for common structures
    const commonStructures = new Set<string>();
    for (const token of set1) {
      if (set2.has(token)) {
        commonStructures.add(token);
      }
    }

    this.lastDetails.commonStructures = Array.from(commonStructures);

    // Calculate similarity based on token similarity
    let score = jaccardSimilarity(set1, set2);

    // Also consider the sequence of tokens
    if (tokens1.length > 0 && tokens2.length > 0) {
      const sequenceSimilarity = this.calculateSequenceSimilarity(tokens1, tokens2);
      score = (score * 0.6 + sequenceSimilarity * 0.4);
    }

    // Check for specific patterns
    const patterns = this.detectCodePatterns(content1, content2);
    if (patterns.length > 0) {
      this.lastDetails.commonStructures!.push(...patterns);
      score = Math.max(score, 0.7);
    }

    return score;
  }

  private analyzeMarkdownStructure(content1: string, content2: string): number {
    // Extract heading structure
    const headings1 = this.extractMarkdownHeadings(content1);
    const headings2 = this.extractMarkdownHeadings(content2);

    if (headings1.length === 0 && headings2.length === 0) {
      // No headings, check paragraph and list structure
      const paras1 = content1.split(/\n\n+/).length;
      const paras2 = content2.split(/\n\n+/).length;

      const lists1 = (content1.match(/^[\s]*[-*+]\s+/gm) || []).length;
      const lists2 = (content2.match(/^[\s]*[-*+]\s+/gm) || []).length;

      const paraSim = 1.0 - Math.abs(paras1 - paras2) / Math.max(paras1, paras2, 1);
      const listSim = 1.0 - Math.abs(lists1 - lists2) / Math.max(lists1, lists2, 1);

      return (paraSim * 0.5 + listSim * 0.5);
    }

    // Compare heading hierarchies
    const hierarchy1 = headings1.map(h => h.level).join('-');
    const hierarchy2 = headings2.map(h => h.level).join('-');

    const hierarchySim = levenshteinSimilarity(hierarchy1, hierarchy2);

    // Compare heading text
    const headingText1 = headings1.map(h => h.text.toLowerCase()).sort();
    const headingText2 = headings2.map(h => h.text.toLowerCase()).sort();

    const textSim = jaccardSimilarity(new Set(headingText1), new Set(headingText2));

    // Store common headings
    const common = headingText1.filter(h => headingText2.includes(h));
    if (common.length > 0) {
      this.lastDetails.commonStructures = common.map(h => `heading: ${h}`);
    }

    return (hierarchySim * 0.6 + textSim * 0.4);
  }

  private analyzeJsonStructure(content1: string, content2: string): number {
    try {
      const json1 = JSON.parse(content1);
      const json2 = JSON.parse(content2);

      const keys1 = this.extractJsonKeys(json1);
      const keys2 = this.extractJsonKeys(json2);

      const similarity = jaccardSimilarity(keys1, keys2);

      // Store common keys
      const common: string[] = [];
      for (const key of keys1) {
        if (keys2.has(key)) {
          common.push(`json-key: ${key}`);
        }
      }

      if (common.length > 0) {
        this.lastDetails.commonStructures = common.slice(0, 10); // Limit to 10
      }

      return similarity;
    } catch {
      // Invalid JSON, fall back to generic structure analysis
      return this.analyzeGenericStructure(content1, content2);
    }
  }

  private analyzeYamlStructure(content1: string, content2: string): number {
    // Simple YAML structure analysis based on indentation and keys
    const lines1 = content1.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
    const lines2 = content2.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));

    const keys1 = new Set<string>();
    const keys2 = new Set<string>();

    // Extract top-level keys
    for (const line of lines1) {
      const match = line.match(/^(\w+):/);
      if (match) keys1.add(match[1]);
    }

    for (const line of lines2) {
      const match = line.match(/^(\w+):/);
      if (match) keys2.add(match[1]);
    }

    const keySimilarity = jaccardSimilarity(keys1, keys2);

    // Compare indentation patterns
    const indent1 = this.getIndentationPattern(lines1);
    const indent2 = this.getIndentationPattern(lines2);

    const indentSim = levenshteinSimilarity(indent1, indent2);

    return (keySimilarity * 0.7 + indentSim * 0.3);
  }

  private analyzeGenericStructure(content1: string, content2: string): number {
    // Line count similarity
    const lines1 = content1.split('\n');
    const lines2 = content2.split('\n');

    const lineCountSim = 1.0 - Math.abs(lines1.length - lines2.length) / Math.max(lines1.length, lines2.length, 1);

    // Paragraph structure
    const paras1 = content1.split(/\n\n+/).length;
    const paras2 = content2.split(/\n\n+/).length;

    const paraSim = 1.0 - Math.abs(paras1 - paras2) / Math.max(paras1, paras2, 1);

    // Indentation patterns
    const indent1 = this.getIndentationPattern(lines1);
    const indent2 = this.getIndentationPattern(lines2);

    const indentSim = levenshteinSimilarity(indent1, indent2);

    return (lineCountSim * 0.3 + paraSim * 0.3 + indentSim * 0.4);
  }

  private calculateSequenceSimilarity(tokens1: string[], tokens2: string[]): number {
    // Use a simple sequence matching approach
    const maxLen = Math.max(tokens1.length, tokens2.length);
    if (maxLen === 0) return 1.0;

    let matches = 0;
    const minLen = Math.min(tokens1.length, tokens2.length);

    for (let i = 0; i < minLen; i++) {
      if (tokens1[i] === tokens2[i]) {
        matches++;
      }
    }

    return matches / maxLen;
  }

  private detectCodePatterns(content1: string, content2: string): string[] {
    const patterns: string[] = [];

    // Check for React component patterns
    if (content1.includes('React') && content2.includes('React')) {
      if (content1.includes('useState') && content2.includes('useState')) {
        patterns.push('react-hooks');
      }
      if (content1.includes('Component') && content2.includes('Component')) {
        patterns.push('react-class-component');
      }
    }

    // Check for async patterns
    if (content1.includes('async') && content2.includes('async')) {
      patterns.push('async-await');
    }

    // Check for test patterns
    if ((content1.includes('describe') && content2.includes('describe')) ||
        (content1.includes('test') && content2.includes('test'))) {
      patterns.push('test-suite');
    }

    return patterns;
  }

  private extractMarkdownHeadings(content: string): Array<{ level: number; text: string }> {
    const headings: Array<{ level: number; text: string }> = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        headings.push({
          level: match[1].length,
          text: match[2].trim(),
        });
      }
    }

    return headings;
  }

  private extractJsonKeys(obj: any, prefix = ''): Set<string> {
    const keys = new Set<string>();

    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          keys.add(fullKey);

          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            const nestedKeys = this.extractJsonKeys(obj[key], fullKey);
            for (const nk of nestedKeys) {
              keys.add(nk);
            }
          }
        }
      }
    }

    return keys;
  }

  private getIndentationPattern(lines: string[]): string {
    return lines.map(line => {
      const match = line.match(/^(\s*)/);
      return match ? match[1].length.toString() : '0';
    }).join('');
  }

  getDetails(): SimilarityDetails {
    return this.lastDetails;
  }
}