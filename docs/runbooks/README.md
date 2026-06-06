# Production Runbooks (ADS-661)

One-page playbooks for the Adopt Don't Shop backend, written for the
on-call engineer who has shell access on the prod host but no context.
Each runbook is symptom → diagnosis → mitigation, ordered so you can
decide in 10 seconds whether to escalate.

## Index

| Runbook                                          | When to open it                                          |
| ------------------------------------------------ | -------------------------------------------------------- |
| [`5xx-spike.md`](./5xx-spike.md)                 | `HighFiveHundredRate` page; 5xx ratio >1% over 5m        |
| [`redis-outage.md`](./redis-outage.md)           | Readiness flap on `redis`; auth `429`s spike or vanish   |
| [`db-pool-exhaustion.md`](./db-pool-exhaustion.md) | `acquire timeout` errors; p95 latency climbs in lockstep |
| [`deploy-rollback.md`](./deploy-rollback.md)     | Bad deploy: image is live but error rate is up           |
| [`migration-failure.md`](./migration-failure.md) | `service-backend-migrate` exited non-zero; backend won't start |
| [`maintenance-mode.md`](./maintenance-mode.md)   | Planned outage, controlled brownout, or kill-switch needed |
| [`applications-cutover.md`](./applications-cutover.md) | Flipping `/api/v1/applications/*` to the microservice (or rolling back) |

## On-call principles

These are deliberately short. The whole point of paging at 03:00 is
that the rules are simple enough to follow when you're half-awake.

### When to page (`critical`)

- A `critical` alert fired and stayed firing past its `for:` window
  (see [`docs/observability-alerting.md`](../observability-alerting.md)).
- `/api/v1/ready` returns `503` and the load balancer is dropping pods.
- A deploy is in flight and the health-check loop in
  `.github/workflows/deploy.yml` has timed out.
- Customer-visible 5xx rate is above 1% for >5 min.

If any of the above is true, ack the page, open the runbook linked
from the alert annotation, post a 1-line status in `#oncall-page`,
**then** start mitigating.

### When to wait (`warning` / `info`)

- A `warning` fired but has not been firing for 30+ minutes.
- p95 latency is high but error rate is flat — start investigating
  in `#alerts`, don't escalate.
- A single readiness probe failed and recovered within 2 min — the
  `ReadinessProbeFailing` rule requires `for: 2m`, so a single blip
  won't page. Investigate, don't escalate.
- Heap usage warning during a known batch job (reports, exports).

### Mitigate before you debug

The order is always:

1. **Stop the bleeding** — roll back, flip the maintenance flag, drop
   the bad pod. Pick the fastest reversible action.
2. **Confirm the bleeding stopped** — refresh the dashboard, re-curl
   `/health`, watch error rate fall.
3. **Capture evidence** — `docker compose logs --since 30m`, screenshot
   the Grafana panel, copy the offending SQL. The post-incident review
   needs this and the data is gone in an hour.
4. **Then debug** — root cause can wait until business hours if the
   bleeding has stopped.

### Severity / routing recap

See [`docs/observability-alerting.md`](../observability-alerting.md)
for the authoritative table. Quick version:

- `critical` → PagerDuty + `#oncall-page` → ack in 5 min
- `warning`  → `#alerts` → review in 30 min
- `info`     → `#alerts-noise` → best effort

### What every runbook assumes you have

- SSH to the prod host running `docker-compose.prod.yml`.
- `docker compose -f docker-compose.prod.yml` works without `sudo`.
- `psql` available either on the host or via
  `docker compose exec database psql`.
- Grafana / Prometheus URL bookmarked.
- The on-call rotation knows who can authorise destructive actions
  (DB restore, force-merge, schema rollback) — if you don't have that
  authority, page the secondary.

### Post-incident

After mitigation:

1. File a follow-up ticket in Linear linking the alert.
2. Update the relevant runbook if the steps were wrong or missing.
3. Bring it to the next on-call handoff.

Runbooks are living docs — if you found a gap at 03:00, fix it at 10:00
so the next person doesn't hit the same wall.
