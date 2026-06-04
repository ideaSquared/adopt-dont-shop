import type { Worker } from 'bullmq';
import { Op } from 'sequelize';
import { z } from 'zod';
import WebhookEventId from '../models/WebhookEventId';
import { buildWorker, getReportsQueue, isQueueAvailable } from '../lib/queue';
import { logger } from '../utils/logger';

/**
 * ADS-734: scheduled purge of stale webhook_event_ids rows.
 *
 * The webhook idempotency table records every (provider, event_id) we've
 * seen so a replay collides on the composite PK. The table only needs to
 * retain rows long enough to cover the signature-skew window (120 s by
 * default) plus any reasonable provider retry-storm window — 7 days is
 * comfortably beyond both and still bounded.
 *
 * Mirrors `revoked-tokens-purge.job.ts`: schedule once at boot, run on
 * the shared `reports` queue, no-op without Redis.
 */

export const WEBHOOK_EVENTS_PURGE_JOB_NAME = 'webhook:events-purge';
export const WEBHOOK_EVENTS_PURGE_REPEAT_KEY = 'webhook:events-purge:daily';

// Strict empty payload: defense-in-depth against producers slipping
// extra fields into the job. Matches the pattern in revoked-tokens-purge.
export const WebhookEventsPurgeJobSchema = z.object({}).strict();

// Default: 04:45 UTC daily — offset from retention (03:30) and
// revoked-tokens (04:15) so the three system purges don't contend.
const WEBHOOK_EVENTS_PURGE_CRON = process.env.WEBHOOK_EVENTS_PURGE_CRON ?? '45 4 * * *';

// 7 days. Long enough to absorb provider retry storms, far beyond the
// 120 s signature-skew window the middleware enforces.
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export const purgeStaleWebhookEvents = async (): Promise<number> => {
  const cutoff = new Date(Date.now() - RETENTION_MS);
  const deleted = await WebhookEventId.destroy({
    where: { received_at: { [Op.lt]: cutoff } },
  });
  logger.info('Stale webhook_event_ids rows purged', { deleted });
  return deleted;
};

export const scheduleWebhookEventsPurgeJob = async (): Promise<void> => {
  if (!isQueueAvailable()) {
    logger.warn('REDIS_URL not set — webhook-events purge job not scheduled');
    return;
  }

  const queue = getReportsQueue();
  await queue.removeRepeatableByKey(WEBHOOK_EVENTS_PURGE_REPEAT_KEY).catch(() => undefined);

  await queue.add(
    WEBHOOK_EVENTS_PURGE_JOB_NAME,
    {},
    {
      jobId: WEBHOOK_EVENTS_PURGE_REPEAT_KEY,
      repeat: { pattern: WEBHOOK_EVENTS_PURGE_CRON, tz: 'UTC' },
    }
  );

  logger.info('Webhook-events purge job scheduled', { cron: WEBHOOK_EVENTS_PURGE_CRON });
};

let workerInstance: Worker | null = null;

export const startWebhookEventsPurgeWorker = (): Worker | null => {
  if (workerInstance) {
    return workerInstance;
  }
  if (!isQueueAvailable()) {
    logger.warn('REDIS_URL not set — webhook-events purge worker not started');
    return null;
  }

  workerInstance = buildWorker(async job => {
    if (job.name !== WEBHOOK_EVENTS_PURGE_JOB_NAME) {
      return;
    }
    const parsed = WebhookEventsPurgeJobSchema.safeParse(job.data);
    if (!parsed.success) {
      logger.warn('webhook-events-purge.job: rejecting malformed payload', {
        jobName: job.name,
        issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), code: i.code })),
      });
      throw new Error('Invalid webhook-events purge job payload');
    }
    const deleted = await purgeStaleWebhookEvents();
    logger.info('Webhook-events purge finished', { deleted });
  });

  return workerInstance;
};

export const stopWebhookEventsPurgeWorker = async (): Promise<void> => {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
  }
};
