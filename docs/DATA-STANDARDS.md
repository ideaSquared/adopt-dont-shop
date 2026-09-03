# Data Standards

Engineering reference for data-modelling decisions across the `adopt-dont-shop` services. These
rules apply to every migration owned by a backend service (`services/<name>/src/migrations/`).
Persistence is raw SQL over `pg` via `@adopt-dont-shop/db` and `node-pg-migrate` — there is no
ORM, no models directory, and no Sequelize. Rules marked **Aspirational** are defined here but
not yet enforced in code.

Last reviewed: 2026-09-03.

## 1. Primary keys

Every domain entity uses a **UUIDv7** primary key.

- Column name `{entity}_id` (e.g. `user_id`, `pet_id`, `application_id`).
- UUIDv7 is time-ordered, so it is lexically sortable and B-tree friendly without a sequence.
- Reference/lookup tables (`roles`, `permissions`) may use
  `INTEGER GENERATED ALWAYS AS IDENTITY` — they rarely grow and are never referenced across
  service boundaries.
- Composite PKs are permitted only on pure join tables (`user_roles`, `role_permissions`).
- In TypeScript every ID is a **branded type** in `lib.types`, so passing a `PetId` where a
  `UserId` is expected is a compile-time error:

```typescript
type Brand<T, B> = T & { readonly __brand: B };
export type UserId = Brand<string, 'UserId'>;
export type PetId = Brand<string, 'PetId'>;
```

## 2. Naming

- Database columns are `snake_case`; the TypeScript fields that carry them are `camelCase`, with
  the mapping done explicitly in the handler's row-to-object code (there is no ORM to
  auto-snake-case).
- Migration files are `NNN_snake_case.ts` (see §11).

## 3. Timestamps

- All `*_at` columns are `TIMESTAMPTZ` (`timestamp with time zone`), never bare `TIMESTAMP`.
- Date-only values (birth date, expiry with no time) use `DATE`.
- Time-of-day values with no date (e.g. `quiet_hours_start`) use `TIME` and carry an explicit
  `timezone TEXT NOT NULL DEFAULT 'UTC'` sibling column so the time is unambiguous.
- Use exactly the names `created_at`, `updated_at`, `deleted_at` for those three concepts.

## 4. Status modelling

Workflow-heavy entities model status as an **append-only transition log**, not a mutable column
poked from application code. This is implemented for pets, applications, home visits, and
moderation reports (`pet_status_transitions`, `application_status_transitions`,
`home_visit_status_transitions`, `report_status_transitions`).

```
{entity}_status_transitions
  transition_id    UUID PK
  {entity}_id      UUID FK → {entity}  ON DELETE CASCADE
  from_status      TEXT | null          -- null = initial
  to_status        TEXT NOT NULL
  transitioned_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  transitioned_by  UUID | null
  reason           TEXT | null
```

Transition rows are immutable. The parent's `current_status` is maintained by an `AFTER INSERT`
trigger on the transitions table (a propagation trigger; see e.g.
`services/applications/src/migrations/006_install_home_visit_status_propagation_trigger.ts` and
`services/moderation/src/migrations/003_install_report_status_propagation_trigger.ts`).
Application code inserts a transition row; the trigger updates the parent, keeping reads O(1)
and the history free.

## 5. Enums

| Scenario                                    | Mechanism                                                  |
| ------------------------------------------- | ---------------------------------------------------------- |
| Stable taxonomy, changes only with a deploy | Postgres `ENUM` type; a TypeScript `enum`/union mirrors it |
| Mutable, business may add/rename at runtime | Lookup reference table with a FK                           |

Stable examples: `PetStatus`, `ApplicationStatus`, `Gender`. Mutable examples: `breeds`
(unbounded), moderation report categories. Changing a Postgres `ENUM` needs `ALTER TYPE` and
cannot reorder or remove values — when in doubt, use a lookup table.

## 6. JSONB

JSONB is for **opaque pass-through data** where the schema is unknown or irrelevant at build
time: provider API responses (`email_queue.tracking`), gesture/event payloads
(`swipe_actions`), and audit metadata bags (`audit_events.metadata`).

JSONB is **not** for:

- User or rescue preferences — use typed relational tables (`user_notification_prefs`,
  `rescue_settings`).
- Structured collections queried individually — use child tables with FKs (`pet_media`,
  `message_reactions`).
- Any field the business will eventually filter, sort, or aggregate on a sub-field.

Validate a JSONB column's shape with a Zod schema in the service layer before writing it.

## 7. Soft delete

Soft-deletable rows carry a plain nullable `deleted_at TIMESTAMPTZ`. There is no ORM default
scope, so **every read must exclude soft-deleted rows explicitly** in its `WHERE` clause
(`WHERE deleted_at IS NULL`). Do not invent an `is_deleted BOOLEAN`. If a `deleted_by` audit
field is needed, add it as a normal nullable column set in the same statement that soft-deletes.

## 8. Actor columns

