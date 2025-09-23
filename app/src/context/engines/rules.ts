/**
 * Business rules implementation for FileDecisionEngine
 */

import * as path from 'path';
import {
  DecisionThresholds,
  DecisionRules,
  Alternative,
  Recommendation
} from './types.js';
import { FileInfo, SimilarityResult } from '../analyzers/types.js';

/**
 * Rule engine for making file operation decisions
 */
export class RuleEngine {
  /**
   * Apply decision rules to determine primary action
   */
  applyRules(
    newFile: FileInfo,
    similarities: SimilarityResult[],
    thresholds: DecisionThresholds,
    rules: DecisionRules
  ): { action: Recommendation['action']; confidence: number; targetFile?: string } {
    if (similarities.length === 0) {
      return {
        action: 'create',
        confidence: 0.8
      };
    }

    const bestMatch = similarities[0];
    // Use the overall score from similarity analysis (it's already weighted)
    const score = bestMatch.overallScore;
    const adjustedConfidence = this.adjustConfidence(bestMatch.overallConfidence, newFile, bestMatch);

    let action: Recommendation['action'];
    let confidence = adjustedConfidence;

    // Apply threshold-based decision logic
    if (score >= thresholds.mergeThreshold) {
      action = 'merge';
      confidence = Math.min(confidence * 1.1, 1.0); // Boost confidence for merge
    } else if (score >= thresholds.updateThreshold) {
      action = 'update';
    } else if (score >= thresholds.createThreshold) {
      action = 'warn';
      confidence = confidence * 0.8; // Lower confidence for warnings
    } else {
      action = 'create';
      confidence = confidence * 0.9;
    }

    const targetFile = (action === 'create' && score < thresholds.createThreshold) ?
      undefined :
      bestMatch.metadata.targetFile;

    return { action, confidence, targetFile };
  }

  /**
   * Generate alternative recommendations
   */
  generateAlternatives(
    primaryAction: Recommendation['action'],
    similarities: SimilarityResult[],
    confidence: number,
    maxAlternatives: number
  ): Alternative[] {
    const alternatives: Alternative[] = [];
    const bestMatch = similarities.length > 0 ? similarities[0] : null;

    switch (primaryAction) {
      case 'merge':
        alternatives.push(
          {
            action: 'update',
            confidence: confidence * 0.8,
            reason: 'Update instead of merge to preserve both files',
            targetFile: bestMatch?.metadata.targetFile
          },
          {
            action: 'create',
            confidence: confidence * 0.6,
            reason: 'Create new file if merge is too risky'
          }
        );
        break;

      case 'update':
        alternatives.push(
          {
            action: 'merge',
            confidence: Math.min(confidence * 1.2, 1.0),
            reason: 'Consider merge if confident about compatibility',
            targetFile: bestMatch?.metadata.targetFile
          },
          {
            action: 'create',
            confidence: confidence * 0.7,
            reason: 'Create new file if updates are complex'
          }
        );
        break;

      case 'warn':
        if (bestMatch) {
          alternatives.push(
            {
              action: 'update',
              confidence: confidence * 1.1,
              reason: 'Update similar file if appropriate',
              targetFile: bestMatch.metadata.targetFile
            },
            {
              action: 'create',
              confidence: confidence * 0.9,
              reason: 'Create new file to avoid conflicts'
            }
          );
        }
        break;

      case 'create':
        if (bestMatch) {
          alternatives.push({
            action: 'update',
            confidence: confidence * 0.9,
            reason: 'Update most similar file instead of creating new',
            targetFile: bestMatch.metadata.targetFile
          });
        }
        break;
    }

    // Sort by confidence and limit
    return alternatives
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxAlternatives);
  }

  /**
   * Generate reasoning text for the recommendation
   */
  generateReasoning(
    action: Recommendation['action'],
    newFile: FileInfo,
    similarities: SimilarityResult[],
    weightedScore: number,
    appliedRules: string[]
  ): string {
    const filename = path.basename(newFile.path);
    const bestMatch = similarities.length > 0 ? similarities[0] : null;

    let reasoning = `Based on similarity score ${weightedScore.toFixed(2)}`;

    if (bestMatch) {
      const targetFilename = path.basename(bestMatch.metadata.targetFile);
      reasoning += ` with ${targetFilename}`;
    }

    // Add content availability context
    if (!newFile.content && similarities.length > 0) {
      reasoning += ' (analysis with limited content available)';
    }

    // Add action-specific reasoning
    switch (action) {
      case 'merge':
        reasoning += '. High similarity suggests merging files would be appropriate';
        if (bestMatch && bestMatch.overallScore >= 0.95) {
          reasoning += '. Files appear nearly identical';
        }
        break;

      case 'update':
        reasoning += '. Medium similarity suggests updating existing file';
        break;

      case 'warn':
        reasoning += '. Some similarity detected - review for potential conflicts';
        break;

      case 'create':
        if (similarities.length === 0) {
          reasoning = 'No similar files found. Safe to create new file';
        } else {
          reasoning += '. Low similarity suggests creating new file is appropriate';
        }
        break;
    }

    // Add file type specific context
    const extension = path.extname(newFile.path);
    if (appliedRules.includes(`${extension}-rules`)) {
      reasoning += ` (applied ${extension} specific rules)`;
    }

    return reasoning;
  }

  /**
   * Determine which rules were applied
   */
  getAppliedRules(newFile: FileInfo, thresholds: DecisionThresholds, defaultThresholds: DecisionThresholds): string[] {
    const rules: string[] = [];
    const extension = path.extname(newFile.path);

    if (thresholds !== defaultThresholds) {
      rules.push(`${extension}-rules`);
    } else {
      rules.push('default');
    }

    return rules;
  }

  /**
   * Calculate weighted similarity score
   */
  private calculateWeightedScore(similarity: SimilarityResult, weights: DecisionRules['weights']): number {
    const layers = similarity.layers;
    return (
      layers.filename.score * weights.filenameWeight +
      layers.structure.score * weights.structureWeight +
      layers.semantic.score * weights.semanticWeight +
      (layers.content?.score || 0) * weights.contentWeight
    );
  }

  /**
   * Adjust confidence based on context
   */
  private adjustConfidence(baseConfidence: number, newFile: FileInfo, bestMatch: SimilarityResult): number {
    let confidence = baseConfidence;

    // Reduce confidence if content is missing
    if (!newFile.content) {
      confidence *= 0.9;
    }

    // Boost confidence for very high scores
    if (bestMatch.overallScore >= 0.95) {
      confidence = Math.min(confidence * 1.1, 1.0);
    }

    // Reduce confidence for edge cases
    if (bestMatch.overallScore <= 0.1) {
      confidence *= 0.8;
    }

    return Math.max(0, Math.min(1, confidence));
  }
}