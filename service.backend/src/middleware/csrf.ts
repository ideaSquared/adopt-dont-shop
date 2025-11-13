import { doubleCsrf, DoubleCsrfConfigOptions } from 'csrf-csrf';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config';
import { AuthenticatedRequest } from '../types';

// CSRF Configuration
const isProduction = process.env.NODE_ENV === 'production';

const csrfConfig: DoubleCsrfConfigOptions = {
  getSecret: () => config.security.csrfSecret, // Validated at startup (minimum 32 characters)
  getSessionIdentifier: req => {
    // Use user ID if authenticated, otherwise use IP address
    const authenticatedReq = req as AuthenticatedRequest;
    return authenticatedReq.user?.userId || req.ip || 'anonymous';
  },
  // Use __Host- prefix only in production (requires secure context)
  cookieName: isProduction ? '__Host-psifi.x-csrf-token' : 'psifi.x-csrf-token',
  cookieOptions: {
    sameSite: 'strict',
    path: '/',
    secure: isProduction,
    httpOnly: true,
  },
  size: 64, // Size of the generated token
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'] as Array<'GET' | 'HEAD' | 'OPTIONS'>,
};

// Initialize CSRF protection
const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf(csrfConfig);

/**
 * Middleware to generate and attach CSRF token to response
 * Use this on routes that render forms or need to provide tokens to clients
 */
export const csrfTokenGenerator = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const csrfToken = generateCsrfToken(req, res);

    // Attach token to response locals for template rendering
    res.locals.csrfToken = csrfToken;

    // Also send in header for API consumers
    res.setHeader('X-CSRF-Token', csrfToken);

    next();
  } catch (error) {
    logger.error('Failed to generate CSRF token', { error });
    next(error);
  }
};

/**
 * Middleware to validate CSRF tokens on state-changing requests
 * Automatically validates POST, PUT, PATCH, DELETE requests
 */
export const csrfProtection = doubleCsrfProtection;

/**
 * Route handler to provide CSRF token to clients
 * Clients should call this endpoint to get a token before making state-changing requests
 */
export const getCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = generateCsrfToken(req, res);
    res.json({
      csrfToken: token,
    });
  } catch (error) {
    logger.error('Failed to generate CSRF token', { error });
    next(error);
  }
};

/**
 * Error handler for CSRF validation failures
 */
export const csrfErrorHandler = (
  err: Error & { code?: string },
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err.code === 'EBADCSRFTOKEN' || err.message?.includes('CSRF')) {
    logger.warn('CSRF token validation failed', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'CSRF token validation failed. Please refresh and try again.',
    });
  } else {
    next(err);
  }
};
