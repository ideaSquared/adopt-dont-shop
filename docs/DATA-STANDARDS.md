# DATA-STANDARDS.md

Engineering reference for all data modelling decisions in the `adopt-dont-shop` monorepo. These rules apply to every model in `service.backend/src/models/` and every migration in `service.backend/src/migrations/`. When a rule is marked **Aspirational**, the standard is defined here but not yet fully enforced in code.

---

## 1. Primary Keys

Every domain entity uses a **UUIDv7** primary key.

- Column name: `{entity}_id` (e.g. `user_id`, `pet_id`, `application_id`).
- UUIDv7 is time-ordered, so it is lexically sortable and B-tree index friendly without a separate sequence.
- Reference / lookup tables (`roles`, `permissions`) may use `INTEGER GENERATED ALWAYS AS IDENTITY` — they rarely grow and are never referenced across service boundaries.
- Composite PKs are permitted only on pure join tables (`user_roles`, `role_permissions`).
- In TypeScript, every ID type is a **branded type** declared in `lib.types`:

```typescript
type Brand<T, B> = T & { readonly __brand: B };
export type UserId   = Brand<string, 'UserId'>;
export type PetId    = Brand<string, 'PetId'>;
export type RescueId = Brand<string, 'RescueId'>;
```

Passing a `PetId` where a `UserId` is expected is a compile-time error.

Helper: `service.backend/src/utils/uuid.ts`.

---

## 2. Naming Conventions

- TypeScript model properties: `camelCase`.
- Database columns: `snake_case`.
- Every model sets `underscored: true` in its options. Every FK is declared with an explicit `field:` override — never rely on Sequelize's implicit snake-casing.
- Association `foreignKey` declarations always use the snake\_case column name (e.g. `foreignKey: 'rescue_id'`), not the JS alias.

Non-negotiable: the `standards.test.ts` suite (see rule 20) asserts `options.underscored === true` on every registered model and will fail a PR that omits it.

---

## 3. Timestamps

- All `*_at` columns are `TIMESTAMPTZ` (`TIMESTAMP WITH TIME ZONE`). Never bare `TIMESTAMP`.
- Sequelize `DataTypes.DATE` emits `TIMESTAMPTZ` on Postgres — verify no migration overrides this.
- Date-only values (birth date, expiry date with no time component) use `DATE` (`DataTypes.DATEONLY`).
- Time-of-day values with no date (e.g. `quiet_hours_start`) use `TIME` and must be accompanied by an explicit `timezone TEXT NOT NULL DEFAULT 'UTC'` sibling column so the time is unambiguous.
- The standard trio `created_at`, `updated_at`, `deleted_at` must use exactly these names. No custom timestamp column names for the same concepts.

---

## 4. Status Modelling

Workflow-heavy entities (`Application`, `Pet`, `HomeVisit`, `UserSanction`, `Report`) model status as an **append-only transition log**, not a mutable status column maintained by hooks.

Pattern:
```
{entity}_status_transitions
  transition_id    UUID PK
  {entity}_id      UUID FK → {entity}  ON DELETE CASCADE
  from_status      ENUM | null          -- null = initial
  to_status        ENUM NOT NULL
  transitioned_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  transitioned_by  UUID FK → users | null
  reason           TEXT | null
  metadata         JSONB | null
```

Transitions are **immutable** — no `updated_at`, no soft-delete.

The parent table carries a `current_status` column maintained exclusively by an `AFTER INSERT` trigger on the transitions table. Application code never writes `current_status` directly; it inserts a transition row and the trigger updates the parent. This makes reads O(1) and the full history free.

Guards: `CHECK (current_status IS NOT NULL)` on the parent; `CHECK (from_status IS DISTINCT FROM to_status)` on the transitions table.

Status timestamps (`submitted_at`, `decision_at`, etc.) are derived from the transitions table via a `{entity}_status_timestamps` view — no duplicated timestamp columns on the parent.

---

## 5. Enum Rule

| Scenario | Mechanism |
|---|---|
| Stable taxonomy — unlikely to change without a deploy | Postgres `ENUM` type; TypeScript `enum` mirrors it |
| Mutable — business might add/rename values at runtime | Lookup reference table with a FK |

Examples of stable enums: `UserStatus`, `Gender`, `PetStatus`, `ApplicationStatus`. Examples of mutable data that should be lookup tables: `breeds` (500+ values, unbounded), report categories (moderators may add new ones).

Changing a Postgres ENUM requires `ALTER TYPE` and cannot reorder or remove values. When in doubt, use a lookup table.

---

## 6. JSONB Rule

JSONB is for **opaque pass-through data** where schema is unknown or irrelevant at build time:

- Provider API responses (`email_queue.tracking`, `payment_events.provider_response`)
- Gesture or event payloads (`swipe_actions.gesture_data`)
- Audit metadata bags (`audit_logs.metadata`)

JSONB is **not** for:

