# 5xx Spike

> **Audience:** on-call, shell access on the prod host, no context.
> **Last reviewed:** 2026-09-03
> **Related alerts:** `HighErrorRate`, `HighGrpcErrorRate` (`warning`,
> `infra/prometheus/rules/high-error-rate.yml`); `ServiceDown`
> (`critical`, `service-down.yml`); `GatewayCircuitOpen` (`critical`,
> `gateway-resilience.yml`). A `critical` here means page-fast — treat a
> `GatewayCircuitOpen` or `ServiceDown` as more urgent than a bare
> `HighErrorRate` warning.

## Preconditions

See [`README.md`](./README.md#preconditions): prod SSH, `cd /opt/ads/production`,
`export PROD_HOSTNAME=…`, `docker compose -f docker-compose.prod.yml`.

## Symptoms

- Alertmanager (`warning-chat`): `HighErrorRate — service-<name> HTTP 5xx rate >1% (5m)`.
- Grafana "Error rate by route" panel shows one or more routes climbing.
- Users / support reporting "internal server error".
- `/health/simple` may still return 200 (LB probe is liveness-only).

## Triage in 60 seconds

```bash
# 1. Confirm the alert is still firing (not a stale page).
#    The gateway exposes only the http_request_duration_seconds histogram
#    (no http_requests_total counter). Grep the histogram's _count series.
curl -s https://${PROD_HOSTNAME}/metrics \
  | grep -E '^http_request_duration_seconds_count{.*status_code="5'

# 2. Which routes are bleeding? (last 30m of gateway access logs)
docker compose -f docker-compose.prod.yml logs --since 30m service-gateway \
  | grep -E '"statusCode":5[0-9]{2}' \
  | head -50

# If the gateway is fine but a specific backing service is erroring, follow
# its logs too — e.g.:
#   docker compose -f docker-compose.prod.yml logs --since 30m service-pets
```

In Grafana, open the **Error rate by route** panel:

```promql
sum by (route, status_code) (rate(http_request_duration_seconds_count{status_code=~"5.."}[5m]))
```

The route with the highest rate is your starting point.

## Diagnosis

Match the symptom to a cause:

| Signal                                                           | Likely cause                                    | Jump to                                                       |
| ---------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| Started immediately after a deploy                               | Bad release                                     | [`deploy-rollback.md`](./deploy-rollback.md)                  |
| Auth / rate-limit routes erroring; `redis` container unhealthy   | Redis outage                                    | [`redis-outage.md`](./redis-outage.md)                        |
| `acquire timeout` / `pool is draining` in service logs           | DB pool exhaustion                              | [`db-pool-exhaustion.md`](./db-pool-exhaustion.md)            |
| One service stuck in `restarting`; recent deploy ran a migration | Migration failure for that service              | [`migration-failure.md`](./migration-failure.md)              |
| Whole domain 404s, `unmatched API route` warns in gateway logs   | Backing service unreachable at its `*_GRPC_URL` | `docker compose -f docker-compose.prod.yml ps` + gateway logs |
| Errors confined to one route, no other signal                    | Application bug on a code path                  | continue below                                                |

The gateway only exposes `/health/simple` (liveness — `200 ok`). There
is no aggregated `/api/v1/health` route; check per-dependency state by
inspecting the containers directly:

```bash
# Backing services + infrastructure
docker compose -f docker-compose.prod.yml ps
# A specific service's logs
docker compose -f docker-compose.prod.yml logs --tail=200 service-auth
```

A service stuck in `restarting`, `unhealthy`, or `exited` is the
dependency to investigate first.

## Mitigation

Pick the fastest reversible action:

1. **Recent deploy** — roll back per
   [`deploy-rollback.md`](./deploy-rollback.md). This is the most
   common cause; do it before deeper debugging.
2. **One bad replica** — restart the affected service. Identify it
   from the diagnosis table above (gateway vs. a specific domain
   service), then:
   ```bash
   docker compose -f docker-compose.prod.yml restart service-<name>
   ```
   Watch the 5xx rate fall in Grafana. If it doesn't, the cause isn't
   restart-local.
3. **Specific route hot** — if the failing route is non-critical (e.g.
   `/api/v1/reports/*`), consider flipping a feature flag to disable
   the code path. See [`maintenance-mode.md`](./maintenance-mode.md)
   for the kill-switch pattern.
4. **All else** — flip `APPLICATION_SETTINGS.maintenance_mode = true`
   to shed traffic while you investigate. See
   [`maintenance-mode.md`](./maintenance-mode.md).

## Verify

- Grafana error rate drops below 1% and stays there for 5 min.
- `HighErrorRate` alert resolves (Alertmanager posts a `resolved`
  event to the Discord alerts channel).
- `curl -sf https://${PROD_HOSTNAME}/health/simple` returns 200 and
  `docker compose -f docker-compose.prod.yml ps` shows every service
  healthy.

## Rollback

Every mitigation above is reversible: a `restart` is idempotent, a rolled-back
deploy rolls forward again (see [`deploy-rollback.md`](./deploy-rollback.md)),
and a maintenance flag or feature gate flips back. If a restart made things
worse, roll the offending service's image back instead.

## Escalate

If the 5xx rate has not fallen **15 minutes** after your mitigation, or a
`critical` (`ServiceDown` / `GatewayCircuitOpen`) is still firing, DM the
secondary on-call. Hand over: the failing route(s), the suspect service and its
SHA, what you've already tried, and the Grafana screenshot.

## Capture before you leave

```bash
# Logs, scoped to the spike window — pull the gateway PLUS any service
# you identified in diagnosis.
docker compose -f docker-compose.prod.yml logs --since 1h --no-color \
  service-gateway service-<name> > /tmp/incident-$(date +%s).log

# Image SHAs actually running across the stack
docker compose -f docker-compose.prod.yml images
```

Attach both to the Linear follow-up ticket along with the Grafana
screenshot.
