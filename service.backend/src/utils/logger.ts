import { Request, Response } from 'express';
import path from 'path';
import winston from 'winston';
import LokiTransport from 'winston-loki';
import { JsonValue, JsonObject } from '../types/common';
import { redactLogPayload } from './redact';
import { getCorrelationId } from './request-context';
import { AuthenticatedRequest } from '../types/auth';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

const VALID_LOG_LEVELS = ['error', 'warn', 'info', 'http', 'debug', 'silly'] as const;
type LogLevel = (typeof VALID_LOG_LEVELS)[number];

const resolveLogLevel = (): LogLevel => {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (envLevel && VALID_LOG_LEVELS.includes(envLevel as LogLevel)) {
    return envLevel as LogLevel;
  }
  return isDevelopment ? 'debug' : 'info';
};

const configuredLogLevel = resolveLogLevel();

// Type definitions for logger data
interface LogData {
  [key: string]: unknown;
}

// Type for log entry structure
type LogEntryValue = string | number | boolean | null | undefined | LogData;

type LogEntry = {
  timestamp: string;
  level: string;
  service: string;
  message: string;
  correlationId?: string;
  meta?: Record<string, LogEntryValue>;
};

// Enhanced log levels with more granularity
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  silly: 5,
};

// Define colors for each level
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  silly: 'grey',
};

winston.addColors(logColors);

/**
 * ADS-405: stamp every log line with the AsyncLocalStorage correlation ID
 * unless the call site already supplied one. Without this, services that
 * do not thread req through their function signatures emit uncorrelated
 * lines.
 */
const correlationFormat = winston.format(info => {
  if (!info.correlationId) {
    const fromCtx = getCorrelationId();
    if (fromCtx) {
      info.correlationId = fromCtx;
    }
  }
  return info;
})();

/**
 * ADS-445 / ADS-459: redact credential and PII fields from every log line
 * by walking the info object before serialisation. Defence-in-depth for
 * the case where a service spreads a user object into a logger call.
 *
 * Winston control fields (`level`, `message`, `timestamp`, `label`,
 * `correlationId`, `service`) are exempt from redaction so the structured
 * envelope is preserved.
 */
const PROTECTED_LOG_FIELDS = new Set([
  'level',
  'message',
  'timestamp',
  'label',
  'correlationId',
  'service',
]);

/**
 * ADS-543: defence in depth — strip known secret-bearing query parameters
 * from any URL-shaped log field (`url`, `originalUrl`, `referer`) before
 * the value is written. Even when a call site forgets to swap
 * `req.originalUrl` for `req.path`, the query string is scrubbed here so a
 * `?token=...` / `?signature=...` / `?code=...` never reaches log storage.
 */
const URL_LOG_KEYS = new Set(['url', 'originalurl', 'referer', 'referrer']);
const SECRET_QUERY_PARAMS = ['token', 'signature', 'code'];

const stripSecretQueryParams = (raw: string): string => {
  const queryStart = raw.indexOf('?');
  if (queryStart === -1) {
    return raw;
  }
  const [pathPart, queryPart] = [raw.slice(0, queryStart), raw.slice(queryStart + 1)];
  if (!queryPart) {
    return raw;
  }
  const kept = queryPart
    .split('&')
    .map(pair => {
      const eq = pair.indexOf('=');
      const key = (eq === -1 ? pair : pair.slice(0, eq)).toLowerCase();
      if (SECRET_QUERY_PARAMS.includes(key)) {
        return `${eq === -1 ? pair : pair.slice(0, eq)}=[REDACTED]`;
      }
      return pair;
    })
    .join('&');
  return kept ? `${pathPart}?${kept}` : pathPart;
};

// ADS-784: JSON.stringify that never throws on circular references or BigInt.
// Log meta can carry Node internals (timers, sockets) and Sequelize instances
// with cyclic references — notably when the migration runner logs umzug error
// objects, which previously crashed `db:migrate` outright.
const safeJsonStringify = (value: unknown): string => {
  const seen = new WeakSet<object>();
  return JSON.stringify(value, (_key, val) => {
    if (typeof val === 'bigint') {
      return val.toString();
    }
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) {
        return '[Circular]';
      }
      seen.add(val);
    }
    return val;
  });
};

