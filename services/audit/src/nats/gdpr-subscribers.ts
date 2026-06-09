// NATS subscribers for the GDPR erasure saga. Two streams:
//
//   * `gdpr.erasureRequested` — INSERT a row into
//     audit.gdpr_erasure_requests. Idempotent via ON CONFLICT (correlation_id).
//   * `gdpr.erasureCompleted` — merge the per-service completion into the
//     `completions` JSONB blob. Updates `completed_at` once every service
//     in the configured EXPECTED_SERVICES set has acked.
//
// Both subscribers share the audit-workers queue group so a replicated
// audit deployment load-balances saga tracking.

import type { NatsConnection, Subscription } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import {
  GDPR_ERASURE_COMPLETED,
  GDPR_ERASURE_REQUESTED,
  subscribe,
  type GdprErasureCompletedPayload,
  type GdprErasureRequestedPayload,
} from '@adopt-dont-shop/events';

// The set of services we expect to ack each request. Once every one of
// these has a completion entry, the request flips to completed_at = now().
// Keep this in sync with services/{auth,notifications,pets,chat,
// applications,matching,moderation,cms,rescue}/src/index.ts subscriber
// wiring.
export const EXPECTED_SERVICES = [
  'auth',
  'notifications',
  'pets',
  'chat',
  'applications',
  'matching',
  'moderation',
  'cms',
  'rescue',
] as const;

const QUEUE_GROUP = 'audit-workers';

export type RegisterGdprSubscribersOptions = {
  nats: NatsConnection;
  pool: Pool;
  logger: Logger;
};

export const registerGdprSubscribers = (opts: RegisterGdprSubscribersOptions): Subscription[] => {
  const { nats, pool, logger } = opts;

  const onError = (err: unknown, ctx: { subject: string }): void => {
    logger.error('audit gdpr subscriber handler failed', {
      subject: ctx.subject,
      err: (err as Error)?.message ?? String(err),
    });
  };

  return [
    subscribe<GdprErasureRequestedPayload>(
      nats,
      { subject: GDPR_ERASURE_REQUESTED, queue: QUEUE_GROUP, onError },
      async payload => {
        await recordRequest(pool, payload);
      }
    ),
    subscribe<GdprErasureCompletedPayload>(
      nats,
      { subject: GDPR_ERASURE_COMPLETED, queue: QUEUE_GROUP, onError },
      async payload => {
        await recordCompletion(pool, payload);
      }
    ),
  ];
};

// INSERT the saga row. ON CONFLICT means a replayed event is a no-op,
// and a completion that arrives BEFORE the request (the bus can reorder
// across subjects) still gets attached when the request finally lands —
// the completion handler's UPDATE locks the row and merges into the
// existing completions blob.
export async function recordRequest(
  pool: Pool,
  payload: GdprErasureRequestedPayload
): Promise<void> {
  await pool.query(
    `INSERT INTO audit.gdpr_erasure_requests
       (correlation_id, user_id, reason, requested_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (correlation_id) DO NOTHING`,
    [payload.correlationId, payload.userId, payload.reason ?? null, payload.requestedAt]
  );
}

// Merge a per-service completion into the row. When every expected
// service has acked, stamp completed_at. If the row hasn't been recorded
// yet (out-of-order delivery), INSERT a skeleton with the completion
// already merged.
export async function recordCompletion(
  pool: Pool,
  payload: GdprErasureCompletedPayload
): Promise<void> {
  const entry = {
    recordsErased: payload.recordsErased,
    completedAt: payload.completedAt,
    ...(payload.error ? { error: payload.error } : {}),
  };

  await pool.query(
    `INSERT INTO audit.gdpr_erasure_requests
       (correlation_id, user_id, reason, requested_at, completions)
     VALUES ($1, $2, NULL, $3, jsonb_build_object($4::text, $5::jsonb))
     ON CONFLICT (correlation_id) DO UPDATE
       SET completions = audit.gdpr_erasure_requests.completions
                       || jsonb_build_object($4::text, $5::jsonb),
           completed_at = CASE
             WHEN audit.gdpr_erasure_requests.completed_at IS NOT NULL
               THEN audit.gdpr_erasure_requests.completed_at
             WHEN (
               SELECT count(*) FROM jsonb_object_keys(
                 audit.gdpr_erasure_requests.completions
                   || jsonb_build_object($4::text, $5::jsonb)
               )
             ) >= $6
               THEN now()
             ELSE NULL
           END,
           updated_at = now()`,
    [
      payload.correlationId,
      payload.userId,
      payload.completedAt,
      payload.service,
      JSON.stringify(entry),
      EXPECTED_SERVICES.length,
    ]
  );
}
