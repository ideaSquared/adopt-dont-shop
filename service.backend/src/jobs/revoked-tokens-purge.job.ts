import type { Worker } from 'bullmq';
import { Op } from 'sequelize';
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
    const deleted = await purgeExpiredRevokedTokens();
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