Tables that store a business event or user-generated data carry `created_by UUID | null` and,
where updates are meaningful, `updated_by UUID | null` — both FKs to `users` that `SET NULL` on
user delete (null for system rows). Reference tables (`roles`, `permissions`, `breeds`) are
exempt. (There is no ORM-level optimistic-concurrency `version` column; concurrency is handled
per-handler where it matters.)

## 9. Money

Never store money as a float or `DECIMAL`. Store a minor-unit integer plus an ISO-4217 currency
code, as pets does today (`adoption_fee_minor` + `adoption_fee_currency CHAR(3)` default
`'GBP'`):

```
adoption_fee_minor    INTEGER CHECK (adoption_fee_minor >= 0)
adoption_fee_currency CHAR(3) CHECK (adoption_fee_currency ~ '^[A-Z]{3}$')
```

`*_minor` holds the smallest unit (pence, cents). Expose money through a `Money` type in
`lib.types` with a dedicated formatter — never format money ad hoc.

## 10. Foreign keys

Because schemas are service-owned, a FK to another aggregate is stored as a bare UUID and
enforced application-side (no cross-schema FK). For same-schema FKs:

1. Declare `ON DELETE` explicitly — `CASCADE` (child meaningless without parent, e.g.
   `pet_media → pets`), `SET NULL` (child survives for audit), or `RESTRICT` (block the delete).
2. **Index the FK column.** Postgres does not auto-index FKs; a missing index turns a
   parent-row delete into a sequential scan of the child table — a common cause of slow deletes.

## 11. Migrations

- One migration file per logical change; never bundle unrelated changes.
- Filename `NNN_snake_case.ts` (3-digit zero-padded prefix, then snake*case) — enforced by each
  service's `migrations.test.ts` against `/^\d{3}*[a-z0-9_]+\.ts$/`.
- Every migration has both `up` and `down`.
- Give every unique/check/FK constraint an explicit name; Postgres auto-names are not stable
  across drift.

Authoring detail lives in [`backend/writing-migrations.md`](./backend/writing-migrations.md);
that page is authoritative for the naming rule and failure recovery.

## 12. Generated columns

Columns derivable from other columns in the same row are declared
`GENERATED ALWAYS AS (…) STORED` in the migration, not maintained by application code — e.g. the
pets full-text search vector (`services/pets/src/migrations/010_pets_search_vector_generated.ts`):

```sql
search_vector TSVECTOR GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(long_description, '')), 'B')
) STORED
```

A GIN index is added separately. The DB keeps the value current with no drift.

## 13. Email and phone

- Email columns are `CITEXT` (case-insensitive), so the unique index rejects `Foo@x.com` vs
  `foo@x.com` automatically. Trim whitespace in the service layer before writing.
- Phone numbers are stored in **E.164** (e.g. `+447911123456`), normalized with
  `libphonenumber-js` before write. Keep the raw user input in a separate
  `phone_number_raw TEXT` column only if display needs it.

## 14. Append-only trigger protection

Two forensic tables are protected at the database level by a `BEFORE UPDATE OR DELETE` trigger
that raises on any mutation — defence in depth against ORM misuse or maintenance scripts:

- `audit.audit_events` — the `audit_events_immutable` trigger rejects all updates and deletes
  (`services/audit/src/migrations/001_create_audit_events.ts`).
- `applications.application_events` — the `application_events_immutable` trigger rejects updates
  and deletes, with a deliberate per-transaction escape hatch: setting the
  `applications.allow_event_mutation` GUC to `'on'` (via `SET LOCAL`) inside a transaction lets
  a controlled correction through (`services/applications/src/migrations/001_create_application_events.ts`).

There is no general "immutable `created_at`" trigger on every table.

## 15. Secrets at rest

- One-shot tokens (password reset, email verification, invite, backup codes, unsubscribe) are
  never stored in plaintext — store the SHA-256 hash and compare on redemption
  (`auth/024_hash_auth_tokens.ts`, `025_hash_refresh_tokens.ts`).
- TOTP secrets are encrypted at rest with AES-256-GCM under an application-level key
  (`auth/027_encrypt_totp_secrets.ts`).
- Generate unsubscribe/opaque tokens with `crypto.randomBytes(32).toString('base64url')`, never
  a human-readable id generator.

## 16. ISO codes

Geographic and locale codes are stored canonically and CHECK-constrained at the DB level:

| Data     | Type          | Constraint                              |
| -------- | ------------- | --------------------------------------- |
| Country  | `CHAR(2)`     | `~ '^[A-Z]{2}$'` (ISO 3166-1 alpha-2)   |
| Language | `VARCHAR(10)` | `~ '^[a-z]{2,3}(-[A-Z]{2})?$'` (BCP 47) |
| Currency | `CHAR(3)`     | `~ '^[A-Z]{3}$'` (ISO 4217)             |

TypeScript mirrors these as branded types or narrow string-literal unions in `lib.types`.
