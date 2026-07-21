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
- Principal extraction + signing helpers (`PrincipalVerification`,
  `PrincipalSigning`).
- `runServiceShutdown(...)` — ordered shutdown sequencer (`ShutdownDeps`).

## Environment variables consumed

This package takes config via function arguments rather than reading env vars
directly; callers pass in the values their own `config.ts` resolved (e.g.
`PRINCIPAL_SIGNING_KEY`). See
[`docs/env-reference.md`](../../docs/env-reference.md) for the shared list.

## Testing notes

Each unit is covered by a sibling `*.test.ts` (adapter, principal, server,
shutdown). Downstream services stub the gRPC transport with
[`@adopt-dont-shop/test-utils`](../test-utils/README.md). See
[`docs/backend/testing.md`](../../docs/backend/testing.md) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/packages/`.
