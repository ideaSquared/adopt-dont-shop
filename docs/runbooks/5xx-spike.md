# 5xx Spike

**Page severity:** `critical` (`HighFiveHundredRate`, ratio >1% for 5m)

## Symptoms

- PagerDuty: `HighFiveHundredRate — Backend 5xx rate >1% (5m)`.
- Grafana "Error rate by route" panel shows one or more routes climbing.
- Users / support reporting "internal server error".
- `/health/simple` may still return 200 (LB probe is liveness-only).

## Triage in 60 seconds

```bash
# 1. Confirm the alert is still firing (not a stale page).
#    The gateway exposes only the http_request_duration_seconds histogram
#    (no http_requests_total counter). Grep the histogram's _count series.
curl -s -H "Authorization: Bearer $METRICS_AUTH_TOKEN" \
  https://${PROD_HOSTNAME}/metrics \
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

| Signal                                                       | Likely cause                                | Jump to                                  |
| ------------------------------------------------------------ | ------------------------------------------- | ---------------------------------------- |
| Started immediately after a deploy                           | Bad release                                 | [`deploy-rollback.md`](./deploy-rollback.md) |
| Auth / rate-limit routes erroring; `redis` container unhealthy | Redis outage                              | [`redis-outage.md`](./redis-outage.md)   |
| `acquire timeout` / `pool is draining` in service logs       | DB pool exhaustion                          | [`db-pool-exhaustion.md`](./db-pool-exhaustion.md) |
| One service stuck in `restarting`; recent deploy ran a migration | Migration failure for that service       | [`migration-failure.md`](./migration-failure.md) |
| Errors confined to one route, no other signal                | Application bug on a code path              | continue below                           |

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
- `HighFiveHundredRate` alert resolves (Alertmanager `resolved` event
  in `#oncall-page`).
- `curl -sf https://${PROD_HOSTNAME}/health/simple` returns 200 and
  `docker compose -f docker-compose.prod.yml ps` shows every service
  healthy.

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
