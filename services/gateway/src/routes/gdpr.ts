// POST /api/v1/users/me/erasure-request — mint a correlationId and
// publish gdpr.erasureRequested on NATS. Each service that owns user-
// keyed data picks it up via @adopt-dont-shop/events.registerGdprSubscriber
// and acks with gdpr.erasureCompleted.
//
// GET /api/v1/users/me/erasure-request/:correlationId — read saga
// status from service.audit (which aggregates request + completions).
//
// The gateway holds no state for the saga.

import { randomUUID } from 'node:crypto';

import { GDPR_ERASURE_REQUESTED, type GdprErasureRequestedPayload } from '@adopt-dont-shop/events';
import type { NatsConnection } from 'nats';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import type { AuditClient } from '../grpc-clients/audit-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';

export type GdprRoutesOptions = {
  nats: NatsConnection;
  // Optional — when wired, the GET status endpoint is registered.
  auditClient?: AuditClient;
};

export const registerGdprRoutes = async (
  app: FastifyInstance,
  opts: GdprRoutesOptions
): Promise<void> => {
  const { nats, auditClient } = opts;

  app.post('/api/v1/users/me/erasure-request', async (req, reply) => {
    const userId = principalUserId(req);
    if (!userId) {
      return reply.code(401).send({ success: false, error: 'unauthenticated' });
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const reason = typeof body.reason === 'string' ? body.reason : undefined;

    const correlationId = randomUUID();
    const payload: GdprErasureRequestedPayload = {
      userId,
      correlationId,
      requestedAt: new Date().toISOString(),
      reason,
    };
    const envelope = {
      id: correlationId,
      occurredAt: new Date().toISOString(),
      payload,
    };
    // Publish through JetStream so the erasure request is durably stored in
    // the stream BEFORE we 202. Any service that owns user data — even one
    // mid-deploy right now — receives it on reconnect via its durable
    // consumer. This is the compliance-critical guarantee: the request can't
    // be lost to a subscriber being briefly down.
    await nats
      .jetstream()
      .publish(GDPR_ERASURE_REQUESTED, new TextEncoder().encode(JSON.stringify(envelope)), {
        msgID: correlationId,
      });

    // 202 — the request is accepted, but actual erasure happens
    // asynchronously across the services. The client polls the status
    // endpoint to confirm.
    return reply.code(202).send({
      success: true,
      correlationId,
      requestedAt: payload.requestedAt,
    });
  });

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
