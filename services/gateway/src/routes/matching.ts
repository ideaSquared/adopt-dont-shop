// REST → gRPC translation for /api/v1/matching/*.
//
// Phase 9.5 cutover. Same shape as routes/audit.ts (#917) /
// routes/rescue.ts / routes/auth.ts — Fastify plugin registers
// BEFORE the strangler-fig http-proxy catch-all, so first-
// registered-wins prefix routing picks it for /api/v1/matching/*
// before the catch-all sees them.
//
// Route map:
//
//   POST /api/v1/matching/sessions                        → StartSession
//   POST /api/v1/matching/sessions/:id/end                → EndSession
//   POST /api/v1/matching/sessions/:id/swipes             → RecordSwipe
//   GET  /api/v1/matching/swipes                          → ListSwipeHistory
//
// Recommend + SearchPets aren't wired yet — the matching gRPC server
// returns UNIMPLEMENTED for them (#922 stubs). When those handlers
// ship the gateway will gain `/api/v1/matching/recommend` +
// `/api/v1/matching/search` routes.
//
// Authz: PETS_VIEW (matching is a pet-browsing surface). The Phase
// 2.5 authenticate middleware stamps x-user-* metadata; the matching
// handlers re-check the permission as defence-in-depth.

import rateLimit from '@fastify/rate-limit';
import { Metadata, status } from '@grpc/grpc-js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  MatchingV1,
  type EndSessionRequest,
  type ListSwipeHistoryRequest,
  type RecordSwipeRequest,
  type StartSessionRequest,
} from '@adopt-dont-shop/proto';

import type { MatchingClient } from '../grpc-clients/matching-client.js';

export type MatchingRoutesOptions = {
  client: MatchingClient;
};

// Adds UNIMPLEMENTED → 501 for the Recommend / SearchPets stubs.
const GRPC_TO_HTTP: Record<number, number> = {
  [status.OK]: 200,
  [status.INVALID_ARGUMENT]: 400,
  [status.UNAUTHENTICATED]: 401,
  [status.PERMISSION_DENIED]: 403,
  [status.NOT_FOUND]: 404,
  [status.UNIMPLEMENTED]: 501,
  [status.INTERNAL]: 500,
};

// Per-route rate limits. Swipes are the chatty path so they get a
// higher ceiling; sessions are bookended (~2 per browsing session)
// so the lower ceiling is fine. History is a paginated read.
const MATCHING_RATE_LIMITS = {
  startSession: { max: 30, timeWindow: '1 minute' },
  endSession: { max: 30, timeWindow: '1 minute' },
  recordSwipe: { max: 240, timeWindow: '1 minute' },
  listSwipeHistory: { max: 60, timeWindow: '1 minute' },
} as const;

type StartSessionBody = {
  filtersJson?: string;
  deviceType?: string;
  userAgent?: string;
  ipAddress?: string;
};

type RecordSwipeBody = {
  petId?: string;
  action?: string;
  responseTime?: number;
  deviceType?: string;
};

export const registerMatchingRoutes = async (
  app: FastifyInstance,
  opts: MatchingRoutesOptions
): Promise<void> => {
  const { client } = opts;

  await app.register(rateLimit, { global: false });

  app.post(
    '/api/v1/matching/sessions',
    { config: { rateLimit: MATCHING_RATE_LIMITS.startSession } },
    async (req, reply) => {
      const body = (req.body ?? {}) as StartSessionBody;
      const grpcReq: StartSessionRequest = {
        filtersJson: body.filtersJson ?? '',
        deviceType: parseDeviceType(body.deviceType),
        userAgent: body.userAgent,
        ipAddress: body.ipAddress,
      };
      try {
        const res = await client.startSession(grpcReq, buildMetadata(req));
        return reply
          .code(res.created ? 201 : 200)
          .send(MatchingV1.StartSessionResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/matching/sessions/:id/end',
    { config: { rateLimit: MATCHING_RATE_LIMITS.endSession } },
    async (req, reply) => {
      const grpcReq: EndSessionRequest = { sessionId: req.params.id };
      try {
        const res = await client.endSession(grpcReq, buildMetadata(req));
        return reply.send(MatchingV1.EndSessionResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/matching/sessions/:id/swipes',
    { config: { rateLimit: MATCHING_RATE_LIMITS.recordSwipe } },
    async (req, reply) => {
      const body = (req.body ?? {}) as RecordSwipeBody;
      const grpcReq: RecordSwipeRequest = {
        sessionId: req.params.id,
        petId: body.petId ?? '',
        action: parseSwipeAction(body.action),
        responseTime: body.responseTime,
        deviceType: body.deviceType,
      };
      try {
        const res = await client.recordSwipe(grpcReq, buildMetadata(req));
        return reply.code(201).send(MatchingV1.RecordSwipeResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.get(
    '/api/v1/matching/swipes',
    { config: { rateLimit: MATCHING_RATE_LIMITS.listSwipeHistory } },
    async (req, reply) => {
      const query = req.query as Record<string, string | undefined>;
      const grpcReq: ListSwipeHistoryRequest = {
        cursor: query.cursor,
        limit: query.limit ? Number.parseInt(query.limit, 10) : 0,
        actionFilter: parseSwipeAction(query.action),
      };
      try {
        const res = await client.listSwipeHistory(grpcReq, buildMetadata(req));
        return reply.send(MatchingV1.ListSwipeHistoryResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
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

// parseSwipeAction accepts DB form ('like' / 'pass' / 'super_like'
// / 'info') AND SCREAMING proto form ('SWIPE_ACTION_LIKE'). Unknown
// coerces to UNSPECIFIED so the matching service's INVALID_ARGUMENT
// guard produces a clean 400.
function parseSwipeAction(raw: string | undefined): MatchingV1.SwipeAction {
  if (!raw) {
    return MatchingV1.SwipeAction.SWIPE_ACTION_UNSPECIFIED;
  }
  const upper = `SWIPE_ACTION_${raw.toUpperCase()}`;
  const candidate = Object.values(MatchingV1.SwipeAction).includes(upper as never) ? upper : raw;
  const out = MatchingV1.swipeActionFromJSON(candidate);
  return out === MatchingV1.SwipeAction.UNRECOGNIZED
    ? MatchingV1.SwipeAction.SWIPE_ACTION_UNSPECIFIED
    : out;
}

// Same shape for the device type enum.
function parseDeviceType(raw: string | undefined): MatchingV1.DeviceType {
  if (!raw) {
    return MatchingV1.DeviceType.DEVICE_TYPE_UNSPECIFIED;
  }
  const upper = `DEVICE_TYPE_${raw.toUpperCase()}`;
  const candidate = Object.values(MatchingV1.DeviceType).includes(upper as never) ? upper : raw;
  const out = MatchingV1.deviceTypeFromJSON(candidate);
  return out === MatchingV1.DeviceType.UNRECOGNIZED
    ? MatchingV1.DeviceType.DEVICE_TYPE_UNSPECIFIED
    : out;
}
