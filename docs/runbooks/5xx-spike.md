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
curl -s -H "Authorization: Bearer $METRICS_AUTH_TOKEN" \
  https://${PROD_HOSTNAME}/metrics \
  | grep -E '^http_requests_total{.*status_code="5'

# 2. Which routes are bleeding? (last 30m of logs, group by status)
docker compose -f docker-compose.prod.yml logs --since 30m service-backend \
  | grep -E '"statusCode":5[0-9]{2}' \
  | head -50
```

In Grafana, open the **Error rate by route** panel:

```promql
sum by (route, status_code) (rate(http_requests_total{status_code=~"5.."}[5m]))
```

The route with the highest rate is your starting point.

## Diagnosis

Match the symptom to a cause:

| Signal                                                       | Likely cause                                | Jump to                                  |
| ------------------------------------------------------------ | ------------------------------------------- | ---------------------------------------- |
| Started immediately after a deploy                           | Bad release                                 | [`deploy-rollback.md`](./deploy-rollback.md) |
| `redis` failing in `/api/v1/health`; auth routes 503         | Redis outage                                | [`redis-outage.md`](./redis-outage.md)   |
| `acquire timeout` / `pool` errors in logs                    | DB pool exhaustion                          | [`db-pool-exhaustion.md`](./db-pool-exhaustion.md) |
| `service-backend-migrate` exited non-zero recently           | Migration failure                           | [`migration-failure.md`](./migration-failure.md) |
| Errors confined to one route, no other signal                | Application bug on a code path              | continue below                           |

Check `/api/v1/health` for an authoritative per-dependency status:

```bash
curl -sf https://${PROD_HOSTNAME}/api/v1/health | jq '.services'
```

Any `"status": "unhealthy"` in `database`, `redis`, or `queue` points
directly at the dependency to investigate.

## Mitigation

Pick the fastest reversible action:

1. **Recent deploy** — roll back per
   [`deploy-rollback.md`](./deploy-rollback.md). This is the most
   common cause; do it before deeper debugging.
2. **One bad pod** — restart it:
   ```bash
   docker compose -f docker-compose.prod.yml restart service-backend
   ```
   Watch the 5xx rate fall in Grafana. If it doesn't, the cause isn't
   pod-local.
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
- `curl -sf https://${PROD_HOSTNAME}/api/v1/health` returns
  `"status": "healthy"`.

## Capture before you leave

```bash
# Logs, scoped to the spike window
docker compose -f docker-compose.prod.yml logs --since 1h --no-color \
  service-backend > /tmp/incident-$(date +%s).log

# Image SHA actually running
docker compose -f docker-compose.prod.yml images service-backend
```

Attach both to the Linear follow-up ticket along with the Grafana
screenshot.
