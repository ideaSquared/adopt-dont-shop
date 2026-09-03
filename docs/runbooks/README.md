# Production Runbooks (ADS-661)

One-page playbooks for the Adopt Don't Shop backend, written for the on-call
engineer who has shell access on the prod host but no context. Each runbook is
symptom → diagnosis → mitigation, ordered so you can decide quickly whether to
escalate. New runbooks follow [`../templates/RUNBOOK.md`](../templates/RUNBOOK.md).

Not looking for prod on-call help? See
[`dev-stack-troubleshooting.md`](./dev-stack-troubleshooting.md) for local
Docker dev stack failures instead — different audience, same symptom →
diagnosis → fix format.

## Preconditions

Every prod runbook assumes you already have all of this. If you don't, get it
before step 1 or escalate.

```bash
# 1. SSH to the single prod host.
ssh deploy@$PROD_HOST

# 2. Everything runs from the deploy directory.
cd /opt/ads/production

# 3. The runbooks curl the public edge by hostname — export it once.
export PROD_HOSTNAME=<the production hostname, e.g. adoptdontshop.example>
```

Tools the runbooks call, and where each comes from:

| Tool                                        | Where                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docker compose -f docker-compose.prod.yml` | On the host; works without `sudo`. All compose commands pass `-f docker-compose.prod.yml` explicitly — the host holds no `.env`-selected default.                                                                                                                                                                                                                  |
| `psql`                                      | Via the DB container: `docker compose -f docker-compose.prod.yml exec database psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"`.                                                                                                                                                                                                                                        |
| `nats` CLI                                  | **Not installed in any prod container** — the `nats` service runs `nats:2.10-alpine` (server only, no CLI). Use the JetStream monitoring endpoint instead: `docker compose -f docker-compose.prod.yml exec nats wget -qO- 'http://localhost:8222/jsz?consumers=true'`. If you need the CLI, run a throwaway `natsio/nats-box` container on the `ads-prod-network`. |
| `aws` CLI                                   | On the host, with the host's own S3 credentials (backups). Needed for restore / backup runbooks.                                                                                                                                                                                                                                                                   |
| `amtool`                                    | Ships in the Alertmanager image: `docker compose -f docker-compose.prod.yml exec alertmanager amtool ...` (observability overlay only).                                                                                                                                                                                                                            |
| `gh`                                        | On your workstation, for `gh workflow run` (deploy / rollback). Not on the prod host.                                                                                                                                                                                                                                                                              |

## Index

### In this directory

