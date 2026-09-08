# Prometheus alerting rules (ADS-806)

Loadable Prometheus rule files implementing the SLOs in
[`docs/slo.md`](../../../docs/slo.md). Every rule is written against a metric
that **actually exists** in the current stack (see the metrics table in
`docs/slo.md`); none reference the deleted monolith's `http_requests_total` /
`METRICS_AUTH_TOKEN`.

## Files

| File                     | Rules                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `service-down.yml`       | `ServiceDown` — scrape `up == 0` per service                                                            |
| `high-error-rate.yml`    | `HighErrorRate` (HTTP 5xx), `HighGrpcErrorRate` (gRPC non-OK)                                           |
| `p95-latency.yml`        | `HttpP95LatencyHigh`, `GrpcP95LatencyHigh`                                                              |
| `gdpr-saga.yml`          | `GdprSagaFailed`, `GdprSagaTimedOut`, `GdprErasureRequestedNotCompleted`                                |
| `gateway-resilience.yml` | `GatewayCircuitOpen`, `GatewayRateLimitSpike`                                                           |
| `watchdog.yml`           | `Watchdog` — always-firing dead-man's-switch source (ADS-1307)                                          |
| `host-resources.yml`     | `HostDiskSpaceLow`, `HostMemoryPressure`, `ContainerRestarting` (ADS-1313)                              |
| `datastore.yml`          | `PostgresConnectionsNearMax`, `RedisDown`, `RedisMemoryHigh` (ADS-1313)                                 |
| `external-probes.yml`    | `PublicEndpointDown`, `TlsCertificateExpiringSoon` (ADS-1307/1324)                                      |
| `outbox.yml`             | `OutboxBacklogGrowing`, `DeadLetterIncreasing` (ADS-1324)                                               |
| `slo-burn-rate.yml`      | Per-service multi-window burn-rate alerts, e.g. `SLOBurnRateFastHttp`, `SLOBurnRateSlowGrpc` (ADS-1324) |

## Assumptions

- **One scrape job per service**, named `service-<name>` (e.g. `service-auth`,
  `service-gateway`). The HTTP histogram carries no service label, so service
  identity for HTTP/`up` rules comes from the `job` label. Adjust the `job`
  matchers if your scrape config names targets differently.
- The `/metrics` endpoint on each service is unauthenticated (current
  behaviour). If you add scrape auth, configure it in `prometheus.yml`, not
  here.
- `gdpr_sagas` is exported only by `service-audit`; `grpc_circuit_state` and
  `gateway_rate_limit_hits_total` only by `service-gateway`.

## Wiring into Prometheus

Reference the files from your `prometheus.yml` and reload:

```yaml
# prometheus.yml
rule_files:
  - /etc/prometheus/rules/*.yml

scrape_configs:
  - job_name: service-gateway
    metrics_path: /metrics
    static_configs:
      - targets: ['service-gateway:4000']
  - job_name: service-auth
    metrics_path: /metrics
    static_configs:
      - targets: ['service-auth:5002']
  # … one job per service, named service-<name>, on its HTTP port.
```

Mount this directory at `/etc/prometheus/rules` (or copy the files there) and
reload Prometheus (`SIGHUP` or `POST /-/reload`).

## Validating

Check syntax with `promtool` before shipping:

```bash
promtool check rules infra/prometheus/rules/*.yml
```

(YAML structure is also CI-checkable with any YAML loader; promtool
additionally validates the PromQL expressions.)

## Alertmanager (ADS-1041)

These files are now **loaded** by Prometheus (`rule_files:` in
`observability/prometheus/prometheus.yml`) and routed by **Alertmanager**
(`observability/alertmanager/alertmanager.yml`) in both the dev `observability`
profile and the prod/staging overlay (`docker-compose.observability.yml`).

Routing keys off the `severity` label: `critical` → the `critical-pager`
receiver, `warning` → `warning-chat`, `none` (the always-firing `Watchdog`
alert, `watchdog.yml`) → `deadman`. `critical-pager` and `warning-chat` each
deliver to their **own** Discord webhook (split — ADS-1307b); `deadman` posts
to an external dead-man's-switch service (Healthchecks.io/Cronitor-style).
Every URL is a file secret, read via `*_file` so it stays out of
`docker inspect`:

- `observability/alertmanager/secrets/discord_webhook_url_critical`
- `observability/alertmanager/secrets/discord_webhook_url_warning`
- `observability/alertmanager/secrets/deadman_webhook_url`

Alertmanager will not start until all three exist. See
`docs/runbooks/observability-enable.md` §4 for how to provision them and
`docs/runbooks/README.md`'s severity section / `docs/slo.md` for the
severity → routing → escalation convention.
