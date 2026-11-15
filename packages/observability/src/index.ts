export { initializeOpenTelemetry, isOpenTelemetryStarted } from './opentelemetry.js';
export type { OpenTelemetryOptions } from './opentelemetry.js';

export { deployEnvironment } from './deploy-environment.js';

export { initializeSentry, redactSentryEvent } from './sentry.js';
export type { SentryOptions } from './sentry.js';

export { BASE_LOG_FIELDS, createLogger, flushLogs, memorySink } from './logger.js';
export type {
  BaseLogField,
  BaseLogger,
  Level,
  LogEvent,
  Logger,
  LoggerOptions,
  Sink,
} from './logger.js';
export { createLokiSink } from './loki-sink.js';
export type { LokiSink, LokiSinkOptions } from './loki-sink.js';

export {
  maskPiiFields,
  maskPiiValue,
  redactSecretFields,
  redactUrl,
  PII_KEY_PATTERN,
  REDACTED,
  SECRET_KEY_PATTERN,
} from './redact.js';

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
export type { GrpcDirection, RecordGrpcOptions, RegisterMetricsOptions } from './metrics.js';

export {
  getRequestId,
  REQUEST_ID_HEADER_NAME,
  registerRequestId,
  runWithRequestId,
} from './request-id.js';

export { extractRequestIdFromMetadata, startGrpcTimer } from './grpc-instrumentation.js';
export type { StopFn } from './grpc-instrumentation.js';
