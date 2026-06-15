// POST /api/v1/users/me/erasure-request — mint a correlationId and
// publish gdpr.erasureRequested on NATS. Each service that owns user-
// keyed data picks it up via @adopt-dont-shop/events.registerGdprSubscriber
// and acks with gdpr.erasureCompleted.
//
// GET /api/v1/users/me/erasure-request/:correlationId — read saga
// status from service.audit (which aggregates request + completions).
//
// The gateway holds no persistent state for the saga. Redis is used
// for a short-lived (24 h) idempotency key so repeat POSTs from the
// same user return the original correlationId rather than triggering
// a duplicate saga across all 9 consumer services.

import { randomUUID } from 'node:crypto';

import { GDPR_ERASURE_REQUESTED, type GdprErasureRequestedPayload } from '@adopt-dont-shop/events';
import type { NatsConnection } from 'nats';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import type { AuditClient } from '../grpc-clients/audit-client.js';
import type { AuthClient } from '../grpc-clients/auth-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';

// Minimal Redis interface — only the operations the route needs.
// Satisfied by ioredis.Redis and the test doubles alike.
export type ErasureStore = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, mode: 'EX', ttl: number) => Promise<unknown>;
};

export type GdprRoutesOptions = {
  nats: NatsConnection;
  // Optional — when wired, the GET status endpoint is registered.
  auditClient?: AuditClient;
  // When wired, the erasure event carries the user's email (resolved from
  // auth) so consumers can erase email-keyed rows that have no user_id —
  // e.g. rescue pending invitations. Best-effort: a failed lookup still
  // publishes the userId-only event rather than blocking erasure.
  authClient?: AuthClient;
  // When wired, used for per-user idempotency: a second POST within
  // ERASURE_IDEMPOTENCY_TTL_SECONDS returns the original correlationId.
  redis?: ErasureStore;
};

const ERASURE_IDEMPOTENCY_KEY = (userId: string) => `gdpr:erasure:${userId}`;
const ERASURE_IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

// Per-route rate-limit: 5 requests per hour per authenticated user.
// Keyed on userId (not IP) so corporate NAT doesn't penalise shared
// addresses. Falls back to req.ip for unauthenticated callers (who
// receive 401 from the handler anyway).
const ERASURE_RATE_LIMIT = {
  max: 5,
  timeWindow: '1 hour',
  keyGenerator: (req: FastifyRequest) => {
    const headers = req.headers as Record<string, string | string[] | undefined>;
    const userId = headers['x-user-id'];
    return typeof userId === 'string' && userId.length > 0 ? `gdpr-erasure:${userId}` : req.ip;
  },
};

export const registerGdprRoutes = async (
  app: FastifyInstance,
  opts: GdprRoutesOptions
): Promise<void> => {
  const { nats, auditClient, authClient, redis } = opts;

  app.post(
    '/api/v1/users/me/erasure-request',
    { config: { rateLimit: ERASURE_RATE_LIMIT } },
    async (req, reply) => {
      const userId = principalUserId(req);
      if (!userId) {
        return reply.code(401).send({ success: false, error: 'unauthenticated' });
      }
      const body = (req.body ?? {}) as Record<string, unknown>;
      const reason = typeof body.reason === 'string' ? body.reason : undefined;

      // Idempotency: if an open erasure saga exists for this user, return
      // the original correlationId so the client can poll status without
      // triggering a duplicate saga across all consumer services.
      if (redis) {
        const cached = await redis.get(ERASURE_IDEMPOTENCY_KEY(userId));
        if (cached) {
          try {
            const stored = JSON.parse(cached) as { correlationId: string; requestedAt: string };
            return reply.code(202).send({
              success: true,
              correlationId: stored.correlationId,
              requestedAt: stored.requestedAt,
            });
          } catch {
            // Corrupt cache entry — fall through and mint a fresh one.
          }
        }
      }

      // Resolve the user's email so consumers can erase email-keyed rows
      // that carry no user_id (e.g. rescue pending invitations). Best-
      // effort: a failed lookup must not block the erasure saga, so we
      // fall through to a userId-only event.
      const email = authClient ? await resolveEmail(authClient, req) : undefined;

      const correlationId = randomUUID();
      const requestedAt = new Date().toISOString();
      const payload: GdprErasureRequestedPayload = {
        userId,
        email,
        correlationId,
        requestedAt,
        reason,
      };
      const envelope = {
        id: correlationId,
        occurredAt: requestedAt,
        payload,
      };

      // Publish through JetStream so the erasure request is durably stored in
      // the stream BEFORE we 202. Any service that owns user data — even one
      // mid-deploy right now — receives it on reconnect via its durable
      // consumer. This is the compliance-critical guarantee: the request can't
      // be lost to a subscriber being briefly down.
      try {
        await nats
          .jetstream()
          .publish(GDPR_ERASURE_REQUESTED, new TextEncoder().encode(JSON.stringify(envelope)), {
            msgID: correlationId,
          });
      } catch {
        return reply.code(503).send({ success: false, error: 'service_unavailable' });
      }

      if (redis) {
        await redis.set(
          ERASURE_IDEMPOTENCY_KEY(userId),
          JSON.stringify({ correlationId, requestedAt }),
          'EX',
          ERASURE_IDEMPOTENCY_TTL_SECONDS
        );
      }

      // 202 — the request is accepted, but actual erasure happens
      // asynchronously across the services. The client polls the status
      // endpoint to confirm.
      return reply.code(202).send({
        success: true,
        correlationId,
        requestedAt,
      });
    }
  );

  // GET /api/v1/users/me/erasure-request/:correlationId — read saga
  // status. The audit handler gates on self-ownership OR admin.gdpr.read,
  // so this endpoint is safe for both the requesting user and an admin.
  if (auditClient) {
    app.get<{ Params: { correlationId: string } }>(
      '/api/v1/users/me/erasure-request/:correlationId',
      async (req, reply) => {
        try {
          const res = await auditClient.getGdprErasureRequest(
            { correlationId: req.params.correlationId },
            buildMetadata(req)
          );
          if (!res.request) {
            return reply.code(404).send({ success: false, error: 'not found' });
          }
          let completions: Record<string, unknown> = {};
          try {
            completions = JSON.parse(res.request.completionsJson) as Record<string, unknown>;
          } catch {
            // Leave as empty object; the SPA can still display the
            // request state without per-service detail.
          }
          return reply.send({
            success: true,
            data: {
              correlationId: res.request.correlationId,
              userId: res.request.userId,
              reason: res.request.reason,
              requestedAt: res.request.requestedAt,
              completions,
              completedAt: res.request.completedAt,
            },
          });
        } catch (err) {
          return handleGrpcError(err, reply);
        }
      }
    );
  }
};

function principalUserId(req: FastifyRequest): string | null {
  const headers = req.headers as Record<string, string | string[] | undefined>;
  const raw = headers['x-user-id'];
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

// Resolve the requesting user's email via auth.GetMe (identified by the
// x-user-id metadata buildMetadata forwards). Returns undefined on any
// failure or missing email — erasure must proceed regardless.
async function resolveEmail(
  authClient: AuthClient,
  req: FastifyRequest
): Promise<string | undefined> {
  try {
    const res = await authClient.getMe({}, buildMetadata(req));
    const email = res.user?.email;
    return typeof email === 'string' && email.length > 0 ? email : undefined;
  } catch {
    return undefined;
  }
}