// ADS-784: bounded depth + cycle guard so a deep/cyclic meta object cannot
// blow the stack (this format runs on every log line).
const redactUrlsInValue = (value: unknown, depth = 0, seen = new WeakSet<object>()): unknown => {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'string') {
    return stripSecretQueryParams(value);
  }
  if (depth >= 8) {
    return value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);
    return value.map(v => redactUrlsInValue(v, depth + 1, seen));
  }
  if (typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);
    const entries = Object.entries(value as Record<string, unknown>).map(([k, v]) => {
      if (URL_LOG_KEYS.has(k.toLowerCase()) && typeof v === 'string') {
        return [k, stripSecretQueryParams(v)];
      }
      return [k, redactUrlsInValue(v, depth + 1, seen)];
    });
    return Object.fromEntries(entries);
  }
  return value;
};

const redactionFormat = winston.format(info => {
  for (const key of Object.keys(info)) {
    if (PROTECTED_LOG_FIELDS.has(key)) {
      continue;
    }
    // URL-shaped top-level fields get the query-param scrub first.
    if (URL_LOG_KEYS.has(key.toLowerCase()) && typeof info[key] === 'string') {
      info[key] = stripSecretQueryParams(info[key] as string);
    } else {
      info[key] = redactUrlsInValue(info[key]);
    }
    info[key] = redactLogPayload(info[key]);
  }
  return info;
})();

// Enhanced log format with correlation ID and service info
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  correlationFormat,
  redactionFormat,
  winston.format.json(),
  winston.format.printf(info => {
    const {
      timestamp,
      level,
      message,
      correlationId,
      service = 'adopt-dont-shop-backend',
      ...meta
    } = info;
    const logEntry: LogEntry = {
      timestamp: timestamp as string,
      level: level as string,
      service: service as string,
      message: message as string,
    };

    if (correlationId) {
      logEntry.correlationId = correlationId as string;
    }

    if (Object.keys(meta).length > 0) {
      logEntry.meta = meta as Record<string, LogEntryValue>;
    }

    return safeJsonStringify(logEntry);
  })
);

// Define development format (more readable)
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  correlationFormat,
  redactionFormat,
  winston.format.colorize({ all: true }),
  winston.format.printf(info => {
    const { timestamp, level, message, correlationId, ...meta } = info;
    const correlationStr = correlationId ? ` [${correlationId}]` : '';
    const metaStr = Object.keys(meta).length > 0 ? ` ${safeJsonStringify(meta)}` : '';
    return `${timestamp}${correlationStr} [${level}]: ${message}${metaStr}`;
  })
);

// Create transports array
const transports: winston.transport[] = [];

// Console transport
transports.push(
  new winston.transports.Console({
    level: configuredLogLevel,
    format: isDevelopment ? devFormat : logFormat,
  })
);

// Loki transport (optional). Enabled whenever LOKI_URL is set, regardless of
// NODE_ENV, so dev compose can opt-in via the `observability` profile without
// having to flip NODE_ENV. Labels are intentionally low-cardinality so Loki
// indexes stay small; dynamic fields (correlationId, userId, action) live in
// the log body and are queried with `|=` / JSON parsers instead.
const lokiUrl = process.env.LOKI_URL?.trim();
if (lokiUrl) {
  transports.push(
    new LokiTransport({
      host: lokiUrl,
      labels: {
        service: 'adopt-dont-shop-backend',
        env: process.env.NODE_ENV || 'development',
      },
      json: true,
      format: logFormat,
      batching: true,
      interval: 5,
      replaceTimestamp: true,
      // Don't crash the app if Loki is unreachable — degrade to console + file.
      onConnectionError: err => {
        console.error('Loki transport connection error:', err);
      },
    })
  );
}

// File transports for production with better organization
if (isProduction) {
  // Error logs
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true,
    })
  );

  // Application logs (info and above)
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'app.log'),
      level: 'info',
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true,
    })
  );

  // HTTP access logs
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'access.log'),
      level: 'http',
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true,
    })
  );

  // Security logs
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'security.log'),
      level: 'warn',
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 20, // Keep security logs longer
      tailable: true,
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: configuredLogLevel,
  levels: logLevels,
  format: logFormat,
  transports,
  exitOnError: false,
  // Add default metadata
  defaultMeta: {
    service: 'adopt-dont-shop-backend',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
});

