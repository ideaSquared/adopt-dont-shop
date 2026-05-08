import { Op } from 'sequelize';
import EmailQueue from '../models/EmailQueue';
import IdempotencyKey from '../models/IdempotencyKey';
import Notification from '../models/Notification';
import RefreshToken from '../models/RefreshToken';
import SwipeAction from '../models/SwipeAction';
import User from '../models/User';
import { anonymizeUser } from './data-deletion.service';
import { logger } from '../utils/logger';

/**
 * ADS-428: retention enforcement.
 *
 * Each policy is the smallest unit of "what to delete and how old it
 * has to be". Periods come from docs/PRIVACY.md and the project plan.
 * The orchestrator runs them in order and returns per-policy counts so
 * the BullMQ job (jobs/retention.job.ts) can log a single summary line.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export const RETENTION_POLICIES = {
  softDeletedUsersGraceDays: 30,
  notificationsDays: 90,
  emailQueueDays: 365,
  refreshTokensExpiredDays: 30,
  idempotencyKeysHours: 24,
  swipeActionsMonths: 24,
} as const;

const cutoffDaysAgo = (days: number): Date => new Date(Date.now() - days * DAY_MS);
const cutoffHoursAgo = (hours: number): Date => new Date(Date.now() - hours * HOUR_MS);

export type RetentionResult = {
  notificationsPurged: number;
  emailQueuePurged: number;
  refreshTokensPurged: number;
  idempotencyKeysPurged: number;
  swipeActionsPurged: number;
  usersAnonymised: number;
};

const purgeNotifications = async (): Promise<number> =>
  Notification.destroy({
    where: { created_at: { [Op.lt]: cutoffDaysAgo(RETENTION_POLICIES.notificationsDays) } },
  });

const purgeEmailQueue = async (): Promise<number> =>
  EmailQueue.destroy({
    where: { createdAt: { [Op.lt]: cutoffDaysAgo(RETENTION_POLICIES.emailQueueDays) } },
  });

const purgeRefreshTokens = async (): Promise<number> =>
  RefreshToken.destroy({
    where: {
      expires_at: { [Op.lt]: cutoffDaysAgo(RETENTION_POLICIES.refreshTokensExpiredDays) },
    },
  });

const purgeIdempotencyKeys = async (): Promise<number> =>
  IdempotencyKey.destroy({
    where: { expires_at: { [Op.lt]: cutoffHoursAgo(RETENTION_POLICIES.idempotencyKeysHours) } },
  });

const purgeSwipeActions = async (): Promise<number> => {
  // 24 months ≈ 730 days; the slight imprecision is acceptable for a
  // rolling-window retention policy, and avoids dragging in date-fns
  // for one cutoff calculation.
  const cutoff = cutoffDaysAgo(RETENTION_POLICIES.swipeActionsMonths * 30);
  return SwipeAction.destroy({ where: { createdAt: { [Op.lt]: cutoff } } });
};

const anonymiseExpiredSoftDeletedUsers = async (): Promise<number> => {
  const cutoff = cutoffDaysAgo(RETENTION_POLICIES.softDeletedUsersGraceDays);
  const candidates = await User.findAll({
    paranoid: false,
    where: { deletedAt: { [Op.lt]: cutoff, [Op.ne]: null } },
    attributes: ['userId', 'email'],
  });

  let count = 0;
  for (const candidate of candidates) {
    if (candidate.email.endsWith('@deleted.invalid')) {
      continue; // already anonymised on a previous pass
    }

    const result = await anonymizeUser(candidate.userId);
    if (result.anonymized) {
      count += 1;
    }
  }
  return count;
};

export const runRetentionEnforcement = async (): Promise<RetentionResult> => {
  const started = Date.now();

  const [
    notificationsPurged,
    emailQueuePurged,
    refreshTokensPurged,
    idempotencyKeysPurged,
    swipeActionsPurged,
    usersAnonymised,
  ] = await Promise.all([
    purgeNotifications().catch(err => {
      logger.error('Retention: notification purge failed', { error: String(err) });
      return 0;
    }),
    purgeEmailQueue().catch(err => {
      logger.error('Retention: email queue purge failed', { error: String(err) });
      return 0;
    }),
    purgeRefreshTokens().catch(err => {
      logger.error('Retention: refresh tokens purge failed', { error: String(err) });
      return 0;
    }),
    purgeIdempotencyKeys().catch(err => {
      logger.error('Retention: idempotency keys purge failed', { error: String(err) });
      return 0;
    }),
    purgeSwipeActions().catch(err => {
      logger.error('Retention: swipe actions purge failed', { error: String(err) });
      return 0;
    }),
    anonymiseExpiredSoftDeletedUsers().catch(err => {
      logger.error('Retention: user anonymisation failed', { error: String(err) });
      return 0;
    }),
  ]);

  const summary: RetentionResult = {
    notificationsPurged,
    emailQueuePurged,
    refreshTokensPurged,
    idempotencyKeysPurged,
    swipeActionsPurged,
    usersAnonymised,
  };

  logger.info('Retention enforcement run completed', {
    ...summary,
    durationMs: Date.now() - started,
  });

  return summary;
};
