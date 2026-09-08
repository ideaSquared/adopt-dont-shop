# Service Level Objectives & Alerting (ADS-806)

Authoritative reference for per-service SLOs, error-budget windows, and the Prometheus alerting rules that watch them (audience: operators + service owners). The rules are committed as loadable rule files under [`infra/prometheus/rules/`](../infra/prometheus/rules/) — see that directory's [README](../infra/prometheus/rules/README.md) for how to wire them into a Prometheus server. To enable the observability stack on a host, see [`runbooks/observability-enable.md`](./runbooks/observability-enable.md).

## What metrics actually exist today

Every service mounts the shared registry from
[`packages/observability/src/metrics.ts`](../packages/observability/src/metrics.ts)
on an unauthenticated `/metrics` endpoint. This is safe **only** because the
endpoint is never reachable from outside the deploy network today — verified
against both prod and staging (ADS-1251):

- No service (including the gateway) publishes its HTTP port to the host in
  `docker-compose.prod.yml` / `docker-compose.staging.yml` — every service
  uses `expose:`, not `ports:`, so only containers on the compose network
  (nginx, and an in-network Prometheus) can reach it.
- The edge nginx explicitly denies the public route: `location = /metrics { deny
all; return 403; }` in both `nginx/nginx.prod.conf` and the dev
  `nginx/nginx.conf`.

If a service HTTP port is ever published directly (bypassing nginx), or a
reverse proxy is added that doesn't carry this same deny rule, `/metrics`
must gain its own auth before that change ships — this doc's
"unauthenticated" note stops being true the moment either guardrail is
removed. `registerMetrics` already supports this (ADS-1327): set
`METRICS_BEARER_TOKEN` to require `Authorization: Bearer <token>` — see
`docs/env-reference.md`. The series available **right now** are:

| Metric                          | Type          | Labels                                                   | Source                                                            |
| ------------------------------- | ------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| `http_request_duration_seconds` | histogram     | `method`, `route`, `status_code`                         | shared — Fastify `onResponse` hook                                |
| `grpc_handler_duration_seconds` | histogram     | `service`, `method`, `code`, `direction`                 | shared — gRPC adapter wrappers                                    |
| `gdpr_sagas`                    | gauge         | `state` (`in_progress`/`completed`/`failed`/`timed_out`) | `services/audit` only                                             |
| `gateway_rate_limit_hits_total` | counter       | `route`                                                  | `services/gateway` only                                           |
| `grpc_circuit_state`            | gauge         | `service` (`0`=closed, `1`=half-open, `2`=open)          | `services/gateway` only                                           |
| `nodejs_*`, `process_*`         | gauge/counter | —                                                        | `collectDefaultMetrics()`                                         |
| `events_outbox_pending`         | gauge         | — (one series per scrape `job`)                          | `packages/events/src/outbox.ts`, every service that writes events |
| `events_dead_letter_total`      | counter       | `subject`                                                | `packages/events/src/dead-letter-metrics.ts`                      |

**Host / datastore / synthetic-probe metrics (ADS-1313, ADS-1307d)** — only
present when `docker-compose.observability.yml` is enabled, since these come
from exporter _containers_, not the app services themselves:

| Metric                                               | Type  | Source (scrape job)                                   |
| ---------------------------------------------------- | ----- | ----------------------------------------------------- |
| `node_filesystem_avail_bytes` / `_size_bytes`        | gauge | `node-exporter` (host disk)                           |
| `node_memory_MemAvailable_bytes` / `_MemTotal_bytes` | gauge | `node-exporter` (host memory)                         |
| `container_start_time_seconds`                       | gauge | `cadvisor` (per-container restarts)                   |
| `pg_stat_database_numbackends`                       | gauge | `postgres-exporter`                                   |
| `redis_up`, `redis_memory_used_bytes`                | gauge | `redis-exporter`                                      |
| `probe_success`, `probe_ssl_earliest_cert_expiry`    | gauge | `blackbox-exporter` (`blackbox-public-endpoints` job) |

Notes that shape every rule below:

