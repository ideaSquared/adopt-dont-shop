// GDPR saga deadline sweep (ADS-830).
//
// Runs periodically (wired in index.ts via the shared Scheduler) and:
//
//   1. TIMEOUT: marks sagas older than GDPR_SAGA_DEADLINE_MS (default 30 min)
//      that still have services which never acked (no completions entry at all)
//      as `timed_out` (stamps timed_out_at). Logs at error level with the list
//      of missing services — Loki/alerting picks that up as the alertable
//      signal.
//
//   2. RETRY: for sagas where failed_at is set AND retry_count < maxRetries,
//      re-publishes gdpr.erasureRequested with the SAME correlationId but a
//      DISTINCT msgID (`${correlationId}:retry:${n}`) so JetStream's dedupe
//      window does not suppress the retry. Increments retry_count in the DB.
//      Erasure handlers are idempotent (re-erasing an already-erased user's
//      row returns 0 rows deleted — clean no-op).
//
// Both passes are intentionally separate queries so a single saga can hit
// both (failed + overdue); the ordering is timeout-first, retry-second so
// the error log always lands before the retry publish.

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import { GDPR_ERASURE_REQUESTED, type GdprErasureRequestedPayload } from '@adopt-dont-shop/events';

import { EXPECTED_SERVICES } from './gdpr-subscribers.js';

export { GDPR_ERASURE_REQUESTED };

// Default deadline: 30 minutes in milliseconds.
export const GDPR_SAGA_DEADLINE_MS = 30 * 60 * 1000;

// Maximum automatic retries before the sweep gives up and waits for operator
// intervention. The combination of error log + timed_out_at means the saga
// is still surfaced; we just stop spamming retries.
export const GDPR_SAGA_MAX_RETRIES = 3;

export type GdprSweepOptions = {
  pool: Pool;
  nats: NatsConnection;
  logger: Logger;
  // Milliseconds since requested_at before a still-in-flight saga is
  // considered timed out. Defaults to GDPR_SAGA_DEADLINE_MS (30 min).
  deadlineMs?: number;
  // Maximum number of automatic retries. Defaults to GDPR_SAGA_MAX_RETRIES.
  maxRetries?: number;
  // Injectable now() for tests. Defaults to Date.now.
  now?: () => number;
};

type SagaRow = {
  correlation_id: string;
  user_id: string;
  reason: string | null;
  requested_at: string;
  completions: Record<string, unknown>;
  completed_at: string | null;
  failed_at: string | null;
  timed_out_at: string | null;
  retry_count: number;
};

export const runGdprSweep = async (opts: GdprSweepOptions): Promise<void> => {
  const {
    pool,
    nats,
    logger,
    deadlineMs = GDPR_SAGA_DEADLINE_MS,
    maxRetries = GDPR_SAGA_MAX_RETRIES,
    now = Date.now,
  } = opts;

  const cutoff = new Date(now() - deadlineMs).toISOString();

  // --- Pass 1: timeout detection -------------------------------------------
  //
  // Find sagas that are:
  //   - not yet completed (completed_at IS NULL)
  //   - not yet timed out (timed_out_at IS NULL)
  //   - older than the deadline (requested_at < cutoff)
  //
  // A saga is "stuck" when at least one EXPECTED_SERVICE has no entry in
  // `completions` at all. Sagas where every service acked (even with errors)
  // are handled by the retry pass, not the timeout pass.
  const { rows: overdueRows } = await pool.query<SagaRow>(
    `SELECT correlation_id, user_id, reason, requested_at,
            completions, completed_at, failed_at, timed_out_at, retry_count
       FROM audit.gdpr_erasure_requests
      WHERE completed_at IS NULL
        AND timed_out_at IS NULL
        AND requested_at < $1`,
    [cutoff]
  );

  for (const row of overdueRows) {
    const ackedServices = new Set(Object.keys(row.completions));
    const missingServices = EXPECTED_SERVICES.filter(s => !ackedServices.has(s));

    if (missingServices.length === 0) {
      // All services acked — just with errors. The retry pass handles this.
      continue;
    }

    await pool.query(
      `UPDATE audit.gdpr_erasure_requests
          SET timed_out_at = now(), updated_at = now()
        WHERE correlation_id = $1`,
      [row.correlation_id]
    );

    logger.error('gdpr saga timed out — services never acked', {
      correlationId: row.correlation_id,
      userId: row.user_id,
      requestedAt: row.requested_at,
      missingServices,
    });
  }

  // --- Pass 2: retry publishing --------------------------------------------
  //
  // Find sagas that:
  //   - have at least one errored completion (failed_at IS NOT NULL)
  //   - are not yet completed (completed_at IS NULL)
  //   - have not exhausted the retry budget (retry_count < maxRetries)
  //
  // We re-publish gdpr.erasureRequested with the SAME payload (same
  // correlationId, userId, requestedAt) so each subscriber's erasure callback
  // runs again. Idempotent: a service that already erased the user's data
  // returns 0 rows on the re-run — clean no-op.
  //
  // The msgID MUST be distinct from the original publish
  // (`${correlationId}.requested` or just the correlationId) to bypass
  // JetStream's duplicate window. Pattern: `${correlationId}:retry:${n}`
  // where n is the NEW retry_count (1-indexed).
  const { rows: retryRows } = await pool.query<SagaRow>(
    `SELECT correlation_id, user_id, reason, requested_at,
            completions, completed_at, failed_at, timed_out_at, retry_count
       FROM audit.gdpr_erasure_requests
      WHERE failed_at IS NOT NULL
        AND completed_at IS NULL
        AND retry_count < $1`,
    [maxRetries]
  );

  for (const row of retryRows) {
    const nextRetryCount = row.retry_count + 1;
    const msgID = `${row.correlation_id}:retry:${nextRetryCount}`;

    const payload: GdprErasureRequestedPayload = {
      correlationId: row.correlation_id,
      userId: row.user_id,
      requestedAt: row.requested_at,
      ...(row.reason !== null ? { reason: row.reason } : {}),
    };

    const envelope = {
      id: msgID,
      occurredAt: new Date(now()).toISOString(),
      payload,
    };

    try {
      await nats
        .jetstream()
        .publish(GDPR_ERASURE_REQUESTED, new TextEncoder().encode(JSON.stringify(envelope)), {
          msgID,
        });

      await pool.query(
        `UPDATE audit.gdpr_erasure_requests
            SET retry_count = $1,
                -- Clear failed_at so a fresh retry starts clean.
                -- The next completion handler will re-stamp if it fails again.
                failed_at = NULL,
                updated_at = now()
          WHERE correlation_id = $2`,
        [nextRetryCount, row.correlation_id]
      );

      logger.info('gdpr saga retry published', {
        correlationId: row.correlation_id,
        retryCount: nextRetryCount,
        msgID,
      });
    } catch (err) {
      logger.error('gdpr saga retry publish failed', {
        correlationId: row.correlation_id,
        retryCount: nextRetryCount,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }
};
