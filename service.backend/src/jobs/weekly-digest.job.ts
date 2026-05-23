import type { Worker } from 'bullmq';
import { z } from 'zod';
import { buildWorker, getReportsQueue, isQueueAvailable } from '../lib/queue';
import { runWeeklyDigest } from '../services/weekly-digest.service';
import { logger } from '../utils/logger';

/**
 * ADS-631: weekly "new matches near you" + favourites re-engagement
 * digest.
 *
 * Runs once a week on the shared `reports` queue (same Redis pattern as
 * retention.job and match-digest.job). Default cadence is Saturday
 * morning UTC — the user-local Saturday morning rendering belongs in a
 * follow-up that splits the cron by timezone bucket; for the initial
 * cut every user gets the same UTC delivery window.
 *
 * Both bootstrap functions are no-ops without REDIS_URL so dev/test
 * environments can boot without Redis, matching the rest of the
 * monorepo's job convention.
 */

export const WEEKLY_DIGEST_JOB_NAME = 'engagement:weekly-digest';
export const WEEKLY_DIGEST_REPEAT_KEY = 'engagement:weekly-digest:saturday';

/**
 * Defense-in-depth: re-validate job payloads at execution time. The
 * weekly digest carries no data — `.strict()` keeps it that way so any
 * extra producer-added fields fail validation rather than being silently
 * ignored. Mirrors reports.worker.ts.
 */
export const WeeklyDigestJobSchema = z.object({}).strict();

// Default: Saturday 09:00 UTC. Override via WEEKLY_DIGEST_CRON env var.
// BullMQ-compatible (5- or 6-field) cron expression.
const WEEKLY_DIGEST_CRON = process.env.WEEKLY_DIGEST_CRON ?? '0 9 * * 6';

export const scheduleWeeklyDigestJob = async (): Promise<void> => {
  if (!isQueueAvailable()) {
    logger.warn('REDIS_URL not set — weekly digest job not scheduled');
    return;
  }

  const queue = getReportsQueue();
  // Strip any previous repeatable so cron changes are observed on next
  // deploy without leaving the old schedule alongside the new one.
  await queue.removeRepeatableByKey(WEEKLY_DIGEST_REPEAT_KEY).catch(() => undefined);

  await queue.add(
    WEEKLY_DIGEST_JOB_NAME,
    {},
    {
      jobId: WEEKLY_DIGEST_REPEAT_KEY,
      repeat: { pattern: WEEKLY_DIGEST_CRON, tz: 'UTC' },
    }
  );

  logger.info('Weekly digest job scheduled', { cron: WEEKLY_DIGEST_CRON });
};

let workerInstance: Worker | null = null;

export const startWeeklyDigestWorker = (): Worker | null => {
  if (workerInstance) {
    return workerInstance;
  }
  if (!isQueueAvailable()) {
    logger.warn('REDIS_URL not set — weekly digest worker not started');
    return null;
  }

  workerInstance = buildWorker(async job => {
    if (job.name !== WEEKLY_DIGEST_JOB_NAME) {
      return;
    }
    const parsed = WeeklyDigestJobSchema.safeParse(job.data);
    if (!parsed.success) {
      logger.warn('weekly-digest.job: rejecting malformed payload', {
        jobName: job.name,
        issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), code: i.code })),
      });
      throw new Error('Invalid weekly digest job payload');
    }
    const result = await runWeeklyDigest();
    logger.info('Weekly digest finished', { result });
  });

  return workerInstance;
};

export const stopWeeklyDigestWorker = async (): Promise<void> => {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
  }
};
