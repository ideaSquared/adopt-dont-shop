# @adopt-dont-shop/service-bootstrap

## Purpose

Shared boot mechanics for the gRPC microservices — a Fastify health server,
a gRPC bind/shutdown wrapper, the gRPC adapter (`adapt` / `adaptUnauth`), a
principal extractor + signer, `HandlerError`, and a shutdown sequencer.
Extracted from the ~200 lines of near-identical boot code that all ten
services were copy-pasting, so a new service stands up its servers and its
graceful-shutdown path with one call.

This is a service-only shared package (not a `lib.*`) — imported by
`services/*` entry points only. See the decision tree in
[`CONTRIBUTING.md`](../../CONTRIBUTING.md#where-does-my-code-go).

## Location in the architecture

The common entry-point substrate every extracted service boots through — see
[`docs/infrastructure/MICROSERVICES-STANDARDS.md`](../../docs/infrastructure/MICROSERVICES-STANDARDS.md)
for the service boundary/ownership model and
[`docs/README.md`](../../docs/README.md#libraries) for where the shared
backend packages sit. Pairs with
[`@adopt-dont-shop/config-secrets`](../config-secrets/README.md) and
[`@adopt-dont-shop/observability`](../observability/README.md).

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

- `createMicroserviceServer(...)` — Fastify health server (`/health/simple`).
- `startGrpcServer(...)` — bind + graceful-close a gRPC server.
- `adapt` / `adaptUnauth` / `HandlerError` — the gRPC handler adapter that
  maps thrown errors to gRPC status codes (unauth variant skips the principal
  check).
- `DRY_RUN_HEADER` / `DRY_RUN_APPLIED_HEADER` — gRPC dry-run request header and
  response echo (see [Dry runs](#dry-runs)).
- Principal extraction + signing helpers (`PrincipalVerification`,
  `PrincipalSigning`).
- `runServiceShutdown(...)` — ordered shutdown sequencer (`ShutdownDeps`).

## Dry runs

`adapt` and `adaptUnauth` honour `x-dry-run: 1` call metadata, so every service
gets it with no per-service code. The handler runs with per-call deps (the
shared `deps` is never mutated):

- `deps.pool` becomes a facade bound to ONE real client inside a transaction
  that is always rolled back (on success and on error), after which the client
  is released. `pool.read` is the same facade. Handler transactions
  (`BEGIN` / `COMMIT` / `ROLLBACK`, e.g. `withTransaction`) become
  `SAVEPOINT dry_run_<n>` / `RELEASE SAVEPOINT` / `ROLLBACK TO SAVEPOINT`, so
  nesting works. `BEGIN ISOLATION LEVEL ...` becomes a plain savepoint; the
  isolation level is not applied.
- `deps.nats` becomes a no-op stub: `publish` and `jetstream().publish` succeed
  and send nothing; `request` rejects.
- Every other key of `deps` is passed through unchanged. Side effects outside
  Postgres and NATS (Redis, email, S3, other gRPC services) are NOT rolled
  back, so only dry-run RPCs whose side effects stay in Postgres and NATS.
  service.ops enforces this with the `rollback` mode in its registry.

The initial response metadata carries `x-dry-run-applied: 1` (in the same
`sendMetadata` call as `x-request-id`). A caller that asked for a dry run and
does not see the echo must treat the call as having run for real.

## Environment variables consumed

This package takes config via function arguments rather than reading env vars
directly; callers pass in the values their own `config.ts` resolved (e.g.
`PRINCIPAL_SIGNING_KEY`). See
[`docs/env-reference.md`](../../docs/env-reference.md) for the shared list.

## Testing notes

Each unit is covered by a sibling `*.test.ts` (adapter, principal, server,
shutdown). Downstream services stub the gRPC transport with
[`@adopt-dont-shop/test-utils`](../test-utils/README.md). See
[`docs/testing.md`](../../docs/testing.md#backend-specifics) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/packages/`.
