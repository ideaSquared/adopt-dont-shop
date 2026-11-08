// OpenTelemetry SDK bootstrap for service.ops. Loaded with `--import` before the
// rest of the service so the auto-instrumentations can hook http, fastify, pg and
// undici first. Silent no-op when OTEL_EXPORTER_OTLP_ENDPOINT is unset.

import { initializeOpenTelemetry } from '@adopt-dont-shop/observability';

initializeOpenTelemetry({ serviceName: 'service.ops' });
