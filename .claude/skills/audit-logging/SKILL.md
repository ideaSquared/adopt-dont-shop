---
name: audit-logging
description: >
  When and how to emit audit events in service.backend. Apply when working on any
  service or route that creates, updates, or deletes user data, performs an
  authentication action, or otherwise changes state that needs forensic record.
---

# Audit Logging

The backend separates **operational logs** (Layer 1 — `logger.*`) from **audit
events** (Layer 2 — durable `audit_logs` table). This skill is about Layer 2.

| | Layer 1 — `logger.*` | Layer 2 — audit |
|---|---|---|
| Purpose | Debugging, ops | Forensics: who did what to what |
| Storage | console + files + Loki | `audit_logs` table + Loki |
| Mutable | Yes | No (immutable, append-only) |
| How | `logger.info/warn/error` | `AuditLogService.log()` or `auditRoute()` |

## When to audit (Layer 2)

Emit an audit row for any action a security/compliance reviewer would want to
reconstruct months later:

- Create / update / delete of business entities (users, pets, applications, rescues,
  invitations, etc.)
- Authentication events (login, logout, password reset, MFA changes)
- Authorisation changes (role grant, permission change, suspension)
- Sensitive reads (admin viewing a user's PII record) — use `audit: true` on `fieldMask`
- Bulk operations, exports, data deletions

Don't audit pure read-only endpoints unless they expose sensitive data. Don't audit
health checks, static assets, or anything a system user couldn't act on.

## Decision rule: pick exactly ONE path

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Service runs the write inside a Sequelize transaction?                 │
│  ──────────────────────────────────────────────────────────────────────│
│   Yes  →  AuditLogService.log({..., transaction: t}) INSIDE the service │
│   No   →  Background job / cron / consumer?                             │
│             Yes →  AuditLogService.log(...) — no transaction needed     │
│             No  →  Route-level CRUD?                                    │
│                     Yes → auditRoute({...}) middleware                  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Never combine both.** `auditRoute()` fires AFTER `res.finish`, which is OUTSIDE
the service transaction — combining produces duplicate rows and breaks atomicity.

## Path A — Inside a service transaction (preferred for writes)

```typescript
import sequelize from '../sequelize';
import { AuditLogService } from './auditLog.service';

return sequelize.transaction(async t => {
  const pet = await Pet.create(payload, { transaction: t });

  await AuditLogService.log({
    userId: actorUserId,
    action: 'CREATE',
    entity: 'Pet',
    entityId: pet.petId,
    details: { name: pet.name, rescueId: pet.rescueId },
    transaction: t,                     // ← critical — commits with the write
  });

  return pet;
});
```

`pet.service.ts:174`, `application.service.ts:524`, `invitation.service.ts`,
`foster.service.ts`, `field-permission.service.ts` follow this pattern.

## Path B — Route-level middleware (route does the write directly)

For lightweight CRUD routes whose controllers don't open a service-level transaction.
The middleware registers `res.on('finish')` and writes the audit row only on 2xx
responses.

```typescript
import { auditRoute } from '../middleware/audit-route';

router.put('/:petId',
  petIdParam,
  auditRoute({
    action: 'APPLICATION_DRAFT_UPSERTED',
    entity: 'ApplicationDraft',
    entityIdFrom: 'params.petId',
    metadataFrom: ['body.status'],          // optional extra details
  }),
  (req, res) => ApplicationDraftController.upsertDraft(req, res)
);
```

`application-draft.routes.ts`, `cms.routes.ts`, `reports.routes.ts` use this.

Trade-off: cannot share a transaction with the handler. Acceptable when the audit row
is best-effort observation rather than transactional invariant.

## Path C — Background job / cron / consumer

No transaction needed because there's no HTTP request to scope to. Just call:

```typescript
await AuditLogService.log({
  userId: 'system',
  action: 'DATA_RETENTION_PURGE',
  entity: 'User',
  entityId: user.userId,
  details: { reason: 'gdpr-retention-window-elapsed' },
});
```

## Capturing before/after for UPDATEs

For sensitive entity updates, record the diff so the audit row tells the full story.

### Option 1 — Read previous row in the same transaction

```typescript
const before = await FieldPermission.findOne({ where: {...}, transaction: t });
await record.update(changes, { transaction: t });

await AuditLogService.log({
  userId: actorUserId,
  action: 'UPDATE',
  entity: 'FieldPermission',
  entityId: record.id,
  details: { before: before?.toJSON(), after: record.toJSON() },
  transaction: t,
});
```

See `field-permission.service.ts upsert()`.

### Option 2 — diffSequelize helper

For models you mutate with `instance.set()` before `instance.save()`:

```typescript
import { diffSequelize } from '../utils/audit-diff';

pet.set(changes);
const delta = diffSequelize(pet, ['name', 'description', 'rescueId']);
await pet.save({ transaction: t });

await AuditLogService.log({
  userId: actorUserId,
  action: 'UPDATE',
  entity: 'Pet',
  entityId: pet.petId,
  details: delta,
  transaction: t,
});
```

The allowlist prevents accidentally auditing internal fields.

## Action and entity naming

`action` is an UPPER_SNAKE_CASE verb phrase. Common values are in the
`AuditLogAction` enum in `auditLog.service.ts`. Prefer the enum value; only add a new
one with a clear domain reason.

| Pattern | Example |
|---------|---------|
| Generic CRUD | `CREATE`, `UPDATE`, `DELETE` |
| Auth | `LOGIN`, `LOGOUT`, `PASSWORD_RESET`, `EMAIL_VERIFICATION` |
| Domain event | `RESCUE_VERIFIED`, `APPLICATION_APPROVED`, `STAFF_INVITED` |

`entity` is PascalCase singular matching the model name: `User`, `Pet`, `Application`.

`entityId` is the primary key as a string.

## PII and secrets

`details` is redacted by the Winston logger config, but treat the column as durable
storage. Never put:

- Plain-text passwords, reset tokens, MFA secrets
- Full credit card or bank account numbers
- Unredacted government IDs

Capture identifiers (userId, email, last4) instead.

## Why not just `logger.info()`?

`logger.info` writes to a rotated file + Loki. Logs are queryable for ops but:
- Get compacted away
- Have no schema
- Aren't a system-of-record for compliance

`audit_logs` is the durable record. Use both layers — log for ops noise, audit for
forensics.

## Common mistakes

- Forgetting `transaction: t` inside a service transaction → audit row commits even
  if the business write rolls back
- Using `auditRoute()` on a route whose service runs a transaction → duplicate rows,
  one of them outside the tx
- Auditing reads that aren't sensitive → noisy table, no value
- Putting secrets in `details` → durable leak
- Inventing new `action` values that overlap with existing ones (e.g. `USER_CREATED`
  when `CREATE` + `entity: 'User'` already conveys it)
- Skipping the `await` — fire-and-forget audit calls are silently dropped on error
