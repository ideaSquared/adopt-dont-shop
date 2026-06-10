// NATS subscriber for the audit vertical.
//
// Phase 10.4 — subscribes to the wildcard `*.actionTaken` subject so
// every state-changing event from every service lands in audit_events.
// Idempotent on event_id (the row PK) so JetStream redelivery / NATS
// replay can't double-insert.
//
// Discipline:
//   - @adopt-dont-shop/events.subscribe wraps the callback with the
//     CAD-#4 poison-pill protection: handler exceptions go through
//     onError, the loop continues, malformed JSON is a clean skip.
//   - Single queue group ('audit-workers') so horizontally-scaled
//     replicas share work — each event is persisted exactly once
//     in the happy path.
//   - INSERT uses ON CONFLICT DO NOTHING on the event_id PK so retries
//     are safe. The row-level immutability trigger (#884) rejects any
//     subsequent UPDATE / DELETE attempt.
//
// What's NOT here: dedup-by-eventId at the event-bus layer. The
// ON CONFLICT clause is enough — we don't need a separate
// processed_events table because the event_id IS the audit_events PK.

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import { subscribe, type SubscriptionHandle } from '@adopt-dont-shop/events';

import type { AuditEventPayload } from './event-types.js';

export type RegisterSubscribersOptions = {
  nats: NatsConnection;
  pool: Pool;
  logger: Logger;
};

// Durable consumer name — all replicas bind the same durable so JetStream
// load-shares the action-taken stream across the audit pool. Part of the
// deployment contract — changing it means duplicate handling during rollover.
const DURABLE = 'audit-workers-actionTaken';

const INSERT_SQL = `
  INSERT INTO audit_events (
    event_id, service, subject, aggregate_type, aggregate_id,
    actor_user_id, actor_email_snapshot, action, outcome,
    occurred_at, payload, ip_address, user_agent
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  ON CONFLICT (event_id) DO NOTHING
`;

export const registerSubscribers = (opts: RegisterSubscribersOptions): SubscriptionHandle[] => {
  const { nats, pool, logger } = opts;

  const onError = (err: unknown, ctx: { subject: string }): void => {
    logger.error('audit subscriber handler failed', {
      subject: ctx.subject,
      err: (err as Error)?.message ?? String(err),
    });
  };

  return [
    subscribe<AuditEventPayload>(
      nats,
      { subject: '*.actionTaken', durable: DURABLE, onError },
      async (payload, meta) => {
        await persistAuditEvent(pool, payload, meta.subject);
      }
    ),
  ];
};

// Exported for direct unit testing — the subscriber test exercises this
// without bringing NATS into the loop.
export async function persistAuditEvent(
  pool: Pool,
  payload: AuditEventPayload,
  natsSubject: string
): Promise<void> {
  // The producer's payload.subject is what we trust; if it's missing,
  // fall back to the NATS-level subject (e.g. 'auth.actionTaken'). This
  // keeps the row populated even when an older producer doesn't stamp
  // the subject explicitly.
  const subjectForRow = payload.subject || natsSubject;

  await pool.query(INSERT_SQL, [
    payload.eventId,
    payload.service,
    subjectForRow,
    payload.aggregateType,
    payload.aggregateId,
    payload.actorUserId ?? null,
    payload.actorEmailSnapshot ?? null,
    payload.action,
    payload.outcome,
    payload.occurredAt,
    JSON.stringify(payload.payload ?? {}),
    payload.ipAddress ?? null,
    payload.userAgent ?? null,
  ]);
}
