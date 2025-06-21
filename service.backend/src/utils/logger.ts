import { Request, Response } from 'express';
import path from 'path';
import winston from 'winston';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Type definitions for logger data
interface LogData {
  [key: string]: unknown;
}

interface AuthenticatedRequest extends Request {
  user?: {
    userId?: string;
    user_id?: string;
  };
  userId?: string;
}

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

// Enhanced log format with correlation ID and service info
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
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
    const logEntry: Record<string, any> = {
      timestamp,
      level,
      service,
      message,
    };

    if (correlationId) {
      logEntry.correlationId = correlationId;
    }

    if (Object.keys(meta).length > 0) {
      logEntry.meta = meta;
    }

    return JSON.stringify(logEntry);
  })
);

// Define development format (more readable)
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(info => {
    const { timestamp, level, message, correlationId, ...meta } = info;
    const correlationStr = correlationId ? ` [${correlationId}]` : '';
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp}${correlationStr} [${level}]: ${message}${metaStr}`;
  })
);

// Create transports array
const transports: winston.transport[] = [];

// Console transport
transports.push(
  new winston.transports.Console({
    level: isDevelopment ? 'debug' : 'info',
    format: isDevelopment ? devFormat : logFormat,
  })
);

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
  level: isDevelopment ? 'debug' : 'info',
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
      ip: req.ip || req.connection.remoteAddress,
      userId: req.userId || req.user?.user_id,
      correlationId: req.get('X-Correlation-ID') || req.get('X-Request-ID'),
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
      correlationId: req?.get('X-Correlation-ID'),
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
      correlationId: req?.get('X-Correlation-ID'),
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
        details: data.details as any,
        ipAddress: data.ip as string,
        userAgent: data.userAgent as string,
      });
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to write audit log to database', { error: errorMessage, action, data });
    }
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

// Graceful shutdown handling
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  logger.end();
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  logger.end();
});

// Uncaught exception handling
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

export default logger;

