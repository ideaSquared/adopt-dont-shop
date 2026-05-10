import { Op } from 'sequelize';
import type { Worker } from 'bullmq';
import { z } from 'zod';
import { buildWorker, getReportsQueue, isQueueAvailable } from '../lib/queue';
import AuditLog from '../models/AuditLog';
import User, { UserStatus } from '../models/User';
import { getPendingReacceptance } from '../services/legal-content.service';
import {
  LEGAL_REMINDER_SENT_ACTION,
  REMINDER_RATE_LIMIT_HOURS,
  sendReacceptanceReminder,
} from '../services/legal-reminder.service';
import { logger } from '../utils/logger';

/**
 * ADS-497 (slice 4): scheduled cron for bulk re-acceptance reminders.
 *
 * Sequential loop over up to `batchSize` users-with-pending and a single
 * summary audit row at the end. Per-user dedupe is delegated to
 * `legal-reminder.service` (LEGAL_REMINDER_SENT fingerprint window) so
 * this worker only does coarse pre-filtering and aggregation.
 *
 * Guardrails (also captured in the PR body):
 *   - Hard batch cap (default 100). Bigger backlogs drain over multiple
 *     daily runs.
 *   - Daily, NOT hourly, schedule.
 *   - Two env-var gates: registration (LEGAL_REMINDER_CRON_ENABLED) and
 *     dry-run (LEGAL_REMINDER_CRON_DRY_RUN). Default OFF / dry-run.
 *   - First deploy is observe-only: ENABLED=true alone still skips
 *     sends; you must also set DRY_RUN=false to actually email users.
 */

export const LEGAL_REMINDER_CRON_RAN_ACTION = 'LEGAL_REMINDER_CRON_RAN';
export const LEGAL_REMINDER_CRON_JOB_NAME = 'legal:reminder-cron';
export const LEGAL_REMINDER_CRON_REPEAT_KEY = 'legal:reminder-cron:daily';
export const DEFAULT_BATCH_SIZE = 100;

// Default 02:00 UTC daily. Override via LEGAL_REMINDER_CRON env var. Cron
// is BullMQ-compatible (5- or 6-field). Daily schedule is a hard rule —
// see PR body — so the documented override is a different time of day,
// not a different frequency.
const LEGAL_REMINDER_CRON = process.env.LEGAL_REMINDER_CRON ?? '0 2 * * *';

const isCronEnabled = (): boolean => process.env.LEGAL_REMINDER_CRON_ENABLED === 'true';

// Default dry-run = TRUE. Operator must explicitly set DRY_RUN=false to
// turn on sends. This makes the first deploy to any environment safe by
// default — observe the summary audit row first, then flip the switch.
const isDryRun = (): boolean => process.env.LEGAL_REMINDER_CRON_DRY_RUN !== 'false';

export const RunSummarySchema = z.object({
  totalEligible: z.number().int().nonnegative(),
  sent: z.number().int().nonnegative(),
  rateLimited: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
  dryRun: z.boolean(),
});
export type RunSummary = z.infer<typeof RunSummarySchema>;

export type RunOptions = {
  dryRun: boolean;
  batchSize?: number;
};

/**
 * Find users who plausibly need a reminder. We pull active, non-deleted
 * users with an email, then exclude anyone who already received a
 * LEGAL_REMINDER_SENT inside the rate-limit window (regardless of
 * fingerprint — the per-fingerprint check still runs inside
 * `sendReacceptanceReminder`).
 *
 * Returns up to `batchSize` userIds. Ordering is stable (createdAt ASC)
 * so the same backlog drains the same way across runs and rotates
 * deterministically.
 */
const findCandidateUserIds = async (batchSize: number): Promise<ReadonlyArray<string>> => {
  const cutoff = new Date(Date.now() - REMINDER_RATE_LIMIT_HOURS * 60 * 60 * 1000);

  const recentlyReminded = await AuditLog.findAll({
    where: {
      action: LEGAL_REMINDER_SENT_ACTION,
      timestamp: { [Op.gte]: cutoff },
    },
    attributes: ['user'],
  });
  const excludedUserIds = recentlyReminded
    .map(row => row.user)
    .filter((u): u is string => typeof u === 'string' && u.length > 0);

  const where: Record<string, unknown> = {
    status: UserStatus.ACTIVE,
  };
  if (excludedUserIds.length > 0) {
    where.userId = { [Op.notIn]: excludedUserIds };
  }

  // Over-fetch slightly so that `sendReacceptanceReminder` returning
  // `no_pending_versions` (user is already up to date) doesn't shrink
  // the effective batch below the cap. Keeping the multiplier small —
  // we don't want to scan the whole user table.
  const overFetch = Math.min(batchSize * 5, 500);
  const users = await User.findAll({
    where,
    attributes: ['userId'],
    order: [['createdAt', 'ASC']],
    limit: overFetch,
  });
  return users.map(u => u.userId);
};

