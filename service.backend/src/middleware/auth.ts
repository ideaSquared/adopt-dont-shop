import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import User, { UserType } from '../models/User';
import Role from '../models/Role';
import Permission from '../models/Permission';
import RevokedToken from '../models/RevokedToken';
import StaffMember from '../models/StaffMember';
import { AuthenticatedRequest } from '../types/auth';
import { logger, loggerHelpers } from '../utils/logger';
import { setUserId } from '../utils/request-context';
import { env } from '../config/env';

export interface JWTPayload {
  userId: string;
  email: string;
  userType?: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

const userInclude = [
  {
    model: Role,
    as: 'Roles',
    include: [{ model: Permission, as: 'Permissions' }],
  },
];

class AuthError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Pulls the bearer token off the Authorization header or the accessToken
 * cookie. Returns null when neither is set.
 */
const extractToken = (req: AuthenticatedRequest): string | null => {
  const authHeader = req.headers.authorization;
  const cookies = req.cookies as Record<string, string> | undefined;
  return (authHeader && authHeader.split(' ')[1]) || cookies?.['accessToken'] || null;
};

/**
 * For RESCUE_STAFF users, attaches the rescueId of the verified
 * staff_members row onto the in-memory User instance. The column was
 * removed from the users table — affiliation lives only in
 * staff_members, gated by the verification flag. Pending (unverified)
 * staff get no rescue scope and behave like adopters.
 */
const attachRescueAffiliation = async (user: User): Promise<void> => {
  if (user.userType !== UserType.RESCUE_STAFF) {
    return;
  }
  const staff = await StaffMember.findOne({
    where: { userId: user.userId, isVerified: true },
    attributes: ['rescueId'],
  });
  const rescueId = staff?.rescueId ?? null;
  user.rescueId = rescueId;
  // setDataValue puts the field on the instance's dataValues bag so
  // res.json(req.user) — which goes through Sequelize's toJSON — will
  // include it. Plain property assignment isn't enough; toJSON
  // serializes dataValues only.
  user.setDataValue('rescueId' as never, rescueId as never);
};

/**
 * Verifies the JWT, rejects revoked tokens, and loads the active User
 * (with roles, permissions, and rescue affiliation). Throws AuthError
 * for the call site to translate into the appropriate HTTP response;
 * jwt library errors propagate as-is so optional-auth paths can swallow
 * them without false 401s.
 */
const authenticateRequest = async (token: string): Promise<User> => {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as JWTPayload;

  if (decoded.jti && (await RevokedToken.findByPk(decoded.jti))) {
    throw new AuthError(401, 'TOKEN_REVOKED', 'Token has been revoked');
  }

  const user = await User.findByPk(decoded.userId, { include: userInclude });
  if (!user) {
    throw new AuthError(401, 'USER_NOT_FOUND', 'User not found');
  }
  if (user.status !== 'active') {
    throw new AuthError(401, 'ACCOUNT_INACTIVE', 'Account is not active');
  }

  await attachRescueAffiliation(user);
  return user;
};

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = extractToken(req);
  if (!token) {
    loggerHelpers.logSecurity(
      'Authentication failed - no token provided',
      { ip: req.ip, userAgent: req.get('User-Agent'), url: req.originalUrl },
      req
    );
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const user = await authenticateRequest(token);

    req.user = user;
    setUserId(user.userId);

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

    if (error instanceof AuthError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    // TokenExpiredError must be checked before JsonWebTokenError because
    // TokenExpiredError extends JsonWebTokenError — checking the parent first
    // would mask expiry errors as generic "Invalid token" responses.
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Optional auth: attaches the user when a valid token is present, but
 * never blocks the request. Token errors and missing accounts are
 * swallowed and the request continues anonymously.
 */
const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const user = await authenticateRequest(token);
    req.user = user;
    setUserId(user.userId);
    logger.debug('Optional authentication successful', {
      userId: user.userId,
      userType: user.userType,
      ip: req.ip,
    });
  } catch (error) {
    logger.debug('Optional authentication skipped', {
      error: error instanceof Error ? error.message : String(error),
      ip: req.ip,
    });
  }

  next();
};

export const optionalAuth = optionalAuthMiddleware;
export const authenticateOptionalToken = optionalAuthMiddleware;

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
