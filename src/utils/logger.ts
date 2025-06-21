import winston from 'winston';

const isDevelopment = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaString}`;
  })
);

// Create the logger
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'adopt-dont-shop-backend' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: isDevelopment ? consoleFormat : logFormat,
    }),

    // File transports for all environments
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],

  // Handle uncaught exceptions
  exceptionHandlers: [new winston.transports.File({ filename: 'logs/exceptions.log' })],

  // Handle unhandled rejections
  rejectionHandlers: [new winston.transports.File({ filename: 'logs/rejections.log' })],
});

// Helper functions for common logging patterns
export const loggerHelpers = {
  // Log API requests
  logRequest: (req: any, duration?: number) => {
    logger.info('API Request', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.userId,
      duration: duration ? `${duration}ms` : undefined,
    });
  },

  // Log authentication events
  logAuth: (event: string, userId?: string, details?: any) => {
    logger.info(`Auth: ${event}`, {
      userId,
      ...details,
    });
  },

  // Log business events
  logBusinessEvent: (event: string, details: any) => {
    logger.info(`Business Event: ${event}`, details);
  },

  // Log security events
  logSecurity: (event: string, details: any) => {
    logger.warn(`Security: ${event}`, details);
  },

  // Log database operations
  logDatabase: (operation: string, table: string, details?: any) => {
    logger.debug(`Database: ${operation} on ${table}`, details);
  },
};

export default logger;
