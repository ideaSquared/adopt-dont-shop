# @adopt-dont-shop/observability

Shared observability bootstrap for backend microservices.

**Mirrors `service.backend`'s existing telemetry stack** — same SDK
versions, same env var contract, same redaction rules — with the
service name parameterised so each extracted service gets the
identical instrumentation with one call.

## API

### `initializeOpenTelemetry({ serviceName, serviceVersion? })`

Starts the OpenTelemetry Node SDK with OTLP/HTTP exporter and the auto-
instrumentations bundle (HTTP, Express, pg, ioredis, socket.io, undici,
Winston). `@opentelemetry/instrumentation-fs` is explicitly disabled —
it emits a span per `readFile` / `stat` which multiplies trace volume
by ~100×.

**Boot order constraint:** must be invoked from a file loaded via
Node's `--import` flag so the auto-instrumentations can hook the
HTTP / pg / ioredis modules BEFORE those are first imported. Each
extracted service has its own thin `src/instrumentation.ts` that calls
this and IS the `--import` target.

```ts
// services/auth/src/instrumentation.ts
import { initializeOpenTelemetry } from '@adopt-dont-shop/observability';
initializeOpenTelemetry({ serviceName: 'service.auth' });
```

```jsonc
// services/auth/package.json
"scripts": {
  "dev": "tsx --import ./src/instrumentation.ts ./src/index.ts"
}
```

Behaviour:
- **No collector configured** (`OTEL_EXPORTER_OTLP_ENDPOINT` unset) →
  silent no-op. Service boots normally with no traces.
- **Set** → SDK starts; `OTEL_SERVICE_NAME` env var still wins so
  operators can override per-deploy without code changes.
- **No-throw contract**: a misconfigured exporter degrades to "no
  traces" rather than wedging boot.

### `initializeSentry({ serviceName, logger? })`

Initializes the `@sentry/node` SDK with profiling integration.

- Only enabled when `SENTRY_DSN` is set AND `NODE_ENV` is `production`
  or `staging`. Silent no-op otherwise.
- `tracesSampleRate` + `profilesSampleRate`: 1.0 in dev, 0.1 in
  production.
- Every event gets the active OpenTelemetry `trace_id` / `span_id`
  stamped on `event.contexts.trace` and `event.tags.trace_id` so a
  Sentry exception pivots to the matching distributed trace.
- `beforeSend` runs `redactSentryEvent` — strips `authorization` /
  `cookie` headers, redacts secret-shaped keys (`password`, `token`,
  `secret`, `api_key`, `authorization`) recursively from
  `request.data` and breadcrumb data, collapses UUIDs + numeric IDs
  in URLs to `:id`.
- `ValidationError`s are dropped before sending — they're caller bugs,
  not service bugs.

### `redactSentryEvent(event)`

Exported separately so the redaction logic can be unit-tested in
isolation. The Sentry SDK's `beforeSend` hook calls this; no callers
should need to call it directly.

### `createLogger({ serviceName, logLevel? })`

Returns a Winston logger with the console transport always wired and
the Loki transport added when `LOKI_URL` is set. Label cardinality
matches `service.backend`'s logger so Grafana queries across services
work without changes.

```ts
import { createLogger } from '@adopt-dont-shop/observability';

const logger = createLogger({ serviceName: 'service.gateway' });
logger.info('booted', { port: 4000 });
```

- `logLevel` priority: `opts.logLevel` → `LOG_LEVEL` env → `debug` in
  development / `info` everywhere else.
- `serviceName` is stamped as `defaultMeta.service` on every line AND
  as the Loki `service` label.

### What this package does NOT include (yet)

- **PII / secret redaction inside log payloads.** `service.backend`'s
  logger has it via a `redactLogPayload` helper. Port that into here
  when the redact module migrates to a shared package.
- **`AsyncLocalStorage` correlation-id stamping.** Coupled to each
  service's request-context middleware. Callers attach
  `correlationId` / `traceparent` to log payloads as fields when they
  have them.
- **`loggerHelpers` bundle** (`logRequest`, `logAuth`, `logBusiness`,
  `logSecurity`, …). Middleware concerns — they live with each
  service's own request pipeline.

## Environment variables

All optional. The bootstraps silently no-op when unset.

| Variable                       | Owner          | Purpose                                                                 |
| ------------------------------ | -------------- | ----------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT`  | OpenTelemetry  | Collector endpoint. Unset → SDK doesn't start.                          |
| `OTEL_SERVICE_NAME`            | OpenTelemetry  | Overrides `opts.serviceName`. Operators set per-deploy.                 |
| `OTEL_TRACES_SAMPLER`          | OpenTelemetry  | Read by the SDK directly (e.g. `parentbased_traceidratio`).             |
| `OTEL_TRACES_SAMPLER_ARG`      | OpenTelemetry  | Ratio for ratio-based samplers (0–1).                                   |
| `SENTRY_DSN`                   | Sentry         | Backend DSN. Unset → Sentry disabled.                                   |
| `SENTRY_RELEASE`               | Sentry         | Optional release tag. Usually set by CI/CD.                             |
| `HOSTNAME`                     | Sentry         | Overrides the `serverName` (falls back to `opts.serviceName`).          |
| `NODE_ENV`                     | Sentry, Logger | `production` / `staging` enable Sentry; `development` enables debug log.|
| `LOG_LEVEL`                    | Logger         | `error` / `warn` / `info` / `http` / `debug` / `silly`.                 |
| `LOKI_URL`                     | Logger         | When set, ships logs to Loki via `winston-loki`.                        |

## Used by

Every extracted service under `services/*` (gateway, auth, pets, rescue, applications, chat, notifications, moderation, matching, cms, audit) wires this package into its `src/instrumentation.ts`. The monolith it was originally extracted from has been removed; this package is now the canonical observability surface for the whole backend.
