// REST → gRPC translation for /api/v1/notifications/*.
//
// Phase 1.6 cutover: this Fastify plugin registers BEFORE the
// strangler-fig http-proxy catch-all, so Fastify's first-registered-
// wins prefix routing picks it for /api/v1/notifications/* requests
// before the catch-all sees them. Every other /api/* path still hits
// the monolith.
//
// Dev-mode auth (same as Phase 1.5 WS): the gateway trusts client-
// supplied `x-user-id` / `x-user-roles` / `x-user-permissions` /
// `x-rescue-id` headers and forwards them as gRPC metadata. Phase 2
// plugs in service.auth.ValidateToken at this seam — the headers
// become server-set rather than client-trusted.
//
// gRPC status → HTTP status map mirrors what callers expect from the
// REST API the monolith used to serve. Body shape comes from
// ts-proto's toJSON helper.

import type { FastifyInstance } from 'fastify';

import {
  NotificationsV1,
  type CreateNotificationRequest,
  type DismissNotificationRequest,
  type ListNotificationsRequest,
  type UpdateNotificationPreferencesRequest,
} from '@adopt-dont-shop/proto';

import type { NotificationsClient } from '../grpc-clients/notifications-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { parsePagination } from '../middleware/pagination.js';

export type NotificationsRoutesOptions = {
  client: NotificationsClient;
};

