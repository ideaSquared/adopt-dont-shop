---
name: audit-logging
description: >
  When and how to emit audit events in the microservices backend. Apply when
  working on any gRPC handler or service action that creates, updates, or
  deletes user data, performs an authentication action, or otherwise changes
  state that needs a forensic record.
---

# Audit Logging

The backend separates **operational logs** (Layer 1 — `logger.*`) from
**audit events** (Layer 2 — durable `audit.audit_events` table). This skill
is about Layer 2.

| | Layer 1 — `logger.*` | Layer 2 — audit |
|---|---|---|
| Purpose | Debugging, ops | Forensics: who did what to what |
| Storage | console + files + Loki | `audit.audit_events` table (owned by `services/audit`) + Loki |
| Mutable | Yes | No (immutable, append-only) |
| How | `logger.info/warn/error` via `@adopt-dont-shop/observability` | `publish({ type: '<domain>.actionTaken', … })` inside `withTransaction` |

## How the audit pipeline actually works

There is **no** `AuditLogService.log()` and **no** `auditRoute()` middleware.
Every state-changing microservice publishes a `<domain>.actionTaken` NATS
event from inside a `withTransaction` block; `services/audit` subscribes to
the wildcard `*.actionTaken` subject and inserts every event into
`audit.audit_events`. Idempotency is handled by the producer's NATS message
id, so JetStream redeliveries collapse to `ON CONFLICT DO NOTHING` inserts.

```
handler
  └── withTransaction(deps, ({ client, publish }) => {
        client.query(...)                             ← DB write
        publish({ type: 'pets.actionTaken', … })      ← NATS event (queued)
      })
        │  (commit succeeds)
        ▼
      NATS *.actionTaken
        │
        ▼
      services/audit  ── INSERT INTO audit.audit_events (idempotent)
```

`withTransaction` (in `@adopt-dont-shop/events`) enforces **publish-after-
commit**: it queues the event during the block and only sends it to NATS
after `COMMIT` succeeds, so a rollback drops the event with no work needed.

## When to audit

Emit an audit row for any action a security / compliance reviewer would want
to reconstruct months later:

- Create / update / delete of business entities (users, pets, applications,
  rescues, invitations, etc.)
- Authentication events (login, logout, password reset, MFA changes)
- Authorisation changes (role grant, permission change, suspension)
- Sensitive reads (admin viewing a user's PII record) — use `audit: true`
  on the field-mask hook, which fans out into an `actionTaken` publish
- Bulk operations, exports, data deletions

Don't audit pure read-only endpoints unless they expose sensitive data.
Don't audit health checks, static assets, or anything a system user could
not act on.

## The canonical pattern (state-changing handler)

```typescript
// services/pets/src/grpc/pet-handlers.ts (illustrative)
import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction } from '@adopt-dont-shop/events';

import type { HandlerDeps } from './handlers.js';

export async function createPet(
  deps: HandlerDeps,
  principal: Principal,
  req: { name: string; rescueId: string },
) {
  requirePermission(principal, 'pet.write');

  const petId = randomUUID();

  await withTransaction(deps, async ({ client, publish }) => {
    await client.query(
      `INSERT INTO pets.pets (pet_id, name, rescue_id, created_at, updated_at)
       VALUES ($1, $2, $3, now(), now())`,
      [petId, req.name, req.rescueId],
    );

    publish({
      type: 'pets.actionTaken',
      id: `pets.created.${petId}`,
      payload: {
        service: 'service.pets',
        aggregateType: 'pet',
        aggregateId: petId,
        action: 'create',
        actorUserId: principal.userId,
        details: { name: req.name, rescueId: req.rescueId },
      },
    });
  });

  return { petId };
}
```

Key points:

- The `publish()` call is inside the `withTransaction` callback — the event
  only fires on commit.
- `id` is the NATS message id and must be deterministic per action (so a
  redelivery does not duplicate rows). A `<domain>.<action>.<aggregateId>`
  string is the usual pattern; append a timestamp when the same aggregate
  can legitimately fire the same action twice.
- `payload` conforms to `AuditEventPayload` in
  `services/audit/src/nats/event-types.ts`.

## Capturing before/after for UPDATEs

For sensitive entity updates, read the previous row inside the same
transaction and record the diff — the audit row then tells the full story.

```typescript
await withTransaction(deps, async ({ client, publish }) => {
  const { rows: [before] } = await client.query(
    `SELECT name, description, updated_at FROM pets.pets
     WHERE pet_id = $1 FOR UPDATE`,
    [petId],
  );
  if (!before) throw new HandlerError('NOT_FOUND', 'pet not found');

  const after = { ...before, ...changes };
  await client.query(
    `UPDATE pets.pets SET name = $1, description = $2, updated_at = now()
     WHERE pet_id = $3`,
    [after.name, after.description, petId],
  );

  publish({
    type: 'pets.actionTaken',
    id: `pets.updated.${petId}.${before.updated_at.toISOString()}`,
    payload: {
      service: 'service.pets',
      aggregateType: 'pet',
      aggregateId: petId,
      action: 'update',
      actorUserId: principal.userId,
      details: { before, after },
    },
  });
});
```

There is no `diffSequelize` helper — services own their own SQL and pick
the fields worth capturing.

## Action and aggregate naming

`action` is a lower-case domain verb: `create`, `update`, `delete`, `submit`,
`approve`, `reject`, `suspend`, `verify`, `assign_role`, `invite`.

`aggregateType` is a lower-case singular noun matching the row's home
concept: `pet`, `application`, `user`, `rescue`, `invitation`,
`chat_message`.

`aggregateId` is the UUID as a string.

`subject` on the NATS envelope is always `<service>.actionTaken` (e.g.
`pets.actionTaken`, `applications.actionTaken`). The audit consumer
subscribes to the wildcard `*.actionTaken`.

## PII and secrets

`details` is redacted by the Winston pipeline before it's logged to Loki,
but the `audit.audit_events` row itself is durable storage. Never put:

- Plain-text passwords, reset tokens, MFA secrets
- Full credit-card or bank-account numbers
- Unredacted government IDs

Capture identifiers (`userId`, hashed email, last4) instead.

## Why not just `logger.info()`?

`logger.info` goes to console + files + Loki. Logs are queryable for ops but:

- Get compacted away
- Have no schema
- Aren't a system-of-record for compliance

`audit.audit_events` is the durable record. Use both layers — log for ops
noise, audit for forensics.

## Common mistakes

- **Publishing outside `withTransaction`** — the event fires even when the
  DB write rolls back. Always `publish()` from inside the callback.
- **Reusing the `id`** — if the id repeats, the audit consumer silently
  drops the second row. Make the id deterministic per (aggregate, action,
  moment).
- **Writing straight to `audit.audit_events`** — that table is owned by
  `services/audit` and no other service has grants against it. Publish the
  NATS event instead.
- **Auditing reads that aren't sensitive** — noisy table, no value.
- **Putting secrets in `details`** — durable leak.
- **Inventing new `action` verbs that overlap with existing ones** (e.g.
  `user_created` when `create` + `aggregateType: 'user'` already conveys
  it).
- **Skipping `await`** — a fire-and-forget `withTransaction` is silently
  dropped on error.