| Runbook                                                          | When to open it                                                                                 |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [`dev-stack-troubleshooting.md`](./dev-stack-troubleshooting.md) | Local `pnpm docker:dev` failures (not prod on-call)                                             |
| [`5xx-spike.md`](./5xx-spike.md)                                 | `HighErrorRate` / `HighGrpcErrorRate` / `ServiceDown` / `GatewayCircuitOpen`; HTTP 5xx ratio up |
| [`redis-outage.md`](./redis-outage.md)                           | `redis` container unhealthy; rate-limiters misbehaving                                          |
| [`db-pool-exhaustion.md`](./db-pool-exhaustion.md)               | `HttpP95LatencyHigh` / `GrpcP95LatencyHigh`; `acquire timeout` errors                           |
| [`deploy-rollback.md`](./deploy-rollback.md)                     | Bad deploy: image is live but error rate is up                                                  |
| [`migration-failure.md`](./migration-failure.md)                 | A schema-owning service stuck in `restarting` after a deploy ran a migration                    |
| [`maintenance-mode.md`](./maintenance-mode.md)                   | Planned outage, controlled brownout, or kill-switch needed (`GatewayRateLimitSpike`)            |
| [`jetstream-backlog.md`](./jetstream-backlog.md)                 | NATS JetStream consumer lag / DLQ growth                                                        |
| [`outbox-backlog.md`](./outbox-backlog.md)                       | `events_outbox_pending` climbs — events staged but not reaching JetStream                       |
| [`nats-down.md`](./nats-down.md)                                 | `nats` container down; every service depends on it                                              |
| [`gdpr-erasure-incident.md`](./gdpr-erasure-incident.md)         | GDPR erasure saga failed / timed out                                                            |
| [`postgres-disk-full.md`](./postgres-disk-full.md)               | Postgres out of disk on the single host                                                         |
| [`tls-cert-renewal.md`](./tls-cert-renewal.md)                   | Let's Encrypt cert expiring / certbot renew failing                                             |
| [`ghcr-pull-failure.md`](./ghcr-pull-failure.md)                 | Deploy or rollback fails pulling images from GHCR                                               |
| [`host-reboot.md`](./host-reboot.md)                             | Host rebooted / cold start; bringing the stack back                                             |
| [`secret-rotation-emergency.md`](./secret-rotation-emergency.md) | Rotate a leaked signing key / secret under compromise                                           |
| [`observability-stack-down.md`](./observability-stack-down.md)   | Prometheus / Grafana / Alertmanager / Loki / Tempo down (flying blind)                          |
| [`observability-enable.md`](./observability-enable.md)           | Setup guide — turn on the self-hosted metrics/logs/traces/alerting + GlitchTip stack            |
| [`screen-reader-smoke.md`](./screen-reader-smoke.md)             | Accessibility screen-reader smoke check for the apps                                            |

### Elsewhere in the docs

| Doc                                                                        | When to open it                                                   |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [`../db-backup-runbook.md`](../db-backup-runbook.md)                       | Back up or restore Postgres / the `uploads` volume; drill cadence |
| [`../operations/deploy.md`](../operations/deploy.md)                       | The normal deploy procedure (not an incident)                     |
| [`../operations/connection-budget.md`](../operations/connection-budget.md) | The per-service DB connection budget arithmetic                   |

## On-call principles

These are deliberately short. The whole point of paging at 03:00 is that the
rules are simple enough to follow when you're half-awake.

### Mitigate before you debug

The order is always:

1. **Stop the bleeding** — roll back, flip maintenance mode, restart the bad
   container. Pick the fastest reversible action.
2. **Confirm the bleeding stopped** — refresh the dashboard, re-curl
   `/health/simple`, watch error rate fall.
3. **Capture evidence** — `docker compose -f docker-compose.prod.yml logs --since 30m`,
   screenshot the Grafana panel, copy the offending SQL. The post-incident
   review needs this and the data ages out fast.
4. **Then debug** — root cause can wait until business hours if the bleeding has
   stopped.

### Severity / routing

Prometheus rules (`infra/prometheus/rules/`) carry exactly two severities.
Alertmanager (`observability/alertmanager/alertmanager.yml`) routes both to
**Discord** via an incoming webhook — there is no PagerDuty, no `#oncall-page`,
and no `info` tier. See [`docs/slo.md`](../slo.md) for the authoritative table.

| Severity   | Alertmanager receiver | Destination                             | Response                                                                             |
| ---------- | --------------------- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| `critical` | `critical-pager`      | Discord webhook (fast group, 1h repeat) | Ack in 5 min, open the runbook in the alert's `runbook` annotation, start mitigating |
| `warning`  | `warning-chat`        | Discord webhook (4h repeat)             | Review within 30 min; investigate, don't necessarily escalate                        |

Escalation is a DM to the secondary on-call — there is no separate pager
system. If you lack authority for a destructive action (DB restore, schema
rollback, secret rotation), that DM is the escalation.

### Post-incident

1. File a follow-up ticket in Linear linking the alert.
2. Update the relevant runbook if the steps were wrong or missing.
3. Bring it to the next on-call handoff.

Runbooks are living docs — if you found a gap at 03:00, fix it at 10:00 so the
next person doesn't hit the same wall.
