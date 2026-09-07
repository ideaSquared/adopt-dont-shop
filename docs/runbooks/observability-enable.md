# Enabling the self-hosted observability stack (ADS-1041)

> **Audience:** operator provisioning the stack on a host (not a paged incident).
> **Last reviewed:** 2026-09-03
> **Related alerts:** none — this is a setup guide. Once the stack is up, the
> `infra/prometheus/rules/` alerts route via Alertmanager to Discord (step 4).
> For the stack itself falling over later, see
> [`observability-stack-down.md`](./observability-stack-down.md).

Setup guide (not a firefighting runbook) for turning on the self-hosted
observability + error-tracking stacks in staging/production. Everything is
**opt-in and off by default** — the app stack is unchanged until you complete
these steps.

## What you get

| Overlay                            | Services                                        | Signals                                          |
| ---------------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| `docker-compose.observability.yml` | Prometheus, Loki, Tempo, Grafana, Alertmanager  | metrics, logs, traces, dashboards, alert routing |
| `docker-compose.glitchtip.yml`     | GlitchTip web + worker + its own Postgres/Redis | backend error tracking (Sentry-compatible)       |

The two are independent — enable either or both.

> ⚠️ **Capacity first.** These add ~5 (observability) + ~4 (GlitchTip)
> containers to a single host the production-readiness review already flags as
> near its memory/DB-connection ceiling (ADS-1039). Check `docker stats` and
> free RAM/disk headroom before enabling, and prefer enabling on **staging
> first**. If the host can't take it, the alternative is a dedicated monitoring
> VPS (move the overlay there and point the endpoints at it).

## 1. Provision files onto the host

The deploy host holds no repo checkout (`deploy.yml`), so copy the overlay
compose file(s) and the config tree to `/opt/ads/<env>/` alongside the base
compose, preserving paths:

```
/opt/ads/<env>/
├── docker-compose.observability.yml
├── docker-compose.glitchtip.yml          # only if enabling GlitchTip
├── infra/prometheus/rules/               # the SLO + host/datastore/burn-rate alert rules
└── observability/
    ├── prometheus/prometheus.yml         # edit the blackbox-public-endpoints target — see step 2a
    ├── blackbox/blackbox.yml             # synthetic-probe module config
    ├── loki/loki-config.yaml
    ├── tempo/tempo.yaml
    ├── alertmanager/alertmanager.yml
    ├── alertmanager/secrets/             # notifier secrets (see step 4)
    └── grafana/provisioning/             # datasources + dashboards
```

`docker-compose.observability.yml` also brings up `node-exporter`, `cadvisor`,
`postgres-exporter`, `redis-exporter` and `blackbox-exporter` (ADS-1313 /
ADS-1307d) — no separate provisioning step for these; they start with the rest
of the overlay and reuse the `db_password` / `redis_password` secrets the base
compose file already provisions.

### 2a. Point the synthetic probe at your real public hostname

`observability/prometheus/prometheus.yml`'s `blackbox-public-endpoints` job
ships with a placeholder target (`https://REPLACE_WITH_PUBLIC_HOSTNAME/`).
Prometheus config has no env-var interpolation, so edit the file on the host
before starting the stack:

```bash
sed -i 's#https://REPLACE_WITH_PUBLIC_HOSTNAME/#https://<your-prod-hostname>/#' \
  /opt/ads/<env>/observability/prometheus/prometheus.yml
```

(e.g. `scp -r docker-compose.observability.yml infra observability deploy@$HOST:/opt/ads/production/`)

## 2. Set host `.env` values

Add to `/opt/ads/<env>/.env` (see `docs/env-reference.md` for the full list):

```env
# Turn the overlay(s) on for this host
OBSERVABILITY_ENABLED=true
GLITCHTIP_ENABLED=true            # only if enabling GlitchTip

# Point services at the in-network backends
LOKI_URL=http://loki:3100
OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1

# Grafana admin (required — Grafana refuses to start without it)
GF_SECURITY_ADMIN_PASSWORD=<random>

# GlitchTip (required when GLITCHTIP_ENABLED=true)
GLITCHTIP_SECRET_KEY=<random 50+ chars>
GLITCHTIP_DB_PASSWORD=<random>
GLITCHTIP_DOMAIN=http://localhost:8000   # the URL GlitchTip serves itself on
                                          # (docker-compose.glitchtip.yml)
```

Leave `SENTRY_DSN` unset for now — you mint it from GlitchTip in step 6.

## 3. Deploy

Re-run `.github/workflows/deploy.yml` for the environment. With the flags set,
the deploy layers the overlay(s) into `docker compose up -d` automatically.
(Manual equivalent on the host:
`docker compose -f docker-compose.<env>.yml -f docker-compose.observability.yml --env-file .env up -d`.)

Confirm containers are healthy: `docker compose -f docker-compose.<env>.yml -f docker-compose.observability.yml ps`.

## 4. Wire Alertmanager (webhook secrets)

`alertmanager.yml` ships with **active** receivers for all three routes —
`critical-pager`, `warning-chat`, and `deadman` — each reading its own file
secret. There is nothing to uncomment; Alertmanager just needs **all three**
files to exist, and **they must exist before the container starts** or
Alertmanager fails to load the config.

1. Create **two** Discord incoming webhooks (Server Settings → Integrations →
   Webhooks) — one for a critical/escalation channel, one for a routine-chat
   channel (the same channel for both is fine if you don't want to split them
   yet — just point both secret files at the same URL).
