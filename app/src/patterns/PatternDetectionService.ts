/**
 * Pattern Detection Service
 *
 * Main service for detecting patterns in graph structures.
 * Coordinates all pattern detectors and produces comprehensive analysis results.
 */

import { GraphNode, GraphEdge } from '../storage/types/GraphTypes'
import {
  PatternDetectionConfig,
  PatternDetectionResult,
  PatternType,
  PatternSeverity,
  DetectedPattern
} from './types/PatternTypes'
import { CircularDependencyDetector } from './detectors/CircularDependencyDetector'
import { OrphanedNodeDetector } from './detectors/OrphanedNodeDetector'
import { HubNodeDetector } from './detectors/HubNodeDetector'

/**
 * Pattern Detection Service
 *
 * Orchestrates pattern detection across all detector types.
 */
export class PatternDetectionService {
  private circularDetector: CircularDependencyDetector
  private orphanedDetector: OrphanedNodeDetector
  private hubDetector: HubNodeDetector

  constructor() {
    this.circularDetector = new CircularDependencyDetector()
    this.orphanedDetector = new OrphanedNodeDetector()
    this.hubDetector = new HubNodeDetector()
  }

  /**
   * Detect all patterns in the given graph
   *
   * @param nodes - All nodes in the graph
   * @param edges - All edges in the graph
   * @param config - Optional configuration for detection
   * @returns Comprehensive pattern detection results
   */
  async detectAllPatterns(
    nodes: GraphNode[],
    edges: GraphEdge[],
    config?: PatternDetectionConfig
  ): Promise<PatternDetectionResult> {
    const startTime = Date.now()
    const allPatterns: DetectedPattern[] = []

    // Determine which patterns to detect
    const enabledPatterns = config?.enabledPatterns ?? [
      PatternType.CIRCULAR_DEPENDENCY,
      PatternType.ORPHANED_NODE,
      PatternType.HUB_NODE,
      PatternType.DEAD_CODE
    ]

    // Run detectors
    if (enabledPatterns.includes(PatternType.CIRCULAR_DEPENDENCY)) {
      const circularPatterns = await this.circularDetector.detect(nodes, edges, config)
      allPatterns.push(...circularPatterns)
    }

    if (enabledPatterns.includes(PatternType.ORPHANED_NODE)) {
      const orphanedPatterns = await this.orphanedDetector.detect(nodes, edges, config)
      allPatterns.push(...orphanedPatterns)
    }

    if (enabledPatterns.includes(PatternType.HUB_NODE)) {
      const hubPatterns = await this.hubDetector.detect(nodes, edges, config)
      allPatterns.push(...hubPatterns)
    }

    // Filter by minimum severity if configured
    const filteredPatterns = config?.minSeverity
      ? allPatterns.filter(p => this.severityLevel(p.severity) >= this.severityLevel(config.minSeverity!))
      : allPatterns

    // Generate summary
    const summary = this.generateSummary(filteredPatterns)
    const bySeverity = this.summarizeBySeverity(filteredPatterns)

    const analysisTime = Date.now() - startTime

    return {
      patterns: filteredPatterns,
      summary,
      bySeverity,
      config: config ?? {},
      analyzedAt: new Date(),
      analysisTime
    }
  }

  /**
   * Detect circular dependencies only
   */
  async detectCircularDependencies(
    nodes: GraphNode[],
    edges: GraphEdge[],
    config?: PatternDetectionConfig
  ) {
    return this.circularDetector.detect(nodes, edges, config)
  }

  /**
   * Detect orphaned nodes only
   */
  async detectOrphanedNodes(
    nodes: GraphNode[],
    edges: GraphEdge[],
    config?: PatternDetectionConfig
  ) {
    return this.orphanedDetector.detect(nodes, edges, config)
  }

  /**
   * Detect hub nodes only
   */
  async detectHubNodes(
    nodes: GraphNode[],
    edges: GraphEdge[],
    config?: PatternDetectionConfig
  ) {
    return this.hubDetector.detect(nodes, edges, config)
  }

  /**
   * Generate summary counts by pattern type
   */
  private generateSummary(patterns: DetectedPattern[]) {
    const summary = {
      [PatternType.CIRCULAR_DEPENDENCY]: 0,
      [PatternType.ORPHANED_NODE]: 0,
      [PatternType.HUB_NODE]: 0,
      [PatternType.DEAD_CODE]: 0,
      total: patterns.length
    }

    for (const pattern of patterns) {
      summary[pattern.type]++
    }

    return summary
  }

  /**
   * Summarize patterns by severity
   */
  private summarizeBySeverity(patterns: DetectedPattern[]) {
    const bySeverity = {
      [PatternSeverity.INFO]: 0,
      [PatternSeverity.WARNING]: 0,
      [PatternSeverity.ERROR]: 0,
      [PatternSeverity.CRITICAL]: 0
    }

    for (const pattern of patterns) {
      bySeverity[pattern.severity]++
    }

    return bySeverity
  }

  /**
   * Convert severity enum to numeric level for comparison
   */
  private severityLevel(severity: PatternSeverity): number {
    const levels: Record<PatternSeverity, number> = {
      [PatternSeverity.INFO]: 1,
      [PatternSeverity.WARNING]: 2,
      [PatternSeverity.ERROR]: 3,
      [PatternSeverity.CRITICAL]: 4
    }
    return levels[severity]
  }
}
