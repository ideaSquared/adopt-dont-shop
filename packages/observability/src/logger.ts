// Structured logger for backend microservices, built on @ideasquared/log: fixed literal messages,
// declared fields, no personal data. Every event is one JSON line on the console (Docker/stdout),
// and is also pushed to Loki when LOKI_URL is set (see loki-sink.ts).
//
// Every event carries `service`. The active OTel trace_id/span_id are stamped into `meta` by the
// sink (ADS-1327), so a log line in Grafana pivots to its trace in Tempo and back.

import { trace } from '@opentelemetry/api';
import {
  createLogger as createBaseLogger,
  type Level,
  type LogEvent,
  type Logger,
  type Sink,
} from '@ideasquared/log';

import { deployEnvironment } from './deploy-environment.js';
import { createLokiSink, type LokiSink } from './loki-sink.js';

// Fields every service may log. Shared packages (service-bootstrap, events, scheduler) type their
// logger against this set, so a service's own field list must start with it. Never add a field that
// holds personal data or a secret: createLogger throws on those names.
export const BASE_LOG_FIELDS = [
  'requestId',
  'client',
  'deletedCount',
  'updatedCount',
  'skippedCount',
  'timeoutMs',
  'seeded',
  'durablePrefix',
  'environment',
  'method',
  'route',
  'subject',
  'durable',
  'attempt',
  'attempts',
  'maxAttempts',
  'outboxId',
  'category',
  'size',
  'key',
  'retryInMs',
  'errorClass',
  'errorCode',
  'signal',
  'port',
  'grpcPort',
  'httpPort',
  'host',
  'schema',
  'migrationsDir',
  'step',
  'check',
  'job',
  'jobCount',
  'intervalMs',
  'scheduledFor',
  'count',
  'durationMs',
  'status',
  'reason',
  'provider',
  'userId',
  'rescueId',
] as const;

export type BaseLogField = (typeof BASE_LOG_FIELDS)[number];
export type BaseLogger = Logger<BaseLogField>;

const LEVEL_ALIASES: Readonly<Record<string, Level>> = {
  error: 'error',
  warn: 'warn',
  info: 'info',
  http: 'info',
  debug: 'debug',
  silly: 'debug',
};

export type LoggerOptions<F extends string> = {
  // Stamped as `service` on every event and as the `service` label on Loki.
  serviceName: string;
  // Every field the logger may write.
  fields: readonly F[];
  // Optional override. Defaults to `LOG_LEVEL` env var, then to `debug`
  // in development / `info` everywhere else.
  logLevel?: Level;
  // Replaces the console + Loki sinks (tests use memorySink()).
  sink?: Sink;
};

const resolveLogLevel = (override?: Level): Level => {
  if (override) return override;
  const fromEnv = LEVEL_ALIASES[process.env.LOG_LEVEL?.toLowerCase() ?? ''];
  if (fromEnv) return fromEnv;
  return process.env.NODE_ENV === 'development' ? 'debug' : 'info';
};

// stdout for every level, as the Winston console transport did.
const consoleSink: Sink = event => {
  process.stdout.write(`${JSON.stringify(event)}\n`);
};

const stampTraceContext = (event: LogEvent): LogEvent => {
  const spanContext = trace.getActiveSpan()?.spanContext();
  if (!spanContext?.traceId) return event;
  return {
    ...event,
    meta: { ...event.meta, trace_id: spanContext.traceId, span_id: spanContext.spanId },
  };
};

const lokiSinks = new Set<LokiSink>();

// Push buffered Loki events now. Call during shutdown, before the process exits.
export const flushLogs = async (): Promise<void> => {
  await Promise.all([...lokiSinks].map(sink => sink.flush()));
};

process.once('beforeExit', () => {
  void flushLogs();
});

const defaultSink = (serviceName: string): Sink => {
  const lokiUrl = process.env.LOKI_URL?.trim();
  if (!lokiUrl) return consoleSink;
  const loki = createLokiSink({
    url: lokiUrl,
    labels: { service: serviceName, env: deployEnvironment() },
  });
  lokiSinks.add(loki);
  return event => {
    consoleSink(event);
    loki(event);
  };
};

export const createLogger = <const F extends string>(opts: LoggerOptions<F>): Logger<F> => {
  const target = opts.sink ?? defaultSink(opts.serviceName);
  return createBaseLogger({
    service: opts.serviceName,
    fields: opts.fields,
    level: resolveLogLevel(opts.logLevel),
    sink: event => target(stampTraceContext(event)),
  });
};

export { memorySink } from '@ideasquared/log';
export type { Level, LogEvent, Logger, Sink } from '@ideasquared/log';
