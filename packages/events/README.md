# @adopt-dont-shop/events

## Purpose

NATS publish-after-commit + idempotent-subscriber helpers for the backend
microservices. Encodes the two CAD-lesson disciplines that pay off most: no
domain event ever fires on a rolled-back transaction, and no single bad message
can tear down a subscription loop.

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

- `withTransaction({ pool, nats }, fn)` — runs `fn` inside a Postgres
  transaction with a buffered `publish(...)`; staged events reach NATS **only
  after** `COMMIT` (no phantom events on rollback).
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
[`docs/backend/testing.md`](../../docs/backend/testing.md) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/packages/`.
