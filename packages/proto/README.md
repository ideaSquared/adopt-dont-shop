# @adopt-dont-shop/proto

## Purpose

Protobuf schemas + generated TypeScript for the inter-service gRPC and NATS
contracts. Codegen is hermetic — it runs locally via ts-proto (no buf.build
remote plugin, a CAD lesson), the generated output is committed, and CI
verifies it's in sync with the `.proto` sources.

This is a service-only shared package (not a `lib.*`) — imported by every
service and by the gateway's generated clients. See the decision tree in
[`CONTRIBUTING.md`](../../CONTRIBUTING.md#where-does-my-code-go).

## Location in the architecture

See [`docs/README.md`](../../docs/README.md#libraries) for where the shared
packages sit. Every microservice domain has a versioned proto namespace under
`proto/adopt_dont_shop/<domain>/v1/`; services bind the emitted Definition
tables (`server.addService(...)`) and the gateway builds clients from the same
constructors. `@grpc/grpc-js` is a runtime dependency here, so any consumer that
imports a namespace gets it transitively.

## Scripts

```bash
pnpm generate     # regenerate src/generated from proto/ (local protoc-gen-ts_proto)
pnpm build        # tsc build
pnpm dev          # tsc --watch
pnpm test         # smoke test: encode/decode round-trip, dual-binding shape
pnpm check:fresh  # CI guard — generated output must match the .proto sources
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
```

## Public API / exports

The canonical list lives in [`src/index.ts`](src/index.ts). Each domain is
re-exported twice (CAD lesson #7 — ts-proto emits every message as both an
`interface` and a `const` factory, which collide in type position):

```ts
export * as AuthV1 from './generated/.../auth.js';          // value namespace
export type { LoginRequest } from './generated/.../auth.js'; // flat type
```

Namespaces follow the `<Package><Version>` convention: `PingV1` (smoke target),
`NotificationsV1`, `AuthV1`, `PetsV1`, `RescueV1`, `ApplicationsV1`, `ChatV1`,
`MatchingV1`, `ModerationV1`, `AuditV1`, `CmsV1`. `buf.gen.yaml` is configured
with `outputServices=grpc-js`, so both server Definition tables and client
constructors are emitted.

## Environment variables consumed

None.

## Testing notes

Vitest — an encode/decode round-trip smoke test plus a dual-binding shape
assertion. `pnpm check:fresh` runs `buf generate` into a tmpdir and diffs
against the committed `src/generated/`, failing the build with a "run `pnpm
generate` and commit" message when stale. See
[`docs/backend/testing.md`](../../docs/backend/testing.md) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/packages/`.
