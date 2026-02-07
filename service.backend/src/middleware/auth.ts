import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Role from '../models/Role';
import Permission from '../models/Permission';
import { AuthenticatedRequest } from '../types/auth';
import { logger, loggerHelpers } from '../utils/logger';
import { env } from '../config/env';

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

    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

    // Fetch user from database to ensure they still exist and are active
    const user = await User.findByPk(decoded.userId, {
      include: [
        {
          model: Role,
          as: 'Roles',
          include: [
            {
              model: Permission,
              as: 'Permissions',
            },
          ],
        },
      ],
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

    // Debug: Log loaded user data structure
    logger.info('🔍 Auth Middleware - User loaded with roles and permissions', {
      userId: decoded.userId,
      email: user.email,
      rolesCount: user.Roles?.length || 0,
    });

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

    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    const user = await User.findByPk(decoded.userId, {
      include: [
        {
          model: Role,
          as: 'Roles',
          include: [
            {
              model: Permission,
              as: 'Permissions',
            },
          ],
        },
      ],
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

      // Check if user has unknown of the required roles
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

/**
 * Optional authentication middleware - continues if no token provided
 * Used for endpoints that work with or without authentication
 */
export const authenticateOptionalToken = async (
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

    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

    // Fetch user from database to ensure they still exist and are active
    const user = await User.findByPk(decoded.userId, {
      include: [
        {
          model: Role,
          as: 'Roles',
          include: [
            {
              model: Permission,
              as: 'Permissions',
            },
          ],
        },
      ],
    });

    if (!user) {
      // Invalid token, but continue without authentication
      next();
      return;
    }

    // Attach user to request if found
    req.user = user;

    logger.info('Optional authentication successful', {
      userId: user.userId,
      userType: user.userType,
      ip: req.ip,
    });

    next();
  } catch (error) {
    // Token verification failed, but continue without authentication
    logger.warn('Optional authentication failed, continuing without auth', {
      error: error instanceof Error ? error.message : String(error),
      ip: req.ip,
    });
    next();
  }
};

/**
 * Middleware to require email verification
 * Must be used after authenticateToken middleware
 * Prevents unverified users from accessing protected resources
 */
export const requireEmailVerification = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      loggerHelpers.logSecurity(
        'Email verification check failed - no user',
        {
          ip: req.ip,
          url: req.originalUrl,
        },
        req
      );
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!req.user.emailVerified) {
      loggerHelpers.logSecurity(
        'Access denied - email not verified',
        {
          userId: req.user.userId,
          email: req.user.email,
          ip: req.ip,
          url: req.originalUrl,
        },
        req
      );
      res.status(403).json({
        error: 'Email verification required',
        message: 'Please verify your email address to access this resource',
        code: 'EMAIL_NOT_VERIFIED',
      });
      return;
    }

    logger.debug('Email verification check passed', {
      userId: req.user.userId,
      email: req.user.email,
    });

    next();
  } catch (error) {
    logger.error('Email verification check error:', {
      error: error instanceof Error ? error.message : String(error),
      userId: req.user?.userId,
      ip: req.ip,
    });
    res.status(500).json({ error: 'Verification check error' });
  }
};