- **There is no `http_requests_total` counter.** Request rate and error rate
  are derived from the histogram's `_count` series
  (`http_request_duration_seconds_count`). The legacy doc's
  `http_requests_total` does not exist.
- **There is no `service` / app label on the HTTP histogram.** A request's
  owning service is identified by the Prometheus **`job`** label set at scrape
  time. The rule files assume one scrape job per service, named for the
  service (`service-auth`, `service-gateway`, …). Adjust the `job` values to
  match your scrape config.
- `grpc_handler_duration_seconds` carries its own `service` label (the gRPC
  service name, e.g. `auth.v1.AuthService`) plus `direction` (`in` on the
  server side, `out` on the gateway's clients).
- `up` and (optional) `probe_success` are synthesised by Prometheus itself
  from scrape success / blackbox probes — they are not exported by the apps.

### Future metrics (ADS-803)

ADS-803 will add **domain** metrics (business counters/histograms on hot
paths — applications submitted, pets listed, notifications sent, etc.). The
comment block at the top of `metrics.ts` reserves that space ("Services
annotate their own hot paths in a follow-up PR"). When those land, add
per-domain SLOs to the table below and per-domain rules in a new
`infra/prometheus/rules/domain-*.yml` file. Until then the SLOs are limited to
the transport-level signals that genuinely exist.

## SLO targets

SLOs are expressed over a **rolling 30-day window**. The error budget is
`(1 - target)` of that window — the amount of bad time/requests the service may
spend before the SLO is breached.

### Availability & latency — request-serving services

These services serve HTTP and/or gRPC and own a user-facing latency budget.

| Service       | Job label               | Availability SLO (non-5xx) | Latency SLO       | 30-day error budget |
| ------------- | ----------------------- | -------------------------- | ----------------- | ------------------- |
| gateway       | `service-gateway`       | 99.9%                      | p95 HTTP < 500 ms | 43m 12s / 0.1% req  |
| auth          | `service-auth`          | 99.9%                      | p95 gRPC < 300 ms | 43m 12s             |
| pets          | `service-pets`          | 99.5%                      | p95 gRPC < 400 ms | 3h 36m              |
| rescue        | `service-rescue`        | 99.5%                      | p95 gRPC < 400 ms | 3h 36m              |
| applications  | `service-applications`  | 99.5%                      | p95 gRPC < 500 ms | 3h 36m              |
| chat          | `service-chat`          | 99.5%                      | p95 gRPC < 400 ms | 3h 36m              |
| matching      | `service-matching`      | 99.0%                      | p95 gRPC < 800 ms | 7h 18m              |
| moderation    | `service-moderation`    | 99.5%                      | p95 gRPC < 400 ms | 3h 36m              |
| notifications | `service-notifications` | 99.5%                      | p95 gRPC < 500 ms | 3h 36m              |
| cms           | `service-cms`           | 99.9%                      | p95 HTTP < 300 ms | 43m 12s             |

Rationale: the **gateway** and **auth** sit on every request path, so they
carry the tightest budgets. **matching** runs a heavier recommender (and reads
pets on-demand), so it gets the loosest latency/availability target.

### Background correctness — audit GDPR saga

The audit service has no user-facing latency SLO, but it owns a **correctness**
objective on the GDPR erasure saga (a legal obligation):

| Objective                 | Target                                                               | Measured by             |
| ------------------------- | -------------------------------------------------------------------- | ----------------------- |
| No saga stuck `failed`    | `gdpr_sagas{state="failed"} == 0`                                    | gauge                   |
| No saga stuck `timed_out` | `gdpr_sagas{state="timed_out"} == 0`                                 | gauge                   |
| Erasure requests complete | each `erasureRequested` reaches `completed` within the saga deadline | gauge + sweep scheduler |

A single `failed`/`timed_out` saga is a budget breach — there is no tolerable
rate of unfulfilled erasure requests.

## Alerting rules → SLO mapping

The committed rules implement the objectives above. Each rule annotates the
runbook to open on fire.

| Rule (file)                                                       | Watches                                                                                  | SLO it protects                                           |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `ServiceDown` (`service-down.yml`)                                | `up == 0` per job                                                                        | Availability — service is unreachable                     |
| `HighErrorRate` (`high-error-rate.yml`)                           | 5xx fraction of `http_request_duration_seconds_count`                                    | Availability (HTTP)                                       |
| `HighGrpcErrorRate` (`high-error-rate.yml`)                       | non-OK fraction of `grpc_handler_duration_seconds_count`                                 | Availability (gRPC)                                       |
| `HttpP95LatencyHigh` (`p95-latency.yml`)                          | `histogram_quantile(0.95, …http_request_duration_seconds_bucket…)`                       | Latency (HTTP)                                            |
| `GrpcP95LatencyHigh` (`p95-latency.yml`)                          | `histogram_quantile(0.95, …grpc_handler_duration_seconds_bucket…)`                       | Latency (gRPC)                                            |
| `GdprSagaFailed` (`gdpr-saga.yml`)                                | `gdpr_sagas{state="failed"} > 0`                                                         | GDPR saga correctness                                     |
| `GdprSagaTimedOut` (`gdpr-saga.yml`)                              | `gdpr_sagas{state="timed_out"} > 0`                                                      | GDPR saga correctness                                     |
| `GdprErasureRequestedNotCompleted` (`gdpr-saga.yml`)              | `in_progress` backlog persisting beyond the saga deadline                                | GDPR saga correctness                                     |
| `GatewayCircuitOpen` (`gateway-resilience.yml`)                   | `grpc_circuit_state == 2`                                                                | Availability — downstream dependency unhealthy            |
| `GatewayRateLimitSpike` (`gateway-resilience.yml`)                | surge in `gateway_rate_limit_hits_total`                                                 | Abuse / capacity signal                                   |
| `SLOBurnRateFastHttp`/`SLOBurnRateSlowHttp` (`slo-burn-rate.yml`) | HTTP 5xx burn rate vs. each job's own target (recording rules), 2-window (5m/1h, 30m/6h) | Availability (HTTP) — per-service, not one flat threshold |
| `SLOBurnRateFastGrpc`/`SLOBurnRateSlowGrpc` (`slo-burn-rate.yml`) | gRPC error burn rate vs. each service's own target, same 2-window shape                  | Availability (gRPC) — per-service                         |
| `HostDiskSpaceLow` (`host-resources.yml`)                         | host root filesystem free % (`node_filesystem_*`)                                        | Host capacity — see `postgres-disk-full.md`               |
| `HostMemoryPressure` (`host-resources.yml`)                       | host memory available % (`node_memory_*`)                                                | Host capacity                                             |
| `ContainerRestarting` (`host-resources.yml`)                      | `changes(container_start_time_seconds[15m]) > 2`                                         | Crash-loop detection                                      |
| `PostgresConnectionsNearMax` (`datastore.yml`)                    | `pg_stat_database_numbackends` vs. `max_connections=200`                                 | Datastore capacity — see `postgres-disk-full.md`          |
| `RedisDown` / `RedisMemoryHigh` (`datastore.yml`)                 | `redis_up`, `redis_memory_used_bytes`                                                    | Datastore availability/capacity — see `redis-outage.md`   |
| `PublicEndpointDown` (`external-probes.yml`)                      | `probe_success` from an external blackbox probe                                          | Availability — as seen from outside the app process       |
| `TlsCertificateExpiringSoon` (`external-probes.yml`)              | `probe_ssl_earliest_cert_expiry` <14 days out                                            | Cert renewal — see `tls-cert-renewal.md`                  |
| `OutboxBacklogGrowing` (`outbox.yml`)                             | `events_outbox_pending > 100` for 10m                                                    | Event delivery lag — see `outbox-backlog.md`              |
| `DeadLetterIncreasing` (`outbox.yml`)                             | `rate(events_dead_letter_total[15m]) > 0`                                                | DLQ growth — see `jetstream-backlog.md`                   |
| `Watchdog` (`watchdog.yml`)                                       | `vector(1)` — always firing                                                              | Dead-man's switch — pipeline/host itself is up            |

## Severity & on-call

As of ADS-1041 the rules are **loaded** by Prometheus and routed by
Alertmanager on their `severity` label in the deployed observability stack
(`docker-compose.observability.yml` / dev `observability` profile). `critical`
and `warning` each deliver to **Discord** via their **own** incoming webhook
(split as of ADS-1307 — a critical escalation channel can differ from routine
chat); a third, always-firing `severity: none` alert (`Watchdog`,
`watchdog.yml`) goes to `deadman`, a generic webhook pointed at an external
dead-man's-switch service (Healthchecks.io/Cronitor-style — see below). Every
webhook URL is read from its own file secret so it never lands in
`docker inspect` (`observability/alertmanager/alertmanager.yml`,
`webhook_url_file:` / `url_file:`). There is **no PagerDuty and no
Slack/SMTP** — Discord (for the two paged severities) plus one generic
webhook (for the dead-man's switch) are the only sinks.

Alertmanager will not start until **all three** secret files exist. To wire
them up (also in
[`runbooks/observability-enable.md`](./runbooks/observability-enable.md)):

1. Create two Discord incoming webhooks (one per severity — or point both
   secret files at the same URL if you haven't split channels yet) and a
   check on a dead-man's-switch service.
2. Drop each into its host secret file:
   ```bash
   printf '%s' '<critical-discord-webhook-url>' \
     > /opt/ads/<env>/observability/alertmanager/secrets/discord_webhook_url_critical
   printf '%s' '<warning-discord-webhook-url>' \
     > /opt/ads/<env>/observability/alertmanager/secrets/discord_webhook_url_warning
   printf '%s' '<deadman-switch-ping-url>' \
     > /opt/ads/<env>/observability/alertmanager/secrets/deadman_webhook_url
   chmod 600 /opt/ads/<env>/observability/alertmanager/secrets/discord_webhook_url_critical \
     /opt/ads/<env>/observability/alertmanager/secrets/discord_webhook_url_warning \
     /opt/ads/<env>/observability/alertmanager/secrets/deadman_webhook_url
   ```
3. Reload: `docker compose … kill -s HUP alertmanager`.
4. Validate: `amtool check-config observability/alertmanager/alertmanager.yml`.
5. Prove it reaches someone: `scripts/observability-fire-test-alert.sh` (see
   `runbooks/observability-enable.md` §7).

Three severities are defined:

| Severity   | Alertmanager receiver | Sink                       | Response                                                                                                                                                                                                                                                 |
| ---------- | --------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `critical` | `critical-pager`      | Discord                    | Ack within 5 min. **Escalation path** (there is no PagerDuty/on-call rotation tool): DM the secondary on-call directly on Discord/Slack; if they don't ack within 15 min, DM the team lead. Both are named in the on-call handoff doc, not in this repo. |
| `warning`  | `warning-chat`        | Discord                    | Review within 30 min; no escalation unless it repeats or is ignored past a shift                                                                                                                                                                         |
| `none`     | `deadman`             | External dead-man's switch | No human response to the alert itself — the _external_ service pages if its ping stops arriving, which means the whole pipeline (or host) is down; see `runbooks/observability-stack-down.md`                                                            |

A firing `critical` inhibits the same alert's `warning` (see the `inhibit_rules` in `alertmanager.yml`).

Retention is sized to the objectives above: Prometheus keeps **30 days** of
metrics (the error-budget window), Loki **14 days** of logs, Tempo **3 days** of
traces.

Each `critical`/`warning` rule annotates a `runbook` — open it from the alert.
Runbook index: [`docs/runbooks/README.md`](./runbooks/README.md).

## Reviewing & evolving SLOs

- Revisit targets quarterly against actual 30-day burn. A budget never spent is
  too loose; a budget chronically exhausted is too tight (or the service needs
  work).
- When ADS-803 domain metrics land, extend the SLO table and add
  `domain-*.yml` rules rather than overloading the transport rules.
