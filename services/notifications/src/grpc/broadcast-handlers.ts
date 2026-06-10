// gRPC handler for NotificationService.Broadcast — fan a single in-app
// notification across a cohort of users.
//
// Flow:
//   1. Permission gate (admin.notifications.broadcast).
//   2. Resolve the cohort by calling AuthService.ListUserIdsByCohort
//      (cross-service gRPC; injected via deps.authClient so unit tests
//      can mock).
//   3. For each user_id, INSERT a notification row, honouring the
//      per-user quiet_hours window (DND skip). Channel toggles do NOT
//      apply — in-app notifications are always on the in-app channel,
//      which the prefs row models with no opt-out (only email/push/sms
//      have toggles).
//   4. Per-user failures are absorbed so a single bad row doesn't
//      poison the batch; failed counter increments, a warn is logged
//      (capped at MAX_LOGGED_FAILURES per broadcast), and the loop
//      moves on.
//
// publish-after-commit: each insert + its `notifications.broadcastSent`
// event runs inside its own withTransaction. Per-recipient atomicity
// matters more than batch atomicity here — a partial fan-out is the
// right behaviour when one recipient's row insert fails.

import { randomUUID } from 'node:crypto';

import { hasPermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction } from '@adopt-dont-shop/events';
import type { Permission } from '@adopt-dont-shop/lib.types';
import {
  AuthV1,
  NotificationsV1,
  type BroadcastRequest,
  type BroadcastResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './handlers.js';

const NOTIFICATIONS_BROADCAST: Permission = 'admin.notifications.broadcast' as Permission;

// Map cohort filter strings (admin UI sends string forms of UserRole /
// UserStatus) onto the auth proto enum values. The gRPC ListUserIdsByCohort
// handler will normalise these back to DB strings.
const ROLE_FROM_STRING: Record<string, AuthV1.UserRole> = {
  adopter: AuthV1.UserRole.USER_ROLE_ADOPTER,
  rescue_staff: AuthV1.UserRole.USER_ROLE_RESCUE_STAFF,
  admin: AuthV1.UserRole.USER_ROLE_ADMIN,
  moderator: AuthV1.UserRole.USER_ROLE_MODERATOR,
  super_admin: AuthV1.UserRole.USER_ROLE_SUPER_ADMIN,
  support_agent: AuthV1.UserRole.USER_ROLE_SUPPORT_AGENT,
};

const STATUS_FROM_STRING: Record<string, AuthV1.UserStatus> = {
  active: AuthV1.UserStatus.USER_STATUS_ACTIVE,
  inactive: AuthV1.UserStatus.USER_STATUS_INACTIVE,
  suspended: AuthV1.UserStatus.USER_STATUS_SUSPENDED,
  pending_verification: AuthV1.UserStatus.USER_STATUS_PENDING_VERIFICATION,
  deactivated: AuthV1.UserStatus.USER_STATUS_DEACTIVATED,
};

const COHORT_PAGE_LIMIT = 500;

// Per-recipient failures are warned individually so operators can see
// which users missed a broadcast — but capped so a systemic outage
// (e.g. DB down mid-fan-out) doesn't flood the logs.
const MAX_LOGGED_FAILURES = 50;

type PrefsRow = {
  user_id: string;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
};

// Quiet-hours check. quiet_hours_* are stored as HH:MM strings; both
// must be set to enable the window. The check uses the user's timezone
// so a US user at 23:30 doesn't get pinged because the broadcast issued
// in UTC midday.
//
// Returns true when the user is currently inside their DND window and
// the broadcast should be suppressed.
export function isInQuietHours(prefs: PrefsRow, now: Date = new Date()): boolean {
  if (!prefs.quiet_hours_start || !prefs.quiet_hours_end) {
    return false;
  }
  // Localise `now` to the user's timezone. Intl.DateTimeFormat gives us
  // HH:MM in the target zone without pulling in a tz library.
  let hhmm: string;
  try {
    hhmm = new Intl.DateTimeFormat('en-GB', {
      timeZone: prefs.timezone || 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(now);
  } catch {
    // Unknown timezone — fall back to UTC rather than throwing.
    hhmm = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(now);
  }
  const start = prefs.quiet_hours_start;
  const end = prefs.quiet_hours_end;
  // Window may wrap midnight (e.g. 22:00 → 07:00).
  if (start <= end) {
    return hhmm >= start && hhmm < end;
  }
  return hhmm >= start || hhmm < end;
}

export async function broadcast(
  deps: HandlerDeps,
  principal: Principal,
  req: BroadcastRequest
): Promise<BroadcastResponse> {
  if (!hasPermission(principal, NOTIFICATIONS_BROADCAST)) {
    throw new HandlerError('PERMISSION_DENIED', `'${NOTIFICATIONS_BROADCAST}' required`);
  }
  if (!deps.authClient) {
    throw new HandlerError(
      'INTERNAL',
      'broadcast requires auth client; service.notifications was not wired with one'
    );
  }
  const title = req.title?.trim() ?? '';
  const message = req.message?.trim() ?? '';
  if (title === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'title is required');
  }
  if (message === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'message is required');
  }

  // Map the string cohort filters onto the auth proto enums. Unknown
  // strings drop silently — the auth handler treats missing as "any".
  const cohort = req.cohort ?? { userTypes: [], statuses: [] };
  const userTypes = (cohort.userTypes ?? [])
    .map(s => ROLE_FROM_STRING[s])
    .filter((v): v is AuthV1.UserRole => v !== undefined);
  const statuses = (cohort.statuses ?? [])
    .map(s => STATUS_FROM_STRING[s])
    .filter((v): v is AuthV1.UserStatus => v !== undefined);

  // Drive the cohort in pages so we don't pull millions of ids into a
  // single buffer for a very-large announcement.
  let page = 1;
  let total = 0;
  let targeted = 0;
  let delivered = 0;
  let suppressed = 0;
  let failed = 0;
  let loggedFailures = 0;

  const type =
    req.type === undefined ||
    req.type === NotificationsV1.NotificationType.NOTIFICATION_TYPE_UNSPECIFIED
      ? NotificationsV1.NotificationType.NOTIFICATION_TYPE_SYSTEM_ANNOUNCEMENT
      : req.type;
  const scheduledFor =
    req.scheduledFor && req.scheduledFor !== '' ? new Date(req.scheduledFor) : null;
  if (scheduledFor !== null && !Number.isFinite(scheduledFor.getTime())) {
    throw new HandlerError('INVALID_ARGUMENT', 'scheduled_for must be RFC 3339');
  }

  const now = new Date();

  while (true) {
    const lookup = await deps.authClient.listUserIdsByCohort({
      userTypes,
      statuses,
      emailVerified: cohort.emailVerified,
      page,
      limit: COHORT_PAGE_LIMIT,
    });
    if (page === 1) {
      total = lookup.total;
    }
    targeted += lookup.userIds.length;
    for (const userId of lookup.userIds) {
      try {
        const outcome = await sendOne(
          deps,
          userId,
          {
            type,
            title,
            message,
            actionUrl: req.actionUrl,
            dataJson: req.dataJson,
            scheduledFor,
            actorId: principal.userId,
          },
          now
        );
        if (outcome === 'delivered') {
          delivered++;
        } else if (outcome === 'suppressed') {
          suppressed++;
        }
      } catch (err) {
        failed++;
        if (loggedFailures < MAX_LOGGED_FAILURES) {
          loggedFailures++;
          deps.logger?.warn('broadcast recipient write failed', {
            userId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
    if (lookup.userIds.length < COHORT_PAGE_LIMIT) {
      break;
    }
    page++;
    // Safety: cap iterations at total/page to avoid an infinite loop if
    // a buggy auth client never shrinks its result set.
    if (page > Math.ceil(total / COHORT_PAGE_LIMIT) + 1) {
      break;
    }
  }

  return { targeted, delivered, suppressed, failed };
}

type SendInput = {
  type: NotificationsV1.NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  dataJson?: string;
  scheduledFor: Date | null;
  actorId: string;
};

// Insert one row + publish the per-recipient event. Returns 'delivered'
// on success, 'suppressed' when the user's DND window says no.
async function sendOne(
  deps: HandlerDeps,
  userId: string,
  input: SendInput,
  now: Date
): Promise<'delivered' | 'suppressed'> {
  return withTransaction(deps, async ({ client, publish }) => {
    // Load prefs (auto-create defaults so the broadcast never errors on
    // missing-row). The defaults disable DND, so a brand-new user gets
    // the announcement.
    const prefsResult = await client.query<PrefsRow>(
      `INSERT INTO notifications.user_notification_prefs (user_id)
         VALUES ($1)
         ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING user_id, quiet_hours_start, quiet_hours_end, timezone`,
      [userId]
    );
    const prefs = prefsResult.rows[0];

    if (prefs && isInQuietHours(prefs, now)) {
      return 'suppressed';
    }

    const notificationId = randomUUID();
    // Merge action_url into the `data` jsonb so it round-trips through the
    // existing read path (the table has no dedicated column for it).
    const data = mergeActionUrl(input.dataJson, input.actionUrl);

    await client.query(
      `INSERT INTO notifications.notifications (
         notification_id, user_id, type, channel, priority, status,
         title, message, data, related_entity_type, related_entity_id,
         scheduled_for, expires_at, retry_count, max_retries, version,
         created_at, updated_at
       )
       VALUES (
         $1, $2, $3, 'in_app', 'normal', 'pending',
         $4, $5, $6::jsonb, NULL, NULL,
         $7, NULL, 0, 3, 0,
         now(), now()
       )`,
      [
        notificationId,
        userId,
        notificationTypeToDb(input.type),
        input.title,
        input.message,
        data,
        input.scheduledFor,
      ]
    );

    publish({
      id: notificationId,
      type: 'notifications.broadcastSent',
      payload: {
        notificationId,
        userId,
        actorId: input.actorId,
      },
    });
    return 'delivered';
  });
}

// Minimal proto → DB type mapping. Anything we don't explicitly map
// falls back to `system_announcement` — broadcasts are admin pushes
// and that's the schema enum value reserved for them.
function notificationTypeToDb(t: NotificationsV1.NotificationType): string {
  switch (t) {
    case NotificationsV1.NotificationType.NOTIFICATION_TYPE_APPLICATION_STATUS:
      return 'application_status';
    case NotificationsV1.NotificationType.NOTIFICATION_TYPE_MESSAGE_RECEIVED:
      return 'message_received';
    case NotificationsV1.NotificationType.NOTIFICATION_TYPE_PET_AVAILABLE:
      return 'pet_available';
    default:
      return 'system_announcement';
  }
}

function mergeActionUrl(dataJson: string | undefined, actionUrl: string | undefined): string {
  let data: Record<string, unknown> = {};
  if (dataJson && dataJson !== '') {
    try {
      const parsed = JSON.parse(dataJson) as unknown;
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        data = parsed as Record<string, unknown>;
      }
    } catch {
      // Malformed JSON from a caller — start fresh rather than throw,
      // so the broadcast still goes out for the rest of the cohort.
    }
  }
  if (actionUrl && actionUrl !== '') {
    data.actionUrl = actionUrl;
  }
  return JSON.stringify(data);
}
