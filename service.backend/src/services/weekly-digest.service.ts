import { Op } from 'sequelize';
import Application from '../models/Application';
import { NotificationType } from '../models/Notification';
import Pet, { PetStatus } from '../models/Pet';
import User, { UserStatus } from '../models/User';
import UserFavorite from '../models/UserFavorite';
import UserNotificationPrefs from '../models/UserNotificationPrefs';
import { logger } from '../utils/logger';
import { NotificationService } from './notification.service';

/**
 * ADS-631: Weekly "new matches near you" digest + favourites
 * re-engagement.
 *
 * Single weekly touch combining two sections:
 *   1. New near you — up to 3 recently-created available pets that
 *      could match the user. The matching algorithm is intentionally
 *      stubbed (Pet.findAll ordered by createdAt) — preference-aware
 *      ranking lands in a follow-up ticket once the scoring service
 *      exposes a synchronous candidate API.
 *   2. Still waiting — up to 2 pets the user has favourited but has
 *      no application against. Drops out silently when the user has
 *      no unactioned favourites.
 *
 * The job no-ops when a user's marketing/digest preference is off, and
 * when both sections are empty (no point emailing a digest with nothing
 * in it).
 */

export const NEW_MATCHES_LIMIT = 3;
export const STILL_WAITING_LIMIT = 2;
export const NEW_MATCHES_LOOKBACK_DAYS = 7;
// Cap the favourites we scan per user. We only surface STILL_WAITING_LIMIT
// pets, but some favourites get filtered out (already applied / no longer
// available), so we look at a bounded window of the oldest favourites rather
// than loading a power-user's entire favourites list into memory.
export const STILL_WAITING_SCAN_LIMIT = 50;

export type DigestPetSummary = {
  petId: string;
  name: string;
};

export type WeeklyDigestPayload = {
  userId: string;
  newMatches: DigestPetSummary[];
  stillWaiting: DigestPetSummary[];
};

const toSummary = (pet: Pet): DigestPetSummary => ({
  petId: pet.petId,
  name: pet.name,
});

/**
 * Whether a user has opted in to marketing-style weekly content.
 *
 * The digest is "marketing-adjacent" — it surfaces new pets and stale
 * favourites that the user hasn't acted on. The closest existing flag
 * is `UserNotificationPrefs.pet_matches`; we also require `email_enabled`
 * because the deliverable is a weekly email. Falls back to NO send when
 * the prefs row is missing — opt-in not opt-out for re-engagement.
 */
export const isOptedIn = (prefs: UserNotificationPrefs | null): boolean => {
  if (!prefs) {
    return false;
  }
  return prefs.email_enabled && prefs.pet_matches;
};

const fetchNewMatches = async (
  userId: string,
  lookbackDays: number = NEW_MATCHES_LOOKBACK_DAYS
): Promise<Pet[]> => {
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
  // Stub matching: most recently listed available pets. Real preference-
  // aware ranking will replace this query when the matching service has
  // a synchronous candidate API. The userId argument keeps the signature
  // ready for that swap.
  void userId;
  return Pet.findAll({
    where: {
      status: PetStatus.AVAILABLE,
      createdAt: { [Op.gte]: since },
    },
    order: [['createdAt', 'DESC']],
    limit: NEW_MATCHES_LIMIT,
  });
};

const fetchStillWaiting = async (userId: string): Promise<Pet[]> => {
  const favorites = await UserFavorite.findAll({
    where: { userId },
    order: [['createdAt', 'ASC']],
    limit: STILL_WAITING_SCAN_LIMIT,
  });

  if (favorites.length === 0) {
    return [];
  }

  const favoritePetIds = favorites.map(f => f.petId);

  // Exclude any favourited pets the user has already applied for —
  // those have been "actioned" and don't belong in re-engagement.
  const applications = await Application.findAll({
    where: {
      userId,
      petId: { [Op.in]: favoritePetIds },
    },
    attributes: ['petId'],
  });
  const appliedPetIds = new Set(applications.map(a => a.petId));

  const unactionedPetIds = favoritePetIds.filter(id => !appliedPetIds.has(id));
  if (unactionedPetIds.length === 0) {
    return [];
  }

  return Pet.findAll({
    where: {
      petId: { [Op.in]: unactionedPetIds },
      status: PetStatus.AVAILABLE,
    },
    limit: STILL_WAITING_LIMIT,
  });
};

/**
 * Build a digest payload for a single user. Does not send anything —
 * returns null when both sections are empty so the caller can skip the
 * delivery entirely.
 */
export const buildDigestPayload = async (userId: string): Promise<WeeklyDigestPayload | null> => {
  const [newMatchPets, stillWaitingPets] = await Promise.all([
    fetchNewMatches(userId),
    fetchStillWaiting(userId),
  ]);

  if (newMatchPets.length === 0 && stillWaitingPets.length === 0) {
    return null;
  }

  return {
    userId,
    newMatches: newMatchPets.map(toSummary),
    stillWaiting: stillWaitingPets.map(toSummary),
  };
};

const formatDigestMessage = (payload: WeeklyDigestPayload): string => {
  const parts: string[] = [];
  if (payload.newMatches.length > 0) {
    const names = payload.newMatches.map(p => p.name).join(', ');
    parts.push(`New near you: ${names}.`);
  }
  if (payload.stillWaiting.length > 0) {
    const names = payload.stillWaiting.map(p => p.name).join(', ');
    parts.push(`Still waiting on your shortlist: ${names}.`);
  }
  return parts.join(' ');
};

/**
 * Send the weekly digest for one user. Returns true when a notification
 * was created, false when skipped (opted out, no payload, etc.).
 *
 * Delivery is delegated to NotificationService.createNotification which
 * fans out to in-app / push / email based on the user's channel prefs
 * — re-using existing infrastructure rather than calling the email
 * and push providers directly.
 */
export const sendWeeklyDigestForUser = async (userId: string): Promise<boolean> => {
  const prefs = await UserNotificationPrefs.findByPk(userId);
  if (!isOptedIn(prefs)) {
    return false;
  }

  const payload = await buildDigestPayload(userId);
  if (!payload) {
    return false;
  }

  const message = formatDigestMessage(payload);
  await NotificationService.createNotification({
    userId,
    type: NotificationType.PET_AVAILABLE,
    title: 'Your weekly pet digest',
    message,
    data: {
      newMatches: payload.newMatches,
      stillWaiting: payload.stillWaiting,
    },
  });

  return true;
};

// Active users are paged through in batches rather than loaded all at once —
// the cohort grows unbounded over the platform's lifetime, so a single
// findAll would eventually exhaust Node's heap.
export const RUN_BATCH_SIZE = 500;

export const runWeeklyDigest = async (): Promise<{ scanned: number; sent: number }> => {
  let scanned = 0;
  let sent = 0;
  let offset = 0;

  for (;;) {
    const users = await User.findAll({
      where: { status: UserStatus.ACTIVE },
      attributes: ['userId'],
      order: [['userId', 'ASC']],
      limit: RUN_BATCH_SIZE,
      offset,
    });

    for (const user of users) {
      scanned += 1;
      try {
        const delivered = await sendWeeklyDigestForUser(user.userId);
        if (delivered) {
          sent += 1;
        }
      } catch (err) {
        logger.warn('weekly digest failed for user', {
          userId: user.userId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (users.length < RUN_BATCH_SIZE) {
      break;
    }
    offset += RUN_BATCH_SIZE;
  }

  return { scanned, sent };
};
