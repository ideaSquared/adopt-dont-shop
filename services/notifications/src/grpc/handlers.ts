// gRPC handler implementations for NotificationService.{Create, List,
// Dismiss}. Exposed as plain async functions that take dependencies
// (pg Pool + NATS connection) + the request + the calling principal.
// The grpc-server adapter (Phase 1.3c) wraps these in
// `(call, callback)` signatures and translates HandlerError codes
// into gRPC status codes.
//
// Discipline:
//   - Every state-changing handler runs the DB write + event publish
//     inside @adopt-dont-shop/events.withTransaction so events only
//     fire after commit (CAD publish-after-commit, PR #29 / #35).
//   - Permission gating uses @adopt-dont-shop/authz against the
//     principal from gRPC metadata. super_admin short-circuit is
//     handled inside hasPermission / requirePermission.
//   - List + Dismiss enforce ownership scope (userId match) so
//     adopters can only read / dismiss their own notifications. Admin
//     services pass `super_admin` in their roles header and bypass.
//   - Dismiss is idempotent: a second Dismiss on an already-read
//     notification returns the same row without re-publishing.

import { randomUUID } from 'node:crypto';

import type { Logger } from 'winston';

import { hasPermission, requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction, type WithTransactionDeps } from '@adopt-dont-shop/events';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';
import {
  NotificationsV1,
  type CreateNotificationRequest,
  type CreateNotificationResponse,
  type DismissNotificationRequest,
  type DismissNotificationResponse,
  type ListNotificationsRequest,
  type ListNotificationsResponse,
  type Notification,
} from '@adopt-dont-shop/proto';

import { claimEvent } from '../processed-events.js';

import {
  channelFromDb,
  channelToDb,
  priorityFromDb,
  priorityToDb,
  relatedEntityTypeFromDb,
  relatedEntityTypeToDb,
  statusFromDb,
  statusToDb,
  typeFromDb,
  typeToDb,
  type NotificationStatusDb,
  type NotificationTypeDb,
  type NotificationChannelDb,
  type NotificationPriorityDb,
  type RelatedEntityTypeDb,
} from './enum-map.js';

// AuthCohortClient — the slice of @adopt-dont-shop/proto's AuthServiceClient
// the broadcast handler needs. Defined inline so handler tests can supply a
// simple mock object without standing up a real gRPC stub.
export type AuthCohortClient = {
  listUserIdsByCohort: (
    req: import('@adopt-dont-shop/proto').ListUserIdsByCohortRequest
  ) => Promise<import('@adopt-dont-shop/proto').ListUserIdsByCohortResponse>;
};

export type HandlerDeps = WithTransactionDeps & {
  // Optional — only broadcast-handlers reads it. Other handlers (Create,
  // List, Dismiss, etc.) work fine without a cross-service client wired.
  authClient?: AuthCohortClient;
  // Optional — only broadcast-handlers reads it (per-recipient failure
  // warns). Other handlers log via the adapt() wrapper's logger.
  logger?: Logger;
};

export type HandlerErrorCode =
  | 'INVALID_ARGUMENT'
  | 'UNAUTHENTICATED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'INTERNAL';

export class HandlerError extends Error {
  constructor(
    public readonly code: HandlerErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'HandlerError';
  }
}

// --- Row shape (mirrors notifications.notifications) -----------------

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

function rowToProto(row: NotificationRow): Notification {
  return {
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
  };
}

// --- Create ----------------------------------------------------------

const NOTIFICATIONS_CREATE: Permission = 'notifications.create' as Permission;
const NOTIFICATIONS_READ: Permission = 'notifications.read' as Permission;
const NOTIFICATIONS_UPDATE: Permission = 'notifications.update' as Permission;

// Subscriber-path idempotency. When set, the create claims (consumer,
// eventId) in processed_events inside the same transaction as the insert,
// so a redelivered upstream event is a no-op (returns `{ notification:
// undefined }`). Direct gRPC callers omit it and keep the original
// always-insert behaviour.
export type CreateNotificationOptions = {
  dedup?: { consumer: string; eventId: string };
};

