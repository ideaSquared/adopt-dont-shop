export { initializeOpenTelemetry, isOpenTelemetryStarted } from './opentelemetry.js';
export type { OpenTelemetryOptions } from './opentelemetry.js';

export { initializeSentry, redactSentryEvent } from './sentry.js';
export type { SentryOptions } from './sentry.js';

export { createLogger } from './logger.js';
export type { LoggerOptions } from './logger.js';

export { redactSecretFields, redactUrl, REDACTED, SECRET_KEY_PATTERN } from './redact.js';

export {
  Counter,
  Gauge,
  Histogram,
  Registry,
  getMetricsRegistry,
  recordGrpcDuration,
  registerMetrics,
  __resetMetricsForTest,
} from './metrics.js';
export type { GrpcDirection, RecordGrpcOptions } from './metrics.js';

export {
  getRequestId,
  REQUEST_ID_HEADER_NAME,
  registerRequestId,
  runWithRequestId,
} from './request-id.js';

export { extractRequestIdFromMetadata, startGrpcTimer } from './grpc-instrumentation.js';
export type { StopFn } from './grpc-instrumentation.js';
