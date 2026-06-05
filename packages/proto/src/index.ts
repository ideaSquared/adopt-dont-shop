// CAD lesson #7: ts-proto emits each message as **both** an `interface X`
// AND a `const X` (the message factory with encode/decode/fromJSON). That
// makes `PingV1.EchoRequest` ambiguous in type position — it resolves to
// the const factory, not the interface, and downstream consumers see the
// wrong shape.
//
// The fix, ported from `@cad/proto`, is to export the package twice:
//
//   - **Value namespace** (`PingV1`) — use for instantiating messages,
//     calling encode/decode/fromJSON, and reading enum values:
//
//       import { PingV1 } from '@adopt-dont-shop/proto';
//       const buf = PingV1.EchoRequest.encode({ message: 'hi' }).finish();
//
//   - **Flat type-only re-exports** — use anywhere a type position needs
//     the interface, NOT the factory:
//
//       import type { EchoRequest } from '@adopt-dont-shop/proto';
//       const req: EchoRequest = { message: 'hi' };
//
// Every new .proto file added under `proto/` gets the same two-line
// treatment here. New domain modules use the convention
// `<Package><Version>` for the namespace (e.g. `AuthV1`, `PetsV1`).

export * as PingV1 from './generated/proto/adopt_dont_shop/v1/ping.js';
export type { EchoRequest, EchoResponse } from './generated/proto/adopt_dont_shop/v1/ping.js';