/**
 * Run the cron once. Returns the same summary that gets persisted as a
 * LEGAL_REMINDER_CRON_RAN audit row, so callers (including the CLI) can
 * print it.
 */
export const runLegalReminderCron = async (options: RunOptions): Promise<RunSummary> => {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const candidateIds = await findCandidateUserIds(batchSize);

  let sent = 0;
  let rateLimited = 0;
  let errors = 0;
  let totalEligible = 0;

  for (const userId of candidateIds) {
    if (totalEligible >= batchSize) {
      break;
    }

    try {
      if (options.dryRun) {
        // Observe-only: count "would-be sends" without invoking the
        // email path. We still check pending docs so the count
        // reflects real eligibility, not just raw candidate volume.
        const { pending } = await getPendingReacceptance(userId);
        if (pending.length === 0) {
          continue;
        }
        totalEligible += 1;
        continue;
      }

      const result = await sendReacceptanceReminder({ userId, triggeredBy: 'cron' });
      if (result.sent) {
        totalEligible += 1;
        sent += 1;
        continue;
      }
      if (result.reason === 'rate_limited') {
        totalEligible += 1;
        rateLimited += 1;
        continue;
      }
      // 'no_pending_versions' — not eligible, don't count toward the cap.
    } catch (err) {
      totalEligible += 1;
      errors += 1;
      logger.error('Legal reminder cron: send failed for user', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const summary: RunSummary = {
    totalEligible,
    sent,
    rateLimited,
    errors,
    dryRun: options.dryRun,
  };

  // System-level audit row — no user attribution. AuditLogService.log
  // requires a userId, so write the row directly. This is append-only
  // (the immutable-trigger only blocks UPDATE/DELETE), so direct
  // creation is safe.
  await AuditLog.create({
    service: 'adopt-dont-shop-backend',
    user: null,
    user_email_snapshot: null,
    action: LEGAL_REMINDER_CRON_RAN_ACTION,
    level: 'INFO',
    timestamp: new Date(),
    metadata: {
      entity: 'System',
      entityId: 'legal-reminder-cron',
      details: { ...summary },
    },
    category: 'System',
  });

  logger.info('Legal reminder cron finished', { summary });
  return summary;
};

/**
 * Schedule the daily repeatable. No-op when REDIS_URL is not set or the
 * cron is not opted in via env var. Mirrors retention.job.ts.
 */
export const scheduleLegalReminderCron = async (): Promise<void> => {
  if (!isCronEnabled()) {
    logger.info('Legal reminder cron not enabled (LEGAL_REMINDER_CRON_ENABLED!=true)');
    return;
  }
  if (!isQueueAvailable()) {
    logger.warn('REDIS_URL not set — legal reminder cron not scheduled');
    return;
  }

  const queue = getReportsQueue();
  await queue.removeRepeatableByKey(LEGAL_REMINDER_CRON_REPEAT_KEY).catch(() => undefined);
  await queue.add(
    LEGAL_REMINDER_CRON_JOB_NAME,
    {},
    {
      jobId: LEGAL_REMINDER_CRON_REPEAT_KEY,
      repeat: { pattern: LEGAL_REMINDER_CRON, tz: 'UTC' },
    }
  );

  logger.info('Legal reminder cron scheduled', {
    cron: LEGAL_REMINDER_CRON,
    dryRun: isDryRun(),
  });
};

let workerInstance: Worker | null = null;

export const startLegalReminderWorker = (): Worker | null => {
  if (workerInstance) {
    return workerInstance;
  }
  if (!isCronEnabled()) {
    return null;
  }
  if (!isQueueAvailable()) {
    logger.warn('REDIS_URL not set — legal reminder worker not started');
    return null;
  }

  workerInstance = buildWorker(async job => {
    if (job.name !== LEGAL_REMINDER_CRON_JOB_NAME) {
      return;
    }
    await runLegalReminderCron({ dryRun: isDryRun() });
  });

  return workerInstance;
};

export const stopLegalReminderWorker = async (): Promise<void> => {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
  }
};
