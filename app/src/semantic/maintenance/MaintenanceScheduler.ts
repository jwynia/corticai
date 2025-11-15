/**
 * MaintenanceScheduler - Background Maintenance Job Scheduler
 *
 * Manages background jobs for semantic maintenance including:
 * - Embedding refresh
 * - Lifecycle analysis
 * - Quality metrics
 * - Index optimization
 *
 * Features:
 * - Priority-based scheduling
 * - Resource-aware execution
 * - Progress tracking
 * - Job cancellation
 * - Automatic retry on failure
 */

import { Logger } from '../../utils/Logger'

/**
 * Job priority levels
 */
export enum JobPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

/**
 * Job execution status
 */
export enum JobStatus {
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  PAUSED = 'paused',
  THROTTLED = 'throttled',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Job execution context
 */
export interface JobContext {
  /** Update job progress (0-1) */
  updateProgress(progress: number): void

  /** Check if job has been cancelled */
  isCancelled(): boolean

  /** Log message from job */
  log(message: string): void
}

/**
 * Maintenance job definition
 */
export interface MaintenanceJob {
  /** Unique job identifier */
  id: string

  /** Human-readable job name */
  name: string

  /** Job priority (default: NORMAL) */
  priority?: JobPriority

  /** Job execution function */
  execute: (ctx: JobContext) => Promise<{ success: boolean; [key: string]: any }>

  /** Whether this job recurs */
  recurring?: boolean

  /** Interval for recurring jobs (ms) */
  interval?: number

  /** Maximum retry attempts */
  maxRetries?: number

  /** Estimated CPU usage (0-100%) */
  estimatedCpuUsage?: number

  /** Job timeout (ms) */
  timeout?: number
}

/**
 * Job status information
 */
export interface JobStatusInfo {
  id: string
  name: string
  status: JobStatus
  progress: number
  executionTime?: number
  error?: string
  startTime?: number
  endTime?: number
  retryCount?: number
}

/**
 * Scheduler configuration
 */
export interface SchedulerConfig {
  /** Maximum CPU usage allowed (0-100%) */
  maxCpuUsage?: number

  /** Enable automatic pause when resources low */
  enableAutoPause?: boolean

  /** Maximum concurrent jobs (default: 1 for sequential) */
  maxConcurrentJobs?: number

  /** Logger instance (optional, defaults to console logger) */
  logger?: Logger
}

/**
 * Scheduler statistics
 */
export interface SchedulerStatistics {
  totalJobs: number
  completedJobs: number
  failedJobs: number
  runningJobs: number
  scheduledJobs: number
}

/**
 * MaintenanceScheduler implementation
 */
export class MaintenanceScheduler {
  // Timing constants for scheduler operations
  private static readonly PAUSE_CHECK_INTERVAL_MS = 100
  private static readonly JOB_POLLING_INTERVAL_MS = 100
  private static readonly JOB_DELAY_MS = 10
  private static readonly RETRY_BACKOFF_BASE_MS = 1000

  private jobs: Map<string, MaintenanceJob> = new Map()
  private jobStatuses: Map<string, JobStatusInfo> = new Map()
  private isRunning: boolean = false
  private isPaused: boolean = false
  private currentJob: string | null = null
  private config: SchedulerConfig
  private logger: Logger
  private executionPromise: Promise<void> | null = null

  constructor(config: SchedulerConfig = {}) {
    this.config = {
      maxCpuUsage: config.maxCpuUsage ?? 80,
      enableAutoPause: config.enableAutoPause ?? false,
      maxConcurrentJobs: config.maxConcurrentJobs ?? 1,
    }
    this.logger = config.logger ?? Logger.createConsoleLogger('MaintenanceScheduler')
  }

  /**
   * Schedule a maintenance job
   */
  async schedule(job: MaintenanceJob): Promise<void> {
    // Validate job
    if (!job.execute || typeof job.execute !== 'function') {
      throw new Error('Job must have an execute function')
    }

    if (this.jobs.has(job.id)) {
      throw new Error(`Job with ID ${job.id} already exists`)
    }

    // Add job with default priority
    const jobWithDefaults: MaintenanceJob = {
      ...job,
      priority: job.priority ?? JobPriority.NORMAL,
    }

    this.jobs.set(job.id, jobWithDefaults)

    // Initialize status
    this.jobStatuses.set(job.id, {
      id: job.id,
      name: job.name,
      status: JobStatus.SCHEDULED,
      progress: 0,
    })
  }

  /**
   * Start the scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    this.isPaused = false

    // Start background execution loop
    this.executionPromise = this.executionLoop()
  }

  /**
   * Pause the scheduler
   */
  pause(): void {
    this.isPaused = true

    // Collect running job IDs first to avoid mutating during iteration
    const runningJobs = Array.from(this.jobStatuses.entries())
      .filter(([_, status]) => status.status === JobStatus.RUNNING)
      .map(([id, _]) => id)

    // Mark running jobs as paused
    for (const id of runningJobs) {
      const status = this.jobStatuses.get(id)
      if (status) {
        status.status = JobStatus.PAUSED
      }
    }
  }

  /**
   * Resume the scheduler
   */
  resume(): void {
    this.isPaused = false

    // Mark paused jobs as scheduled
    for (const [id, status] of this.jobStatuses.entries()) {
      if (status.status === JobStatus.PAUSED) {
        status.status = JobStatus.SCHEDULED
      }
    }
  }

