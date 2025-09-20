/**
 * Filename similarity analysis layer
 */

import { AnalysisLayer, FileInfo, SimilarityDetails } from '../types';
import {
  levenshteinSimilarity,
  normalizeText,
  getFilenameStem,
  areExtensionsRelated,
} from '../utils';

export class FilenameAnalyzer implements AnalysisLayer {
  public readonly name = 'filename';
  private lastDetails: SimilarityDetails = {};

  async analyze(file1: FileInfo, file2: FileInfo): Promise<number> {
    // Reset details
    this.lastDetails = { filenamePatterns: [] };

    // Perfect match
    if (file1.name === file2.name) {
      this.lastDetails.filenamePatterns!.push('exact_match');
      return 1.0;
    }

    let score = 0.0;
    let weightSum = 0.0;

    // 1. Base name similarity (40% weight)
    const stem1 = getFilenameStem(file1.name);
    const stem2 = getFilenameStem(file2.name);
    const baseSimilarity = this.calculateBaseSimilarity(stem1, stem2);
    score += baseSimilarity * 0.4;
    weightSum += 0.4;

    // 2. Extension similarity (20% weight)
    const extSimilarity = this.calculateExtensionSimilarity(file1.extension, file2.extension);
    score += extSimilarity * 0.2;
    weightSum += 0.2;

    // 3. Pattern detection (40% weight)
    const patternScore = this.detectPatterns(stem1, stem2);
    score += patternScore * 0.4;
    weightSum += 0.4;

    return Math.min(1.0, score / weightSum);
  }

  private calculateBaseSimilarity(stem1: string, stem2: string): number {
    // Normalize for comparison
    const norm1 = normalizeText(stem1);
    const norm2 = normalizeText(stem2);

    // Direct similarity
    let similarity = levenshteinSimilarity(norm1, norm2);

    // Check for case variations only
    if (stem1.toLowerCase() === stem2.toLowerCase()) {
      similarity = Math.max(similarity, 0.9);
      this.lastDetails.filenamePatterns!.push('case_variation');
    }

    // Check for separator variations (_ vs -)
    const normalized1 = norm1.replace(/[-_]/g, '');
    const normalized2 = norm2.replace(/[-_]/g, '');
    if (normalized1 === normalized2) {
      similarity = Math.max(similarity, 0.95);
      this.lastDetails.filenamePatterns!.push('separator_variation');
    }

    return similarity;
  }

  private calculateExtensionSimilarity(ext1: string, ext2: string): number {
    if (ext1 === ext2) return 1.0;
    if (areExtensionsRelated(ext1, ext2)) {
      this.lastDetails.filenamePatterns!.push('related_extensions');
      return 0.7;
    }
    return 0.0;
  }

  private detectPatterns(stem1: string, stem2: string): number {
    let maxScore = 0.0;

    // Version patterns (e.g., file.v1, file.v2)
    if (this.detectVersionPattern(stem1, stem2)) {
      this.lastDetails.filenamePatterns!.push('version_pattern');
      maxScore = Math.max(maxScore, 0.8);
    }

    // Backup patterns (e.g., file, file_backup)
    if (this.detectBackupPattern(stem1, stem2)) {
      this.lastDetails.filenamePatterns!.push('backup_pattern');
      maxScore = Math.max(maxScore, 0.75);
    }

    // Copy patterns (e.g., file, file_copy)
    if (this.detectCopyPattern(stem1, stem2)) {
      this.lastDetails.filenamePatterns!.push('copy_pattern');
      maxScore = Math.max(maxScore, 0.75);
    }

    // Date patterns (e.g., report-2024-01-01, report-2024-01-02)
    if (this.detectDatePattern(stem1, stem2)) {
      this.lastDetails.filenamePatterns!.push('date_pattern');
      maxScore = Math.max(maxScore, 0.85);
    }

    // Number sequence (e.g., test1, test2)
    if (this.detectNumberSequence(stem1, stem2)) {
      this.lastDetails.filenamePatterns!.push('number_sequence');
      maxScore = Math.max(maxScore, 0.85);
    }

    // Common suffix/prefix (e.g., UserController, PostController)
    const affixScore = this.detectCommonAffix(stem1, stem2);
    if (affixScore > 0.5) {
      this.lastDetails.filenamePatterns!.push('common_affix');
      maxScore = Math.max(maxScore, affixScore);
    }

    return maxScore;
  }

  private detectVersionPattern(stem1: string, stem2: string): boolean {
    const versionRegex = /(.+?)[\s._-]?v?(\d+)$/i;
    const match1 = stem1.match(versionRegex);
    const match2 = stem2.match(versionRegex);

    if (match1 && match2) {
      const base1 = match1[1].toLowerCase();
      const base2 = match2[1].toLowerCase();
      return base1 === base2 || levenshteinSimilarity(base1, base2) > 0.8;
    }

    // Check if one has version and other doesn't
    if (match1) {
      const base = match1[1].toLowerCase();
      return base === stem2.toLowerCase();
    }
    if (match2) {
      const base = match2[1].toLowerCase();
      return base === stem1.toLowerCase();
    }

    return false;
  }

