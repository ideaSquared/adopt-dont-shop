# Internal gRPC trust model

> Tracked in [ADS-829](https://linear.app/ideasquared/issue/ADS-829). Created
> 2026-06 as part of the production-readiness security review. mTLS hardening
> is tracked separately as [ADS-800](https://linear.app/ideasquared/issue/ADS-800).

This document records the current trust assumptions for inter-service gRPC
traffic, the mitigations in place, the accepted risk, and the roadmap to
eliminate it.

## How internal gRPC traffic works today

All microservices bind their gRPC listener using `ServerCredentials.createInsecure()`
([`packages/service-bootstrap/src/grpc-server.ts:32`](../../packages/service-bootstrap/src/grpc-server.ts)).
All gRPC clients connect with `credentials.createInsecure()` (e.g.
[`services/notifications/src/grpc/auth-client.ts:61`](../../services/notifications/src/grpc/auth-client.ts),
[`services/gateway/src/grpc-clients/auth-client.ts`](../../services/gateway/src/grpc-clients/auth-client.ts)).

Traffic between services is **HTTP/2 cleartext**. TLS is not terminated by
any service process; the assumption is that the Docker bridge network is the
trust boundary.

## How principal identity is propagated

The gateway (`services/gateway/src/middleware/authenticate.ts`) enforces a
two-step discipline on every inbound HTTP request:

1. **Strip spoofable headers unconditionally** — `x-user-id`, `x-user-roles`,
   `x-user-permissions`, and `x-rescue-id` are deleted from the incoming
   request before any authentication logic runs, so a client can never inject
   a pre-stamped identity.
2. **Validate the bearer token and re-stamp** — if an `Authorization: Bearer`
   header is present, the gateway calls `service.auth ValidateToken` and, on
   success, sets the validated `x-user-*` headers from the returned `Principal`.

Downstream services trust these headers as ground truth. The extraction
logic lives in
[`packages/service-bootstrap/src/principal.ts`](../../packages/service-bootstrap/src/principal.ts):
`extractPrincipal(metadata)` reads `x-user-id`, `x-user-roles`, and
`x-user-permissions` directly from the gRPC `Metadata` object without any
cryptographic verification. The `principalToMetadata` function performs the
inverse — serialising a `Principal` back to outbound metadata — used by
services that forward a caller's identity to a second downstream service
(e.g. `applications → pets`).

Service-to-service calls that originate inside the cluster (not forwarded
user traffic) stamp a **system principal** directly into the metadata. For
example, the notifications service stamps `x-user-id: svc-notifications`,
`x-user-roles: admin`, `x-user-permissions: admin.users.broadcast` when
calling `service.auth ListUserIdsByCohort`
([`services/notifications/src/grpc/auth-client.ts:65-68`](../../services/notifications/src/grpc/auth-client.ts)).

## Threat model

**What the current model prevents:**

- An external client forging `x-user-id` via a raw HTTP request — the gateway
  strips those headers before any downstream service sees them.
- Unauthenticated access to protected RPCs on publicly-reachable paths — the
  gateway validates the bearer token and returns 401 before forwarding.

**What the current model does NOT prevent:**

- Any process that can reach the internal Docker bridge network can open a
  gRPC connection to any service and supply arbitrary `x-user-*` metadata.
  There is no certificate check, channel binding, or token validation at the
  gRPC layer. An attacker with network access to the internal network can
  impersonate any user or service principal.

**Scope of "network access":**

In the dev (`docker-compose.yml`) and production (`docker-compose.prod.yml`)
configurations, only HTTP ports (`500x`) are published to the host. gRPC
ports (`600x`) are not mapped to any host interface — they are reachable only
within the Docker network. An attacker would need to compromise a container
or find a path through the HTTP/gRPC gateway to reach the internal gRPC
listeners directly.

In production (`docker-compose.prod.yml`), services use `expose:` only (e.g.
`expose: ["5001"]`), so even the HTTP health/management ports are not
accessible from outside the Docker network without going through nginx.

**Accepted risk:**

The current posture is accepted on the basis that:

- The Docker internal network is not publicly routable.
- No gRPC port is exposed on a host interface in any environment (dev or
  production).
- The attack surface requires prior container compromise, which is a
  higher-severity incident in its own right.

This is a **recognised gap**, not an oversight. It is acceptable for the
current deployment scale and is tracked for remediation.

## Roadmap

[ADS-800](https://linear.app/ideasquared/issue/ADS-800) tracks adding mutual
TLS (mTLS) to all inter-service gRPC channels. Once that lands:

- Each service will present a client certificate issued by an internal CA.
- The server will verify the client certificate before processing any RPC.
- `ServerCredentials.createInsecure()` and `credentials.createInsecure()`
  will be replaced with TLS credentials in
  `packages/service-bootstrap/src/grpc-server.ts` and each client file.
- The principal-propagation model (`x-user-*` headers) remains, but the
  channel itself will no longer be spoofable from an unauthenticated network
  position.

## Known gaps not covered by ADS-800

- The gateway's `authenticate` middleware does not 401 unauthenticated
  requests to non-public paths today (Phase 2.6 item noted in
  `services/gateway/src/middleware/authenticate.ts:85-91`). Until that
  lands, a request with no token can still reach downstream handlers that
  apply their own auth gate.
- Outbound service-to-service system principals (e.g. `svc-notifications`)
  are hardcoded strings with no runtime attestation beyond the channel trust
  described above.
