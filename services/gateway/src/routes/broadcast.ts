// POST /api/v1/notifications/broadcast — admin fan-out across a cohort.
//
// Thin REST → gRPC translation: parse the JSON body into BroadcastRequest,
// forward principal metadata, return the aggregate counters.

import type { FastifyInstance } from 'fastify';

import { NotificationsV1, type BroadcastRequest } from '@adopt-dont-shop/proto';

import type { NotificationsClient } from '../grpc-clients/notifications-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { parseType } from './notifications.js';

export type BroadcastRoutesOptions = {
  client: NotificationsClient;
};

export const registerBroadcastRoutes = async (
  app: FastifyInstance,
  opts: BroadcastRoutesOptions
): Promise<void> => {
  const { client } = opts;

  app.post(
    '/api/v1/notifications/broadcast',
    {
      schema: {
        tags: ['notifications', 'admin'],
        summary: 'Broadcast a notification to a cohort of users',
        body: {
          type: 'object',
          properties: {
            cohort: { type: 'object' },
            type: {},
            title: { type: 'string' },
            message: { type: 'string' },
            actionUrl: { type: 'string' },
            action_url: { type: 'string' },
            data: { type: 'object' },
            dataJson: { type: 'string' },
            scheduledFor: { type: 'string' },
            scheduled_for: { type: 'string' },
          },
          additionalProperties: true,
        },
      },
    },
    async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const cohort = (body.cohort ?? {}) as Record<string, unknown>;

    const grpcReq: BroadcastRequest = {
      cohort: {
        userTypes: Array.isArray(cohort.userTypes)
          ? (cohort.userTypes as string[])
          : Array.isArray(cohort.user_types)
            ? (cohort.user_types as string[])
            : [],
        statuses: Array.isArray(cohort.statuses) ? (cohort.statuses as string[]) : [],
        emailVerified:
          typeof cohort.emailVerified === 'boolean'
            ? cohort.emailVerified
            : typeof cohort.email_verified === 'boolean'
              ? cohort.email_verified
              : undefined,
      },
      type: parseBodyType(body.type),
      title: typeof body.title === 'string' ? body.title : '',
      message: typeof body.message === 'string' ? body.message : '',
      actionUrl:
        typeof body.actionUrl === 'string'
          ? body.actionUrl
          : typeof body.action_url === 'string'
            ? body.action_url
            : undefined,
      dataJson:
        typeof body.data === 'object' && body.data !== null
          ? JSON.stringify(body.data)
          : typeof body.dataJson === 'string'
            ? body.dataJson
            : undefined,
      scheduledFor:
        typeof body.scheduledFor === 'string'
          ? body.scheduledFor
          : typeof body.scheduled_for === 'string'
            ? body.scheduled_for
            : undefined,
    };

    try {
      const res = await client.broadcast(grpcReq, buildMetadata(req));
      return reply.send({
        success: true,
        targeted: res.targeted,
        delivered: res.delivered,
        suppressed: res.suppressed,
        failed: res.failed,
      });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });
};

// body.type arrives either as the REST string form ('pet_available') or a
// numeric proto enum value. Missing / unknown values stay UNSPECIFIED so
// the downstream handler's default (system_announcement) is unchanged.
function parseBodyType(raw: unknown): NotificationsV1.NotificationType {
  if (typeof raw === 'number') {
    const out = NotificationsV1.notificationTypeFromJSON(raw);
    return out === NotificationsV1.NotificationType.UNRECOGNIZED
      ? NotificationsV1.NotificationType.NOTIFICATION_TYPE_UNSPECIFIED
      : out;
  }
  if (typeof raw === 'string') {
    return parseType(raw);
  }
  return NotificationsV1.NotificationType.NOTIFICATION_TYPE_UNSPECIFIED;
}
