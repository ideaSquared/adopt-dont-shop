# Observability & Alerting (superseded)

> **This document is superseded and retained only so existing links resolve.**
>
> It described the alerting setup for the original **monolith backend**
> (`service.backend`), which has since been replaced by the Fastify gateway +
> gRPC microservices architecture. Everything it specified no longer exists in
> the current stack:
>
> - the `/metrics` endpoint gated by `METRICS_AUTH_TOKEN` (Bearer),
> - the `http_requests_total` counter,
> - the `service="adopt-dont-shop-backend"` scrape label, and
> - the `HighFiveHundredRate` / `P95LatencyHigh` alert rules.
>
> For the current, canonical observability and alerting documentation see:
>
> - [`docs/slo.md`](./slo.md) — per-service SLOs, error budgets, the alert-rule
>   → SLO mapping, and the severity/routing convention.
> - [`infra/prometheus/rules/`](../infra/prometheus/rules/) — the committed
>   Prometheus rule files (`HighErrorRate`, `HttpP95LatencyHigh`,
>   `GrpcP95LatencyHigh`, `ServiceDown`, …), each written against a metric that
>   actually exists in the current stack.