export async function createNotification(
  deps: HandlerDeps,
  principal: Principal,
  req: CreateNotificationRequest,
  opts?: CreateNotificationOptions
): Promise<CreateNotificationResponse> {
  // Input validation — INVALID_ARGUMENT for caller bugs.
  if (!req.userId) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_id is required');
  }
  if (!req.title) {
    throw new HandlerError('INVALID_ARGUMENT', 'title is required');
  }
  if (!req.message) {
    throw new HandlerError('INVALID_ARGUMENT', 'message is required');
  }
  if (req.type === NotificationsV1.NotificationType.NOTIFICATION_TYPE_UNSPECIFIED) {
    throw new HandlerError('INVALID_ARGUMENT', 'type is required');
  }
  if (req.channel === NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_UNSPECIFIED) {
    throw new HandlerError('INVALID_ARGUMENT', 'channel is required');
  }

  // Permission gate. notifications.create is typically held by system
  // services (the application/pet/chat services that emit user-facing
  // events) plus admins.
  if (!hasPermission(principal, NOTIFICATIONS_CREATE)) {
    throw new HandlerError(
      'PERMISSION_DENIED',
      `'${NOTIFICATIONS_CREATE}' required to create notifications`
    );
  }

  const notificationId = randomUUID();
  const priority =
    req.priority === NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_UNSPECIFIED
      ? NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_NORMAL
      : req.priority;

  let inserted: NotificationRow | undefined;
  let skipped = false;

  await withTransaction(deps, async ({ client, publish }) => {
    // Idempotency claim FIRST — atomic with the insert below. A redelivered
    // event loses the ON CONFLICT race, so we skip the insert + publish and
    // the whole transaction is a no-op.
    if (opts?.dedup) {
      const claimed = await claimEvent(client, opts.dedup.consumer, opts.dedup.eventId);
      if (!claimed) {
        skipped = true;
        return;
      }
    }

    const result = await client.query<NotificationRow>(
      `
      INSERT INTO notifications.notifications (
        notification_id, user_id, type, channel, priority, status,
        title, message, data, template_id, template_variables,
        related_entity_type, related_entity_id,
        scheduled_for, expires_at, external_id,
        retry_count, max_retries, version,
        created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, 'pending',
        $6, $7, $8::jsonb, $9, $10::jsonb,
        $11, $12,
        $13, $14, $15,
        0, 3, 0,
        now(), now()
      )
      RETURNING *
      `,
      [
        notificationId,
        req.userId,
        typeToDb(req.type),
        channelToDb(req.channel),
        priorityToDb(priority),
        req.title,
        req.message,
        req.dataJson || '{}',
        req.templateId ?? null,
        req.templateVariablesJson || '{}',
        req.relatedEntityType !== undefined &&
        req.relatedEntityType !==
          NotificationsV1.NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_UNSPECIFIED
          ? relatedEntityTypeToDb(req.relatedEntityType)
          : null,
        req.relatedEntityId ?? null,
        req.scheduledFor ?? null,
        req.expiresAt ?? null,
        req.externalId ?? null,
      ]
    );
    inserted = result.rows[0];

    // CAD-#9-style event id — derived from the aggregate id so subscribers
    // dedupe naturally. Same shape every handler in this service will use.
    publish({
      type: 'notifications.created',
      id: `notifications.created.${notificationId}`,
      payload: {
        notificationId,
        userId: req.userId,
        type: typeToDb(req.type),
        channel: channelToDb(req.channel),
        // The push worker renders the device notification straight from
        // this payload — without title/message/dataJson every push went
        // out with the default title and an empty body.
        title: req.title,
        message: req.message,
        dataJson: req.dataJson || '{}',
      },
    });
  });

  // Redelivery — the event was already processed, so there is no new row.
  // Subscribers ignore the return value; this just makes the skip explicit.
  if (skipped) {
    return { notification: undefined };
  }

  // `inserted` is guaranteed populated by the RETURNING clause —
  // withTransaction would have thrown if the query failed.
  if (!inserted) {
    throw new HandlerError('INTERNAL', 'insert returned no rows');
  }
  return { notification: rowToProto(inserted) };
}

// --- List ------------------------------------------------------------

type ListCursor = { createdAt: string; notificationId: string };

const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;

