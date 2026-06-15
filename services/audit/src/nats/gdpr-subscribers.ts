// NATS subscribers for the GDPR erasure saga. Two streams:
//
//   * `gdpr.erasureRequested` — INSERT a row into
//     audit.gdpr_erasure_requests. Idempotent via ON CONFLICT (correlation_id).
//   * `gdpr.erasureCompleted` — merge the per-service completion into the
//     `completions` JSONB blob. Updates `completed_at` once every service
//     in the configured EXPECTED_SERVICES set has acked without an error;
//     errored acks stamp `failed_at` instead so operators see the saga
//     needs attention.
//
// Both subscribers share the audit-workers queue group so a replicated
// audit deployment load-balances saga tracking.

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import {
  GDPR_ERASURE_COMPLETED,
  GDPR_ERASURE_REQUESTED,
  subscribe,
  type GdprErasureCompletedPayload,
  type GdprErasureRequestedPayload,
  type SubscriptionHandle,
} from '@adopt-dont-shop/events';

// The set of services we expect to ack each request. Once every one of
// these has an error-free completion entry, the request flips to
// completed_at = now().
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

// Durable consumer names — all audit replicas bind the same durables so the
// saga-tracking work is load-shared. Distinct durables per subject keep each
// subscriber's redelivery cursor independent.
const DURABLE_REQUEST = 'audit-workers-gdpr-request';
const DURABLE_COMPLETION = 'audit-workers-gdpr-completion';

export type RegisterGdprSubscribersOptions = {
  nats: NatsConnection;
  pool: Pool;
  logger: Logger;
};

export const registerGdprSubscribers = (
  opts: RegisterGdprSubscribersOptions
): SubscriptionHandle[] => {
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
      { subject: GDPR_ERASURE_REQUESTED, durable: DURABLE_REQUEST, onError },
      async payload => {
        await recordRequest(pool, payload);
      }
    ),
    subscribe<GdprErasureCompletedPayload>(
      nats,
      { subject: GDPR_ERASURE_COMPLETED, durable: DURABLE_COMPLETION, onError },
      async payload => {
        await recordCompletion(pool, payload, logger);
      }
    ),
  ];
};

// INSERT the saga row. A completion that arrives BEFORE the request (the
// bus can reorder across subjects) INSERTs a skeleton with reason = NULL
// and requested_at = the completion timestamp, so the conflict clause
// back-fills the real values instead of dropping them (ADS-776):
// COALESCE keeps any already-known reason/user_id (replay safety) and
// LEAST keeps the earliest requested_at (the true request time).
export async function recordRequest(
  pool: Pool,
  payload: GdprErasureRequestedPayload
): Promise<void> {
  await pool.query(
    `INSERT INTO audit.gdpr_erasure_requests
       (correlation_id, user_id, reason, requested_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (correlation_id) DO UPDATE
       SET reason = COALESCE(audit.gdpr_erasure_requests.reason, EXCLUDED.reason),
           requested_at = LEAST(audit.gdpr_erasure_requests.requested_at, EXCLUDED.requested_at),
           user_id = COALESCE(audit.gdpr_erasure_requests.user_id, EXCLUDED.user_id),
           updated_at = now()`,
    [payload.correlationId, payload.userId, payload.reason ?? null, payload.requestedAt]
  );
}

// Merge a per-service completion into the row. completed_at is only
// stamped once every expected service has acked WITHOUT an error —
// errored acks still merge into the blob but don't count (ADS-777).
// The first errored ack stamps failed_at (a later success never clears
// it; the operator resolves and re-runs the saga) and emits a Layer-1
// warning. If the row hasn't been recorded yet (out-of-order delivery),
// INSERT a skeleton with the completion already merged.
export async function recordCompletion(
  pool: Pool,
  payload: GdprErasureCompletedPayload,
  logger: Logger
): Promise<void> {
  if (payload.error) {
    logger.warn('gdpr erasure completion reported an error', {
      correlationId: payload.correlationId,
      service: payload.service,
      error: payload.error,
    });
  }

  const entry = {
    recordsErased: payload.recordsErased,
    completedAt: payload.completedAt,
    ...(payload.error ? { error: payload.error } : {}),
  };

  await pool.query(
    `INSERT INTO audit.gdpr_erasure_requests
       (correlation_id, user_id, reason, requested_at, completions, failed_at)
     VALUES ($1, $2, NULL, $3, jsonb_build_object($4::text, $5::jsonb),
             CASE WHEN $5::jsonb ? 'error' THEN now() END)
     ON CONFLICT (correlation_id) DO UPDATE
       SET completions = audit.gdpr_erasure_requests.completions
                       || jsonb_build_object($4::text, $5::jsonb),
           completed_at = CASE
             WHEN audit.gdpr_erasure_requests.completed_at IS NOT NULL
               THEN audit.gdpr_erasure_requests.completed_at
             WHEN (
               SELECT count(*) FROM jsonb_each(
                 audit.gdpr_erasure_requests.completions
                   || jsonb_build_object($4::text, $5::jsonb)
               ) AS c(key, value)
               WHERE NOT (c.value ? 'error') AND c.key = ANY($7::text[])
             ) >= $6
               THEN now()
             ELSE NULL
           END,
           failed_at = COALESCE(
             audit.gdpr_erasure_requests.failed_at,
             CASE WHEN $5::jsonb ? 'error' THEN now() END
           ),
           updated_at = now()`,
    [
      payload.correlationId,
      payload.userId,
      payload.completedAt,
      payload.service,
      JSON.stringify(entry),
      EXPECTED_SERVICES.length,
      [...EXPECTED_SERVICES],
    ]
  );
}
