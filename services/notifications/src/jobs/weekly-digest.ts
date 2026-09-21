// Weekly-digest email (ADS-1270) — rebuild of the send-nothing scaffold
// shelved at ADS-1245 (its fan-out RPCs were never wired; see the comment
// this replaces in ../index.ts). Two sections, sourced from data already
// owned elsewhere:
//   - "new matches near you" — the user's own current, still-available
//     shortlist (pets.ListFavoritesForUser). A future pets.Recommend
//     (real matching) is explicitly out of scope for this ticket.
//   - "still waiting on your shortlist" — in-progress applications
//     (applications.List via adopter_id_filter).
//
// Consent is a hard requirement, checked against notifications' own
// email_preferences table (see email/preferences.ts's
// loadWeeklyDigestConsentedUserIds) BEFORE any per-user work — global
// unsubscribe, blacklist, and the weekly digest_frequency cadence. A user
// with no favourites and no in-progress applications is skipped entirely
// (composeWeeklyDigest returns null): never send an empty digest.
//
// Sends go through the same notification-create path every other
// transactional notification uses (createNotification), as an email
// notification (channel=EMAIL, type=REMINDER — see channel-adapter.ts's
// EMAIL_WORTHY_TYPES). That gives the send channel/category preference
// enforcement (preferences-gate.ts) for free, on top of this job's own
// digest-specific consent check.

import { randomUUID } from 'node:crypto';

import type { Logger } from 'winston';

import { withTransaction, type WithTransactionDeps } from '@adopt-dont-shop/events';
import {
  ApplicationsV1,
  NotificationsV1,
  PetsV1,
  type Application,
  type ListUserIdsByCohortRequest,
  type ListUserIdsByCohortResponse,
  type Pet,
} from '@adopt-dont-shop/proto';

import { loadWeeklyDigestConsentedUserIds } from '../email/preferences.js';
import { createNotification } from '../grpc/handlers.js';
import { SYSTEM_PRINCIPAL } from '../nats/system-principal.js';

// --- Fan-out client slices this job needs ------------------------------

export type WeeklyDigestAuthClient = {
  listUserIdsByCohort: (req: ListUserIdsByCohortRequest) => Promise<ListUserIdsByCohortResponse>;
};

export type WeeklyDigestPetsClient = {
  listFavoritesForUser: (userId: string) => Promise<Pet[]>;
};

export type WeeklyDigestApplicationsClient = {
  listByUser: (userId: string) => Promise<Application[]>;
};

export type WeeklyDigestDeps = WithTransactionDeps & {
  authClient: WeeklyDigestAuthClient;
  petsClient: WeeklyDigestPetsClient;
  applicationsClient: WeeklyDigestApplicationsClient;
  logger: Logger;
};

export type WeeklyDigestResult = {
  cohortSize: number;
  consented: number;
  sent: number;
  skippedEmpty: number;
  failed: number;
};

// --- Pure content composition (unit-testable without any I/O) ---------

const MAX_FAVORITES_SHOWN = 5;

const NON_TERMINAL_APPLICATION_STATUSES = new Set<ApplicationsV1.ApplicationStatus>([
  ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_SUBMITTED,
  ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_UNDER_REVIEW,
  ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_HOME_VISIT_SCHEDULED,
  ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_HOME_VISIT_COMPLETED,
]);

const APPLICATION_STATUS_LABEL: Partial<Record<ApplicationsV1.ApplicationStatus, string>> = {
  [ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_SUBMITTED]: 'submitted, awaiting review',
  [ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_UNDER_REVIEW]: 'under review',
  [ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_HOME_VISIT_SCHEDULED]:
    'home visit scheduled',
  [ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_HOME_VISIT_COMPLETED]:
    'home visit completed, awaiting a decision',
};

// UK-locale date formatting (DD/MM/YYYY). services/* cannot depend on the
// frontend-only @adopt-dont-shop/lib.utils (packages/lib.* are frontend-
// shared libs — see CLAUDE.md's repo map), so this mirrors the en-GB
// Intl.DateTimeFormat approach broadcast-handlers.ts already uses for
// quiet-hours time formatting.
const formatUkDate = (iso: string): string =>
  new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(iso)
  );

export type ComposedDigest = { title: string; message: string };

// Returns null when there is nothing to say — the caller must not send an
// empty digest.
export const composeWeeklyDigest = (input: {
  favorites: readonly Pet[];
  applications: readonly Application[];
}): ComposedDigest | null => {
  const availableFavorites = input.favorites.filter(
    p => p.status === PetsV1.PetStatus.PET_STATUS_AVAILABLE
  );
  const inProgress = input.applications.filter(a =>
    NON_TERMINAL_APPLICATION_STATUSES.has(a.status)
  );

  if (availableFavorites.length === 0 && inProgress.length === 0) {
    return null;
  }

  const sections: string[] = [];

  if (availableFavorites.length > 0) {
    const shown = availableFavorites.slice(0, MAX_FAVORITES_SHOWN);
    const remainder = availableFavorites.length - shown.length;
    const names = shown.map(p => p.name).join(', ');
    sections.push(
      `New matches near you: ${names}${remainder > 0 ? ` and ${remainder} more` : ''} — still on your shortlist and available to adopt.`
    );
  }

  if (inProgress.length > 0) {
    const statusCounts = new Map<ApplicationsV1.ApplicationStatus, number>();
    for (const app of inProgress) {
      statusCounts.set(app.status, (statusCounts.get(app.status) ?? 0) + 1);
    }
    const breakdown = [...statusCounts.entries()]
      .map(
        ([appStatus, count]) => `${count} ${APPLICATION_STATUS_LABEL[appStatus] ?? 'in progress'}`
      )
      .join(', ');
    const earliestSubmitted = inProgress
      .map(a => a.submittedAt)
      .filter((d): d is string => Boolean(d))
      .sort()[0];
    sections.push(
      `Still waiting on your shortlist: you have ${inProgress.length} application${
        inProgress.length === 1 ? '' : 's'
      } in progress (${breakdown})${
        earliestSubmitted ? `, earliest submitted ${formatUkDate(earliestSubmitted)}` : ''
      }.`
    );
  }

  return {
    title: "Your weekly Adopt Don't Shop digest",
    message: sections.join('\n\n'),
  };
};