  /**
   * Stop the scheduler and cancel all jobs
   */
  async stop(): Promise<void> {
    this.isRunning = false

    // Cancel all scheduled jobs
    for (const [id, status] of this.jobStatuses.entries()) {
      if (status.status === JobStatus.SCHEDULED || status.status === JobStatus.RUNNING) {
        status.status = JobStatus.CANCELLED
      }
    }

    // Wait for current execution to finish
    if (this.executionPromise) {
      await this.executionPromise
    }
  }

  /**
   * Cancel a specific job
   */
  async cancel(jobId: string): Promise<void> {
    const status = this.jobStatuses.get(jobId)
    if (!status) {
      throw new Error(`Job ${jobId} not found`)
    }

    status.status = JobStatus.CANCELLED
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): JobStatusInfo | undefined {
    return this.jobStatuses.get(jobId)
  }

  /**
   * Get scheduler statistics
   */
  getStatistics(): SchedulerStatistics {
    let completed = 0
    let failed = 0
    let running = 0
    let scheduled = 0

    for (const status of this.jobStatuses.values()) {
      switch (status.status) {
        case JobStatus.COMPLETED:
          completed++
          break
        case JobStatus.FAILED:
          failed++
          break
        case JobStatus.RUNNING:
          running++
          break
        case JobStatus.SCHEDULED:
          scheduled++
          break
      }
    }

    return {
      totalJobs: this.jobs.size,
      completedJobs: completed,
      failedJobs: failed,
      runningJobs: running,
      scheduledJobs: scheduled,
    }
  }

  /**
   * Main execution loop
   */
  private async executionLoop(): Promise<void> {
    while (this.isRunning) {
      if (this.isPaused) {
        await new Promise(resolve => setTimeout(resolve, MaintenanceScheduler.PAUSE_CHECK_INTERVAL_MS))
        continue
      }

      // Get next job to execute
      const nextJob = this.getNextJob()

      if (!nextJob) {
        await new Promise(resolve => setTimeout(resolve, MaintenanceScheduler.JOB_POLLING_INTERVAL_MS))
        continue
      }

      const job = this.jobs.get(nextJob.id)!
      await this.executeJob(job, nextJob)

      // Handle recurring jobs
      if (job.recurring && nextJob.status === JobStatus.COMPLETED) {
        // Reschedule
        nextJob.status = JobStatus.SCHEDULED
        nextJob.progress = 0

        // Wait for interval
        if (job.interval) {
          await new Promise(resolve => setTimeout(resolve, job.interval))
        }
      }

      // Handle retry delays
      if (nextJob.status === JobStatus.SCHEDULED && nextJob.retryCount && nextJob.retryCount > 0) {
        // Wait before retrying (exponential backoff based on retry count)
        await new Promise(resolve => setTimeout(resolve, MaintenanceScheduler.RETRY_BACKOFF_BASE_MS * (nextJob.retryCount || 0)))
      }

      // Small delay between jobs
      await new Promise(resolve => setTimeout(resolve, MaintenanceScheduler.JOB_DELAY_MS))
    }
  }

  /**
   * Get next job to execute based on priority
   */
  private getNextJob(): JobStatusInfo | null {
    let highestPriority: JobStatusInfo | null = null
    let maxPriority = -1

    for (const [id, status] of this.jobStatuses.entries()) {
      if (status.status !== JobStatus.SCHEDULED) {
        continue
      }

      const job = this.jobs.get(id)!

      // Check resource limits
      if (job.estimatedCpuUsage && job.estimatedCpuUsage > this.config.maxCpuUsage!) {
        status.status = JobStatus.THROTTLED
        continue
      }

      const priority = job.priority ?? JobPriority.NORMAL

      if (priority > maxPriority) {
        maxPriority = priority
        highestPriority = status
      }
    }

    return highestPriority
  }

  /**
   * Execute a single job
   */
  private async executeJob(job: MaintenanceJob, status: JobStatusInfo): Promise<void> {
    status.status = JobStatus.RUNNING
    status.startTime = Date.now()
    status.retryCount = status.retryCount ?? 0
    this.currentJob = job.id

    // Create job context
    const context: JobContext = {
      updateProgress: (progress: number) => {
        status.progress = Math.max(0, Math.min(1, progress))
      },
      isCancelled: () => {
        return status.status === JobStatus.CANCELLED
      },
      log: (message: string) => {
        this.logger.info(message, { jobId: job.id, jobName: job.name })
      },
    }

    try {
      // Execute with timeout if specified
      const result = job.timeout
        ? await this.executeWithTimeout(job.execute(context), job.timeout)
        : await job.execute(context)

      // Check if job was cancelled during execution
      const currentStatus = this.jobStatuses.get(job.id)
      if (currentStatus?.status === JobStatus.CANCELLED) {
        return
      }

      status.status = JobStatus.COMPLETED
      status.progress = 1.0
      status.endTime = Date.now()
      status.executionTime = status.endTime - status.startTime
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // If job was cancelled, preserve that status
      const currentStatus = this.jobStatuses.get(job.id)
      if (currentStatus?.status === JobStatus.CANCELLED) {
        return
      }

      // Check if we should retry
      const maxRetries = job.maxRetries ?? 0
      if (status.retryCount! < maxRetries) {
        status.retryCount!++
        status.status = JobStatus.SCHEDULED // Reschedule for retry
        status.progress = 0
        // Don't wait here - let execution loop handle retry timing
      } else {
        status.status = JobStatus.FAILED
        status.error = errorMessage
        status.endTime = Date.now()
        status.executionTime = status.endTime - status.startTime
      }
    } finally {
      this.currentJob = null
    }
  }

  /**
   * Execute a promise with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Job timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ])
  }
}
