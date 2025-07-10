import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { logger } from '../utils/logger';

// Development rate limiter that tracks but doesn't block
const createDevLimiter = (windowMs: number, max: number, name: string) => {
  return rateLimit({
    windowMs,
    max: Number.MAX_SAFE_INTEGER, // Never actually block in dev
    message: { error: 'Rate limit bypassed in development' },
    standardHeaders: true,
    legacyHeaders: false,
    onLimitReached: req => {
      logger.warn(
        `🚨 RATE LIMIT WARNING (${name}): Would have been blocked in production! IP: ${req.ip}, Path: ${req.path}, Limit: ${max} per ${
          windowMs / 1000
        }s`
      );
    },
    handler: (req, res, next) => {
      // In development, log but don't block
      logger.warn(
        `🚨 RATE LIMIT WARNING (${name}): Request would be blocked in production! IP: ${req.ip}, Path: ${req.path}`
      );
      next(); // Continue processing the request
    },
  });
};

// Production rate limiter that actually blocks
const createProdLimiter = (windowMs: number, max: number, name: string, retryAfter: number) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter,
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      res.status(429).json({
        error: 'Too many requests from this IP, please try again later.',
        retryAfter,
      });
    },
  });
};

// General API rate limiter
export const apiLimiter =
  config.nodeEnv === 'development'
    ? createDevLimiter(config.rateLimit.windowMs, config.rateLimit.maxRequests, 'API')
    : createProdLimiter(
        config.rateLimit.windowMs,
        config.rateLimit.maxRequests,
        'API',
        Math.ceil(config.rateLimit.windowMs / 1000)
      );

// Alias for general limiter (for backwards compatibility)
export const generalLimiter = apiLimiter;

// Strict rate limiter for authentication endpoints
export const authLimiter =
  config.nodeEnv === 'development'
    ? createDevLimiter(15 * 60 * 1000, 5, 'AUTH')
    : rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // Limit each IP to 5 requests per windowMs for auth endpoints
        message: {
          error: 'Too many authentication attempts, please try again later.',
          retryAfter: 900, // 15 minutes
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true, // Don't count successful requests
        handler: (req, res) => {
          logger.warn(`Auth rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
          res.status(429).json({
            error: 'Too many authentication attempts, please try again later.',
            retryAfter: 900,
          });
        },
      });

// Moderate rate limiter for password reset endpoints
export const passwordResetLimiter =
  config.nodeEnv === 'development'
    ? createDevLimiter(60 * 60 * 1000, 3, 'PASSWORD_RESET')
    : rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // Limit each IP to 3 password reset requests per hour
        message: {
          error: 'Too many password reset attempts, please try again later.',
          retryAfter: 3600, // 1 hour
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
          logger.warn(`Password reset rate limit exceeded for IP: ${req.ip}`);
          res.status(429).json({
            error: 'Too many password reset attempts, please try again later.',
            retryAfter: 3600,
          });
        },
      });

// File upload rate limiter
export const uploadLimiter =
  config.nodeEnv === 'development'
    ? createDevLimiter(15 * 60 * 1000, 20, 'UPLOAD')
    : rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 20, // Limit each IP to 20 uploads per 15 minutes
        message: {
          error: 'Too many file uploads, please try again later.',
          retryAfter: 900,
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
          logger.warn(`Upload rate limit exceeded for IP: ${req.ip}`);
          res.status(429).json({
            error: 'Too many file uploads, please try again later.',
            retryAfter: 900,
          });
        },
      });