// --- Scheduler wiring constants (consumed by ../index.ts) ---------------

// Weekly, not configurable — cadence is the product spec, not an ops knob
// (unlike the retention jobs' *_INTERVAL_MS env vars).
export const WEEKLY_DIGEST_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

// Monday 09:00 UTC (matches email_preferences.digest_time's '09:00'
// default) — any instant on that grid works as the anchor; 2024-01-01 is
// a Monday. Anchoring matters: an un-anchored 7-day job grid-aligns to the
// Unix epoch's weekday (Thursday) regardless of boot time (ADS-1127 — see
// packages/scheduler/src/scheduler.test.ts's grid-drift regression, added
// specifically because "there is no live weekly-digest job on main to
// rewire ... this documents ... the existing anchorMs mechanism a rebuilt
// job must use to avoid it").
export const WEEKLY_DIGEST_ANCHOR_MS = Date.UTC(2024, 0, 1, 9, 0, 0);

// --- Orchestration ------------------------------------------------------

// Mirrors broadcast-handlers.ts's cohort-paging bound.
const COHORT_PAGE_LIMIT = 500;

const collectActiveUserIds = async (authClient: WeeklyDigestAuthClient): Promise<string[]> => {
  const userIds: string[] = [];
  let page = 1;
  for (;;) {
    // Empty userTypes/statuses = "any type" / "active-only" — the
    // AuthService.ListUserIdsByCohort documented safe default.
    const lookup = await authClient.listUserIdsByCohort({
      userTypes: [],
      statuses: [],
      page,
      limit: COHORT_PAGE_LIMIT,
    });
    userIds.push(...lookup.userIds);
    if (lookup.userIds.length < COHORT_PAGE_LIMIT) {
      break;
    }
    page++;
    // Safety valve mirroring broadcast-handlers.ts — a buggy client that
    // never shrinks its page can't loop forever.
    if (page > Math.ceil(lookup.total / COHORT_PAGE_LIMIT) + 1) {
      break;
    }
  }
  return userIds;
};

export async function runWeeklyDigest(
  deps: WeeklyDigestDeps,
  now: Date = new Date()
): Promise<WeeklyDigestResult> {
  const activeUserIds = await collectActiveUserIds(deps.authClient);
  const consentedUserIds = await loadWeeklyDigestConsentedUserIds(deps.pool, activeUserIds);

  let sent = 0;
  let skippedEmpty = 0;
  let failed = 0;

  for (const userId of consentedUserIds) {
    try {
      const [favorites, applications] = await Promise.all([
        deps.petsClient.listFavoritesForUser(userId),
        deps.applicationsClient.listByUser(userId),
      ]);
      const composed = composeWeeklyDigest({ favorites, applications });
      if (!composed) {
        skippedEmpty++;
        continue;
      }

      await createNotification(deps, SYSTEM_PRINCIPAL, {
        userId,
        type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_REMINDER,
        channel: NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_EMAIL,
        priority: NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_NORMAL,
        title: composed.title,
        message: composed.message,
        dataJson: '',
        templateVariablesJson: '',
      });
      // Bookkeeping only — 006_create_email_preferences.ts's last_digest_sent
      // column exists for exactly this. Not coupled to the notification
      // insert's own transaction: a failure here doesn't need to roll back
      // an email that has already been queued.
      await deps.pool.query(
        `UPDATE email_preferences SET last_digest_sent = $2 WHERE user_id = $1`,
        [userId, now]
      );
      sent++;
    } catch (err) {
      failed++;
      deps.logger.warn('weekly-digest.recipient_failed', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // One summary audit event per run, same shape as
  // jobs/email-queue-retention.ts's purge summary — no audit noise for a
  // run that sent nothing.
  if (sent > 0) {
    await withTransaction(deps, async ({ publish }) => {
      publish({
        type: 'notifications.actionTaken',
        id: `notifications.actionTaken.weeklyDigestRun.${now.getTime()}`,
        payload: {
          service: 'service.notifications',
          subject: 'notifications.actionTaken',
          aggregateType: 'weekly_digest',
          aggregateId: randomUUID(),
          action: 'digest_run',
          details: {
            cohortSize: activeUserIds.length,
            consented: consentedUserIds.length,
            sent,
            skippedEmpty,
            failed,
          },
        },
      });
    });
  }

  return {
    cohortSize: activeUserIds.length,
    consented: consentedUserIds.length,
    sent,
    skippedEmpty,
    failed,
  };
}
