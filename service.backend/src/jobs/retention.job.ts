import type { Worker } from 'bullmq';
import { buildWorker, getReportsQueue, isQueueAvailable } from '../lib/queue';
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
    const result = await runRetentionEnforcement();
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
