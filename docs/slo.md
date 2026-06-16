# Service Level Objectives & Alerting (ADS-806)

Per-service SLOs, error-budget windows, and the Prometheus alerting rules
that watch them. The rules are committed as loadable rule files under
[`infra/prometheus/rules/`](../infra/prometheus/rules/) — see that
directory's [README](../infra/prometheus/rules/README.md) for how to wire
them into a Prometheus server.

> **This supersedes [`docs/observability-alerting.md`](./observability-alerting.md).**
> That document targets the deleted monolith
> (`service="adopt-dont-shop-backend"`, `http_requests_total`,
> `METRICS_AUTH_TOKEN`) — none of which exist in the current microservices
> stack. It is kept for history; treat this file and the rule files as
> canonical.

## What metrics actually exist today

Every service mounts the shared registry from
[`packages/observability/src/metrics.ts`](../packages/observability/src/metrics.ts)
on an unauthenticated `/metrics` endpoint. The series available **right now**
are:

| Metric | Type | Labels | Source |
| --- | --- | --- | --- |
| `http_request_duration_seconds` | histogram | `method`, `route`, `status_code` | shared — Fastify `onResponse` hook |
| `grpc_handler_duration_seconds` | histogram | `service`, `method`, `code`, `direction` | shared — gRPC adapter wrappers |
| `gdpr_sagas` | gauge | `state` (`in_progress`/`completed`/`failed`/`timed_out`) | `services/audit` only |
| `gateway_rate_limit_hits_total` | counter | `route` | `services/gateway` only |
| `grpc_circuit_state` | gauge | `service` (`0`=closed, `1`=half-open, `2`=open) | `services/gateway` only |
| `nodejs_*`, `process_*` | gauge/counter | — | `collectDefaultMetrics()` |

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

| Service | Job label | Availability SLO (non-5xx) | Latency SLO | 30-day error budget |
| --- | --- | --- | --- | --- |
| gateway | `service-gateway` | 99.9% | p95 HTTP < 500 ms | 43m 12s / 0.1% req |
| auth | `service-auth` | 99.9% | p95 gRPC < 300 ms | 43m 12s |
| pets | `service-pets` | 99.5% | p95 gRPC < 400 ms | 3h 36m |
| rescue | `service-rescue` | 99.5% | p95 gRPC < 400 ms | 3h 36m |
| applications | `service-applications` | 99.5% | p95 gRPC < 500 ms | 3h 36m |
| chat | `service-chat` | 99.5% | p95 gRPC < 400 ms | 3h 36m |
| matching | `service-matching` | 99.0% | p95 gRPC < 800 ms | 7h 18m |
| moderation | `service-moderation` | 99.5% | p95 gRPC < 400 ms | 3h 36m |
| notifications | `service-notifications` | 99.5% | p95 gRPC < 500 ms | 3h 36m |
| cms | `service-cms` | 99.9% | p95 HTTP < 300 ms | 43m 12s |

Rationale: the **gateway** and **auth** sit on every request path, so they
carry the tightest budgets. **matching** runs a heavier recommender (and reads
pets on-demand), so it gets the loosest latency/availability target.

### Background correctness — audit GDPR saga

The audit service has no user-facing latency SLO, but it owns a **correctness**
objective on the GDPR erasure saga (a legal obligation):

| Objective | Target | Measured by |
| --- | --- | --- |
| No saga stuck `failed` | `gdpr_sagas{state="failed"} == 0` | gauge |
| No saga stuck `timed_out` | `gdpr_sagas{state="timed_out"} == 0` | gauge |
| Erasure requests complete | each `erasureRequested` reaches `completed` within the saga deadline | gauge + sweep scheduler |

A single `failed`/`timed_out` saga is a budget breach — there is no tolerable
rate of unfulfilled erasure requests.

## Alerting rules → SLO mapping

The committed rules implement the objectives above. Each rule annotates the
runbook to open on fire.

| Rule (file) | Watches | SLO it protects |
| --- | --- | --- |
| `ServiceDown` (`service-down.yml`) | `up == 0` per job | Availability — service is unreachable |
| `HighErrorRate` (`high-error-rate.yml`) | 5xx fraction of `http_request_duration_seconds_count` | Availability (HTTP) |
| `HighGrpcErrorRate` (`high-error-rate.yml`) | non-OK fraction of `grpc_handler_duration_seconds_count` | Availability (gRPC) |
| `HttpP95LatencyHigh` (`p95-latency.yml`) | `histogram_quantile(0.95, …http_request_duration_seconds_bucket…)` | Latency (HTTP) |
| `GrpcP95LatencyHigh` (`p95-latency.yml`) | `histogram_quantile(0.95, …grpc_handler_duration_seconds_bucket…)` | Latency (gRPC) |
| `GdprSagaFailed` (`gdpr-saga.yml`) | `gdpr_sagas{state="failed"} > 0` | GDPR saga correctness |
| `GdprSagaTimedOut` (`gdpr-saga.yml`) | `gdpr_sagas{state="timed_out"} > 0` | GDPR saga correctness |
| `GdprErasureRequestedNotCompleted` (`gdpr-saga.yml`) | `in_progress` backlog persisting beyond the saga deadline | GDPR saga correctness |
| `GatewayCircuitOpen` (`gateway-resilience.yml`) | `grpc_circuit_state == 2` | Availability — downstream dependency unhealthy |
| `GatewayRateLimitSpike` (`gateway-resilience.yml`) | surge in `gateway_rate_limit_hits_total` | Abuse / capacity signal |

## Severity & on-call

The rules label severity but **deliberately do not configure Alertmanager
routing or receivers** — that needs a real destination (PagerDuty key / Slack
webhook) which does not exist in this repo yet. Wire routing when a destination
is provisioned. Until then the convention is:

| Severity | Intended routing (TODO: wire) | Response |
| --- | --- | --- |
| `critical` | page | ack within 5 min |
| `warning` | chat channel | review within 30 min |

Each `critical`/`warning` rule annotates a `runbook` — open it from the alert.
Runbook index: [`docs/runbooks/README.md`](./runbooks/README.md).

## Reviewing & evolving SLOs

- Revisit targets quarterly against actual 30-day burn. A budget never spent is
  too loose; a budget chronically exhausted is too tight (or the service needs
  work).
- When ADS-803 domain metrics land, extend the SLO table and add
  `domain-*.yml` rules rather than overloading the transport rules.
