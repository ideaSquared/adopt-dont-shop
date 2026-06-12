# @adopt-dont-shop/proto

Protobuf schemas + generated TypeScript for inter-service contracts.

## Hermetic codegen (no buf.build remote)

CAD lesson, ported verbatim:

> The default `buf generate` setup uses `remote:` plugins that hit
> `api.buf.build`. The dev environment couldn't reach `buf.build` (403
> from a non-browser client). Decision: local `protoc-gen-ts_proto`
> invoked via `node_modules/.bin`, so codegen runs anywhere
> `pnpm install` runs.

The plugin path lives in `buf.gen.yaml`:

```yaml
plugins:
  - plugin: ts_proto
    path: ../../node_modules/.bin/protoc-gen-ts_proto
```

No remote dependency, no buf.build account, no auth tokens. Every CI
runner and every developer machine that runs `pnpm install` can run
`pnpm generate`.

## Generated output IS committed

`src/generated/` is checked in. Two reasons:
1. Consumers can import this package without first running a build step
   (the same `"main": "./src/index.ts"` convention used by `@adopt-dont-shop/db`
   and friends — no `dist/` indirection at dev time).
2. PRs that touch `.proto` files show the regenerated TS in the diff,
   which is the easiest way to spot accidental breaking changes.

A `check:fresh` CI guard runs `buf generate` into a tmpdir and diffs
against `src/generated/` — if the committed output is stale, the build
fails with a "run `pnpm generate` and commit" message.

## Dual binding (CAD lesson #7)

ts-proto emits each message as **both** an `interface` AND a `const`
factory. The two collide in type position. The fix, also from CAD, is
to re-export the package twice from `src/index.ts`:

```ts
// Value namespace — for clients, encode/decode, and enums
export * as PingV1 from './generated/proto/adopt_dont_shop/v1/ping.js';

// Flat type-only re-exports — for type positions
export type { EchoRequest, EchoResponse } from './generated/proto/adopt_dont_shop/v1/ping.js';
```

Usage:

```ts
import { PingV1, type EchoRequest } from '@adopt-dont-shop/proto';

const req: EchoRequest = { message: 'hi' };          // flat type
const buf = PingV1.EchoRequest.encode(req).finish(); // value namespace
```

Every new `.proto` file added under `proto/<package>/<version>/` gets
two lines in `src/index.ts` — one `export * as …` for the value
namespace and one `export type { … }` for the flat re-export. Follow
the `<Package><Version>` convention (`AuthV1`, `PetsV1`, …) for the
namespace alias.

## What's here today

- `proto/adopt_dont_shop/v1/ping.proto` — smoke target so the toolchain
  has something to compile, even before any real service exists.
- `proto/adopt_dont_shop/notifications/v1/notification.proto` —
  `NotificationService.{Create, List, Dismiss}` plus the Notification
  message and the five Postgres-ENUM-mirrored enums. Added in Phase 1.3a.

`buf.gen.yaml` is configured with **`outputServices=grpc-js`** — both
server-side Definition tables (consumed by `server.addService(...)`)
and client constructors are emitted. `@grpc/grpc-js` is a runtime
dependency on this package; services that import any namespace get it
transitively.

## What's NOT here yet

- **Real domain protos beyond notifications.** Auth, pets, applications,
  chat, etc. land in their respective phase commits, each following the
  same naming pattern: `proto/adopt_dont_shop/<domain>/v1/*.proto`.

## Commands

```bash
pnpm generate     # regenerate src/generated from proto/
pnpm check:fresh  # CI guard — generated output must match .proto sources
pnpm test         # smoke test: encode/decode round-trip, dual-binding shape
pnpm type-check   # tsc --noEmit over src/
```