2. Create a check on a dead-man's-switch service (e.g.
   [Healthchecks.io](https://healthchecks.io) or [Cronitor](https://cronitor.io)):
   period matching the Watchdog route's `repeat_interval` (5m,
   `observability/alertmanager/alertmanager.yml`), grace period covering at
   least one missed cycle. Copy its ping URL.
3. Write all three to the secret files on the host (git-ignored, mounted
   read-only at `/etc/alertmanager/secrets/`):

   ```bash
   cd /opt/ads/<env>
   printf '%s' '<critical-discord-webhook-url>' \
     > observability/alertmanager/secrets/discord_webhook_url_critical
   printf '%s' '<warning-discord-webhook-url>' \
     > observability/alertmanager/secrets/discord_webhook_url_warning
   printf '%s' '<deadman-switch-ping-url>' \
     > observability/alertmanager/secrets/deadman_webhook_url
   chmod 600 observability/alertmanager/secrets/discord_webhook_url_critical \
     observability/alertmanager/secrets/discord_webhook_url_warning \
     observability/alertmanager/secrets/deadman_webhook_url
   ```

4. Reload Alertmanager so it re-reads the secrets:

   ```bash
   docker compose -f docker-compose.<env>.yml -f docker-compose.observability.yml \
     kill -s HUP alertmanager
   ```

5. Validate the running config:

   ```bash
   docker compose -f docker-compose.<env>.yml -f docker-compose.observability.yml \
     exec alertmanager amtool check-config /etc/alertmanager/alertmanager.yml
   # Expected: "Checking '/etc/alertmanager/alertmanager.yml'  SUCCESS" and
   # all three receivers listed.
   ```

Escalation path and response SLAs for each severity: see
[`README.md`](./README.md#severity--routing) and
[`docs/slo.md`](../slo.md#severity--on-call).

## 5. Reach Grafana

Grafana has no public port. Tunnel to it:

```
ssh -L 3030:localhost:3030 deploy@$HOST   # then browse http://localhost:3030
```

Log in as `admin` / `GF_SECURITY_ADMIN_PASSWORD`. The Prometheus, Loki, and
Tempo datasources and the three dashboards (`service-overview`,
`domain-operations`, `audit-events`) are provisioned automatically.

## 6. GlitchTip project + DSN (if enabled)

1. Tunnel to GlitchTip web (`ssh -L 8000:localhost:8000 deploy@$HOST`, published
   on host loopback) and create an org + project in the UI.
2. Copy the project DSN and set it in the host `.env`:
   `SENTRY_DSN=http://<publicKey>@glitchtip-web:8080/<projectId>`
3. Re-deploy so the app services pick it up. `initializeSentry` activates
   automatically (NODE_ENV is production/staging).

## 7. Verify signals

- **Metrics:** Grafana → `service-overview` populates; Prometheus → Status →
  Targets shows all 11 `service-*` jobs `UP` (incl. `service-chat`, `service-cms`),
  plus `node-exporter`, `cadvisor`, `postgres-exporter`, `redis-exporter` and
  `blackbox-public-endpoints` `UP` (ADS-1313 / ADS-1307d).
- **Logs:** Grafana → Explore → Loki → `{service="service.gateway"}` returns lines.
- **Traces:** Grafana → Explore → Tempo → recent traces appear (hit an endpoint first).
- **Alerts:** Prometheus → Alerts lists the SLO + host/datastore/burn-rate rules
  as `inactive`/`pending`, and `Watchdog` as permanently `firing` (that's
  correct — it always fires by design, see `infra/prometheus/rules/watchdog.yml`).
- **Errors:** trigger a handled error and confirm it lands in GlitchTip.

### End-to-end proof: does an alert actually reach someone?

Every step above confirms the stack is _collecting_ signals — none of them
prove Alertmanager can actually wake a human. Fire a synthetic alert straight
at Alertmanager's API and confirm the message lands in Discord:

```bash
ALERTMANAGER_URL=http://localhost:9093 \  # through the SSH tunnel from step 5
  scripts/observability-fire-test-alert.sh warning
ALERTMANAGER_URL=http://localhost:9093 \
  scripts/observability-fire-test-alert.sh critical
```

For each severity, confirm:

1. Prometheus → Alerts (or Alertmanager's own UI) shows `ObservabilityFireTest`
   firing within seconds of the `curl`.
2. The severity's Discord channel receives a `[FIRING:1] ObservabilityFireTest`
   message within its `group_wait` (10s critical / 30s warning).
3. ~5 minutes later, a `[RESOLVED]` message arrives for the same alert
   (`send_resolved: true` on both Discord receivers).

No message after a few minutes → the receiver's webhook secret file is
missing/wrong, or Alertmanager hasn't picked it up — re-check step 4.

Separately, confirm the dead-man's-switch is wired: watch the
Healthchecks.io/Cronitor check's dashboard for a ping within the `deadman`
route's `repeat_interval` (5m) of the stack coming up — that ping is the
`Watchdog` alert (always firing) reaching the `deadman` receiver, proving the
off-host detection path works _before_ you need it.

## Disabling / rollback

Set `OBSERVABILITY_ENABLED=false` (and/or `GLITCHTIP_ENABLED=false`) in the host
`.env` and re-deploy — the overlay is dropped from `up -d`. Stop leftover
containers with
`docker compose -f docker-compose.<env>.yml -f docker-compose.observability.yml down`.
App services keep running; their shipping endpoints go inert. Named volumes
(metrics/logs/traces/GlitchTip data) persist unless you `down -v`.
