# Testing strategy and scope

This document is the authoritative reference for what is — and is not —
covered by automated tests in this repository.

## Test runners

| Runner     | Where it lives                           | What it covers                                                  |
| ---------- | ---------------------------------------- | --------------------------------------------------------------- |
| Vitest     | every `services/*`, `app.*`, and `lib.*` | Behaviour-driven tests for services, components, libraries      |
| Vitest     | `scripts/` (`pnpm test:scripts`)         | The repo's own DX guard-scripts (see below)                     |
| Playwright | `e2e/`                                   | Cross-app integration journeys against the docker-compose stack |

Each backend service — and every `packages/lib.*` — owns its own
`vitest.config.ts`, which declares and enforces that package's coverage
thresholds (see CONTRIBUTING.md "Coverage thresholds", ADS-1004).
`pnpm test:coverage` in that workspace fails the build below the thresholds.

## E2E gating

The Playwright `test-e2e` job in `.github/workflows/ci.yml` is opt-in per
PR — it runs only when the PR carries the `run-e2e` label (or on `main`
push / manual dispatch). When it runs it is a required check and blocks
merge on failure; unlabelled PRs skip the job entirely to keep the
default CI path fast. See CONTRIBUTING.md for the label workflow.

## Scope: payment / donation processing — out of scope

A repo-wide search for `stripe`, `paypal`, `payment`, and `donation`
returns no production code paths that handle money:

- The single `payment` reference in `packages/lib.support-tickets/src/schemas.ts`
  is the enum value `'payment_issue'` used to categorise support tickets
  — there is no payment processing behind it.
- No service file touches a card processor SDK.
- No frontend route renders a checkout/donation form.

Adoption is intentionally a free workflow: rescues vet adopters and
transfer pets without payment. Donations, if ever introduced, would
arrive as a discrete feature with its own stripe/paypal integration and
test suite.

**Conclusion (ADS-529):** payment and donation flows are explicitly out
of scope for the launch. They should not appear as gaps in production
readiness audits unless product reverses this decision. If that
happens, this document and the audit checklists must be updated in the
same PR that introduces the feature.

## Behaviour-driven testing rules

The full ruleset lives in `.claude/CLAUDE.md`. The tactical reminders
that come up most often:

- No `as any`, no private-method spies, no implementation-detail tests.
- Test through public APIs; for gateway routes that means Fastify's
  `inject()` with `vi.mock()` on the downstream gRPC clients; for gRPC
  handlers, invoke the handler function directly with a synthetic
  context.
- 100% coverage of behaviour is the aspiration, but coverage thresholds
  (see `vitest.config.ts`) define the _enforced_ floor.

## `scripts/` test guard

`scripts/` holds the repo's own enforcement — `check-workspace-consistency.mjs`,
`check-docker-pinning.mjs`, `check-docs-freshness.mjs`, the `new-app`/`new-lib`
generators, and their shared libs. These are tested by a dedicated Vitest
project (`vitest.scripts.config.ts`, run via `pnpm test:scripts`) since
`scripts/` is not a pnpm workspace and `turbo run test` never reaches it. CI
runs it in the `workspace-drift` job before the guard-script steps, and
`pnpm ci:local` includes it too — a regression here fails open (a guard
silently stops catching what it was meant to catch), so it must run
everywhere the guards do.

## `lib.*` test guard

`scripts/check-lib-tests.mjs` fails CI if any `lib.*` package ships with
zero test files. The allowlist is currently empty (ADS-528) — if you
add a new library that legitimately has no testable behaviour, add it
to the allowlist with a Linear ticket reference and a plan to remove
the entry.

## Backend specifics

Backend tests are Vitest, colocated with the source (`handlers.ts` next to
`handlers.test.ts`; no `__tests__/` directory). They exercise behaviour through public APIs.
The pyramid:

- **Gateway route tests** (`services/gateway/src/routes/*.test.ts`) — build the server with
  Fastify and drive it through `inject()`, with `vi.mock()` on the downstream gRPC clients so
  no real service is needed. Worked example: `services/gateway/src/routes/pets.test.ts`.
- **gRPC handler tests** (`services/<name>/src/grpc/*.test.ts`) — call the handler function
  directly with a synthetic `(deps, principal, request)` context; there is no server or
  transport in the loop. Worked example: `services/pets/src/grpc/handlers.test.ts`.
- **Pure unit tests** — adapters, mappers, and domain logic tested in isolation.

### `@adopt-dont-shop/test-utils`

Shared helpers for the services, added as a devDependency
(`packages/test-utils/src/index.ts`):

| Export                | Use                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------- |
| `startStubGrpcServer` | Start an in-process gRPC server on an ephemeral port for contract/integration tests |
| `testPrincipal`       | Build a `Principal` with sensible defaults (override per test)                      |
| `metadataFor`         | Serialise a `Principal` into the `x-user-*` gRPC metadata the gateway stamps        |
| `makeNatsDouble`      | A NATS/JetStream publish-recording double for asserting emitted events              |
| `withTestDatabase`    | Migrate a throwaway Postgres schema, yield a real `pg.Pool`, drop it (see below)    |

### Integration tests (real Postgres) — ADS-1315

Everything above runs against mocks — a fake `pg.Pool`, a fake NATS connection. That's the
right default (fast, no external dependency) but it means SQL correctness, real transaction
semantics, and the events transactional-outbox seam were never exercised against an actual
database. `@adopt-dont-shop/test-utils`'s `withTestDatabase` closes that gap for the small set of
cases where it matters:

