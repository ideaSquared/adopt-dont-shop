// REST → gRPC translation for /api/notifications/*.
//
// Phase 1.6 cutover: this Fastify plugin registers BEFORE the
// strangler-fig http-proxy catch-all, so Fastify's first-registered-
// wins prefix routing picks it for /api/notifications/* requests
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

import { Metadata, status } from '@grpc/grpc-js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  NotificationsV1,
  type CreateNotificationRequest,
  type DismissNotificationRequest,
  type ListNotificationsRequest,
} from '@adopt-dont-shop/proto';

import type { NotificationsClient } from '../grpc-clients/notifications-client.js';

export type NotificationsRoutesOptions = {
  client: NotificationsClient;
};

// Inverse of services/notifications/src/grpc/adapter.ts CODE_TO_GRPC.
// Anything we don't recognise — including null/undefined — falls
// through to 500 so an unmapped code never returns 200.
const GRPC_TO_HTTP: Record<number, number> = {
  [status.OK]: 200,
  [status.INVALID_ARGUMENT]: 400,
  [status.UNAUTHENTICATED]: 401,
  [status.PERMISSION_DENIED]: 403,
  [status.NOT_FOUND]: 404,
  [status.INTERNAL]: 500,
};

export const registerNotificationsRoutes = async (
  app: FastifyInstance,
  opts: NotificationsRoutesOptions
): Promise<void> => {
  const { client } = opts;

  app.get('/api/notifications', async (req, reply) => {
    const metadata = buildMetadata(req);
    const query = req.query as Record<string, string | undefined>;

    const grpcReq: ListNotificationsRequest = {
      cursor: query.cursor,
      // Default 0 → handler clamps to the canonical default. Same shape
      // service.notifications.handlers.listNotifications expects.
      limit: query.limit ? Number.parseInt(query.limit, 10) : 0,
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

  app.post('/api/notifications', async (req, reply) => {
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

  app.delete<{ Params: { id: string } }>('/api/notifications/:id', async (req, reply) => {
    const metadata = buildMetadata(req);
    const grpcReq: DismissNotificationRequest = { notificationId: req.params.id };

    try {
      const res = await client.dismiss(grpcReq, metadata);
      return reply.send(NotificationsV1.DismissNotificationResponse.toJSON(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });
};

// --- Helpers ---------------------------------------------------------

function buildMetadata(req: FastifyRequest): Metadata {
  const m = new Metadata();
  const headers = req.headers as Record<string, string | string[] | undefined>;
  for (const key of ['x-user-id', 'x-user-roles', 'x-user-permissions', 'x-rescue-id']) {
    const raw = headers[key];
    if (typeof raw === 'string' && raw.length > 0) {
      m.set(key, raw);
    }
  }
  return m;
}

type GrpcError = { code?: number; details?: string; message?: string };

function handleGrpcError(err: unknown, reply: FastifyReply): FastifyReply {
  const grpcErr = err as GrpcError;
  const httpStatus = (grpcErr?.code !== undefined && GRPC_TO_HTTP[grpcErr.code]) || 500;
  return reply.code(httpStatus).send({
    error: grpcErr?.details ?? grpcErr?.message ?? 'internal_error',
  });
}

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

function parseType(raw: string | undefined): NotificationsV1.NotificationType {
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
