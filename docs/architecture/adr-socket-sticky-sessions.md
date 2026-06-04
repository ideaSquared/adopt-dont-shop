# ADR — Sticky Sessions for the Socket.IO Connection Cap

- Status: Accepted
- Date: 2026-06-04
- Linear: ADS-678
- Related code: `service.backend/src/socket/socket-registry.ts`,
  `service.backend/src/middleware/socket-rate-limit.ts`

## Context

The backend enforces a per-user concurrent Socket.IO connection cap
(`MAX_CONNECTIONS_PER_USER`, currently 5) in
`service.backend/src/socket/socket-registry.ts`. The cap exists so a
single authenticated user cannot exhaust file descriptors on a backend
instance by repeatedly opening sockets (DoS protection covering the
multi-device + multi-tab case: laptop + phone + a second laptop = 3,
with headroom for brief overlap during reconnects).

The cap is tracked in a process-local `Map<userId, Set<socketId>>`. It
is NOT shared between backend replicas. By contrast, the inbound
per-event rate limiter at
`service.backend/src/middleware/socket-rate-limit.ts` (ADS-709) is
backed by Redis (`INCR` + `EXPIRE` Lua script) with an in-memory
fallback so its counters are global across replicas.

When the backend scales horizontally we must decide how the connection
cap should behave globally. Two paths exist:

1. Make the cap state global the same way the rate limiter is — keep
   per-user counters in Redis, atomically incremented on connect and
   decremented on disconnect.
2. Keep the cap per-instance and rely on the load balancer to route a
   given user's sockets to the same instance, so a per-instance cap of
   N behaves like a global cap of N.

This ADR records the choice of option 2.

## Decision

**Rely on sticky sessions at the load balancer to keep all sockets for
a given authenticated user on a single backend instance.** The
per-instance connection cap in `socket-registry.ts` is intentional and
remains the global cap so long as stickiness holds.

The mechanism is LB-dependent but in all cases targets the WebSocket
upgrade path (`/socket.io`):

- **AWS ALB** — enable target group stickiness (`stickiness.enabled =
  true`, `type = lb_cookie`, duration 1–24 hours). The ALB-issued
  `AWSALB` / `AWSALBCORS` cookies pin the client to one target.
- **nginx upstream** (current `nginx/nginx.prod.conf` proxy in front of
  the backend) — use `ip_hash;` on the backend upstream block, or
  `hash $http_authorization consistent;` if you prefer keying off the
  JWT rather than the client IP. `ip_hash` is the simpler default and
  matches Socket.IO's documented recommendation.
- **Other LBs (HAProxy, Traefik, etc.)** — equivalent cookie-based or
  source-IP-hash stickiness on the WebSocket route.

Sticky sessions only need to cover the WebSocket transport. The
stateless HTTP API does not require — and should not have — sticky
routing.

## Consequences

### Pros

- **No Redis hot key on connect/disconnect.** Every WebSocket
  open/close is a write. Moving the cap to Redis would create a
  per-user counter key incremented on every reconnect, with the noisiest
  users (mobile reconnect storms, flaky networks) producing the most
  writes. The hottest key would be the noisiest user, which is the
  opposite of what we want.
- **Simpler code.** The current implementation is a `Map<string,
  Set<string>>` with synchronous `isUserAtConnectionCap`,
  `registerUserSocket`, `unregisterUserSocket` — no I/O on the
  connect path. A Redis-backed version would need atomic INCR/DECR with
  TTL fallback for crash-leaked counters, plus an in-memory fallback for
  Redis-down scenarios (mirroring the rate limiter), all to enforce a
  cap that already works correctly per-instance.
- **No leaked counters on crash.** Process-local state dies with the
  process; the next time the user connects, the counter starts at zero
  on whichever instance picks them up. A Redis counter would need a
  separate TTL or explicit cleanup to avoid drift after a crash that
  skipped the disconnect handler.
- **Matches existing presence assumptions.** The `userSocketIds` map
  is already documented as process-local (see also the presence map in
  `socket-handlers`). Sticky sessions are consistent with how presence
  is computed.

### Cons

- **Uneven load when one user opens many sockets.** A user with the
  maximum 5 active devices/tabs always lands on the same instance. With
  realistic user counts this is statistically negligible; with a
  pathological distribution it could skew capacity slightly. Not a
  concern for our current scale.
- **Cap is approximate during failover.** When an instance is drained
  or crashes, the LB re-pins affected users to a new instance. For a
  short window (until old sockets fully disconnect on the old instance,
  or are cleaned up by socket.io ping timeout) the user can temporarily
  exceed the cap globally because each instance independently counts
  only its own sockets. This is bounded by the socket.io
  `pingTimeout` (default 20s) and is acceptable — the cap is a DoS
  guardrail, not a hard quota.
