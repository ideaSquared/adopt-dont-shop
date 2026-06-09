// POST /api/v1/notifications/broadcast — admin fan-out across a cohort.
//
// Thin REST → gRPC translation: parse the JSON body into BroadcastRequest,
// forward principal metadata, return the aggregate counters.

import { Metadata, status } from '@grpc/grpc-js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type { BroadcastRequest } from '@adopt-dont-shop/proto';

import type { NotificationsClient } from '../grpc-clients/notifications-client.js';

export type BroadcastRoutesOptions = {
  client: NotificationsClient;
};

const GRPC_TO_HTTP: Record<number, number> = {
  [status.OK]: 200,
  [status.INVALID_ARGUMENT]: 400,
  [status.UNAUTHENTICATED]: 401,
  [status.PERMISSION_DENIED]: 403,
  [status.NOT_FOUND]: 404,
  [status.INTERNAL]: 500,
};

export const registerBroadcastRoutes = async (
  app: FastifyInstance,
  opts: BroadcastRoutesOptions
): Promise<void> => {
  const { client } = opts;

  app.post('/api/v1/notifications/broadcast', async (req, reply) => {
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
      type: 0,
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
    success: false,
    error: grpcErr?.details ?? grpcErr?.message ?? 'internal_error',
  });
}
