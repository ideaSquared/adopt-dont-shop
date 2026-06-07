// gRPC handlers for the user-facing notification surface that doesn't
// fit in handlers.ts (Create / List / Dismiss) or email-handlers.ts
// (SendEmail / email-prefs): GetNotification, GetUnreadCount,
// MarkAllRead, DeleteNotification, plus the in-app notification
// preferences (user_notification_prefs) RPCs.
//
// Pattern matches the rest of the service — handlers take WithTransactionDeps,
// gate via @adopt-dont-shop/authz, throw HandlerError on bad input, and
// run writes inside withTransaction so any future publish-after-commit
// hook can ride along without restructuring.

import { hasPermission, requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction, type WithTransactionDeps } from '@adopt-dont-shop/events';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';
import {
  NotificationsV1,
  type DeleteNotificationRequest,
  type DeleteNotificationResponse,
  type GetNotificationPreferencesRequest,
  type GetNotificationPreferencesResponse,
  type GetNotificationRequest,
  type GetNotificationResponse,
  type GetUnreadCountRequest,
  type GetUnreadCountResponse,
  type MarkAllReadRequest,
  type MarkAllReadResponse,
  type NotificationPreferences as NotificationPreferencesProto,
  type UpdateNotificationPreferencesRequest,
  type UpdateNotificationPreferencesResponse,
} from '@adopt-dont-shop/proto';

import {
  channelFromDb,
  priorityFromDb,
  relatedEntityTypeFromDb,
  statusFromDb,
  typeFromDb,
  type NotificationChannelDb,
  type NotificationPriorityDb,
  type NotificationStatusDb,
  type NotificationTypeDb,
  type RelatedEntityTypeDb,
} from './enum-map.js';
import { HandlerError } from './handlers.js';

export type HandlerDeps = WithTransactionDeps;

// --- Permissions -----------------------------------------------------

const NOTIFICATIONS_READ: Permission = 'notifications.read' as Permission;
const NOTIFICATIONS_UPDATE: Permission = 'notifications.update' as Permission;
const NOTIFICATIONS_DELETE: Permission = 'notifications.delete' as Permission;
const PREFS_READ_SELF: Permission = 'notifications.prefs.read' as Permission;
const PREFS_READ_ANY: Permission = 'notifications.prefs.read:any' as Permission;
const PREFS_WRITE_SELF: Permission = 'notifications.prefs.update' as Permission;
const PREFS_WRITE_ANY: Permission = 'notifications.prefs.update:any' as Permission;

// --- Row shapes ------------------------------------------------------

type NotificationRow = {
  notification_id: string;
  user_id: string;
  type: NotificationTypeDb;
  channel: NotificationChannelDb;
  priority: NotificationPriorityDb;
  status: NotificationStatusDb;
  title: string;
  message: string;
  data: Record<string, unknown>;
  template_id: string | null;
  template_variables: Record<string, unknown>;
  related_entity_type: RelatedEntityTypeDb | null;
  related_entity_id: string | null;
  scheduled_for: Date | null;
  sent_at: Date | null;
  delivered_at: Date | null;
  read_at: Date | null;
  clicked_at: Date | null;
  expires_at: Date | null;
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  external_id: string | null;
  created_at: Date;
  updated_at: Date;
};

