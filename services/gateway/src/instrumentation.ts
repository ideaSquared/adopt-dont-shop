// OpenTelemetry SDK bootstrap for service.gateway.
//
// MUST be loaded via Node's `--import` flag so the auto-instrumentations
// can hook `http`, `fastify`, `undici` etc. BEFORE those modules are
// first imported by the rest of the service. The package.json scripts
// do this — `dev` uses `tsx --import ./src/instrumentation.ts ./src/index.ts`,
// `start` uses `node --import ./dist/instrumentation.js ./dist/index.js`.
//
// Behaviour matches service.backend (and every other extracted service
// that uses @adopt-dont-shop/observability):
//   - Silent no-op when OTEL_EXPORTER_OTLP_ENDPOINT is unset.
//   - OTEL_SERVICE_NAME env var overrides the value below.
//   - No-throw contract.

import { initializeOpenTelemetry } from '@adopt-dont-shop/observability';

initializeOpenTelemetry({ serviceName: 'service.gateway' });
