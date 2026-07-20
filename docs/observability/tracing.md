# Distributed Tracing (ADS-660)

The backend ships with the OpenTelemetry Node SDK and the standard
auto-instrumentation bundle. Traces are exported via OTLP/HTTP to
whatever collector is configured in the environment — Tempo, Jaeger,
the OTel Collector itself, or any compatible backend.

## Quick start

The SDK is **disabled by default**. Set `OTEL_EXPORTER_OTLP_ENDPOINT`
to a collector URL to turn it on. With the variable unset, the backend
boots normally, no spans are emitted, and the existing
correlation-ID + W3C `traceparent` scaffold continues to work.

```bash
# .env / .env.local
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=adopt-dont-shop-backend     # optional, this is the default
OTEL_TRACES_SAMPLER=parentbased_traceidratio  # optional
OTEL_TRACES_SAMPLER_ARG=1.0                   # optional
```

## Local viewer (Jaeger)

We deliberately do NOT bundle Jaeger in `docker-compose.yml` — the
collector is an operator concern. To inspect traces from a local
backend run, start Jaeger's all-in-one container in a separate shell:

```bash
docker run --rm --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

Then point the stack at it:

```bash
# All services (gateway + microservices) — each boots its own OTel SDK
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 pnpm dev

# Or a single service — set the endpoint before starting it
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
  pnpm exec turbo dev --filter=@adopt-dont-shop/service.gateway
```

Open <http://localhost:16686>. Each service registers its own service
name (`service.gateway`, `service.auth`, …).

## What gets instrumented

`@opentelemetry/auto-instrumentations-node` enables every contrib
instrumentation that ships in the bundle. The relevant ones for this
service are:

| Module         | Spans                                                     |
|----------------|-----------------------------------------------------------|
| `http`         | inbound + outbound HTTP                                    |
| `fastify`      | route handlers + hooks (gateway + each service)            |
| `grpc`         | gRPC client + server calls between the gateway and services |
| `pg`           | every SQL statement (direct via `@adopt-dont-shop/db`)     |
| `ioredis`      | every Redis command                                        |
| `socket.io`    | server-side connection events (gateway)                    |
| `undici`       | `fetch()` calls                                            |
| `winston`      | log-record attribution to a span                           |

`@opentelemetry/instrumentation-fs` is **disabled** because it emits
one span per `readFile` / `stat` and floods exporters with no
operational signal. Override via the standard
`OTEL_NODE_DISABLED_INSTRUMENTATIONS` /
`OTEL_NODE_ENABLED_INSTRUMENTATIONS` env vars if you need it.

## Trace flow

```
Inbound request
  └── HTTP instrumentation creates a server span (root)
      └── requestContextMiddleware reads the span via trace.getActiveSpan()
          and stores its traceparent in AsyncLocalStorage
              └── Winston stamps `traceparent` on every log line
                  └── Sentry's beforeSend adds trace_id to every event
                      └── Outbound HTTP / Redis / PG spans become children
                          via auto-instrumentation propagation
```

The result: every log line, Sentry event, and outbound call shares
the same trace ID, so a single trace in the collector links logs in
Loki, exceptions in Sentry, and downstream service spans.

## Sentry correlation

`config/sentry.ts` reads the active OTel span in `beforeSend` and
sets `event.contexts.trace.trace_id` plus a `trace_id` tag on every
event. The Sentry UI then renders a "View trace" link that pivots to
the collector when the IDs match.

## Sampling

The SDK respects the standard env vars:

- `OTEL_TRACES_SAMPLER` — sampler algorithm. Default is
  `parentbased_always_on`; production should set this to
  `parentbased_traceidratio` to keep volume manageable.
- `OTEL_TRACES_SAMPLER_ARG` — ratio in `[0, 1]` for the ratio
  samplers.

## Background work

There are no in-process worker daemons in the microservices — recurring
work happens via NATS JetStream consumers (durable subscriptions started
by `src/index.ts` in the owning service) and standalone `docker compose
run` cron jobs configured in `docker-compose.yml`. Both inherit the
per-service SDK boot, so their spans appear under the same service name
as the HTTP surface. Standalone one-shot scripts need
`OTEL_EXPORTER_OTLP_ENDPOINT` set in the shell that invokes them.

## Disabling

Unset (or remove) `OTEL_EXPORTER_OTLP_ENDPOINT`. The SDK will not
start, no spans are emitted, and there is no runtime overhead beyond
the cost of importing the module.