export const registerNotificationsRoutes = async (
  app: FastifyInstance,
  opts: NotificationsRoutesOptions
): Promise<void> => {
  const { client } = opts;

  app.get('/api/v1/notifications', async (req, reply) => {
    const metadata = buildMetadata(req);
    const query = req.query as Record<string, string | undefined>;
    const pagination = parsePagination(query, { limit: 0 });
    if (!pagination.ok) {
      return reply.code(400).send({ error: pagination.error });
    }

    const grpcReq: ListNotificationsRequest = {
      cursor: query.cursor,
      // Default 0 → handler clamps to the canonical default. Same shape
      // service.notifications.handlers.listNotifications expects.
      limit: pagination.limit,
      statusFilter: parseStatus(query.status),
      channelFilter: parseChannel(query.channel),
      typeFilter: parseType(query.type),
    };

    try {
      const res = await client.list(grpcReq, metadata);
      return reply.send(NotificationsV1.ListNotificationsResponse.toJSON(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  app.post('/api/v1/notifications', async (req, reply) => {
    const metadata = buildMetadata(req);
    const body = (req.body ?? {}) as Partial<CreateNotificationRequest>;

    // We accept the JSON shape that mirrors the proto fields directly.
    // fromJSON would also work, but proto3 oneof JSON encoding rules
    // change the structure; keeping a direct map is more predictable
    // for the small set of fields the gateway needs to accept.
    const grpcReq: CreateNotificationRequest = {
      userId: body.userId ?? '',
      type: body.type ?? NotificationsV1.NotificationType.NOTIFICATION_TYPE_UNSPECIFIED,
      channel: body.channel ?? NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_UNSPECIFIED,
      priority:
        body.priority ?? NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_UNSPECIFIED,
      title: body.title ?? '',
      message: body.message ?? '',
      dataJson: body.dataJson ?? '{}',
      templateId: body.templateId,
      templateVariablesJson: body.templateVariablesJson ?? '{}',
      relatedEntityType: body.relatedEntityType,
      relatedEntityId: body.relatedEntityId,
      scheduledFor: body.scheduledFor,
      expiresAt: body.expiresAt,
      externalId: body.externalId,
    };

    try {
      const res = await client.create(grpcReq, metadata);
      return reply.code(201).send(NotificationsV1.CreateNotificationResponse.toJSON(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // Unread count — must register before /:id so the static segment wins.
  app.get('/api/v1/notifications/unread/count', async (req, reply) => {
    const metadata = buildMetadata(req);
    try {
      const res = await client.getUnreadCount({}, metadata);
      return reply.send({ success: true, data: { count: res.count } });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // Admin cleanup — soft-delete notifications older than N days.
  app.post('/api/v1/notifications/cleanup', async (req, reply) => {
    const metadata = buildMetadata(req);
    const body = (req.body ?? {}) as { daysToKeep?: number; days_to_keep?: number };
    const daysToKeep = body.daysToKeep ?? body.days_to_keep ?? 0;
    try {
      const res = await client.cleanupExpiredNotifications({ daysToKeep }, metadata);
      return reply.send({
        success: true,
        message: `Cleaned up ${res.deletedCount} expired notifications`,
        data: { deletedCount: res.deletedCount },
      });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // Mark all unread as read.
  app.post('/api/v1/notifications/read-all', async (req, reply) => {
    const metadata = buildMetadata(req);
    try {
      const res = await client.markAllRead({}, metadata);
      return reply.send({
        success: true,
        message: `Marked ${res.affectedCount} notifications as read`,
        data: { affectedCount: res.affectedCount },
      });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // In-app notification preferences (user_notification_prefs).
  app.get('/api/v1/notifications/preferences', async (req, reply) => {
    const metadata = buildMetadata(req);
    try {
      const res = await client.getNotificationPreferences({}, metadata);
      return reply.send({
        success: true,
        data: NotificationsV1.NotificationPreferences.toJSON(res.preferences!),
      });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  app.put('/api/v1/notifications/preferences', async (req, reply) => {
    const metadata = buildMetadata(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const grpcReq: UpdateNotificationPreferencesRequest = buildPrefsPatch(body);

    try {
      const res = await client.updateNotificationPreferences(grpcReq, metadata);
      return reply.send({
        success: true,
        message: 'Notification preferences updated successfully',
        data: NotificationsV1.NotificationPreferences.toJSON(res.preferences!),
      });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // Single notification fetch.
  app.get<{ Params: { id: string } }>('/api/v1/notifications/:id', async (req, reply) => {
    const metadata = buildMetadata(req);
    try {
      const res = await client.getNotification({ notificationId: req.params.id }, metadata);
      return reply.send({
        success: true,
        data: NotificationsV1.Notification.toJSON(res.notification!),
      });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // Mark single notification as read — matches the monolith path
  // /api/v1/notifications/:notificationId/read.
  app.patch<{ Params: { id: string } }>('/api/v1/notifications/:id/read', async (req, reply) => {
    const metadata = buildMetadata(req);
    try {
      await client.dismiss({ notificationId: req.params.id }, metadata);
      return reply.send({
        success: true,
        message: 'Notification marked as read',
      });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  app.delete<{ Params: { id: string } }>('/api/v1/notifications/:id', async (req, reply) => {
    const metadata = buildMetadata(req);
    const grpcReq: DismissNotificationRequest = { notificationId: req.params.id };

    try {
      // The monolith DELETE soft-deletes via deleted_at. We call the
      // dedicated deleteNotification RPC (status untouched) for parity —
      // the old proto contract used Dismiss(status='read') under DELETE,
      // which would have lost the distinction between read-but-kept and
      // deleted. Preserve the monolith semantics here.
      const res = await client.deleteNotification(grpcReq, metadata);
      return reply.send({
        success: true,
        message: 'Notification deleted successfully',
        data: NotificationsV1.Notification.toJSON(res.notification!),
      });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });
};

// --- Body parsing for prefs PUT --------------------------------------

// Monolith body keys → proto field names. Only fields actually present
// in the body are forwarded; the handler's set_* discipline (proto3
// optional) then governs which columns get written.
function buildPrefsPatch(body: Record<string, unknown>): UpdateNotificationPreferencesRequest {
  const out: UpdateNotificationPreferencesRequest = {
    digestFrequency:
      NotificationsV1.NotificationDigestFrequency.NOTIFICATION_DIGEST_FREQUENCY_UNSPECIFIED,
  };
  // Monolith uses bare field names (email, push, sms, applications,
  // messages, quietHoursStart, quietHoursEnd, timezone) for back-compat.
  // We also accept the proto-aligned camelCase (emailEnabled, …) so the
  // gateway is the only translation layer.
  if (typeof body.email === 'boolean') {
    out.emailEnabled = body.email;
  }
  if (typeof body.emailEnabled === 'boolean') {
    out.emailEnabled = body.emailEnabled;
  }
  if (typeof body.push === 'boolean') {
    out.pushEnabled = body.push;
  }
  if (typeof body.pushEnabled === 'boolean') {
    out.pushEnabled = body.pushEnabled;
  }
  if (typeof body.sms === 'boolean') {
    out.smsEnabled = body.sms;
  }
  if (typeof body.smsEnabled === 'boolean') {
    out.smsEnabled = body.smsEnabled;
  }
  if (typeof body.applications === 'boolean') {
    out.applicationUpdates = body.applications;
  }
  if (typeof body.applicationUpdates === 'boolean') {
    out.applicationUpdates = body.applicationUpdates;
  }
  if (typeof body.messages === 'boolean') {
    out.chatMessages = body.messages;
  }
  if (typeof body.chatMessages === 'boolean') {
    out.chatMessages = body.chatMessages;
  }
  if (typeof body.petMatches === 'boolean') {
    out.petMatches = body.petMatches;
  }
  if (typeof body.rescueUpdates === 'boolean') {
    out.rescueUpdates = body.rescueUpdates;
  }
  if (typeof body.quietHoursStart === 'string') {
    out.quietHoursStart = body.quietHoursStart;
  }
  if (typeof body.quietHoursEnd === 'string') {
    out.quietHoursEnd = body.quietHoursEnd;
  }
  if (typeof body.timezone === 'string') {
    out.timezone = body.timezone;
  }
  if (typeof body.digestFrequency === 'string') {
    const upper = `NOTIFICATION_DIGEST_FREQUENCY_${body.digestFrequency.toUpperCase()}`;
    const parsed = NotificationsV1.notificationDigestFrequencyFromJSON(
      Object.values(NotificationsV1.NotificationDigestFrequency).includes(upper as never)
        ? upper
        : body.digestFrequency
    );
    if (parsed !== NotificationsV1.NotificationDigestFrequency.UNRECOGNIZED) {
      out.digestFrequency = parsed;
    }
  }
  return out;
}

// --- Helpers ---------------------------------------------------------

function parseStatus(raw: string | undefined): NotificationsV1.NotificationStatus {
  if (!raw) {
    return NotificationsV1.NotificationStatus.NOTIFICATION_STATUS_UNSPECIFIED;
  }
  // The route accepts SCREAMING_SNAKE proto names ('NOTIFICATION_STATUS_PENDING')
  // OR the Postgres lowercase ('pending') for convenience. fromJSON on
  // proto enums handles the SCREAMING form; we coerce lowercase first.
  const upper = `NOTIFICATION_STATUS_${raw.toUpperCase()}`;
  const out = NotificationsV1.notificationStatusFromJSON(
    Object.values(NotificationsV1.NotificationStatus).includes(upper as never) ? upper : raw
  );
  return out === NotificationsV1.NotificationStatus.UNRECOGNIZED
    ? NotificationsV1.NotificationStatus.NOTIFICATION_STATUS_UNSPECIFIED
    : out;
}

function parseChannel(raw: string | undefined): NotificationsV1.NotificationChannel {
  if (!raw) {
    return NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_UNSPECIFIED;
  }
  const upper = `NOTIFICATION_CHANNEL_${raw.toUpperCase()}`;
  const out = NotificationsV1.notificationChannelFromJSON(
    Object.values(NotificationsV1.NotificationChannel).includes(upper as never) ? upper : raw
  );
  return out === NotificationsV1.NotificationChannel.UNRECOGNIZED
    ? NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_UNSPECIFIED
    : out;
}

// Exported for reuse by the broadcast route, which accepts the same
// REST string forms for `type`.
export function parseType(raw: string | undefined): NotificationsV1.NotificationType {
  if (!raw) {
    return NotificationsV1.NotificationType.NOTIFICATION_TYPE_UNSPECIFIED;
  }
  const upper = `NOTIFICATION_TYPE_${raw.toUpperCase()}`;
  const out = NotificationsV1.notificationTypeFromJSON(
    Object.values(NotificationsV1.NotificationType).includes(upper as never) ? upper : raw
  );
  return out === NotificationsV1.NotificationType.UNRECOGNIZED
    ? NotificationsV1.NotificationType.NOTIFICATION_TYPE_UNSPECIFIED
    : out;
}