export async function listNotifications(
  deps: HandlerDeps,
  principal: Principal,
  req: ListNotificationsRequest
): Promise<ListNotificationsResponse> {
  // Adopters need notifications.read AND scope to their own userId.
  // super_admin short-circuits both checks inside requirePermission.
  const allowed = requirePermission(principal, NOTIFICATIONS_READ, {
    userId: principal.userId,
  });
  if (!allowed) {
    throw new HandlerError('PERMISSION_DENIED', `'${NOTIFICATIONS_READ}' required (self-scoped)`);
  }

  const limit = clampLimit(req.limit);
  const cursor = req.cursor ? parseCursor(req.cursor) : undefined;

  // Build WHERE clause incrementally. user_id scope is always
  // enforced — even super_admin's List returns only its own
  // notifications (cross-user listing is a separate admin endpoint
  // that's not part of this RPC).
  const where: string[] = ['user_id = $1', 'deleted_at IS NULL'];
  const params: unknown[] = [principal.userId];
  let nextParam = 2;

  if (
    req.statusFilter !== undefined &&
    req.statusFilter !== NotificationsV1.NotificationStatus.NOTIFICATION_STATUS_UNSPECIFIED
  ) {
    where.push(`status = $${nextParam}`);
    params.push(statusToDb(req.statusFilter));
    nextParam++;
  }
  if (
    req.channelFilter !== undefined &&
    req.channelFilter !== NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_UNSPECIFIED
  ) {
    where.push(`channel = $${nextParam}`);
    params.push(channelToDb(req.channelFilter));
    nextParam++;
  }
  if (
    req.typeFilter !== undefined &&
    req.typeFilter !== NotificationsV1.NotificationType.NOTIFICATION_TYPE_UNSPECIFIED
  ) {
    where.push(`type = $${nextParam}`);
    params.push(typeToDb(req.typeFilter));
    nextParam++;
  }
  if (cursor) {
    // Keyset on (created_at DESC, notification_id DESC) — same shape
    // CAD audit query uses. Cursor is the last row of the previous
    // page; we want everything strictly older.
    where.push(`(created_at, notification_id) < ($${nextParam}, $${nextParam + 1})`);
    params.push(new Date(cursor.createdAt));
    params.push(cursor.notificationId);
    nextParam += 2;
  }

  // Fetch limit+1 so we know whether a next page exists without a
  // separate count query.
  const result = await deps.pool.query<NotificationRow>(
    `
    SELECT * FROM notifications.notifications
    WHERE ${where.join(' AND ')}
    ORDER BY created_at DESC, notification_id DESC
    LIMIT $${nextParam}
    `,
    [...params, limit + 1]
  );

  const hasMore = result.rows.length > limit;
  const page = hasMore ? result.rows.slice(0, limit) : result.rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({
          createdAt: last.created_at.toISOString(),
          notificationId: last.notification_id,
        })
      : undefined;

  return {
    notifications: page.map(rowToProto),
    nextCursor,
  };
}

function clampLimit(requested: number): number {
  if (requested === 0) {
    return DEFAULT_LIST_LIMIT;
  }
  if (requested > MAX_LIST_LIMIT) {
    throw new HandlerError('INVALID_ARGUMENT', `limit must be <= ${MAX_LIST_LIMIT}`);
  }
  return requested;
}

function parseCursor(raw: string): ListCursor {
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded) as ListCursor;
    if (!parsed.createdAt || !parsed.notificationId) {
      throw new Error('missing fields');
    }
    return parsed;
  } catch {
    throw new HandlerError('INVALID_ARGUMENT', 'cursor is malformed');
  }
}

function encodeCursor(cursor: ListCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64');
}

// --- Dismiss ---------------------------------------------------------

export async function dismissNotification(
  deps: HandlerDeps,
  principal: Principal,
  req: DismissNotificationRequest
): Promise<DismissNotificationResponse> {
  if (!req.notificationId) {
    throw new HandlerError('INVALID_ARGUMENT', 'notification_id is required');
  }

  // Fetch outside the transaction first so we can return NOT_FOUND
  // cleanly without holding a write lock. The ownership check below
  // runs against this SELECTed row; there is no TOCTOU window because
  // user_id is immutable, so the row the UPDATE targets by
  // notification_id still belongs to the same user.
  const existing = await deps.pool.query<NotificationRow>(
    `SELECT * FROM notifications.notifications WHERE notification_id = $1 AND deleted_at IS NULL`,
    [req.notificationId]
  );
  if (existing.rows.length === 0) {
    throw new HandlerError('NOT_FOUND', `notification ${req.notificationId} not found`);
  }
  const row = existing.rows[0];

  // Ownership scope — only the recipient (or super_admin) can dismiss.
  const allowed = requirePermission(principal, NOTIFICATIONS_UPDATE, {
    userId: row.user_id as UserId,
  });
  if (!allowed) {
    throw new HandlerError(
      'PERMISSION_DENIED',
      `'${NOTIFICATIONS_UPDATE}' required for this notification`
    );
  }

  // Idempotency — if it's already read, return as-is without a write
  // OR an event. Same payload either way.
  if (row.status === 'read') {
    return { notification: rowToProto(row) };
  }

  let updated: NotificationRow | undefined;
  await withTransaction(deps, async ({ client, publish }) => {
    const result = await client.query<NotificationRow>(
      `
      UPDATE notifications.notifications
      SET status = 'read', read_at = now(), updated_at = now(), version = version + 1
      WHERE notification_id = $1
      RETURNING *
      `,
      [req.notificationId]
    );
    updated = result.rows[0];

    publish({
      type: 'notifications.dismissed',
      id: `notifications.dismissed.${req.notificationId}`,
      payload: { notificationId: req.notificationId, userId: row.user_id },
    });
  });

  if (!updated) {
    throw new HandlerError('INTERNAL', 'update returned no rows');
  }
  return { notification: rowToProto(updated) };
}
