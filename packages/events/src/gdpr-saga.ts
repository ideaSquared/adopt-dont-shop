// Per-service GDPR subscriber helper. Each service uses this to:
//
//   * Subscribe to gdpr.erasureRequested
//   * Run its erasure callback inside a transaction (so the per-row scrub
//     either fully succeeds or is rolled back)
//   * Publish gdpr.erasureCompleted with the resulting row count — or
//     with an error message if the callback threw
//
// Keeps each service's gdpr-subscriber.ts file down to a few lines. The
// callback receives the Pool client inside an open transaction and
// returns the number of rows it touched. Errors are caught here; the
// completion event is always published so the audit consumer's saga
// tracker doesn't stall on a silent service failure.
//
// Durability (the compliance fix): the subscriber is a durable JetStream
// consumer named `gdpr-<service>`. If this service is restarting/deploying
// when `gdpr.erasureRequested` fires, the broker holds the message and
// redelivers it the moment the durable consumer reconnects — the service's
// slice IS erased and IS reported, instead of being silently dropped (the
// at-most-once hole core NATS left).

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';

import { withTransaction } from './publish.js';
import { subscribe, type SubscriptionHandle } from './subscribe.js';
import {
  GDPR_ERASURE_COMPLETED,
  GDPR_ERASURE_REQUESTED,
  type GdprErasureCompletedPayload,
  type GdprErasureRequestedPayload,
} from './gdpr.js';

export type GdprEraseFn = (
  // PoolClient — typed as `unknown` here so this package doesn't pull in
  // pg types just to forward them. The per-service callback re-types it.
  client: import('pg').PoolClient,
  payload: GdprErasureRequestedPayload
) => Promise<number>;

export type RegisterGdprSubscriberOptions = {
  nats: NatsConnection;
  pool: Pool;
  service: string;
  // Optional durable consumer name. All replicas of the same service share
  // one durable so the erasure requests load-share across them. Defaults to
  // `gdpr-<service>` which is the right shape for every horizontally-scaled
  // subscriber.
  durable?: string;
  erase: GdprEraseFn;
  onError?: (err: unknown, subject: string) => void;
};

export function registerGdprSubscriber(opts: RegisterGdprSubscriberOptions): SubscriptionHandle {
  const { nats, pool, service, erase } = opts;
  const durable = opts.durable ?? `gdpr-${service}`;

  return subscribe<GdprErasureRequestedPayload>(
    nats,
    {
      subject: GDPR_ERASURE_REQUESTED,
      durable,
      onError: opts.onError ? (err, ctx) => opts.onError?.(err, ctx.subject) : undefined,
    },
    async (payload, _meta) => {
      let recordsErased = 0;
      let errorMessage: string | undefined;
      try {
        await withTransaction({ pool, nats }, async ({ client, publish }) => {
          recordsErased = await erase(client, payload);
          const completion: GdprErasureCompletedPayload = {
            userId: payload.userId,
            correlationId: payload.correlationId,
            service,
            recordsErased,
            completedAt: new Date().toISOString(),
          };
          publish({
            id: `${payload.correlationId}.${service}`,
            type: GDPR_ERASURE_COMPLETED,
            payload: completion,
          });
        });
      } catch (err) {
        errorMessage = err instanceof Error ? err.message : String(err);
        // Publish a failure completion OUTSIDE the rolled-back transaction
        // so the audit tracker doesn't stall waiting on this service.
        const failure: GdprErasureCompletedPayload = {
          userId: payload.userId,
          correlationId: payload.correlationId,
          service,
          recordsErased: 0,
          completedAt: new Date().toISOString(),
          error: errorMessage,
        };
        const completionId = `${payload.correlationId}.${service}`;
        const envelope = {
          id: completionId,
          occurredAt: new Date(),
          payload: failure,
        };
        try {
          // Publish through JetStream so the failure completion is durable
          // too — the audit tracker must see it even if it was restarting.
          await nats
            .jetstream()
            .publish(GDPR_ERASURE_COMPLETED, new TextEncoder().encode(JSON.stringify(envelope)), {
              msgID: completionId,
            });
        } catch {
          // If even publishing the failure fails, the audit tracker's
          // timeout sweep will surface the missing ack — nothing more
          // useful we can do from inside a poison-pill catch.
        }
        opts.onError?.(err, GDPR_ERASURE_REQUESTED);
      }
    }
  );
}
