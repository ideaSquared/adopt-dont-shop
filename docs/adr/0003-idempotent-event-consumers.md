# ADR 0003 — At-least-once delivery and idempotent event consumers

- Status: Accepted
- Date: 2026-06-16
- Scope: every NATS/JetStream subscriber across `services/*/src/nats/`,
  `services/*/src/gdpr/`, the saga subscribers in
  `packages/events/src/gdpr-saga.ts`, and the shared `claimEvent` primitive in
  `packages/events/src/idempotency.ts`
- Related: ADS-808, PR #1002 (JetStream migration)

## Context

PR #1002 moved the event bus to JetStream with durable consumers. Delivery is
now **at-least-once**: a handler may observe the same event id more than once —
broker redelivery after a transient failure, a consumer restart between doing
the work and acking, or a `nak` on a partial failure. The ack strategy from
that PR is correct (`ack` on success, `nak` on transient error, `term` on a
poison message, per-message `try/catch` so one bad message never tears down the
subscription loop), but ack discipline alone does not make a handler safe — the
side-effect itself must be safe to apply twice.

A duplicate that produces a duplicate side-effect (two notification rows, two
emails, two auto-reports, a double-counted GDPR completion) is a correctness
bug. We need a single, documented convention so the discipline doesn't bit-rot
as new subscribers are added.

## Decision

**Every subscriber that turns an upstream event into a durable, non-idempotent
side-effect MUST be idempotent on the event id.** A redelivery of the same event
must produce exactly one effect. There are three sanctioned ways to achieve
this; pick the one that fits the side-effect:

1. **`claimEvent` against `processed_events`** (the shared primitive in
   `packages/events/src/idempotency.ts`). It inserts a `(consumer, event_id)`
   row `ON CONFLICT DO NOTHING` and reports whether THIS call won the race; a
   redelivery returns `false` and the handler skips. Pass a `PoolClient` to
   claim **atomically inside the same transaction as the side-effect** — a
   rolled-back handler also un-claims the event, so there is never an
   ack-without-effect or effect-without-claim. Pass a `Pool` for best-effort
   dedup where there is no DB write to be atomic with (a pure fan-out worker,
   where suppressing a duplicate matters and a missed effect on a mid-flight
   crash is acceptable).

2. **A natural unique constraint that makes the write itself the claim.** When
   the side-effect already has a deterministic key, an `INSERT … ON CONFLICT`
   (or a unique index that raises `23505`) makes the insert atomic with the
   dedup — no separate `processed_events` row needed. Examples in-tree:
   - `services/notifications/src/email/channel-adapter.ts` keys the email queue
     row on `notif-email:<notificationId>`; a redelivery hits
     `email_queue_idempotency_key_unique` and is swallowed as a no-op.
   - `services/moderation/src/grpc/handlers.ts` `fileReport` upserts on the
     partial unique index `(reported_entity_type, reported_entity_id) WHERE
     reporter_id = SYSTEM` and only publishes its domain event when the row was
     genuinely inserted (`xmax = 0`), so a redelivered auto-report neither
     duplicates the report nor re-emits `moderation.reportFiled`.
   - `services/audit/src/nats/gdpr-subscribers.ts` upserts the saga row
     `ON CONFLICT (correlation_id)` and merges each completion into a JSONB blob
     keyed by service name, so a redelivered completion is idempotent.

3. **State-guarded transitions** — when the side-effect is a state change, make
   the update conditional on the current state so re-applying it is a no-op
   (e.g. `WHERE status = 'pending'`). A redelivery finds the row already in the
   target state and changes nothing.

**Treat the four CAD lesson-#4 cases as a clean skip, not an error** (so the
broker isn't told to redeliver forever): unknown id, wrong/already-advanced
state, parse/`22P02` failure, and a plain redelivery. These are `ack`-and-move-on,
not `nak`.

## Consequences

- New subscribers have a checklist: identify the event id, choose mechanism
  1/2/3, and add a "publish twice → one effect" test (the redelivery test).
  Subscribers that rely on a unique constraint (mechanism 2) historically had no
  such test; ADS-808 adds one for the moderation auto-report path as the
  template.
- `claimEvent`'s key is `(consumer, event_id)`, never `event_id` alone, so the
  same id consumed by two different durables/subjects each claims independently.
- This is a convention, not a framework: there is no enforced base class. The
  guard against drift is code review plus the per-subscriber redelivery test.
- Out of scope: exactly-once delivery (impossible across a network) and
  read-after-write consistency.
