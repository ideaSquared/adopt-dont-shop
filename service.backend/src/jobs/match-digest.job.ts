import type { Worker } from 'bullmq';
import { Op } from 'sequelize';
import { matchService } from '../matching';
import { loadMatchConfig } from '../matching/config';
import AdopterMatchProfile from '../models/AdopterMatchProfile';
import { NotificationType } from '../models/Notification';
import Pet, { PetStatus } from '../models/Pet';
import Rescue from '../models/Rescue';
import User, { UserStatus } from '../models/User';
import { buildWorker, getReportsQueue, isQueueAvailable } from '../lib/queue';
import { NotificationService } from '../services/notification.service';
import { logger } from '../utils/logger';

/**
 * Daily digest of new pet matches for opted-in adopters.
 *
 * Runs on the shared `reports` queue (same pattern as the retention
 * job). For each profile with `notify_new_matches=true`:
 *   - Score pets created since `last_notified_at` (or last 24h on
 *     first run).
 *   - Pick the top 3 that beat `min_notification_score`.
 *   - Send a single in-app notification per user (one digest, not 3).
 *   - Update `last_notified_at` so the next run only scores newer pets.
 *
 * Gated by MATCH_DIGEST_ENABLED so we can ship the scheduler dark
 * and flip it on per environment. No-op when Redis/queue unavailable.
 */

export const MATCH_DIGEST_JOB_NAME = 'match:daily-digest';
export const MATCH_DIGEST_REPEAT_KEY = 'match:daily-digest:08utc';
const MATCH_DIGEST_CRON = process.env.MATCH_DIGEST_CRON ?? '0 8 * * *';
const TOP_N = 3;
const FALLBACK_LOOKBACK_MS = 24 * 60 * 60 * 1000;

export const scheduleMatchDigestJob = async (): Promise<void> => {
  const cfg = loadMatchConfig();
  if (!cfg.digestEnabled) {
    logger.info('MATCH_DIGEST_ENABLED=false — match digest job not scheduled');
    return;
  }
  if (!isQueueAvailable()) {
    logger.warn('REDIS_URL not set — match digest job not scheduled');
    return;
  }

  const queue = getReportsQueue();
  await queue.removeRepeatableByKey(MATCH_DIGEST_REPEAT_KEY).catch(() => undefined);
  await queue.add(
    MATCH_DIGEST_JOB_NAME,
    {},
    {
      jobId: MATCH_DIGEST_REPEAT_KEY,
      repeat: { pattern: MATCH_DIGEST_CRON, tz: 'UTC' },
    }
  );

  logger.info('Match digest job scheduled', { cron: MATCH_DIGEST_CRON });
};

export const runMatchDigest = async (): Promise<{ scanned: number; notified: number }> => {
  const profiles = await AdopterMatchProfile.findAll({
    where: { notify_new_matches: true },
  });

  let notified = 0;
  for (const profile of profiles) {
    try {
      // Defense-in-depth: re-verify the recipient User still exists
      // and is ACTIVE. The `notify_new_matches=true` WHERE clause
      // doesn't join through User.status, so a suspended/deleted user
      // with a stale profile would otherwise still get notifications.
      const recipient = await User.findByPk(profile.user_id);
      if (!recipient || recipient.status !== UserStatus.ACTIVE) {
        logger.warn('match-digest: skipping — recipient missing or inactive', {
          userId: profile.user_id,
          status: recipient?.status ?? null,
        });
        continue;
      }

      const since = profile.last_notified_at ?? new Date(Date.now() - FALLBACK_LOOKBACK_MS);
      const candidates = await Pet.findAll({
        where: {
          status: PetStatus.AVAILABLE,
          createdAt: { [Op.gt]: since },
        },
        include: [{ model: Rescue, as: 'Rescue', attributes: ['rescue_id', 'name'] }],
        limit: 50,
      });

      if (candidates.length === 0) {
        continue;
      }

      const scored = await matchService.rankPets(profile.user_id, candidates);
      const top = scored.filter(s => s.score >= profile.min_notification_score).slice(0, TOP_N);

      if (top.length === 0) {
        continue;
      }

      const petNames = top
        .map(s => candidates.find(c => c.petId === s.petId)?.name)
        .filter((n): n is string => Boolean(n));

      await NotificationService.createNotification({
        userId: profile.user_id,
        type: NotificationType.PET_AVAILABLE,
        title: `${top.length} new ${top.length === 1 ? 'match' : 'matches'} for you`,
        message: `Top picks: ${petNames.join(', ')}`,
        data: {
          matches: top.map(s => ({ petId: s.petId, score: s.score })),
        },
      });

      profile.last_notified_at = new Date();
      await profile.save();
      notified += 1;
    } catch (err) {
      logger.warn('match digest failed for user', {
        userId: profile.user_id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { scanned: profiles.length, notified };
};

let workerInstance: Worker | null = null;

export const startMatchDigestWorker = (): Worker | null => {
  if (workerInstance) {
    return workerInstance;
  }
  if (!isQueueAvailable()) {
    logger.warn('REDIS_URL not set — match digest worker not started');
    return null;
  }
  workerInstance = buildWorker(async job => {
    if (job.name !== MATCH_DIGEST_JOB_NAME) {
      return;
    }
    const result = await runMatchDigest();
    logger.info('Match digest finished', result);
  });
  return workerInstance;
};

export const stopMatchDigestWorker = async (): Promise<void> => {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
  }
};