const notificationRowToProto = (row: NotificationRow): NotificationsV1.Notification => ({
  notificationId: row.notification_id,
  userId: row.user_id,
  type: typeFromDb(row.type),
  channel: channelFromDb(row.channel),
  priority: priorityFromDb(row.priority),
  status: statusFromDb(row.status),
  title: row.title,
  message: row.message,
  dataJson: JSON.stringify(row.data),
  templateId: row.template_id ?? undefined,
  templateVariablesJson: JSON.stringify(row.template_variables),
  relatedEntityType: row.related_entity_type
    ? relatedEntityTypeFromDb(row.related_entity_type)
    : undefined,
  relatedEntityId: row.related_entity_id ?? undefined,
  scheduledFor: row.scheduled_for?.toISOString(),
  sentAt: row.sent_at?.toISOString(),
  deliveredAt: row.delivered_at?.toISOString(),
  readAt: row.read_at?.toISOString(),
  clickedAt: row.clicked_at?.toISOString(),
  expiresAt: row.expires_at?.toISOString(),
  retryCount: row.retry_count,
  maxRetries: row.max_retries,
  errorMessage: row.error_message ?? undefined,
  externalId: row.external_id ?? undefined,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

// --- GetNotification -------------------------------------------------

export async function getNotification(
  deps: HandlerDeps,
  principal: Principal,
  req: GetNotificationRequest
): Promise<GetNotificationResponse> {
  if (!req.notificationId) {
    throw new HandlerError('INVALID_ARGUMENT', 'notification_id is required');
  }

  const result = await deps.pool.query<NotificationRow>(
    `SELECT * FROM notifications.notifications
     WHERE notification_id = $1 AND deleted_at IS NULL`,
    [req.notificationId]
  );
  if (result.rows.length === 0) {
    throw new HandlerError('NOT_FOUND', `notification ${req.notificationId} not found`);
  }
  const row = result.rows[0];

  const allowed = requirePermission(principal, NOTIFICATIONS_READ, {
    userId: row.user_id as UserId,
  });
  if (!allowed) {
    // Don't enumerate — same response shape as a row that doesn't exist.
    throw new HandlerError('NOT_FOUND', `notification ${req.notificationId} not found`);
  }

  return { notification: notificationRowToProto(row) };
}

// --- GetUnreadCount --------------------------------------------------

export async function getUnreadCount(
  deps: HandlerDeps,
  principal: Principal,
  _req: GetUnreadCountRequest
): Promise<GetUnreadCountResponse> {
  if (!hasPermission(principal, NOTIFICATIONS_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${NOTIFICATIONS_READ}' required`);
  }

  const result = await deps.pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM notifications.notifications
     WHERE user_id = $1
       AND deleted_at IS NULL
       AND read_at IS NULL
       AND (expires_at IS NULL OR expires_at > now())`,
    [principal.userId]
  );
  return { count: Number.parseInt(result.rows[0]?.count ?? '0', 10) };
}

// --- MarkAllRead -----------------------------------------------------

export async function markAllRead(
  deps: HandlerDeps,
  principal: Principal,
  _req: MarkAllReadRequest
): Promise<MarkAllReadResponse> {
  if (!hasPermission(principal, NOTIFICATIONS_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${NOTIFICATIONS_UPDATE}' required`);
  }

  let affected = 0;
  await withTransaction(deps, async ({ client, publish }) => {
    const result = await client.query<{ notification_id: string }>(
      `
      UPDATE notifications.notifications
      SET status = 'read', read_at = now(), updated_at = now(), version = version + 1
      WHERE user_id = $1
        AND deleted_at IS NULL
        AND read_at IS NULL
      RETURNING notification_id
      `,
      [principal.userId]
    );
    affected = result.rowCount ?? 0;

    if (affected > 0) {
      publish({
        type: 'notifications.allRead',
        id: `notifications.allRead.${principal.userId}.${Date.now()}`,
        payload: { userId: principal.userId, affectedCount: affected },
      });
    }
  });

  return { affectedCount: affected };
}

// --- DeleteNotification ----------------------------------------------

export async function deleteNotification(
  deps: HandlerDeps,
  principal: Principal,
  req: DeleteNotificationRequest
): Promise<DeleteNotificationResponse> {
  if (!req.notificationId) {
    throw new HandlerError('INVALID_ARGUMENT', 'notification_id is required');
  }

  const existing = await deps.pool.query<NotificationRow & { deleted_at: Date | null }>(
    `SELECT * FROM notifications.notifications WHERE notification_id = $1`,
    [req.notificationId]
  );
  if (existing.rows.length === 0) {
    throw new HandlerError('NOT_FOUND', `notification ${req.notificationId} not found`);
  }
  const row = existing.rows[0];

  const allowed = requirePermission(principal, NOTIFICATIONS_DELETE, {
    userId: row.user_id as UserId,
  });
  if (!allowed) {
    // Same don't-enumerate posture as GetNotification.
    throw new HandlerError('NOT_FOUND', `notification ${req.notificationId} not found`);
  }

  // Idempotent — return the already-deleted row without re-stamping.
  if (row.deleted_at) {
    return { notification: notificationRowToProto(row) };
  }

  let updated: NotificationRow | undefined;
  await withTransaction(deps, async ({ client, publish }) => {
    const result = await client.query<NotificationRow>(
      `
      UPDATE notifications.notifications
      SET deleted_at = now(), updated_at = now(), version = version + 1
      WHERE notification_id = $1
      RETURNING *
      `,
      [req.notificationId]
    );
    updated = result.rows[0];

    publish({
      type: 'notifications.deleted',
      id: `notifications.deleted.${req.notificationId}`,
      payload: { notificationId: req.notificationId, userId: row.user_id },
    });
  });

  if (!updated) {
    throw new HandlerError('INTERNAL', 'delete returned no rows');
  }
  return { notification: notificationRowToProto(updated) };
}

// --- Notification preferences (user_notification_prefs) --------------

type PrefsRow = {
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  digest_frequency: 'immediate' | 'daily' | 'weekly' | 'never';
  application_updates: boolean;
  pet_matches: boolean;
  rescue_updates: boolean;
  chat_messages: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
  created_at: Date;
  updated_at: Date;
};

const dbFrequencyToProto = (
  v: PrefsRow['digest_frequency']
): NotificationsV1.NotificationDigestFrequency => {
  switch (v) {
    case 'immediate':
      return NotificationsV1.NotificationDigestFrequency.NOTIFICATION_DIGEST_FREQUENCY_IMMEDIATE;
    case 'daily':
      return NotificationsV1.NotificationDigestFrequency.NOTIFICATION_DIGEST_FREQUENCY_DAILY;
    case 'weekly':
      return NotificationsV1.NotificationDigestFrequency.NOTIFICATION_DIGEST_FREQUENCY_WEEKLY;
    case 'never':
      return NotificationsV1.NotificationDigestFrequency.NOTIFICATION_DIGEST_FREQUENCY_NEVER;
  }
};

const protoFrequencyToDb = (
  v: NotificationsV1.NotificationDigestFrequency
): PrefsRow['digest_frequency'] | null => {
  switch (v) {
    case NotificationsV1.NotificationDigestFrequency.NOTIFICATION_DIGEST_FREQUENCY_IMMEDIATE:
      return 'immediate';
    case NotificationsV1.NotificationDigestFrequency.NOTIFICATION_DIGEST_FREQUENCY_DAILY:
      return 'daily';
    case NotificationsV1.NotificationDigestFrequency.NOTIFICATION_DIGEST_FREQUENCY_WEEKLY:
      return 'weekly';
    case NotificationsV1.NotificationDigestFrequency.NOTIFICATION_DIGEST_FREQUENCY_NEVER:
      return 'never';
    default:
      return null;
  }
};

const prefsRowToProto = (row: PrefsRow): NotificationPreferencesProto => ({
  userId: row.user_id,
  emailEnabled: row.email_enabled,
  pushEnabled: row.push_enabled,
  smsEnabled: row.sms_enabled,
  digestFrequency: dbFrequencyToProto(row.digest_frequency),
  applicationUpdates: row.application_updates,
  petMatches: row.pet_matches,
  rescueUpdates: row.rescue_updates,
  chatMessages: row.chat_messages,
  quietHoursStart: row.quiet_hours_start ?? undefined,
  quietHoursEnd: row.quiet_hours_end ?? undefined,
  timezone: row.timezone,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const findOrCreatePrefs = async (deps: HandlerDeps, userId: string): Promise<PrefsRow> => {
  const existing = await deps.pool.query<PrefsRow>(
    `SELECT * FROM notifications.user_notification_prefs WHERE user_id = $1`,
    [userId]
  );
  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const inserted = await deps.pool.query<PrefsRow>(
    `
    INSERT INTO notifications.user_notification_prefs (user_id)
    VALUES ($1)
    ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
    RETURNING *
    `,
    [userId]
  );
  return inserted.rows[0];
};

const resolveTargetUserId = (
  principal: Principal,
  requested: string | undefined,
  anyPerm: Permission
): string => {
  const target = requested || (principal.userId as string);
  if (target === principal.userId) {
    return target;
  }
  if (!hasPermission(principal, anyPerm)) {
    throw new HandlerError(
      'PERMISSION_DENIED',
      `'${anyPerm}' required to access another user's notification preferences`
    );
  }
  return target;
};

export async function getNotificationPreferences(
  deps: HandlerDeps,
  principal: Principal,
  req: GetNotificationPreferencesRequest
): Promise<GetNotificationPreferencesResponse> {
  if (!hasPermission(principal, PREFS_READ_SELF)) {
    throw new HandlerError('PERMISSION_DENIED', `'${PREFS_READ_SELF}' required`);
  }
  const userId = resolveTargetUserId(principal, req.userId, PREFS_READ_ANY);
  const row = await findOrCreatePrefs(deps, userId);
  return { preferences: prefsRowToProto(row) };
}

export async function updateNotificationPreferences(
  deps: HandlerDeps,
  principal: Principal,
  req: UpdateNotificationPreferencesRequest
): Promise<UpdateNotificationPreferencesResponse> {
  if (!hasPermission(principal, PREFS_WRITE_SELF)) {
    throw new HandlerError('PERMISSION_DENIED', `'${PREFS_WRITE_SELF}' required`);
  }
  const userId = resolveTargetUserId(principal, req.userId, PREFS_WRITE_ANY);

  // Ensure the row exists before we UPDATE so the response always
  // reflects the canonical row even when no fields were patched.
  await findOrCreatePrefs(deps, userId);

  const sets: string[] = [];
  const params: unknown[] = [];
  let n = 1;

  const setBool = (column: string, value: boolean | undefined): void => {
    if (value !== undefined) {
      sets.push(`${column} = $${n}`);
      params.push(value);
      n++;
    }
  };

  setBool('email_enabled', req.emailEnabled);
  setBool('push_enabled', req.pushEnabled);
  setBool('sms_enabled', req.smsEnabled);
  setBool('application_updates', req.applicationUpdates);
  setBool('pet_matches', req.petMatches);
  setBool('rescue_updates', req.rescueUpdates);
  setBool('chat_messages', req.chatMessages);

  const freq = protoFrequencyToDb(req.digestFrequency);
  if (freq) {
    sets.push(`digest_frequency = $${n}`);
    params.push(freq);
    n++;
  }

  // Quiet-hours: empty string clears (NULL); absent leaves untouched.
  if (req.quietHoursStart !== undefined) {
    if (
      req.quietHoursStart !== '' &&
      !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(req.quietHoursStart)
    ) {
      throw new HandlerError('INVALID_ARGUMENT', 'quiet_hours_start must be HH:MM');
    }
    sets.push(`quiet_hours_start = $${n}`);
    params.push(req.quietHoursStart === '' ? null : req.quietHoursStart);
    n++;
  }
  if (req.quietHoursEnd !== undefined) {
    if (req.quietHoursEnd !== '' && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(req.quietHoursEnd)) {
      throw new HandlerError('INVALID_ARGUMENT', 'quiet_hours_end must be HH:MM');
    }
    sets.push(`quiet_hours_end = $${n}`);
    params.push(req.quietHoursEnd === '' ? null : req.quietHoursEnd);
    n++;
  }

  if (req.timezone !== undefined) {
    sets.push(`timezone = $${n}`);
    params.push(req.timezone);
    n++;
  }

  if (sets.length === 0) {
    // No-op patch — return current row.
    const current = await deps.pool.query<PrefsRow>(
      `SELECT * FROM notifications.user_notification_prefs WHERE user_id = $1`,
      [userId]
    );
    return { preferences: prefsRowToProto(current.rows[0]) };
  }

  sets.push('updated_at = now()');
  sets.push('version = version + 1');
  params.push(userId);

  const result = await deps.pool.query<PrefsRow>(
    `
    UPDATE notifications.user_notification_prefs
    SET ${sets.join(', ')}
    WHERE user_id = $${n}
    RETURNING *
    `,
    params
  );
  return { preferences: prefsRowToProto(result.rows[0]) };
}
