# @adopt-dont-shop/events

## Purpose

Transactional-outbox event delivery + idempotent-subscriber helpers for the
backend microservices. Encodes the disciplines that pay off most: no domain
event ever fires on a rolled-back transaction, no committed event is ever lost,
and no single bad message can tear down a subscription loop.

### Transactional outbox (ADS-1048)

`withTransaction` no longer publishes to JetStream directly after `COMMIT` (the
old commit-then-publish dual-write, where a crash between the commit and the
ack lost the event forever). Instead every staged event is written as a row in
an `event_outbox` table **inside the same transaction** as the business write —
so the event is durable atomically with the state change it describes.

Delivery is then two-phase:

- **Inline fast-path** — right after commit, `withTransaction` publishes the
  just-staged rows and deletes them on ack. Best-effort: a failure here is
  swallowed (the row stays in the outbox), so it never fails the caller.
- **Relay** (`startOutboxRelay`, started once per service at boot) — a
  background sweep that publishes any rows the inline path did not clear
  (process died in the commit→publish window, or JetStream was unreachable) and
  deletes them on ack. This is the durability guarantee, and doubles as the
  reconciliation job. A row is deleted on successful publish, so the table is a
  self-cleaning queue, not an append-only log.

Each event-publishing service adds a migration that creates `event_outbox` in
its own schema (re-exporting the DDL from
[`src/outbox-schema.ts`](src/outbox-schema.ts) via the `./outbox-schema`
subpath) and starts the relay in its boot sequence. The table is referenced
unqualified everywhere, resolving to the calling service's schema through the
connection search_path — the same pattern as the consumer-side
`processed_events` / `claimEvent` ledger.

Redelivery is safe by construction: JetStream de-dups on `Nats-Msg-Id` within
its duplicate window and every business consumer is idempotent on the event id,
so a row the inline path published but crashed before deleting is harmlessly
re-published by the relay.

Observability: `events_outbox_pending` (gauge — unpublished backlog, the
primary alert signal), `events_outbox_published_total`, and
`events_outbox_publish_failures_total` are exposed on the shared `/metrics`
registry.

### Durable consumers, retries, and the dead-letter stream

`subscribe()` does a create-or-reuse on its JetStream durable consumer
(`jsm.consumers.add(DOMAIN_STREAM, { durable_name, filter_subject, deliver_policy,
max_deliver, … })`). **Footgun:** JetStream fixes `deliver_policy` and
`filter_subject` at consumer-creation time and silently ignores them on a re-add
of an existing durable. So flipping `deliverNew` in code, or changing the
`subject` for a durable that already exists, has **no effect** anywhere the
durable is already present — staging/prod, and any dev container whose NATS
volume persisted. Changing either is a deliberate ops step: delete and recreate
the consumer (`nats consumer rm DOMAIN_EVENTS <durable-name>`, then restart the
service so it re-adds), or pick a new durable name (which starts from
`deliver_policy` again — `All` replays the 7-day backlog, `New` skips it).
[`src/consumer-registry.ts`](src/consumer-registry.ts) is the inventory of every
durable (name, subject, registering file) — consult it when you need to know
which one to recreate. Two replicas binding the **same** durable load-share
(each message delivered once across them); fan-out consumers that must each see
every message (e.g. gateway WS subscribers) use per-replica-unique durable
names.

Retry budget: a parseable but persistently-failing message is `nak()`'d with
exponential backoff (`min(30s, 1s · 2^(attempt-1))`) up to `MAX_DELIVER = 7`,
then parked in the dead-letter stream `DOMAIN_EVENTS_DLQ` (subjects `dlq.>`,
14-day retention) and `term()`'d. The main stream keeps a 7-day `max_age` and a
2-minute `Nats-Msg-Id` duplicate window — far shorter than retention, so
redelivery-safety rests on **consumer idempotency** (`claimEvent` /
`processed_events`), not on the broker dedup. See
[`docs/adr/0003-idempotent-event-consumers.md`](../../docs/adr/0003-idempotent-event-consumers.md).

This is a service-only shared package (not a `lib.*`) — imported by every
schema-owning service. See the decision tree in
[`CONTRIBUTING.md`](../../CONTRIBUTING.md#where-does-my-code-go).

## Location in the architecture

See [`docs/README.md`](../../docs/README.md#libraries) for where the shared
packages sit; the general event pattern is documented in
[`docs/backend/implementation-guide.md`](../../docs/backend/implementation-guide.md).
Every `services/*` domain write goes through `withTransaction`, and every
consumer through `subscribe`; the GDPR erasure saga primitives here are
coordinated by `service.audit`. Callers own the `NatsConnection` lifecycle
(`connect()` / `drain()`) — the helpers expect a live connection.

## Scripts

```bash
pnpm build        # tsc build
pnpm dev          # tsc --watch
pnpm test         # Vitest (run mode)
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
```

## Public API / exports

The canonical list lives in [`src/index.ts`](src/index.ts):

- `withTransaction({ pool, nats, logger? }, fn)` — runs `fn` inside a Postgres
  transaction with a buffered `publish(...)`; staged events are written to the
  `event_outbox` table in the same transaction (no phantom events on rollback,
  no lost events after commit) and delivered inline + by the relay.
- `startOutboxRelay({ pool, nats, logger? }, { intervalMs?, batchSize? })` —
  starts the background outbox relay; returns a handle whose `stop()` clears
  it. Call once per event-publishing service at boot; stop it on shutdown.
- `relayOutboxOnce({ pool, nats }, batchSize)` — publishes one batch of pending
  outbox rows and returns the count. The relay's unit of work, also usable as a
  one-shot reconciliation job.
- `OUTBOX_TABLE` — the `event_outbox` table name. The DDL is re-exported from
  the `@adopt-dont-shop/events/outbox-schema` subpath for per-service
  migrations.
- `subscribe(nats, { subject, durable, onError, deliverNew? }, handler)` — a
  poison-pill-safe consumer loop (errors reported via `onError`, malformed JSON
  skipped). The `durable` name is the JetStream consumer identity — shared for
  queue-group load-sharing, distinct for per-replica fan-out.
- `ensureStream`, `DOMAIN_STREAM`, `DOMAIN_SUBJECTS` — shared `DOMAIN_EVENTS`
  JetStream topology helpers.
- `claimEvent` + `CONSUMER_REGISTRY` — the idempotent-consumer dedup helper.
- `GDPR_ERASURE_REQUESTED` / `GDPR_ERASURE_COMPLETED` / `EXPECTED_GDPR_SERVICES`
  / `registerGdprSubscriber` — GDPR erasure saga primitives.
- `redactAuditPayload` — payload-side redaction for audit publishes.

## Environment variables consumed

None — the connection and configuration are passed in by the caller.

## Testing notes

Vitest, against an in-memory NATS double (`@adopt-dont-shop/test-utils`) — the
suite asserts publish-only-after-commit ordering, no-publish-on-rollback,
handler idempotency, and clean skips on malformed messages. See
[`docs/testing.md`](../../docs/testing.md#backend-specifics) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/packages/`.
