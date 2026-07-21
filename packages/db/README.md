# @adopt-dont-shop/db

## Purpose

Postgres client + `node-pg-migrate` runner for the backend microservices. Bakes
in the four CAD-lesson fixes so every service that adds Postgres gets a working
setup from day one, plus the `schema`/`public` `search_path` for PostGIS
compatibility.

This is a service-only shared package (not a `lib.*`) — imported by
`services/*` boot + handlers. See the decision tree in
[`CONTRIBUTING.md`](../../CONTRIBUTING.md#where-does-my-code-go).

## Location in the architecture

See [`docs/README.md`](../../docs/README.md#libraries) for where the shared
packages sit. Every schema-owning service migrates through `runMigrations` at
boot and queries through `createDbClient`; `@adopt-dont-shop/seed-faker` runs
its bulk inserts over the same client.

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

- `createDbClient({ connectionString, schema })` — a pooled client that sets
  `search_path` on every new connection (unqualified table refs resolve
  service-locally; PostGIS types stay reachable in `public`).
- `runMigrations({ databaseUrl, schema, migrationsDir })` — the migration
  runner with the CAD-lesson fixes baked in.

The four baked-in fixes: `createSchema: true` (runner creates its
`pgmigrations` table inside the service schema — CAD #1); output-path
discipline so `migrationsDir` resolves identically in dev/prod (CAD #2);
`ignorePattern: '(\\..*|.*\\.map)'` so `.js.map` sidecars aren't `import()`ed
(CAD #3); and retry-with-linear-backoff around `node-pg-migrate`'s
database-wide advisory lock so services booting together don't crash (CAD #9,
up to 12 attempts × 250 ms).

## Environment variables consumed

None directly — callers pass `databaseUrl` / `connectionString` (typically
their own `DATABASE_URL`). See
[`docs/env-reference.md`](../../docs/env-reference.md) for the shared list.

## Testing notes

Vitest. See [`docs/backend/testing.md`](../../docs/backend/testing.md) for
shared conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/packages/`.
