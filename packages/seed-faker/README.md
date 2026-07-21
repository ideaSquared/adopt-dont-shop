# @adopt-dont-shop/seed-faker

## Purpose

Dev-only bulk-data ("spam") seeding toolkit: an env guard, a seeded UK-locale
Faker, and a batched bulk-insert helper. Shared by each service's `db:spam`
script to flood a development database with prod-shaped volume. It is **never**
imported by runtime code — it exists purely for local load/shape testing.

This is a service-only shared package (not a `lib.*`). See the decision tree
in [`CONTRIBUTING.md`](../../CONTRIBUTING.md#where-does-my-code-go).

## Location in the architecture

Consumed only by the `db:spam` scripts in `services/*` that own a schema — see
[`docs/README.md`](../../docs/README.md#libraries) for where the shared
packages sit. Pairs with [`@adopt-dont-shop/db`](../db/README.md) (the
Postgres client the bulk inserts run through).

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

- `assertSpamAllowed()` — throws unless the spam env guard is satisfied (see
  below), so `db:spam` can never run against a non-dev database.
- `createSpamFaker()` / `DEFAULT_FAKER_SEED` — a UK-locale Faker seeded for
  reproducible runs.
- `bulkInsert(...)` (`BulkInsertDeps`, `QueryFn`) — batched multi-row insert.
- `spamCount()` — resolves how many rows to generate.

## Environment variables consumed

| Variable | Purpose | Required |
| --- | --- | --- |
| `ALLOW_SPAM` | Must be truthy for `assertSpamAllowed()` to pass — the safety interlock. | Yes (to run `db:spam`) |
| `NODE_ENV` | Guard refuses to run under `production`. | — |
| `FAKER_SEED` | Overrides `DEFAULT_FAKER_SEED` for reproducible data. | No |
| `SPAM_PETS` | Row-count override read by `spamCount()`. | No |

See [`docs/env-reference.md`](../../docs/env-reference.md) for the full list.

## Testing notes

Each unit has a sibling `*.test.ts` (env-guard, faker-rng, bulk-insert,
counts). The env guard is the security-relevant path — its tests assert it
fails closed. See [`docs/backend/testing.md`](../../docs/backend/testing.md)
for shared conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/packages/`.