- User or rescue preferences — use typed relational tables (`user_notification_prefs`, `rescue_settings`).
- Structured arrays that will be queried individually — use child tables with FKs (`pet_media`, `application_references`, `application_answers`, `message_reactions`).
- Any field where the business will eventually want to filter, sort, or aggregate on a sub-field.

When a JSONB column is unavoidable, validate its shape with a Zod schema in the model's `beforeValidate` hook.

---

## 7. Soft-Delete

Use Sequelize's built-in `paranoid: true` on every model that requires soft-delete. This adds `deleted_at TIMESTAMPTZ NULL` automatically and scopes all queries to exclude soft-deleted rows by default.

- No custom `is_deleted BOOLEAN` columns.
- No manual `where: { isDeleted: false }` scopes.
- If a `deleted_by` audit field is needed alongside soft-delete, add it as a normal nullable FK column and set it in a `beforeDestroy` hook.

Consistency check: the `standards.test.ts` suite asserts that every model in the "soft-deletable" whitelist has `paranoid: true`.

---

## 8. Audit Columns

Every **transactional** model (i.e. any model that records a business event or stores user-generated data) requires three extra columns:

- `created_by UUID | null` — FK to `users`, `SET NULL` on user delete. Null for system-generated rows.
- `updated_by UUID | null` — FK to `users`, `SET NULL` on user delete.
- `version INTEGER NOT NULL DEFAULT 0` — incremented on every update via Sequelize's built-in `version: true` option. Enables optimistic concurrency: a stale `PATCH` will fail with a version conflict rather than silently overwriting concurrent changes.

Reference tables (`roles`, `permissions`, `breeds`) are exempt.

Helper factory: `service.backend/src/models/audit-columns.ts`.

---

## 9. Money

Never store money as a float or `DECIMAL`.

```
adoption_fee_minor    INTEGER NOT NULL CHECK (adoption_fee_minor >= 0)
adoption_fee_currency CHAR(3)  NOT NULL CHECK (adoption_fee_currency ~ '^[A-Z]{3}$')
```

- `*_minor` holds the amount in the smallest unit of the currency (pence, cents, etc.).
- `*_currency` holds the ISO 4217 three-letter code.
- Expose via a `Money` type in `lib.types`: `{ amount: number; currency: CurrencyCode }` with a dedicated formatter — never format money in ad-hoc application code.
- The `CHECK` on currency is enforced at the DB level; validation with a `CurrencyCode` Zod enum is enforced at the service layer.

---

## 10. Foreign Keys

Every FK must declare:

1. **`onDelete`** explicitly — no implicit defaults. Choose one:
   - `CASCADE` — child is meaningless without parent (e.g. `pet_media → pets`, `*_status_transitions → parent`).
   - `SET NULL` — child survives for audit purposes (e.g. `audit_logs.user_id`, `applications.reviewed_by`).
   - `RESTRICT` — deletion should be blocked until the dependency is resolved (e.g. a rescue with active pets).

2. **An index on the FK column** — Postgres does not auto-index FK columns. A missing index turns parent-row deletes into full sequential scans of every child table. This is consistently one of the top causes of slow production deletes.

Document the choice inline:
```typescript
{ foreignKey: { name: 'user_id', onDelete: 'SET NULL' } }
```

The `standards.test.ts` suite asserts that every FK column has a matching entry in `indexes`.

---

## 11. Defaults

Every column with a default value must have that default set **in two places**:

1. `defaultValue:` in the Sequelize model definition.
2. `DEFAULT` clause in the migration.

If the DB default is missing, raw SQL inserts and bulk-seed scripts will produce null values. If only the DB default exists, TypeScript types will show the field as potentially undefined. Both must be present.

---

## 12. Generated Columns

Derived columns that can be computed from other columns in the same row must be declared as `GENERATED ALWAYS AS ... STORED` in the migration, not maintained by hooks.

Example — full-text search vector:
```sql
search_vector TSVECTOR GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B')
) STORED
```

A GIN index is added separately on the generated column. This eliminates drift between the column value and the source fields — the DB always keeps it current without any application-layer hook.

---

## 13. Email and Phone

- **Email columns** are typed `CITEXT` (case-insensitive text extension). The unique index becomes case-insensitive automatically, preventing two users from registering as `Foo@x.com` and `foo@x.com`. Whitespace is still trimmed in a `beforeValidate` hook.
- **Phone numbers** are stored in **E.164 format** (e.g. `+447911123456`). Normalization via `libphonenumber-js` is applied in `beforeValidate`. If the original user-supplied format is needed for display, store it in a separate `phone_number_raw TEXT` column.

---

## 14. Immutable `created_at`

A database trigger on every table rejects `UPDATE` statements that attempt to change `created_at`:

```sql
CREATE TRIGGER enforce_created_at_immutable
BEFORE UPDATE ON {table}
FOR EACH ROW WHEN (OLD.created_at IS DISTINCT FROM NEW.created_at)
EXECUTE FUNCTION raise_immutable_created_at();
```

This is defence in depth against ORM misuse and raw SQL maintenance scripts. The trigger is applied in the baseline migration for every table.

