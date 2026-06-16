# Prometheus alerting rules (ADS-806)

Loadable Prometheus rule files implementing the SLOs in
[`docs/slo.md`](../../../docs/slo.md). Every rule is written against a metric
that **actually exists** in the current stack (see the metrics table in
`docs/slo.md`); none reference the deleted monolith's `http_requests_total` /
`METRICS_AUTH_TOKEN`.

## Files

| File | Rules |
| --- | --- |
| `service-down.yml` | `ServiceDown` — scrape `up == 0` per service |
| `high-error-rate.yml` | `HighErrorRate` (HTTP 5xx), `HighGrpcErrorRate` (gRPC non-OK) |
| `p95-latency.yml` | `HttpP95LatencyHigh`, `GrpcP95LatencyHigh` |
| `gdpr-saga.yml` | `GdprSagaFailed`, `GdprSagaTimedOut`, `GdprErasureRequestedNotCompleted` |
| `gateway-resilience.yml` | `GatewayCircuitOpen`, `GatewayRateLimitSpike` |

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

## Out of scope

**Alertmanager routing & receivers are not configured here.** Routing needs a
real destination (PagerDuty integration key / Slack webhook) that this repo
does not yet have. The rules set a `severity` label and a `runbook` annotation;
wire `severity`-based routes in Alertmanager once a destination exists. See
`docs/slo.md` for the intended severity → routing convention.
