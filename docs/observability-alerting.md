# Observability & Alerting

ADS-510 — starter alerting rules and on-call paging conventions for the
Adopt Don't Shop backend. Wire these into the production Prometheus +
Alertmanager + PagerDuty/Slack stack.

## Metric sources

The backend exposes a Prometheus scrape endpoint at `/metrics`, gated by
`METRICS_AUTH_TOKEN` (Bearer). Available series:

- Process / Node defaults: `process_cpu_*`, `nodejs_*` (heap, GC, event-loop lag)
- HTTP histogram: `http_request_duration_seconds{method,route,status_code}`
- HTTP counter: `http_requests_total{method,route,status_code}`

Health-check probes also publish status data via `/api/v1/health` and
`/api/v1/ready` (the readiness probe asserts DB + Redis + BullMQ).

## Severity / routing convention

| Severity | Routing                                  | Response target |
| -------- | ---------------------------------------- | --------------- |
| `critical` | PagerDuty primary, Slack `#oncall-page` | 5 min ack       |
| `warning`  | Slack `#alerts`                         | 30 min review   |
| `info`     | Slack `#alerts-noise`                   | best-effort     |

All rules below assume a `service="adopt-dont-shop-backend"` label is
attached at scrape time.

## Starter alerting rules

```yaml
groups:
  - name: adopt-dont-shop-backend
    interval: 30s
    rules:
      # 5xx error-rate spike
      - alert: HighFiveHundredRate
        expr: |
          sum(rate(http_requests_total{status_code=~"5.."}[5m]))
            /
          sum(rate(http_requests_total[5m])) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Backend 5xx rate >1% (5m)"
          runbook: "https://wiki.example.com/runbooks/5xx-spike"

      # Latency regression
      - alert: P95LatencyHigh
        expr: |
          histogram_quantile(
            0.95,
            sum by (le) (rate(http_request_duration_seconds_bucket[5m]))
          ) > 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Backend p95 latency >500ms (10m)"

      # Event-loop lag
      - alert: EventLoopLag
        expr: nodejs_eventloop_lag_p99_seconds > 0.2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Node.js event-loop lag p99 >200ms"

      # Memory headroom
      - alert: HeapUsageHigh
        expr: |
          process_resident_memory_bytes
            /
          on() group_left() node_memory_MemTotal_bytes > 0.8
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Backend RSS >80% of node memory"

      # Readiness flapping
      - alert: ReadinessProbeFailing
        expr: probe_success{job="adopt-dont-shop-ready"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Backend /api/v1/ready failing (DB/Redis/BullMQ)"
```

## Dashboards

Recommended Grafana panels:

1. **Request volume** — `sum(rate(http_requests_total[1m])) by (route)`
2. **Error rate by route** — `sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (route)`
3. **Latency heatmap** — `http_request_duration_seconds_bucket`
4. **Event-loop lag** — `nodejs_eventloop_lag_seconds`
5. **Heap usage** — `nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes`
6. **Readiness up/down** — `probe_success{job="adopt-dont-shop-ready"}`

## On-call escalation

1. **Page received** → ack within 5 min (PagerDuty)
2. **Triage** — open the runbook linked from the alert annotation
3. **Mitigate** — restart, scale, or roll back. Record the action in
   `#oncall-page` thread.
4. **Post-incident** — file a follow-up ticket in Linear and link the
   alert in the next on-call handoff doc.

## Health endpoints reference

| Endpoint            | Probes                          | Used by              |
| ------------------- | ------------------------------- | -------------------- |
| `/health/simple`    | server is up                    | Load balancer        |
| `/api/v1/health`    | DB, email, storage, fs, Redis, queue | Operator dashboards |
| `/api/v1/ready`     | DB + Redis + BullMQ             | Kubernetes readiness |
| `/health/ready`     | (alias of `/api/v1/ready`)      | Legacy probes        |
| `/metrics`          | Prometheus scrape               | Prometheus           |
