# ADR 0012 — Internal defence-in-depth posture for the eyes-on launch (ADS-1255)

- Status: Accepted (2026-08-28). Item 2 (gateway auth backstop) is now
  **implemented** — see the update note under that item. Items 1 (mTLS) and 3
  (migration back-compat) remain deferred per the decision below.
- Date: 2026-08-28
- Scope: three internal defence-in-depth items — inter-service gRPC channel
  security, the gateway `authenticate` hook's non-enforcement of unauthenticated
  requests, and migration back-compat. Builds on
  [`docs/security/internal-grpc-trust.md`](../security/internal-grpc-trust.md)
  (ADS-829 / 800 / 1050) and
  [ADR 0008](./0008-pre-deploy-migration-strategy.md).
- Linear: ADS-1255
- Supersedes / Superseded by: —

## Context

ADS-1255 groups three defence-in-depth gaps, all currently accepted on
network-isolation / discipline grounds. This ADR makes the per-item launch-phase
decision the ticket asks for — build now, or re-affirm the acceptance with a
documented trigger — for each. It decides; it does not re-survey (the trust-model
doc and ADR 0008 already do).

## Decision

### 1. mTLS on inter-service gRPC — re-affirm acceptance; trigger = multi-host

Inter-service gRPC is HTTP/2 cleartext (`ServerCredentials.createInsecure()`),
so a captured token is replayable within its 120s TTL from a network position
that can sniff the Docker bridge.
[`internal-grpc-trust.md`](../security/internal-grpc-trust.md) already documents
this as a **recognised, accepted gap** (explicitly "not an oversight"), because:
no gRPC port is host-exposed in any environment (dev and prod leave `600x`
unmapped / `expose:`-only), the Docker network is not publicly routable, and
reaching the gRPC listeners requires prior container compromise — itself a
higher-severity incident. Signed principal tokens (ADS-800) plus boot-time
enforcement (ADS-1050) already defeat header-forgery on that same network.

**Decision:** re-affirm the acceptance for the single-host launch phase.
**Promotion trigger:** the move to multi-host (ADR 0009 Option C), where gRPC
leaves a single box and crosses a real network — mTLS ships _with_ that
migration, per the roadmap already in `internal-grpc-trust.md` (client certs
from an internal CA, replacing the insecure credentials in
`packages/service-bootstrap/src/grpc-server.ts` and each client). Building mTLS
before multi-host buys little: on one host the channel never leaves the
loopback / bridge, so the CA and cert-rotation operational cost lands with no
threat reduction that container-compromise wouldn't already defeat.

### 2. Gateway `authenticate` hook non-enforcement — commit to build, gated on a public-path audit

The gateway hook strips spoofable headers and validates a _present_ token, but a
request with **no** token falls through to the downstream handler even on a
protected path (`services/gateway/src/middleware/authenticate.ts` —
`if (!token) return`). The comment cites a strangler-fig "Phase 2.6" rationale
(the monolith handled its own unauth responses); the ticket correctly notes that
rationale is **stale — the monolith is deleted.** `internal-grpc-trust.md` lists
the same item under "Known gaps." Today all enforcement rests on the per-handler
gates, so a single handler that forgets its gate has no gateway backstop.

**Decision:** commit to building the gateway backstop (401 on a tokenless
request to a non-public path), **but gate the build on a public-path-allowlist
audit** and defer it out of this pass. The change is small in code and large in
blast radius: `PUBLIC_PATH_PREFIXES` must provably enumerate _every_
legitimately-unauthenticated route (auth login / register / verify / reset,
health, docs / openapi, any webhook, any public read) or the switch 401s real
traffic. **The audit is the work** — enumerate the public routes across every
`services/gateway/src/routes/*`, reconcile them against the allowlist, and add
tests asserting each public path passes tokenless while each protected path 401s
tokenless. That is why this is planned-and-deferred rather than a drive-by flip.
It is defence-in-depth only: the handler gates already enforce; this adds the
missing backstop.

**Update (implemented, 2026-08-28):** built as described. The audit ran across
every `services/gateway/src/routes/*` file (evidence-backed: downstream
`requirePermission`, principal reads, `security: []` schema markers), and the
mechanism is a per-route `config: { public: true }` opt-in read by the
`authenticate` onRequest hook — **not** a URL-prefix allowlist, which the audit
proved unsafe (a public read and a protected mutation share prefixes, e.g. GET
`/api/v1/pets` public vs POST `/api/v1/pets` protected). The gateway is now
protected-by-default: a tokenless request to any route that has not opted in is
401'd. ~38 genuinely-public routes carry the flag; the shared-package infra
endpoints (`/health`, `/metrics`, `/openapi.json`) are matched by a
collision-free prefix exception. mTLS (item 1) and the migration contract (item 3) remain deferred as decided.

### 3. Migration back-compat — already owned by ADR 0008; no new decision

Rollback safety depends on every migration being old-code-compatible, and
`schema-equivalence.yml` checks that migrations _apply_, not that they are
_non-breaking_. This is **already the subject of
[ADR 0008](./0008-pre-deploy-migration-strategy.md)** (expand/contract as policy
plus a CI lint), which is _Proposed_ and pending its own sign-off.

**Decision:** no separate decision here — tracked under ADR 0008.
Cross-referenced so ADS-1255's third bullet is accounted for, not dropped.

## What sign-off ratifies

- **mTLS:** accepted for the single-host phase; ships with the multi-host
  migration.
- **Gateway hook:** the backstop _will_ be built, gated on the public-path audit
  above; deferred this pass.
- **Migration back-compat:** deferred to ADR 0008; no duplicate plan.

## Relationship to existing records

This ADR decides; it does not replace.
[`internal-grpc-trust.md`](../security/internal-grpc-trust.md) remains the living
trust-model reference (its "Known gaps" section already flags items 1 and 2);
ADR 0008 remains the migration plan. When the gateway backstop (item 2) is built,
`internal-grpc-trust.md`'s "Known gaps" entry should be updated at that time.
