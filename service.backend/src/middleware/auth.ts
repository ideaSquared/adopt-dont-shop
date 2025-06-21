import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthenticatedRequest } from '../types/auth';
import { logger, loggerHelpers } from '../utils/logger';

export interface JWTPayload {
  userId: string;
  email: string;
  userType?: string;
  iat?: number;
  exp?: number;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      loggerHelpers.logSecurity(
        'Authentication failed - no token provided',
        {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.originalUrl,
        },
        req
      );
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Fetch user from database to ensure they still exist and are active
    const user = await User.findByPk(decoded.userId, {
      include: ['Roles'],
    });

    if (!user) {
      loggerHelpers.logSecurity(
        'Authentication failed - user not found',
        {
          userId: decoded.userId,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        },
        req
      );
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (user.status !== 'active') {
      loggerHelpers.logSecurity(
        'Authentication failed - inactive account',
        {
          userId: user.userId,
          status: user.status,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        },
        req
      );
      res.status(401).json({ error: 'Account is not active' });
      return;
    }

    // Attach user to request
    req.user = user;

    loggerHelpers.logAuth(
      'User authenticated',
      {
        userId: user.userId,
        email: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      },
      req
    );

    next();
  } catch (error) {
    loggerHelpers.logSecurity(
      'Authentication failed - token error',
      {
        error: error instanceof Error ? error.message : String(error),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
      },
      req
    );

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }

    res.status(500).json({ error: 'Authentication error' });
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // No token provided, continue without authentication
      next();
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const user = await User.findByPk(decoded.userId, {
      include: ['Roles'],
    });

    if (user && user.status === 'active') {
      req.user = user;
      logger.debug('Optional authentication successful', {
        userId: user.userId,
        ip: req.ip,
      });
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    logger.debug('Optional authentication failed', {
      error: error instanceof Error ? error.message : String(error),
      ip: req.ip,
    });
    next();
  }
};

/**
 * Middleware to require specific roles
 */
export const requireRole = (requiredRoles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        loggerHelpers.logSecurity(
          'Role authorization failed - no user',
          {
            requiredRoles: Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles],
            ip: req.ip,
            url: req.originalUrl,
          },
          req
        );
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

      // Check if user has any of the required roles
      const userRoles = req.user.Roles?.map(role => role.name) || [];
      const hasRequiredRole = roles.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        loggerHelpers.logSecurity(
          'Role authorization failed - insufficient permissions',
          {
            userId: req.user.userId,
            userRoles,
            requiredRoles: roles,
            ip: req.ip,
            url: req.originalUrl,
          },
          req
        );
        res.status(403).json({
          error: `Access denied. Required roles: ${roles.join(', ')}`,
        });
        return;
      }

      logger.debug('Role authorization successful', {
        userId: req.user.userId,
        roles: userRoles,
        requiredRoles: roles,
      });

      next();
    } catch (error) {
      logger.error('Role authorization error:', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.userId,
        ip: req.ip,
      });
      res.status(500).json({ error: 'Authorization error' });
    }
  };
};
