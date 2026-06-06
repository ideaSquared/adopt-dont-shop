// Weekly digest scheduled job.
//
// Ports service.backend/src/services/weekly-digest.service.ts, but the
// data-source reads are split across services in the new architecture:
//
//   - "new matches near you" candidate list lives in services/pets
//     (PetService.List + a future PetService.Recommend RPC)
//   - "still waiting on your shortlist" reads UserFavorite from
//     services/pets and excludes applied pets from services/applications
//   - the active-user cohort lives in services/auth
//
// Cross-schema SELECTs are forbidden by the schema-per-service rule,
// so this job's "real" implementation depends on three currently-
// unwired gRPC calls. The version landed here is a SCAFFOLD: it walks
// the email_preferences rows for users opted in to weekly digests and
// logs a "would-build" line per candidate. When the upstream RPCs ship
// (pets.ListFavorites, applications.ListByUser, auth.ListActiveUsers)
// the body of `runDigestForUser` swaps in the real fan-out.
//
// Cadence: once per 7 days. Configured in the scheduler caller, not
// here, so the smoke can dial it down to seconds for testing.

import type { Pool } from 'pg';
import type { Logger } from 'winston';

import type { WithTransactionDeps } from '@adopt-dont-shop/events';

import type { Principal } from '@adopt-dont-shop/authz';

export type WeeklyDigestDeps = WithTransactionDeps;

export type RunWeeklyDigestOptions = {
  deps: WeeklyDigestDeps;
  logger: Logger;
  // Override the default principal used by the underlying
  // notification-create path. Same shape the NATS subscribers use.
  principal?: Principal;
};

// Page through opted-in users in bounded batches — the cohort grows
// unbounded as the platform scales, so a single SELECT eventually
// exhausts Node's heap (CAD lesson preserved from monolith).
const BATCH_SIZE = 500;

export type WeeklyDigestRunSummary = {
  scanned: number;
  scaffoldOnly: number;
};

type UserPrefsRow = {
  user_id: string;
};

const fetchOptedInBatch = async (pool: Pool, offset: number): Promise<UserPrefsRow[]> => {
  // Targets users with the email channel open AND the digest cadence
  // explicitly set to weekly. is_blacklisted and global_unsubscribe
  // are both respected.
  const res = await pool.query<UserPrefsRow>(
    `
    SELECT user_id
    FROM email_preferences
    WHERE is_email_enabled = true
      AND global_unsubscribe = false
      AND is_blacklisted = false
      AND digest_frequency = 'weekly'
    ORDER BY user_id ASC
    LIMIT $1 OFFSET $2
    `,
    [BATCH_SIZE, offset]
  );
  return res.rows;
};

const runDigestForUser = async (userId: string, logger: Logger): Promise<void> => {
  // SCAFFOLD: the candidate fan-out (pets.recommend / pets.favorites /
  // applications.listByUser) isn't wired yet. The full implementation
  // mirrors the monolith's `buildDigestPayload` + `formatDigestMessage`
  // + `NotificationService.createNotification` chain; for now we log
  // the intent so the schedule + opt-in lookup itself is exercisable
  // end-to-end without depending on unfinished services.
  logger.info('scheduler.weekly_digest.scaffold', {
    userId,
    todo: 'fan-out via pets/applications gRPC once those RPCs ship',
  });
};

export const runWeeklyDigest = async (
  opts: RunWeeklyDigestOptions
): Promise<WeeklyDigestRunSummary> => {
  let scanned = 0;
  let scaffoldOnly = 0;
  let offset = 0;

  for (;;) {
    const rows = await fetchOptedInBatch(opts.deps.pool, offset);
    for (const row of rows) {
      scanned += 1;
      try {
        await runDigestForUser(row.user_id, opts.logger);
        scaffoldOnly += 1;
      } catch (err) {
        opts.logger.warn('scheduler.weekly_digest.user_failed', {
          userId: row.user_id,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
    if (rows.length < BATCH_SIZE) {
      break;
    }
    offset += BATCH_SIZE;
  }

  opts.logger.info('scheduler.weekly_digest.done', { scanned, scaffoldOnly });
  return { scanned, scaffoldOnly };
};