// Enhanced helper functions for specific log types
export const loggerHelpers = {
  // API request logging with enhanced metadata
  logRequest: (req: AuthenticatedRequest, res: Response, duration?: number) => {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: duration ? `${duration}ms` : undefined,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.socket.remoteAddress,
      userId: req.user?.userId,
      correlationId: req.get('X-Correlation-ID') || req.get('X-Request-ID') || getCorrelationId(),
      contentLength: res.get('Content-Length'),
      referer: req.get('Referer'),
    };

    // Log different levels based on status code
    if (res.statusCode >= 500) {
      logger.error('API Request - Server Error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('API Request - Client Error', logData);
    } else {
      logger.http('API Request', logData);
    }
  },

  // Authentication events with security context
  logAuth: (event: string, data: LogData, req?: Request) => {
    logger.info(`Auth: ${event}`, {
      category: 'AUTHENTICATION',
      ip: req?.ip,
      userAgent: req?.get('User-Agent'),
      correlationId: req?.get('X-Correlation-ID') || getCorrelationId(),
      ...data,
    });
  },

  // Business events for audit trail
  logBusiness: (event: string, data: LogData, userId?: string) => {
    logger.info(`Business: ${event}`, {
      category: 'BUSINESS',
      userId,
      ...data,
    });
  },

  // Security events with enhanced tracking
  logSecurity: (event: string, data: LogData, req?: Request) => {
    logger.warn(`Security: ${event}`, {
      category: 'SECURITY',
      ip: req?.ip,
      userAgent: req?.get('User-Agent'),
      correlationId: req?.get('X-Correlation-ID') || getCorrelationId(),
      severity: 'HIGH',
      ...data,
    });
  },

  // Database events with query performance
  logDatabase: (event: string, data: LogData & { queryTime?: number }) => {
    const level = data.queryTime && data.queryTime > 1000 ? 'warn' : 'debug';
    logger[level](`Database: ${event}`, {
      category: 'DATABASE',
      ...data,
    });
  },

  // Performance events with thresholds
  logPerformance: (event: string, data: LogData & { duration?: number; threshold?: number }) => {
    const { duration, threshold = 1000, ...otherData } = data;
    const level = duration && duration > threshold ? 'warn' : 'info';

    logger[level](`Performance: ${event}`, {
      category: 'PERFORMANCE',
      duration: duration ? `${duration}ms` : undefined,
      exceedsThreshold: duration ? duration > threshold : false,
      ...otherData,
    });
  },

  // Application lifecycle events
  logLifecycle: (event: string, data: LogData = {}) => {
    logger.info(`Lifecycle: ${event}`, {
      category: 'LIFECYCLE',
      pid: process.pid,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      ...data,
    });
  },

  // External service integration logs
  logExternalService: (service: string, event: string, data: LogData) => {
    logger.info(`External: ${service} - ${event}`, {
      category: 'EXTERNAL_SERVICE',
      service,
      ...data,
    });
  },

  // Database audit trail integration
  logAuditableAction: async (action: string, data: LogData) => {
    // Log to file system first (immediate)
    logger.info(`Audit: ${action}`, {
      category: 'AUDIT',
      ...data,
    });

    // Then log to database (async, don't block)
    try {
      const { AuditLogService } = await import('../services/auditLog.service');
      await AuditLogService.log({
        userId: data.userId as string,
        action,
        entity: data.entity as string,
        entityId: data.entityId as string,
        details:
          data.details && typeof data.details === 'object' && !Array.isArray(data.details)
            ? (data.details as JsonObject)
            : undefined,
        ipAddress: data.ip as string,
        userAgent: data.userAgent as string,
      });
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to write audit log to database', { error: errorMessage, action, data });
    }
  },

  /**
   * Emit an audit event line to the log stream tagged `audit: true`. Used by
   * the new audit-route middleware (Layer 2) and by transactional explicit
   * audit calls inside services to mirror the DB row into the log aggregator
   * so dashboards in Grafana/Loki can correlate audit events with the
   * surrounding operational logs by correlationId.
   *
   * This does NOT write to the audit_logs table — the caller is expected to
   * have already written (or queued) the immutable DB row via
   * AuditLogService.log. Keeping the two emit points separate keeps the
   * transactional contract of the DB write intact.
   */
  logAudit: (
    action: string,
    data: LogData & {
      entity?: string;
      entityId?: string;
      userId?: string;
      status?: 'success' | 'failure';
    }
  ) => {
    logger.info(`Audit: ${action}`, {
      category: 'AUDIT',
      audit: true,
      action,
      ...data,
    });
  },
};

// Create logs directory structure if it doesn't exist
if (isProduction) {
  import('fs')
    .then(fs => {
      const logsDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
        logger.info('Created logs directory', { path: logsDir });
      }

      // Create archive directory for log rotation
      const archiveDir = path.join(logsDir, 'archive');
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }
    })
    .catch(error => {
      console.error('Failed to create logs directory:', error);
    });
}

// Process-level signal + exception handling is consolidated in src/index.ts
// (it owns the graceful-shutdown drain). Registering duplicate handlers here
// caused non-deterministic shutdown ordering, so they were removed. The
// `console.error` fallbacks for an unavailable logger live at each call site
// in index.ts's handlers.

export default logger;
