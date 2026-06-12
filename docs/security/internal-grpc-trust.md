# Internal gRPC trust model

> Tracked in [ADS-829](https://linear.app/ideasquared/issue/ADS-829). Created
> 2026-06 as part of the production-readiness security review.
> [ADS-800](https://linear.app/ideasquared/issue/ADS-800) added signed
> principal tokens (below); mTLS for encryption-in-transit remains future
> work.

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

The extraction logic lives in
[`packages/service-bootstrap/src/principal.ts`](../../packages/service-bootstrap/src/principal.ts).
Without a signing key configured (legacy mode), `extractPrincipal(metadata)`
reads `x-user-id`, `x-user-roles`, and `x-user-permissions` directly from the
gRPC `Metadata` object without any cryptographic verification. The
`principalToMetadata` function performs the inverse — serialising a
`Principal` back to outbound metadata — used by services that forward a
caller's identity to a second downstream service (e.g. `applications → pets`).

Service-to-service calls that originate inside the cluster (not forwarded
user traffic) stamp a **system principal** directly into the metadata. For
example, the notifications service stamps `x-user-id: svc-notifications`,
`x-user-roles: admin`, `x-user-permissions: admin.users.broadcast` when
calling `service.auth ListUserIdsByCohort`
([`services/notifications/src/grpc/auth-client.ts`](../../services/notifications/src/grpc/auth-client.ts)).

## Signed principal tokens (ADS-800)

When the shared `PRINCIPAL_SIGNING_KEY` secret is deployed (read via
`@adopt-dont-shop/config-secrets`, so both the plaintext env var and the
`PRINCIPAL_SIGNING_KEY_FILE` Docker-secret form work), principal propagation
is cryptographically verified:

- **Signing.** The gateway's `authenticate` middleware signs the validated
  principal and stamps it as an `x-principal-token` header alongside the
  `x-user-*` headers; `buildMetadata` forwards it on every gateway → service
  gRPC call. `principalToMetadata` (service → service identity forwarding,
  e.g. `applications → pets`) and the notifications auth-client (system
  principal) sign with the same helper.
- **Token format.** `base64url(JSON payload incl. iat/exp)` + `.` +
  `base64url(HMAC-SHA256(payload, key))`, implemented with `node:crypto`
  only in
  [`packages/service-bootstrap/src/principal-token.ts`](../../packages/service-bootstrap/src/principal-token.ts).
  Default TTL is 120 s; MAC comparison uses `crypto.timingSafeEqual`.
- **Verification.** When a service has the key configured,
  `extractPrincipal` REQUIRES a valid token and takes the principal **from
  the token payload** — the `x-user-*` headers become informational, so a
  forged header can no longer win. A missing, malformed, tampered, or
  expired token maps to gRPC `UNAUTHENTICATED`.
- **Rollout.** The key is optional on both sides. Key unset on a service →
  legacy header trust (unchanged). Key set on a service but not on the
  gateway → that service rejects all authenticated traffic with
  `UNAUTHENTICATED`, so deploy the key to the **signers (gateway,
  notifications) first**, then to the verifiers. The dev compose passes
  `PRINCIPAL_SIGNING_KEY` from `.env`; production/staging mount
  `/run/secrets/principal_signing_key`.

## Threat model

**What the current model prevents:**

- An external client forging `x-user-id` via a raw HTTP request — the gateway
  strips those headers before any downstream service sees them.
- Unauthenticated access to protected RPCs on publicly-reachable paths — the
  gateway validates the bearer token and returns 401 before forwarding.

- With `PRINCIPAL_SIGNING_KEY` deployed: a process on the internal network
  forging `x-user-*` gRPC metadata. Services take the principal from the
  HMAC-verified `x-principal-token`; without the key an attacker cannot mint
  one, and tampering or replay beyond the 120 s TTL fails verification.

**What the current model does NOT prevent:**

- Without `PRINCIPAL_SIGNING_KEY` deployed (legacy mode), any process that
  can reach the internal Docker bridge network can open a gRPC connection to
  any service and supply arbitrary `x-user-*` metadata and impersonate any
  user or service principal.
- Traffic is still HTTP/2 cleartext — an attacker who can sniff the internal
  network can read payloads and capture a valid token for replay within its
  TTL. There is no certificate check or channel binding at the gRPC layer;
  encryption-in-transit needs mTLS (future work).

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

The remaining posture (cleartext channel; header trust where the key is not
yet deployed) is accepted on the basis that:

- The Docker internal network is not publicly routable.
- No gRPC port is exposed on a host interface in any environment (dev or
  production).
- The attack surface requires prior container compromise, which is a
  higher-severity incident in its own right.

This is a **recognised gap**, not an oversight. It is acceptable for the
current deployment scale and is tracked for remediation.

## Roadmap

- **Done (ADS-800):** signed principal tokens — header forgery on the
  internal network is mitigated wherever `PRINCIPAL_SIGNING_KEY` is
  deployed (see above).
- **Future work:** mutual TLS (mTLS) on all inter-service gRPC channels for
  encryption-in-transit and channel-level peer authentication. Once that
  lands:
  - Each service will present a client certificate issued by an internal CA.
  - The server will verify the client certificate before processing any RPC.
  - `ServerCredentials.createInsecure()` and `credentials.createInsecure()`
    will be replaced with TLS credentials in
    `packages/service-bootstrap/src/grpc-server.ts` and each client file.
  - The principal-propagation model (signed `x-principal-token` +
    informational `x-user-*` headers) remains; the channel itself stops
    being sniffable/spoofable from an unauthenticated network position.

## Known gaps not covered by ADS-800

- The gateway's `authenticate` middleware does not 401 unauthenticated
  requests to non-public paths today (Phase 2.6 item noted in
  `services/gateway/src/middleware/authenticate.ts`). Until that
  lands, a request with no token can still reach downstream handlers that
  apply their own auth gate.
- Outbound service-to-service system principals (e.g. `svc-notifications`)
  are hardcoded strings. With the key deployed they are at least signed by a
  key-holding process, but any key holder can mint any principal — there is
  no per-service identity attestation (that needs mTLS client certs).
