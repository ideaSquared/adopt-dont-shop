import type { Worker } from 'bullmq';
import { z } from 'zod';
import { buildWorker, getReportsQueue, isQueueAvailable } from '../lib/queue';
import AuditLog from '../models/AuditLog';
import { runRetentionEnforcement } from '../services/data-retention.service';
import { logger } from '../utils/logger';

/**
 * ADS-428: BullMQ-driven retention enforcement.
 *
 * The job runs once a day (default 03:30 UTC) on the shared `reports`
 * queue — see lib/queue.ts. Reusing the queue avoids spinning up a
 * second Redis client for one repeatable cron.
 *
 * Bootstrap:
 *   1. Call `scheduleRetentionJob()` once on server start; it adds (or
 *      replaces) the repeatable.
 *   2. Call `startRetentionWorker()` so the same process — or a
 *      dedicated worker — actually runs the job. Idempotent.
 *
 * Both functions are no-ops when REDIS_URL isn't set; that mirrors the
 * reports worker's behaviour and lets dev/test environments boot
 * without Redis.
 */

export const RETENTION_JOB_NAME = 'privacy:retention-enforcement';
export const RETENTION_REPEAT_KEY = 'privacy:retention-enforcement:daily';
export const RETENTION_ENFORCEMENT_RAN_ACTION = 'RETENTION_ENFORCEMENT_RAN';

/**
 * Defense-in-depth: re-validate job payloads at execution time. BullMQ
 * persists job.data as JSON in Redis, so a queue compromise or a
 * mis-deployment that pushed a hand-crafted payload would otherwise hit
 * the handler with whatever shape it likes. The retention job carries no
 * data — `.strict()` keeps it that way so any extra producer-added
 * fields fail validation rather than being silently ignored. Mirrors
 * reports.worker.ts.
 */
export const RetentionJobSchema = z.object({}).strict();

// Default: 03:30 UTC daily. Override via RETENTION_CRON env var. The
// cron is BullMQ-compatible (5- or 6-field format).
const RETENTION_CRON = process.env.RETENTION_CRON ?? '30 3 * * *';

export const scheduleRetentionJob = async (): Promise<void> => {
  if (!isQueueAvailable()) {
    logger.warn('REDIS_URL not set — retention job not scheduled');
    return;
  }

  const queue = getReportsQueue();
  // Clean up any previous repeatable so a cron change is observed on
  // next deploy without leaving the old schedule in place.
  await queue.removeRepeatableByKey(RETENTION_REPEAT_KEY).catch(() => undefined);

  await queue.add(
    RETENTION_JOB_NAME,
    {},
    {
      jobId: RETENTION_REPEAT_KEY,
      repeat: { pattern: RETENTION_CRON, tz: 'UTC' },
    }
  );

  logger.info('Retention job scheduled', { cron: RETENTION_CRON });
};

let workerInstance: Worker | null = null;

export const startRetentionWorker = (): Worker | null => {
  if (workerInstance) {
    return workerInstance;
  }
  if (!isQueueAvailable()) {
    logger.warn('REDIS_URL not set — retention worker not started');
    return null;
  }

  workerInstance = buildWorker(async job => {
    if (job.name !== RETENTION_JOB_NAME) {
      return;
    }
    const parsed = RetentionJobSchema.safeParse(job.data);
    if (!parsed.success) {
      // Don't log job.data verbatim — it may carry attacker-controlled
      // payload. Throw so BullMQ surfaces the failure rather than letting
      // the worker silently run the retention sweep on a poisoned job.
      logger.warn('retention.job: rejecting malformed payload', {
        jobName: job.name,
        issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), code: i.code })),
      });
      throw new Error('Invalid retention job payload');
    }
    const result = await runRetentionEnforcement();
    // System-level audit row — mirrors legal-reminder.worker.ts. No user
    // attribution; AuditLog.create directly because the immutable-trigger
    // only blocks UPDATE/DELETE. Written only on success — failures
    // bubble up to BullMQ's retry path and don't leave a misleading
    // "ran" row behind.
    await AuditLog.create({
      service: 'adopt-dont-shop-backend',
      user: null,
      user_email_snapshot: null,
      action: RETENTION_ENFORCEMENT_RAN_ACTION,
      level: 'INFO',
      timestamp: new Date(),
      metadata: {
        entity: 'System',
        entityId: 'retention-enforcement',
        details: { ...result },
      },
      category: 'System',
    });
    logger.info('Retention job finished', { result });
  });

  return workerInstance;
};

export const stopRetentionWorker = async (): Promise<void> => {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
  }
};
