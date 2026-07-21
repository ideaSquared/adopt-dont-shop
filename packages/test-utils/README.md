# @adopt-dont-shop/test-utils

## Purpose

Shared test utilities for the gRPC microservices: a stub gRPC server harness,
principal/metadata builders, and NATS/JetStream test doubles. Dev-only — it
is a `devDependency` of the services and is never bundled into a service
image.

This is a service-only shared package (not a `lib.*`). See the decision tree
in [`CONTRIBUTING.md`](../../CONTRIBUTING.md#where-does-my-code-go).

## Location in the architecture

Test-time only — consumed by `services/*` Vitest suites, alongside
[`@adopt-dont-shop/service-bootstrap`](../service-bootstrap/README.md) (whose
gRPC adapter and principal helpers these doubles exercise). See
[`docs/README.md`](../../docs/README.md#libraries) for where the shared
packages sit.

## Scripts

```bash
pnpm test         # Vitest (run mode)
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
```

This package ships its `src/` directly (no build step) — consumers import it
over the workspace alias.

## Public API / exports

The canonical list lives in [`src/index.ts`](src/index.ts):

- `startStubGrpcServer(...)` → `StubGrpcServer` — stand up an in-process gRPC
  server backed by handler stubs.
- `testPrincipal(overrides)` / `metadataFor(...)` — build a principal and the
  gRPC metadata a handler expects.
- `makeNatsDouble()` → `NatsDouble` — an in-memory NATS/JetStream double that
  records `NatsPublishCall`s.

## Environment variables consumed

None — the harness is configured entirely through function arguments.

## Testing notes

The utilities are themselves covered by sibling `*.test.ts` files. See
[`docs/backend/testing.md`](../../docs/backend/testing.md) for how services
wire these doubles into their suites.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/packages/`.
