# Applications strangler cutover — REMOVED

> **This runbook is obsolete.** The per-domain `CUTOVER_<DOMAIN>` strangler
> switches have been removed. The residual `service.backend` monolith was
> deleted in Phase 11, so there is no longer anything to "cut over" to or roll
> back to.

## What replaced it

The gateway is now the single REST surface. Each domain's `/api/v1/*` routes
register automatically whenever that service's gRPC client is wired (i.e. its
`*_GRPC_URL` is configured — which it always is via the gateway config
defaults). There is no flag to flip and no monolith fall-through: any
`/api/v1/*` path the gateway doesn't own returns `404`, and that 404 is now
logged at `warn` so a misconfiguration (e.g. an unreachable service) is visible
in the gateway logs.

If a domain's routes are missing, the cause is operational, not a toggle:

- the backing service isn't reachable at its `*_GRPC_URL`, or
- the gateway came up before the service was healthy.

Check `docker compose ps` and the gateway logs (`unmatched API route` warnings)
rather than any `CUTOVER_*` variable — those no longer exist.

## Historical context

The original migration plan and response-shape contract requirements live in
[ADR 0002](../adr/0002-applications-strangler-cutover.md), retained for history.