  private detectBackupPattern(stem1: string, stem2: string): boolean {
    const backupKeywords = ['backup', 'bak', 'old', 'archive'];
    const lower1 = stem1.toLowerCase();
    const lower2 = stem2.toLowerCase();

    for (const keyword of backupKeywords) {
      if (lower1.includes(keyword) || lower2.includes(keyword)) {
        // Remove backup keyword and compare
        const clean1 = lower1.replace(new RegExp(`[_-]?${keyword}[_-]?`), '');
        const clean2 = lower2.replace(new RegExp(`[_-]?${keyword}[_-]?`), '');

        if (clean1 === clean2 ||
            lower1.replace(new RegExp(`[_-]?${keyword}[_-]?`), '') === lower2 ||
            lower2.replace(new RegExp(`[_-]?${keyword}[_-]?`), '') === lower1) {
          return true;
        }
      }
    }

    return false;
  }

  private detectCopyPattern(stem1: string, stem2: string): boolean {
    const copyKeywords = ['copy', 'dup', 'duplicate', 'clone'];
    const lower1 = stem1.toLowerCase();
    const lower2 = stem2.toLowerCase();

    for (const keyword of copyKeywords) {
      if (lower1.includes(keyword) || lower2.includes(keyword)) {
        // Check various copy patterns
        const patterns = [
          new RegExp(`^(.+)[_-]${keyword}$`),
          new RegExp(`^${keyword}[_-]?of[_-](.+)$`),
          new RegExp(`^(.+)[_-]${keyword}[_-]?\\d*$`),
        ];

        for (const pattern of patterns) {
          const match1 = lower1.match(pattern);
          const match2 = lower2.match(pattern);

          if (match1 && lower2 === match1[1]) return true;
          if (match2 && lower1 === match2[1]) return true;
        }
      }
    }

    // Check for (1), (2) pattern
    const parenRegex = /^(.+?)\s*\(\d+\)$/;
    const match1 = stem1.match(parenRegex);
    const match2 = stem2.match(parenRegex);

    if (match1 && match2) {
      return match1[1] === match2[1];
    }
    if (match1 && match1[1] === stem2) return true;
    if (match2 && match2[1] === stem1) return true;

    return false;
  }

  private detectDatePattern(stem1: string, stem2: string): boolean {
    // Common date patterns
    const dateRegex = /(.+?)[-_]?(\d{4}[-_]?\d{2}[-_]?\d{2}|\d{2}[-_]?\d{2}[-_]?\d{4})/;
    const match1 = stem1.match(dateRegex);
    const match2 = stem2.match(dateRegex);

    if (match1 && match2) {
      const base1 = match1[1].toLowerCase();
      const base2 = match2[1].toLowerCase();
      return base1 === base2 || levenshteinSimilarity(base1, base2) > 0.8;
    }

    return false;
  }

  private detectNumberSequence(stem1: string, stem2: string): boolean {
    const numRegex = /^(.+?)(\d+)$/;
    const match1 = stem1.match(numRegex);
    const match2 = stem2.match(numRegex);

    if (match1 && match2) {
      const base1 = match1[1].toLowerCase();
      const base2 = match2[1].toLowerCase();
      return base1 === base2;
    }

    return false;
  }

  private detectCommonAffix(stem1: string, stem2: string): number {
    const lower1 = stem1.toLowerCase();
    const lower2 = stem2.toLowerCase();

    // Common suffixes in code
    const suffixes = ['controller', 'service', 'component', 'module', 'helper', 'util', 'manager', 'handler'];

    for (const suffix of suffixes) {
      if (lower1.endsWith(suffix) && lower2.endsWith(suffix)) {
        const base1 = lower1.substring(0, lower1.length - suffix.length);
        const base2 = lower2.substring(0, lower2.length - suffix.length);

        // If bases are different but both have same suffix
        if (base1 && base2 && base1 !== base2) {
          return 0.6; // Moderate similarity
        }
      }
    }

    // Check for common prefixes
    const prefixes = ['test', 'mock', 'stub', 'base', 'abstract'];

    for (const prefix of prefixes) {
      if (lower1.startsWith(prefix) && lower2.startsWith(prefix)) {
        return 0.6;
      }
    }

    // Check for longest common prefix/suffix
    const minLen = Math.min(lower1.length, lower2.length);
    let commonPrefixLen = 0;
    let commonSuffixLen = 0;

    // Common prefix
    for (let i = 0; i < minLen; i++) {
      if (lower1[i] === lower2[i]) {
        commonPrefixLen++;
      } else {
        break;
      }
    }

    // Common suffix
    for (let i = 1; i <= minLen; i++) {
      if (lower1[lower1.length - i] === lower2[lower2.length - i]) {
        commonSuffixLen++;
      } else {
        break;
      }
    }

    const maxCommon = Math.max(commonPrefixLen, commonSuffixLen);
    const avgLen = (lower1.length + lower2.length) / 2;

    if (maxCommon > 3 && maxCommon / avgLen > 0.4) {
      return maxCommon / avgLen;
    }

    return 0.0;
  }

  getDetails(): SimilarityDetails {
    return this.lastDetails;
  }
}