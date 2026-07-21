# @adopt-dont-shop/observability

## Purpose

Shared observability bootstrap for the backend microservices — OpenTelemetry
(OTLP/HTTP), Sentry (Node + profiling), and a Winston logger with optional Loki
shipping, plus PII/secret redaction. The service name is parameterised so every
extracted service gets the identical telemetry stack (same SDK versions, env
contract, and redaction rules) with one call.

This is a service-only shared package (not a `lib.*`) — the canonical backend
observability surface. See the decision tree in
[`CONTRIBUTING.md`](../../CONTRIBUTING.md#where-does-my-code-go).

## Location in the architecture

See [`docs/README.md`](../../docs/README.md#libraries) for where the shared
packages sit. Every service under `services/*` wires this into its thin
`src/instrumentation.ts` (the `--import` target), and reads its Prometheus
registry via `getMetricsRegistry`. The gateway's rate-limit and WS-handshake
counters register here. (`lib.observability` is the separate frontend-side
equivalent.)

## Scripts

```bash
pnpm build        # tsc build
pnpm dev          # tsc --watch
pnpm test         # Vitest (run mode)
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
```

## Public API / exports

The canonical list lives in [`src/index.ts`](src/index.ts):

- `initializeOpenTelemetry({ serviceName, serviceVersion? })` — starts the OTel
  Node SDK (OTLP/HTTP + auto-instrumentations; `fs` instrumentation disabled).
  Must be invoked from a `--import` target so it hooks HTTP/pg/ioredis before
  they're imported. Silent no-op when `OTEL_EXPORTER_OTLP_ENDPOINT` is unset;
  no-throw so a misconfigured exporter degrades to "no traces".
- `initializeSentry({ serviceName, logger? })` + `redactSentryEvent` — Sentry
  with profiling, enabled only when `SENTRY_DSN` is set and `NODE_ENV` is
  production/staging; stamps the active trace/span id and redacts secrets in
  `beforeSend`.
- `createLogger({ serviceName, logLevel? })` — Winston logger (console always;
  Loki when `LOKI_URL` is set), with `serviceName` stamped on every line.
- `getMetricsRegistry` / `registerMetrics` — the shared Prometheus registry +
  `/metrics` wiring.
- `redactSecretFields`, `REDACTED`, `SECRET_KEY_PATTERN`, `redactUrl`,
  `registerRequestId` — redaction + request-id helpers.

## Environment variables consumed

All optional — the bootstraps silently no-op when unset:
`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME` (overrides `serviceName`),
`OTEL_TRACES_SAMPLER` / `OTEL_TRACES_SAMPLER_ARG`, `SENTRY_DSN`,
`SENTRY_RELEASE`, `HOSTNAME`, `NODE_ENV`, `LOG_LEVEL`, `LOKI_URL`. See
[`docs/env-reference.md`](../../docs/env-reference.md) for the full list.

## Testing notes

Vitest. The redaction logic (`redactSentryEvent`, `redactSecretFields`) is
exported separately so it's unit-tested in isolation; the bootstraps are tested
for their no-op / no-throw contracts. See
[`docs/backend/testing.md`](../../docs/backend/testing.md) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/packages/`.