- **LB configuration is operationally load-bearing.** If stickiness is
  silently disabled (misconfiguration, LB swap, ingress refactor) the
  cap quietly becomes per-instance with no global ceiling, and a hostile
  client could connect N × replica_count sockets. Mitigation: the
  operational requirements below are explicit, and a smoke test on
  deploy should assert that two consecutive WebSocket handshakes from
  the same client land on the same target.

### Neutral

- The cap value (`MAX_CONNECTIONS_PER_USER = 5`) does not change. If
  product needs ever push the realistic device count above 5, raise the
  constant — sticky sessions don't constrain it.

## Alternatives considered

### Redis-backed per-user counter (INCR + TTL)

Mirror the `socket-rate-limit.ts` pattern: on connect, `INCR
sock-cap:<userId>` with a short TTL refresh; on disconnect, `DECR`.
Reject the connection when the post-INCR value exceeds the cap.

Rejected for now because:

- **Hot-key risk on the noisiest users.** Reconnect storms (mobile
  network flaps) would hammer a small number of keys.
- **Counter drift on crash.** A backend that dies between INCR and
  DECR leaks a counter slot. Mitigated by TTLs, but introduces a
  window where the user appears over-cap until the TTL expires —
  worse UX than the current per-instance approach.
- **Complexity disproportionate to the threat.** The cap is a DoS
  guardrail. Sticky sessions make the per-instance cap a global cap
  for the cost of one LB setting. Building a distributed counter to
  replace one LB setting is overkill for the current scale.

Revisit if we later need a strictly global cap (e.g. quota-based
plans, paid-tier socket limits) where approximate enforcement during
failover is unacceptable.

### Redis pub/sub presence reconciliation

Have each instance publish its connection-count for each user to Redis
and sum them on every connect. Rejected: even more I/O than option 1,
without the atomicity benefit, and the same drift problem on crash.

### No cap at all, rely on rate limiting

Rejected: the inbound rate limiter caps event _rate_, not concurrent
_connections_. A client opening N sockets but staying silent does not
trip the rate limiter, but does consume N file descriptors and N
authentication checks on connect. The cap is the right control here.

## Operational requirements

The ops team MUST ensure the production load balancer is configured for
WebSocket stickiness before this assumption holds. Concretely:

### AWS ALB

| Setting | Value |
|---|---|
| `stickiness.enabled` | `true` |
| `stickiness.type` | `lb_cookie` |
| `stickiness.lb_cookie.duration_seconds` | `86400` (24h; minimum 60s — long enough to outlast typical socket sessions) |
| Cookie name | ALB-managed: `AWSALB`, `AWSALBCORS` (not configurable on the LB cookie type; use `app_cookie` if you must control the name) |
| Target group | The one routing `/socket.io` traffic to the backend service |

### nginx (current production proxy)

Add `ip_hash;` (or `hash $http_authorization consistent;`) to the
backend upstream block in `nginx/nginx.prod.conf`:

```nginx
upstream service_backend {
    ip_hash;
    server service-backend-1:3000;
    server service-backend-2:3000;
    # ...
}
```

Place the directive at the top of the upstream block. With a single
backend replica (current default) the directive is a no-op but is
harmless and future-proofs the config.

### Validation

After deploy, verify stickiness with two consecutive WebSocket
handshakes from the same client:

```bash
# Both calls should land on the same backend instance — check the
# `X-Backend-Instance` response header (set by the backend on
# successful socket.io polling handshake) or instance-tagged logs.
for i in 1 2; do
  curl -sI "https://${PROD_HOSTNAME}/socket.io/?EIO=4&transport=polling" \
    | grep -i x-backend-instance
done
```

If the two handshakes hit different instances, stickiness is not
working and the cap is per-instance only.

### Monitoring / alerting

- Add a synthetic check that the stickiness cookie is present on
  Socket.IO handshake responses in production. Page if it disappears
  for > 5 minutes.
- Alert on `socket_connections_rejected_total{reason="user_cap"}` going
  to zero across all replicas if it was previously non-zero — could
  indicate the cap is no longer being hit because traffic is being
  fanned across replicas instead of pinned. (Optional; only worth
  adding once we have the metric.)

## Revisit triggers

Re-open this decision if:

- We need strict global enforcement (paid-tier socket quotas, billing).
- We move to a serverless / per-request socket model where instance
  affinity is impossible.
- Mobile reconnect patterns produce uneven enough load to matter.
- We adopt a service mesh that makes Redis-backed counters effectively
  free (atomic increments at the sidecar with no app-level I/O).
