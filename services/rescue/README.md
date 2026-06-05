# service.rescue

Rescue vertical — Phase 4 of the microservices migration.

Owns the `rescue.*` schema (Rescue, RescueSettings, StaffMember,
Invitation, FosterPlacement, ApplicationQuestion) and exposes
`RescueService` over gRPC.

Classical (no event sourcing — mostly CRUD with a few status
transitions). Subscribes to `auth.userCreated` to maintain
staff-member denormalisation (CAD-style cross-service maintained
read model).

## What's shipped so far

**Phase 4.1** — boot skeleton:
- `src/index.ts` starts a Fastify server on `RESCUE_PORT` (default
  5004), wires `/health/simple`.
- `src/instrumentation.ts` boots OpenTelemetry via
  `@adopt-dont-shop/observability` with `serviceName: 'service.rescue'`.
- `src/config.ts` env validation. Hard-requires `DATABASE_URL` so
  misconfiguration fails fast at boot rather than at first request.
- `src/server.ts` `createServer({ config, logger? })`.

**Phase 4.2** — `rescue.*` schema + migrations:
- `001_create_rescues.ts` — the headline organisation row (name,
  contact, address, status / verification machinery, settings JSON).
  Creates the `citext` extension in `public` for the case-insensitive
  email column.
- `002_create_rescue_settings.ts` — 1:1 typed-preference table keyed
  on `rescue_id` (CASCADE FK to rescues).
- `003_create_staff_members.ts` — user↔rescue join with verification +
  onboarding trail. Phase 4.4 subscribes to `auth.userCreated` to
  denormalise into here when invitees register.
- `004_create_invitations.ts` — pending-staff invitation row
  (signed token + expiry). Not paranoid — the monolith hard-deletes
  on accept; we preserve that contract.
- `005_create_foster_placements.ts` — active/completed/cancelled
  foster runs per pet per rescue. Partial-unique on
  `(pet_id, status='active', deleted_at IS NULL)` enforces "one active
  placement at a time".
- `006_create_application_questions.ts` — rescue-configurable
  adoption questionnaire rows; 3 enums (scope / category /
  question_type), two partial-unique indexes (per-rescue + global
  core).
- All `rescue_id` FKs are INTRA-schema (CASCADE). User pointers and
  cross-vertical entity IDs (`pet_id`, `foster_user_id`, audit
  `created_by`/`updated_by`) stay FK-free per the schema-per-service
  rule.
- `src/db/migrate.ts` runs them via `@adopt-dont-shop/db.runMigrations`.
  Run with `npm run db:migrate`.

## What's NOT here yet

- **Phase 4.3** — gRPC `RescueService`:
  - proto + grpc-js stubs in `@adopt-dont-shop/proto`
  - handler logic (CRUD + verify / invite-staff transitions)
  - gRPC server boot + adapter (same pattern as service.pets)
- **Phase 4.4** — NATS publishers (`rescue.created`,
  `rescue.verified`, `rescue.staffInvited`, etc.) + subscriber for
  `auth.userCreated` to denormalise staff_member rows.
- **Phase 4.5** — Gateway routes `/api/rescue/*` here.
- **Phase 4.6** — Cutover: monolith's rescue code becomes dead,
  removal bundled into Phase 11.

## Configuration

| Env var            | Default            | Required | Purpose                                                                  |
| ------------------ | ------------------ | -------- | ------------------------------------------------------------------------ |
| `RESCUE_PORT`      | `5004`             |          | HTTP port for `/health/simple`.                                          |
| `RESCUE_GRPC_PORT` | `6004`             |          | gRPC port `RescueService` will bind (Phase 4.3c).                        |
| `RESCUE_HOST`      | `0.0.0.0`          |          | Bind interface (both HTTP + gRPC).                                       |
| `RESCUE_SCHEMA`    | `rescue`           |          | Postgres schema. Override for parallel test DBs.                         |
| `DATABASE_URL`     | —                  | ✅       | Postgres connection string. Same physical Postgres as `service.backend`. |
| `NATS_URL`         | `nats://nats:4222` |          | NATS bus URL.                                                            |
| `NODE_ENV`         | `development`      |          | Surfaces in health + logs.                                               |

Plus the standard observability env vars consumed by
`@adopt-dont-shop/observability`.

## Running

```bash
# Dev — hot reload, OTel SDK loaded via --import
npm run dev

# Production build
npm run build
npm run start
```
