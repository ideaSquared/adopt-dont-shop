# ADR 0005 — Pact consumer-driven contract tests

- Status: Accepted
- Date: 2026-06-18
- Linear: ADS-816
- Scope: `services/gateway`, `services/auth`, `services/applications`,
  `services/notifications`, `pacts/`, `.github/workflows/ci.yml`

## Context

Inter-service compatibility today relies on proto schema correctness. Proto
catches structural drift (wrong field name, wrong type) but misses three
failure modes:

1. **Semantic drift** — same field name and type, changed meaning (e.g.
   `expiresAt` changes from UTC epoch to local time).
2. **Behavioural drift** — an RPC's error-code semantics shift without a
   schema change (e.g. `NOT_FOUND` replaced by `INVALID_ARGUMENT` for a
   missing resource).
3. **Event payload drift** — NATS JSON payloads are parsed blindly; the
   proto layer has no visibility of them.

Consumer-driven contract testing with Pact addresses these by making the
consumer codify its expectations about the provider, and then running a
verification step that proves the real provider still satisfies those
expectations.

## Decision

### Framework

**`@pact-foundation/pact` v13** (message Pact API, `MessageConsumerPact` /
`MessageProviderPact`).

Pact is the industry-standard consumer-driven contract testing library. Its
message API covers both async events (NATS) and, with the approach described
below, gRPC interactions.

### gRPC modelling: message-level, not binary gRPC

The Pact gRPC plugin (`pact-grpc-plugin`) requires native binaries compiled
against specific glibc versions and a separate plugin daemon process. Running
it reliably in the monorepo's Node-based CI runners without Docker-in-Docker
proved impractical during ADS-816. The Pact maintainers document this as a
known limitation for Node environments.

**Decision: model gRPC contracts as typed JSON messages** — use
`MessageConsumerPact` where each "message" represents one RPC interaction:

- `content`: the JSON serialisation of the proto response (what ts-proto's
  `toJSON` would produce).
- `metadata`: `{ contentType: 'application/json' }`.
- The consumer's handler asserts the shape of the JSON object it receives,
  exactly as the gateway code would consume it after ts-proto deserialises
  the binary response.

**Trade-offs accepted:**

| What this catches | What it misses |
|---|---|
| Field name / type drift | Protobuf wire encoding (field numbers, varint encoding) |
| Required field removals | Order of oneof variants |
| Error code semantics changes | gRPC compression / stream semantics |
| Enum value drift (as `number`) | HTTP/2 flow control |

The missed items are covered by the existing in-process gRPC server contract
tests (`services/gateway/src/grpc-clients/*.contract.test.ts`) which exercise
the binary wire path with real `@grpc/grpc-js`. Pact adds the _consumer-
driven_ dimension on top: the consumer declares what it expects, and the
provider verifies it independently of the consumer's code.

If the gRPC plugin becomes viable in a future Node release, migrating the
three gRPC pacts to use it is a drop-in swap of the interaction encoding —
the consumer/provider structure, pact file locations, and CI job remain
unchanged.

### NATS events

`MessageConsumerPact` is a natural fit for NATS: one NATS message delivery =
one Pact message interaction. The NATS subject is routing metadata (not
payload content) so it is intentionally omitted from the Pact metadata;
the contract focuses on the JSON payload shape.

### The three contracts in scope (ADS-816 pragmatic scoping)

| Consumer | Provider | RPC / Subject |
|---|---|---|
| `service.gateway` | `service.auth` | `ValidateToken` (happy path + UNAUTHENTICATED error) |
| `service.gateway` | `service.applications` | `GetApplication` (happy path + NOT\_FOUND error) |
| `service.notifications` | `service.gateway` | `gdpr.erasureRequested` NATS event |

### File layout

```
pacts/                                  ← shared pact files (written by consumer, read by provider)
  service.gateway-service.auth.json
  service.gateway-service.applications.json
  service.notifications-service.gateway.json

services/gateway/
  test/contracts/
    gateway-auth-validate-token.consumer.test.ts
    gateway-applications-get.consumer.test.ts
    gateway-gdpr-erasure-publisher.provider.test.ts  ← gateway is the publisher
  vitest.contracts.config.ts

services/auth/
  test/contracts/
    auth-validate-token.provider.test.ts
  vitest.contracts.config.ts

services/applications/
  test/contracts/
    applications-get.provider.test.ts
  vitest.contracts.config.ts

services/notifications/
  test/contracts/
    notifications-gdpr-erasure-requested.consumer.test.ts
  vitest.contracts.config.ts
```

### CI job ordering

A dedicated CI job (`test-contracts`) runs after `build-libs` and is separate
from `test-services` so the two-phase consumer→provider order is explicit:

1. **Consumer phase**: `service.gateway` (consumer) and
   `service.notifications` (consumer) write their pact files to `pacts/`.
2. **Provider phase**: `service.auth`, `service.applications`, and
   `service.gateway` (as gdpr event publisher) read the pact files and run
   verification.

Running consumer and provider tests in the same `vitest` invocation without
guaranteed ordering would require the pact files to be pre-committed, which
defeats the consumer-driven model.

### When to add a new contract

Add a Pact contract when:

- A new gRPC RPC or NATS subject is introduced whose _semantic_ contract (not
  just the proto type) matters to at least one consumer.
- An existing interaction has a history of silent drift (semantic or
  behavioural) that is worth catching in CI without a full integration test.

**Do not add a contract** for:

- RPCs that are already heavily covered by integration/E2E tests.
- Internal-only endpoints that have a single caller and a single
  implementation in the same deploy unit.

### When to ignore a semver-bumped pact

Provider semver is not wired to pact versioning in this setup (no Pact
Broker). A provider can make a non-breaking change to its interaction body
(e.g. adding a new optional field) without failing the pact — Pact's
body-matching is additive by default (extra fields in the response are
ignored). The provider only fails if it _removes_ or _changes_ a field the
consumer asserted.

If a breaking contract change is intentional (e.g. a field is renamed):

1. Update the consumer test first (new expectation).
2. Consumer test generates a new pact file.
3. Update the provider test and implementation.
4. Both pass in CI, proving the migration is complete.

Never silently update pact files to make a failing provider test green. That
defeats the consumer-driven model.

## Consequences

- **Consumer-driven safety net for semantic drift** on the three
  highest-value inter-service boundaries.
- **No native binary dependency** — the pure-JS Pact message API runs in any
  Node environment that can run Vitest.
- **Wire encoding gap** — binary gRPC encoding is not covered by Pact; the
  existing in-process gRPC contract tests (`*.contract.test.ts` in
  `src/grpc-clients/`) already cover that.
- **Maintenance overhead** — each new interaction description must appear in
  both consumer and provider, and the string keys must match exactly.
  Mitigated by keeping descriptions descriptive rather than generic.
- **No Pact Broker** — pact files are committed to the repo under `pacts/`.
  This is sufficient for a single-repo monorepo; a Pact Broker becomes
  worthwhile if services move to separate repos.
