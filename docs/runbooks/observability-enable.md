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
├── infra/prometheus/rules/               # the SLO alert rules
└── observability/
    ├── prometheus/prometheus.yml
    ├── loki/loki-config.yaml
    ├── tempo/tempo.yaml
    ├── alertmanager/alertmanager.yml
    ├── alertmanager/secrets/             # notifier secrets (see step 4)
    └── grafana/provisioning/             # datasources + dashboards
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

## 4. Wire Alertmanager (Discord webhook secret)

`alertmanager.yml` ships with **active** Discord receivers — both
`critical-pager` and `warning-chat` are configured with
`discord_configs.webhook_url_file: /etc/alertmanager/secrets/discord_webhook_url`.
There is nothing to uncomment; Alertmanager just needs the secret file to
exist, and **it must exist before the container starts** or Alertmanager fails
to load the config.

1. Create a Discord incoming webhook (Server Settings → Integrations →
   Webhooks) for the alerts channel; copy its URL.
2. Write it to the secret file on the host (git-ignored, mounted read-only at
   `/etc/alertmanager/secrets/`):

   ```bash
   cd /opt/ads/<env>
   printf '%s' '<discord-webhook-url>' \
     > observability/alertmanager/secrets/discord_webhook_url
   chmod 600 observability/alertmanager/secrets/discord_webhook_url
   ```

3. Reload Alertmanager so it re-reads the secret:

   ```bash
   docker compose -f docker-compose.<env>.yml -f docker-compose.observability.yml \
     kill -s HUP alertmanager
   ```

4. Validate the running config:

   ```bash
   docker compose -f docker-compose.<env>.yml -f docker-compose.observability.yml \
     exec alertmanager amtool check-config /etc/alertmanager/alertmanager.yml
   # Expected: "Checking '/etc/alertmanager/alertmanager.yml'  SUCCESS" and
   # both receivers listed.
   ```

Both severities currently point at the same webhook (single Discord channel).
Split them by pointing `critical-pager` at a second `*_url` secret file later.

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
  Targets shows all 11 `service-*` jobs `UP` (incl. `service-chat`, `service-cms`).
- **Logs:** Grafana → Explore → Loki → `{service="service.gateway"}` returns lines.
- **Traces:** Grafana → Explore → Tempo → recent traces appear (hit an endpoint first).
- **Alerts:** Prometheus → Alerts lists the SLO rules as `inactive`/`pending`.
- **Errors:** trigger a handled error and confirm it lands in GlitchTip.

## Disabling / rollback

Set `OBSERVABILITY_ENABLED=false` (and/or `GLITCHTIP_ENABLED=false`) in the host
`.env` and re-deploy — the overlay is dropped from `up -d`. Stop leftover
containers with
`docker compose -f docker-compose.<env>.yml -f docker-compose.observability.yml down`.
App services keep running; their shipping endpoints go inert. Named volumes
(metrics/logs/traces/GlitchTip data) persist unless you `down -v`.