```ts
import { describe, expect, it } from 'vitest';
import { withTestDatabase } from '@adopt-dont-shop/test-utils';

describe.skipIf(!process.env.DATABASE_URL)('my real-DB behaviour', () => {
  it('does the real thing', async () => {
    await withTestDatabase(
      { schemaPrefix: 'my_thing', migrationsDir: MIGRATIONS_DIR },
      async pool => {
        // pool is a real, migrated pg.Pool scoped to a throwaway schema.
      }
    );
  });
});
```

`withTestDatabase(options, fn)`:

- Generates a throwaway schema name (`<schemaPrefix>_test_<random>`), runs the target
  `migrationsDir`'s migrations against it via `runMigrations` (the same helper `db:migrate` and
  container boot use), and hands `fn` a real `pg.Pool` scoped to that schema.
- Drops the schema and closes the pool when `fn` settles (success or throw).
- Reads `DATABASE_URL` from the environment by default (override via `options.databaseUrl` for a
  test that needs a different target — rare).
- `options.exactSchemaName: true` uses `schemaPrefix` verbatim instead of appending the random
  suffix. Needed only when a service's committed migrations reference their own schema by
  **literal name** in raw SQL (`pgm.sql('UPDATE auth.refresh_tokens ...')`, not through
  node-pg-migrate's schema-aware helpers) — fixing that migration is not an option (never modify
  a shipped migration), so the test uses the schema name the migration hardcodes instead. Callers
  that set this must not run two suites against the same exact name concurrently; sequential `it`
  blocks within one file (the common case) are safe.
- `options.registerTsxLoader: true` registers `tsx`'s module loader (the same one `pnpm
db:migrate` runs under) before running migrations. Needed only when a migration imports a
  sibling module via a `.js` specifier that resolves to a `.ts` file — resolving that is a
  loader-hook feature, not something Node's native TypeScript support does on its own (e.g.
  `services/auth/src/migrations/027_encrypt_totp_secrets.ts` imports `./totp-crypto.js`). Leave
  it off unless a migration actually needs it — registering it unconditionally can turn an
  in-process-generated migration file that re-exports an already-loaded module into a
  `require(esm)`-in-a-cycle failure (see the module comment in
  `packages/test-utils/src/test-database.ts` and `packages/events/src/outbox.integration.test.ts`
  for the concrete case and the workaround).

**Naming and skip convention.** Real-DB tests live in `*.integration.test.ts` files (not mixed
into the regular `*.test.ts` suite) and their top-level `describe` is always guarded with
`describe.skipIf(!process.env.DATABASE_URL)` — the suite reports **skipped**, never silently
passed, when no database is configured. Two suites exist today as the worked examples:

- `packages/events/src/outbox.integration.test.ts` — the transactional-outbox
  publish-after-commit semantics (`withTransaction`): commit delivers and self-cleans the outbox
  row, a thrown business fn really rolls back (no row, no event), and a failed inline delivery
  leaves the event durably queued for the relay. Uses `makeNatsDouble()` for NATS — the point is
  Postgres transaction semantics, not the wire protocol.
- `services/auth/src/grpc/handlers.integration.test.ts` — the RBAC seed → `loadPrincipal` →
  `hasPermission` path: seeds a user with a role, runs every real migration (including the RBAC
  grant seeds), and proves the seeded grants produce the intended allow/deny outcome. Uses
  `exactSchemaName: true` (auth's migration 025 hardcodes `auth.refresh_tokens`) and
  `registerTsxLoader: true` (migration 027's cross-file import).

**Running locally.** Point `DATABASE_URL` at any reachable Postgres with the `citext` and
`postgis` extensions available (the `postgis/postgis` image ci.yml and docker-compose use ships
both) — a superuser role that can `CREATE EXTENSION` and `CREATE SCHEMA` is required:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres \
  pnpm --filter @adopt-dont-shop/service.auth test handlers.integration.test.ts
```

Without `DATABASE_URL` set, the same command reports the suite as skipped rather than failing.

**In CI.** `ci.yml`'s `test-services` job runs a `postgis/postgis` service container (matching
the image `docker-compose.prod.yml` runs) and sets `DATABASE_URL` for the whole job, so every
`*.integration.test.ts` under `services/*` runs for real on every backend-touching PR. A real
NATS container was deliberately not added — the two suites above use `makeNatsDouble()`, and
nothing yet needs a real broker; add one to `test-services` following the same `services:` shape
if a future suite does.

### Running backend tests

Run from a `services/<name>` package, or filtered from the repo root:

```bash
pnpm exec turbo test --filter=@adopt-dont-shop/service.pets   # one service
pnpm test                       # all tests in the current package
pnpm test:watch                 # watch mode
pnpm test:coverage              # coverage (fails below the package's floor)
pnpm test handlers.test.ts      # Vitest substring filter
```

There are no separate `test:integration` / `test:e2e` scripts in a service — route and
integration tests run in the same Vitest invocation; target them by substring or path. Each
service configures Vitest in its own `vitest.config.ts`; the services do not use Jest.

Vitest reads the database via the `DB_*` / `TEST_DB_NAME` env vars (see `.env.example`). In
Docker, confirm the database is healthy first (`docker compose ps database`); each service runs
its own `db:migrate` on boot.
