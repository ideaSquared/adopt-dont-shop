// OpenTelemetry SDK bootstrap for service.notifications.
//
// Same --import-flag pattern as service.gateway and (eventually) every
// extracted service: tsx / node loads this BEFORE the rest of the
// service so the auto-instrumentations can hook http, fastify,
// pg, ioredis, undici, and the nats client BEFORE those modules are
// first imported.
//
// Behaviour matches the rest of the stack (see @adopt-dont-shop/observability):
//   - Silent no-op when OTEL_EXPORTER_OTLP_ENDPOINT is unset.
//   - OTEL_SERVICE_NAME env var overrides the value below.
//   - No-throw contract.

import { initializeOpenTelemetry } from '@adopt-dont-shop/observability';

initializeOpenTelemetry({ serviceName: 'service.notifications' });