---

## 15. Secrets at Rest

One-shot tokens (password reset, email verification, invite, backup codes, unsubscribe) are **never stored in plaintext**. Store the SHA-256 hash of the token; compare the hash on redemption:

```typescript
const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
```

Two-factor authentication secrets (`twoFactorSecret`) are encrypted at rest using AES-256-GCM with an application-level key. If the database is exfiltrated, the raw secret is not exposed.

`EmailPreference.unsubscribeToken` must be generated with `crypto.randomBytes(32).toString('base64url')` — not with `generateReadableId`, which produces guessable output.

Helpers: `service.backend/src/utils/secrets.ts`.

---

## 16. Migrations

- One migration file per logical change. Never bundle unrelated changes.
- Filename format: `{NN}-{verb}-{subject}.ts` (e.g. `36-add-citext-to-users.ts`). Sequential numbering.
- Every migration includes both `up` and `down` methods.
- Every unique, check, and FK constraint is given an **explicit name** in the migration (e.g. `users_email_unique`, `fk_pet_media_pet_id`). Postgres auto-names are not reliable across schema drifts.
- `sync({ alter: true })` is **prohibited in production**. It is allowed only in test setup (`test-db-setup.ts`, `setup-tests.ts`). The production startup path must not call sync with `alter` or `force`.

---

## 17. ISO Codes

All geographic and locale codes are stored in their canonical formats and validated at the DB level with CHECK constraints:

| Data | Column type | Constraint |
|---|---|---|
| Country | `CHAR(2)` | `CHECK (country ~ '^[A-Z]{2}$')` (ISO 3166-1 alpha-2) |
| Language | `VARCHAR(10)` | `CHECK (language ~ '^[a-z]{2,3}(-[A-Z]{2})?$')` (BCP 47) |
| Currency | `CHAR(3)` | `CHECK (currency ~ '^[A-Z]{3}$')` (ISO 4217) |

TypeScript mirrors these as branded types or narrow string literals in `lib.types`.

---

## 18. Addresses as a First-Class Entity

User and rescue addresses are stored in a dedicated `addresses` table — not as inline columns on the parent:

```
addresses
  address_id   UUID PK
  owner_type   ENUM (user|rescue)
  owner_id     UUID
  label        TEXT | null           -- 'home', 'mailing'
  line_1       TEXT NOT NULL
  line_2       TEXT | null
  city         TEXT NOT NULL
  region       TEXT | null
  postal_code  TEXT NOT NULL
  country      CHAR(2) NOT NULL
  location     GEOGRAPHY(Point, 4326) | null
  is_primary   BOOLEAN NOT NULL DEFAULT false
  created_at   TIMESTAMPTZ NOT NULL
  updated_at   TIMESTAMPTZ NOT NULL
  UNIQUE (owner_type, owner_id) WHERE is_primary = true
```

The partial unique index ensures at most one primary address per owner. `HomeVisit` references an `address_id` FK rather than copying address fields.

---

## 19. Idempotency Keys

Every state-changing API endpoint (submit application, send message, process payment) accepts an `Idempotency-Key` request header. The key is stored hashed in a small table:

```
idempotency_keys
  key_hash        BYTEA PK           -- SHA-256 of the client-supplied key
  endpoint        TEXT NOT NULL
  user_id         UUID | null
  response_body   JSONB NOT NULL
  response_status INTEGER NOT NULL
  created_at      TIMESTAMPTZ NOT NULL
  expires_at      TIMESTAMPTZ NOT NULL  -- 24-hour retention
```

A retried request with the same key returns the cached response without executing the operation again. This prevents double-submitted applications and duplicate charges.

---

## 20. Standards Enforcement Test

`service.backend/src/__tests__/models/standards.test.ts` is the ongoing enforcement mechanism. It iterates `sequelize.models` at runtime and asserts that every model satisfies:

- `options.underscored === true`
- Primary key is UUID with a default (whitelisted INTEGER PKs on reference tables are exempt)
- Every FK column has a matching index entry
- Every `created_at` / `updated_at` / `deleted_at` column is `TIMESTAMPTZ`, not bare `TIMESTAMP`
- No column uses `DataTypes.JSON` (on Postgres, always use `DataTypes.JSONB`)
- Every model on the soft-delete whitelist has `paranoid: true`
- Every transactional model has `created_by`, `updated_by`, and `version`

This test must pass on every PR. A model that is missing any required property cannot be merged.

---

## Where the Rules Live

| Concern | File |
|---|---|
| Sequelize dialect helpers (`getJsonType`, `getUuidType`, etc.) | `service.backend/src/sequelize.ts` |
| Audit column factory (`created_by`, `updated_by`, `version`) | `service.backend/src/models/audit-columns.ts` |
| Secret hashing and encryption helpers | `service.backend/src/utils/secrets.ts` |
| UUIDv7 generator | `service.backend/src/utils/uuid.ts` |
| Standards enforcement test | `service.backend/src/__tests__/models/standards.test.ts` |
