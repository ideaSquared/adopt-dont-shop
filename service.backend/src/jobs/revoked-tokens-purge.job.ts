import type { Worker } from 'bullmq';
import { Op } from 'sequelize';
import { z } from 'zod';
import AuditLog from '../models/AuditLog';
import RevokedToken from '../models/RevokedToken';
import { buildWorker, getReportsQueue, isQueueAvailable } from '../lib/queue';
import { logger } from '../utils/logger';

/**
 * ADS-544: scheduled purge of expired RevokedToken rows.
 *
 * The auth middleware checks every authenticated request against this table
 * to short-circuit revoked-token reuse. Without a purge, the table grows
 * forever and the lookup gets slower over time. Once an access token has
 * passed its `exp` claim it is unusable anyway, so we can safely delete the
 * blacklist entry.
 *
 * Mirrors `retention.job.ts`: schedule once at boot, run on the shared
 * `reports` queue, no-op without Redis.
 */

export const REVOKED_TOKENS_PURGE_JOB_NAME = 'auth:revoked-tokens-purge';
export const REVOKED_TOKENS_PURGE_REPEAT_KEY = 'auth:revoked-tokens-purge:daily';
export const REVOKED_TOKENS_PURGE_RAN_ACTION = 'REVOKED_TOKENS_PURGE_RAN';

/**
 * Defense-in-depth: re-validate job payloads at execution time. The
 * purge job carries no data — `.strict()` keeps it that way so any
 * extra producer-added fields fail validation rather than being silently
 * ignored. Mirrors reports.worker.ts.
 */
export const RevokedTokensPurgeJobSchema = z.object({}).strict();

// Default: 04:15 UTC daily — offset from retention's 03:30 so the two
// don't contend for the same worker slot. Override via env.
const REVOKED_TOKENS_PURGE_CRON = process.env.REVOKED_TOKENS_PURGE_CRON ?? '15 4 * * *';

export const purgeExpiredRevokedTokens = async (): Promise<number> => {
  const deleted = await RevokedToken.destroy({
    where: { expires_at: { [Op.lt]: new Date() } },
  });
  logger.info('Expired RevokedToken rows purged', { deleted });
  return deleted;
};

export const scheduleRevokedTokensPurgeJob = async (): Promise<void> => {
  if (!isQueueAvailable()) {
    logger.warn('REDIS_URL not set — revoked-tokens purge job not scheduled');
    return;
  }

  const queue = getReportsQueue();
  await queue.removeRepeatableByKey(REVOKED_TOKENS_PURGE_REPEAT_KEY).catch(() => undefined);

  await queue.add(
    REVOKED_TOKENS_PURGE_JOB_NAME,
    {},
    {
      jobId: REVOKED_TOKENS_PURGE_REPEAT_KEY,
      repeat: { pattern: REVOKED_TOKENS_PURGE_CRON, tz: 'UTC' },
    }
  );

  logger.info('Revoked-tokens purge job scheduled', { cron: REVOKED_TOKENS_PURGE_CRON });
};

let workerInstance: Worker | null = null;

export const startRevokedTokensPurgeWorker = (): Worker | null => {
  if (workerInstance) {
    return workerInstance;
  }
  if (!isQueueAvailable()) {
    logger.warn('REDIS_URL not set — revoked-tokens purge worker not started');
    return null;
  }

  workerInstance = buildWorker(async job => {
    if (job.name !== REVOKED_TOKENS_PURGE_JOB_NAME) {
      return;
    }
    const parsed = RevokedTokensPurgeJobSchema.safeParse(job.data);
    if (!parsed.success) {
      logger.warn('revoked-tokens-purge.job: rejecting malformed payload', {
        jobName: job.name,
        issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), code: i.code })),
      });
      throw new Error('Invalid revoked-tokens purge job payload');
    }
    const deleted = await purgeExpiredRevokedTokens();
    // System-level audit row — mirrors legal-reminder.worker.ts. No user
    // attribution; AuditLog.create directly because the immutable-trigger
    // only blocks UPDATE/DELETE. Written only on success.
    await AuditLog.create({
      service: 'adopt-dont-shop-backend',
      user: null,
      user_email_snapshot: null,
      action: REVOKED_TOKENS_PURGE_RAN_ACTION,
      level: 'INFO',
      timestamp: new Date(),
      metadata: {
        entity: 'System',
        entityId: 'revoked-tokens-purge',
        details: { deleted },
      },
      category: 'System',
    });
    logger.info('Revoked-tokens purge finished', { deleted });
  });

  return workerInstance;
};

export const stopRevokedTokensPurgeWorker = async (): Promise<void> => {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
  }
};
