/**
 * MaintenanceScheduler Tests
 *
 * Tests for background maintenance job scheduling and execution.
 * Following TDD: These tests are written BEFORE implementation.
 *
 * Test Coverage:
 * - Job scheduling with priorities
 * - Background execution without blocking
 * - Resource-aware execution
 * - Progress tracking and reporting
 * - Job cancellation and cleanup
 * - Error handling and recovery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MaintenanceScheduler, MaintenanceJob, JobPriority, JobStatus } from '../../../../src/semantic/maintenance/MaintenanceScheduler'

describe('MaintenanceScheduler', () => {
  let scheduler: MaintenanceScheduler

  beforeEach(() => {
    scheduler = new MaintenanceScheduler()
  })

  afterEach(async () => {
    // Clean up any running jobs
    await scheduler.stop()
  })

  describe('Job Scheduling', () => {
    it('should schedule a job with default priority', async () => {
      const job: MaintenanceJob = {
        id: 'test-job-1',
        name: 'Test Job',
        execute: vi.fn().mockResolvedValue({ success: true }),
      }

      await scheduler.schedule(job)

      const status = scheduler.getJobStatus('test-job-1')
      expect(status).toBeDefined()
      expect(status?.status).toBe(JobStatus.SCHEDULED)
    })

    it('should schedule jobs with different priorities', async () => {
      const highPriorityJob: MaintenanceJob = {
        id: 'high-job',
        name: 'High Priority Job',
        priority: JobPriority.HIGH,
        execute: vi.fn().mockResolvedValue({ success: true }),
      }

      const lowPriorityJob: MaintenanceJob = {
        id: 'low-job',
        name: 'Low Priority Job',
        priority: JobPriority.LOW,
        execute: vi.fn().mockResolvedValue({ success: true }),
      }

      await scheduler.schedule(lowPriorityJob)
      await scheduler.schedule(highPriorityJob)

      // High priority should execute first
      await scheduler.start()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(highPriorityJob.execute).toHaveBeenCalled()
      expect(lowPriorityJob.execute).toHaveBeenCalledAfter(highPriorityJob.execute)
    })

    it('should prevent duplicate job IDs', async () => {
      const job1: MaintenanceJob = {
        id: 'duplicate-id',
        name: 'Job 1',
        execute: vi.fn(),
      }

      const job2: MaintenanceJob = {
        id: 'duplicate-id',
        name: 'Job 2',
        execute: vi.fn(),
      }

      await scheduler.schedule(job1)

      await expect(scheduler.schedule(job2)).rejects.toThrow('Job with ID duplicate-id already exists')
    })

    it('should allow scheduling recurring jobs', async () => {
      const job: MaintenanceJob = {
        id: 'recurring-job',
        name: 'Recurring Job',
        recurring: true,
        interval: 100, // 100ms
        execute: vi.fn().mockResolvedValue({ success: true }),
      }

      await scheduler.schedule(job)
      await scheduler.start()

      // Wait for multiple executions (100ms interval + overhead, ~110ms per cycle)
      await new Promise(resolve => setTimeout(resolve, 280))

      // Should execute multiple times
      expect(job.execute).toHaveBeenCalledTimes(3)
    })
  })

  describe('Job Execution', () => {
    it('should execute scheduled jobs in background', async () => {
      const job: MaintenanceJob = {
        id: 'bg-job',
        name: 'Background Job',
        execute: vi.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 50))
          return { success: true }
        }),
      }

      await scheduler.schedule(job)
      await scheduler.start()

      // Job should be running in background
      const status = scheduler.getJobStatus('bg-job')
      expect(status?.status).toBe(JobStatus.RUNNING)

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 100))

      const finalStatus = scheduler.getJobStatus('bg-job')
      expect(finalStatus?.status).toBe(JobStatus.COMPLETED)
    })

    it('should execute jobs sequentially to avoid resource conflicts', async () => {
      let executionOrder: string[] = []

      const job1: MaintenanceJob = {
        id: 'job-1',
        name: 'Job 1',
        execute: vi.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 50))
          executionOrder.push('job-1')
          return { success: true }
        }),
      }

      const job2: MaintenanceJob = {
        id: 'job-2',
        name: 'Job 2',
        execute: vi.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 50))
          executionOrder.push('job-2')
          return { success: true }
        }),
      }

      await scheduler.schedule(job1)
      await scheduler.schedule(job2)
      await scheduler.start()

      await new Promise(resolve => setTimeout(resolve, 150))

      // Jobs should execute in order, not concurrently
      expect(executionOrder).toEqual(['job-1', 'job-2'])
    })

    it('should handle job execution errors gracefully', async () => {
      const job: MaintenanceJob = {
        id: 'failing-job',
        name: 'Failing Job',
        execute: vi.fn().mockRejectedValue(new Error('Job failed')),
      }

      await scheduler.schedule(job)
      await scheduler.start()

      await new Promise(resolve => setTimeout(resolve, 100))

      const status = scheduler.getJobStatus('failing-job')
      expect(status?.status).toBe(JobStatus.FAILED)
      expect(status?.error).toContain('Job failed')
    })

    it('should retry failed jobs if configured', async () => {
      let attemptCount = 0

      const job: MaintenanceJob = {
        id: 'retry-job',
        name: 'Retry Job',
        maxRetries: 2,
        execute: vi.fn().mockImplementation(async () => {
          attemptCount++
          if (attemptCount < 3) {
            throw new Error('Temporary failure')
          }
          return { success: true }
        }),
      }

      await scheduler.schedule(job)
      await scheduler.start()

      // Wait for retries (1st retry: 1000ms delay, 2nd retry: 2000ms delay)
      await new Promise(resolve => setTimeout(resolve, 3500))

      expect(job.execute).toHaveBeenCalledTimes(3) // Initial + 2 retries
      const status = scheduler.getJobStatus('retry-job')
      expect(status?.status).toBe(JobStatus.COMPLETED)
    })
  })

  describe('Resource Management', () => {
    it('should respect CPU usage limits', async () => {
      scheduler = new MaintenanceScheduler({
        maxCpuUsage: 50, // 50% max CPU
      })

      const cpuIntensiveJob: MaintenanceJob = {
        id: 'cpu-job',
        name: 'CPU Intensive Job',
        execute: vi.fn().mockResolvedValue({ success: true }),
        estimatedCpuUsage: 60, // Exceeds limit
      }

      await scheduler.schedule(cpuIntensiveJob)
      await scheduler.start()

      // Job should be throttled or delayed
      const status = scheduler.getJobStatus('cpu-job')
      expect(status?.status).toBe(JobStatus.THROTTLED)
    })

    it('should pause when system resources are low', async () => {
      scheduler = new MaintenanceScheduler({
        enableAutoPause: true,
      })

      const job: MaintenanceJob = {
        id: 'pauseable-job',
        name: 'Pauseable Job',
        execute: vi.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 500))
          return { success: true }
        }),
      }

      await scheduler.schedule(job)
      await scheduler.start()

      // Simulate low resources
      scheduler.pause()

      await new Promise(resolve => setTimeout(resolve, 100))

      const status = scheduler.getJobStatus('pauseable-job')
      expect(status?.status).toBe(JobStatus.PAUSED)
    })

    it('should resume jobs after pause', async () => {
      const job: MaintenanceJob = {
        id: 'resume-job',
        name: 'Resume Job',
        execute: vi.fn().mockResolvedValue({ success: true }),
      }

      await scheduler.schedule(job)
      await scheduler.start()
      scheduler.pause()

      await new Promise(resolve => setTimeout(resolve, 50))

      scheduler.resume()

      await new Promise(resolve => setTimeout(resolve, 100))

      const status = scheduler.getJobStatus('resume-job')
      expect(status?.status).toBe(JobStatus.COMPLETED)
    })
  })

  describe('Progress Tracking', () => {
    it('should track job progress', async () => {
      const job: MaintenanceJob = {
        id: 'progress-job',
        name: 'Progress Job',
        execute: vi.fn().mockImplementation(async (ctx) => {
          ctx.updateProgress(0.25)
          await new Promise(resolve => setTimeout(resolve, 50))
          ctx.updateProgress(0.50)
          await new Promise(resolve => setTimeout(resolve, 50))
          ctx.updateProgress(0.75)
          await new Promise(resolve => setTimeout(resolve, 50))
          ctx.updateProgress(1.0)
          return { success: true }
        }),
      }

      await scheduler.schedule(job)
      await scheduler.start()

      // Check progress during execution
      await new Promise(resolve => setTimeout(resolve, 100))
      const midStatus = scheduler.getJobStatus('progress-job')
      expect(midStatus?.progress).toBeGreaterThan(0)
      expect(midStatus?.progress).toBeLessThan(1)

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 200))
      const finalStatus = scheduler.getJobStatus('progress-job')
      expect(finalStatus?.progress).toBe(1.0)
    })

    it('should provide job statistics', () => {
      const stats = scheduler.getStatistics()

      expect(stats).toHaveProperty('totalJobs')
      expect(stats).toHaveProperty('completedJobs')
      expect(stats).toHaveProperty('failedJobs')
      expect(stats).toHaveProperty('runningJobs')
      expect(stats).toHaveProperty('scheduledJobs')
    })

    it('should track execution time', async () => {
      const job: MaintenanceJob = {
        id: 'timed-job',
        name: 'Timed Job',
        execute: vi.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return { success: true }
        }),
      }

      await scheduler.schedule(job)
      await scheduler.start()

      await new Promise(resolve => setTimeout(resolve, 150))

      const status = scheduler.getJobStatus('timed-job')
      expect(status?.executionTime).toBeGreaterThan(90) // ~100ms
      expect(status?.executionTime).toBeLessThan(150)
    })
  })

  describe('Job Cancellation', () => {
    it('should cancel a scheduled job', async () => {
      const job: MaintenanceJob = {
        id: 'cancel-job',
        name: 'Cancellable Job',
        execute: vi.fn().mockResolvedValue({ success: true }),
      }

      await scheduler.schedule(job)
      await scheduler.cancel('cancel-job')

      const status = scheduler.getJobStatus('cancel-job')
      expect(status?.status).toBe(JobStatus.CANCELLED)
      expect(job.execute).not.toHaveBeenCalled()
    })

    it('should cancel a running job', async () => {
      const job: MaintenanceJob = {
        id: 'running-cancel-job',
        name: 'Running Cancellable Job',
        execute: vi.fn().mockImplementation(async (ctx) => {
          for (let i = 0; i < 10; i++) {
            if (ctx.isCancelled()) {
              throw new Error('Job cancelled')
            }
            await new Promise(resolve => setTimeout(resolve, 50))
          }
          return { success: true }
        }),
      }

      await scheduler.schedule(job)
      await scheduler.start()

      // Let it start running
      await new Promise(resolve => setTimeout(resolve, 100))

      await scheduler.cancel('running-cancel-job')

      await new Promise(resolve => setTimeout(resolve, 100))

      const status = scheduler.getJobStatus('running-cancel-job')
      expect(status?.status).toBe(JobStatus.CANCELLED)
    })

    it('should cancel all jobs on stop', async () => {
      const job1: MaintenanceJob = {
        id: 'stop-job-1',
        name: 'Job 1',
        execute: vi.fn().mockResolvedValue({ success: true }),
      }

      const job2: MaintenanceJob = {
        id: 'stop-job-2',
        name: 'Job 2',
        execute: vi.fn().mockResolvedValue({ success: true }),
      }

      await scheduler.schedule(job1)
      await scheduler.schedule(job2)
      await scheduler.start()
      await scheduler.stop()

      const status1 = scheduler.getJobStatus('stop-job-1')
      const status2 = scheduler.getJobStatus('stop-job-2')

      // Jobs should be stopped or cancelled
      expect([JobStatus.CANCELLED, JobStatus.COMPLETED]).toContain(status1?.status)
      expect([JobStatus.CANCELLED, JobStatus.COMPLETED]).toContain(status2?.status)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty job queue', async () => {
      await scheduler.start()

      const stats = scheduler.getStatistics()
      expect(stats.totalJobs).toBe(0)
      expect(stats.runningJobs).toBe(0)
    })

    it('should handle rapid start/stop cycles', async () => {
      await scheduler.start()
      await scheduler.stop()
      await scheduler.start()
      await scheduler.stop()
      await scheduler.start()

      // Should not throw or crash
      expect(scheduler).toBeDefined()
    })

    it('should handle job with no execute function gracefully', async () => {
      const invalidJob = {
        id: 'invalid-job',
        name: 'Invalid Job',
        // Missing execute function
      } as MaintenanceJob

      await expect(scheduler.schedule(invalidJob)).rejects.toThrow()
    })

    it('should handle very long-running jobs', async () => {
      const longJob: MaintenanceJob = {
        id: 'long-job',
        name: 'Long Running Job',
        timeout: 200, // 200ms timeout
        execute: vi.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 500)) // Exceeds timeout
          return { success: true }
        }),
      }

      await scheduler.schedule(longJob)
      await scheduler.start()

      await new Promise(resolve => setTimeout(resolve, 250))

      const status = scheduler.getJobStatus('long-job')
      expect(status?.status).toBe(JobStatus.FAILED)
      expect(status?.error).toContain('timeout')
    })
  })
})
