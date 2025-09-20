/**
 * Utility functions for similarity analysis
 */

import * as crypto from 'crypto';

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate normalized Levenshtein similarity (0.0 to 1.0)
 */
export function levenshteinSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;

  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(str1, str2);
  return 1.0 - (distance / maxLen);
}

/**
 * Extract keywords from text content
 */
export function extractKeywords(content: string, minLength = 3): Set<string> {
  const keywords = new Set<string>();

  // Split on word boundaries and filter
  const words = content
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= minLength);

  // Common stop words to exclude
  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all',
    'can', 'her', 'was', 'one', 'our', 'out', 'his', 'has',
    'had', 'were', 'been', 'have', 'their', 'its', 'would',
    'will', 'with', 'this', 'that', 'from', 'they', 'which',
  ]);

  for (const word of words) {
    if (!stopWords.has(word)) {
      keywords.add(word);
    }
  }

  return keywords;
}

/**
 * Calculate Jaccard similarity between two sets
 */
export function jaccardSimilarity<T>(set1: Set<T>, set2: Set<T>): number {
  if (set1.size === 0 && set2.size === 0) return 1.0;

  const intersection = new Set<T>();
  const union = new Set<T>(set1);

  for (const item of set2) {
    if (set1.has(item)) {
      intersection.add(item);
    }
    union.add(item);
  }

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Calculate a hash for cache key generation
 */
export function generateCacheKey(path1: string, path2: string): string {
  const sorted = [path1, path2].sort();
  return crypto.createHash('md5').update(sorted.join('|')).digest('hex');
}

/**
 * Extract structural tokens from code
 */
export function extractStructuralTokens(content: string, extension: string): string[] {
  const tokens: string[] = [];

  // TypeScript/JavaScript patterns
  if (['.ts', '.tsx', '.js', '.jsx'].includes(extension)) {
    // Imports
    const importMatches = content.match(/import\s+.+?\s+from\s+['"][^'"]+['"]/g) || [];
    tokens.push(...importMatches.map(() => 'IMPORT'));

    // Exports
    const exportMatches = content.match(/export\s+(default\s+)?(const|function|class|interface|type|enum)/g) || [];
    tokens.push(...exportMatches.map(() => 'EXPORT'));

    // Functions
    const funcMatches = content.match(/function\s+\w+/g) || [];
    tokens.push(...funcMatches.map(() => 'FUNCTION'));

    // Classes
    const classMatches = content.match(/class\s+\w+/g) || [];
    tokens.push(...classMatches.map(() => 'CLASS'));

    // Interfaces
    const interfaceMatches = content.match(/interface\s+\w+/g) || [];
    tokens.push(...interfaceMatches.map(() => 'INTERFACE'));

    // Arrow functions
    const arrowMatches = content.match(/=>\s*{/g) || [];
    tokens.push(...arrowMatches.map(() => 'ARROW_FUNCTION'));
  }

  // Markdown patterns
  if (['.md', '.mdx'].includes(extension)) {
    // Headers
    const headerMatches = content.match(/^#{1,6}\s+.+$/gm) || [];
    headerMatches.forEach(h => {
      const level = h.match(/^(#+)/)?.[1].length || 1;
      tokens.push(`H${level}`);
    });

    // Code blocks
    const codeBlockMatches = content.match(/```[\s\S]*?```/g) || [];
    tokens.push(...codeBlockMatches.map(() => 'CODE_BLOCK'));

    // Lists
    const listMatches = content.match(/^[\s]*[-*+]\s+/gm) || [];
    tokens.push(...listMatches.map(() => 'LIST_ITEM'));
  }

  // JSON structure
  if (['.json'].includes(extension)) {
    try {
      const parsed = JSON.parse(content);
      const keys = extractJsonKeys(parsed);
      tokens.push(...keys.map(k => `KEY:${k}`));
    } catch {
      // Invalid JSON, skip structural analysis
    }
  }

  return tokens;
}

/**
 * Extract keys from JSON object recursively
 */
function extractJsonKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];

  if (obj && typeof obj === 'object') {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        keys.push(fullKey);

        // Recurse for nested objects
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          keys.push(...extractJsonKeys(obj[key], fullKey));
        }
      }
    }
  }

  return keys;
}

/**
 * Normalize text for comparison
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract filename stem (without extension)
 */
export function getFilenameStem(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(0, lastDot) : filename;
}

/**
 * Check if two extensions are related
 */
export function areExtensionsRelated(ext1: string, ext2: string): boolean {
  const related = [
    ['.js', '.ts', '.jsx', '.tsx'],
    ['.json', '.jsonc', '.json5'],
    ['.yml', '.yaml'],
    ['.md', '.mdx'],
    ['.htm', '.html'],
  ];

  for (const group of related) {
    if (group.includes(ext1) && group.includes(ext2)) {
      return true;
    }
  }

  return ext1 === ext2;
}