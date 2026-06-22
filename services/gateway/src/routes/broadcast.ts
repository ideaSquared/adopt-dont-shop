// POST /api/v1/notifications/broadcast — admin fan-out across a cohort.
// GET /api/v1/notifications/broadcast/preview — cohort size for a named
// audience, with no writes (BroadcastRequest.dryRun).
//
// Thin REST → gRPC translation: parse the JSON body into BroadcastRequest,
// forward principal metadata, return the aggregate counters.
//
// The admin SPA's audience picker (apps/admin/src/pages/BroadcastNotifications.tsx)
// sends a named `audience` string rather than a raw cohort filter, and a
// `body` field rather than `message`. AUDIENCE_COHORT maps the named
// audiences onto the same BroadcastCohort shape the explicit `cohort`
// object uses, so both forms are accepted side by side.

import type { FastifyInstance } from 'fastify';

import {
  NotificationsV1,
  type BroadcastCohort,
  type BroadcastRequest,
} from '@adopt-dont-shop/proto';

import type { NotificationsClient } from '../grpc-clients/notifications-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { parseType } from './notifications.js';

export type BroadcastRoutesOptions = {
  client: NotificationsClient;
};

const AUDIENCE_COHORT: Record<string, BroadcastCohort> = {
  all: { userTypes: [], statuses: [] },
  'all-rescues': { userTypes: ['rescue_staff'], statuses: [] },
  'all-adopters': { userTypes: ['adopter'], statuses: [] },
  'all-staff': { userTypes: ['admin', 'moderator', 'super_admin', 'support_agent'], statuses: [] },
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
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const cohort = resolveCohort(body);

      const grpcReq: BroadcastRequest = {
        cohort,
        type: parseBodyType(body.type),
        title: typeof body.title === 'string' ? body.title : '',
        message:
          typeof body.message === 'string'
            ? body.message
            : typeof body.body === 'string'
              ? body.body
              : '',
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
        dryRun: false,
      };

      try {
        const res = await client.broadcast(grpcReq, buildMetadata(req));
        return reply.send({
          success: true,
          targeted: res.targeted,
          delivered: res.delivered,
          suppressed: res.suppressed,
          failed: res.failed,
          data: {
            audience: typeof body.audience === 'string' ? body.audience : undefined,
            targetCount: res.targeted,
            deliveredInApp: res.delivered,
            // Channel-preference suppression isn't tracked separately from
            // the DND window yet — see broadcast-handlers.ts's quiet-hours
            // check, the only suppression source today.
            skippedByPrefs: 0,
            skippedByDnd: res.suppressed,
            channels: Array.isArray(body.channels) ? body.channels : [],
          },
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.get(
    '/api/v1/notifications/broadcast/preview',
    {
      schema: {
        tags: ['notifications', 'admin'],
        summary: 'Preview the recipient count for a named broadcast audience',
      },
    },
    async (req, reply) => {
      const query = (req.query ?? {}) as Record<string, unknown>;
      const audience = typeof query.audience === 'string' ? query.audience : '';
      const cohort = AUDIENCE_COHORT[audience];
      if (!cohort) {
        return reply.code(400).send({ success: false, error: 'unknown audience' });
      }

      const grpcReq: BroadcastRequest = {
        cohort,
        type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_UNSPECIFIED,
        title: '',
        message: '',
        dryRun: true,
      };

      try {
        const res = await client.broadcast(grpcReq, buildMetadata(req));
        return reply.send({ success: true, data: { audience, count: res.targeted } });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};

// Explicit `cohort` (the gateway's original contract) wins when present;
// otherwise a named `audience` string is mapped onto the matching
// BroadcastCohort.
function resolveCohort(body: Record<string, unknown>): BroadcastCohort {
  const cohort = body.cohort as Record<string, unknown> | undefined;
  if (cohort && typeof cohort === 'object') {
    return {
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
    };
  }
  const audience = typeof body.audience === 'string' ? body.audience : undefined;
  return (audience && AUDIENCE_COHORT[audience]) || { userTypes: [], statuses: [] };
}

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
