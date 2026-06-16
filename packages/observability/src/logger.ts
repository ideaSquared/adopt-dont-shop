// Minimal Winston logger for backend microservices — console transport in
// all environments, plus a Loki transport when LOKI_URL is set. Matches
// service.backend's logger transport shape (winston-loki@^6) so logs from
// every extracted service land in the same Loki stream with consistent
// labels.
//
// What this does NOT include (deliberately):
//   - PII / secret redaction (service.backend's logger has it via
//     redactLogPayload — port that into here in a follow-up commit
//     when the redact module moves into a shared package).
//   - AsyncLocalStorage correlation-id stamping. That's coupled to each
//     service's request-context middleware. Callers attach correlationId
//     / traceparent to log payloads as fields when they have them.
//   - The loggerHelpers bundle (logRequest / logAuth / logBusiness /
//     logSecurity / …). Those are middleware concerns and live with
//     each service's own request pipeline.
//
// The minimum here is enough to boot a service with structured logs
// shipping to Loki. Services layer their own concerns on top.

import winston, { type Logger } from 'winston';
import LokiTransport from 'winston-loki';

import { redactSecretFields, REDACTED, SECRET_KEY_PATTERN } from './redact.js';

const VALID_LOG_LEVELS = ['error', 'warn', 'info', 'http', 'debug', 'silly'] as const;
type LogLevel = (typeof VALID_LOG_LEVELS)[number];

export type LoggerOptions = {
  // Shipped as the `service` label on Loki + as a top-level field on
  // every log line so multi-service queries in Grafana can filter by
  // origin.
  serviceName: string;
  // Optional override. Defaults to `LOG_LEVEL` env var, then to `debug`
  // in development / `info` everywhere else.
  logLevel?: LogLevel;
};

// Redact secret/PII-shaped fields from every log line BEFORE it reaches
// any transport (console + Loki). Runs as a logger-level format so it
// applies ahead of the per-transport json/printf formats. Mutates the
// info object's own string keys in place to preserve Winston's Symbol
// properties (level/message), recursing into nested meta via
// redactSecretFields.
const redactingFormat = winston.format(info => {
  const record = info as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    record[key] = SECRET_KEY_PATTERN.test(key) ? REDACTED : redactSecretFields(record[key]);
  }
  return info;
});

const resolveLogLevel = (override?: LogLevel): LogLevel => {
  if (override) {
    return override;
  }
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (envLevel && (VALID_LOG_LEVELS as readonly string[]).includes(envLevel)) {
    return envLevel as LogLevel;
  }
  return process.env.NODE_ENV === 'development' ? 'debug' : 'info';
};

export const createLogger = (opts: LoggerOptions): Logger => {
  const level = resolveLogLevel(opts.logLevel);
  const isProduction = process.env.NODE_ENV === 'production';

  const transports: winston.transport[] = [
    new winston.transports.Console({
      // JSON in production for log shippers; pretty-printed in dev.
      format: isProduction
        ? winston.format.combine(winston.format.timestamp(), winston.format.json())
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level: lvl, message, ...meta }) => {
              const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
              return `${timestamp as string} [${lvl}]: ${message as string}${metaStr}`;
            })
          ),
    }),
  ];

  // Optional Loki shipper — same low-cardinality label shape as
  // service.backend's logger so multi-service queries Just Work.
  const lokiUrl = process.env.LOKI_URL?.trim();
  if (lokiUrl) {
    transports.push(
      new LokiTransport({
        host: lokiUrl,
        labels: {
          service: opts.serviceName,
          env: process.env.NODE_ENV || 'development',
        },
        json: true,
        format: winston.format.json(),
        // Batch every 5s so the Node loop isn't tied up with HTTP per log.
        batching: true,
        interval: 5,
        // Loki being down must not kill the service — degrade to
        // console-only transparently.
        onConnectionError: err => {
          console.error('Loki transport error:', (err as Error).message);
        },
      })
    );
  }

  return winston.createLogger({
    level,
    defaultMeta: { service: opts.serviceName },
    // Redaction runs first, then each transport's own format.
    format: redactingFormat(),
    transports,
  });
};
