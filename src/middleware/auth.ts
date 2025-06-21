import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User, { UserStatus } from '../models/User';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  userType: string;
  iat: number;
  exp: number;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        error: 'Access denied',
        message: 'No token provided',
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET is not defined');
      res.status(500).json({
        error: 'Server configuration error',
        message: 'Authentication service unavailable',
      });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // Fetch fresh user data to ensure account is still active
    const user = await User.scope('withSecrets').findByPk(decoded.userId);

    if (!user) {
      res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token - user not found',
      });
      return;
    }

    // Check if user account is active and can login
    if (!user.canLogin()) {
      const reason = user.isAccountLocked()
        ? 'Account is locked'
        : user.status === UserStatus.SUSPENDED
          ? 'Account is suspended'
          : !user.isEmailVerified()
            ? 'Email not verified'
            : 'Account is inactive';

      res.status(403).json({
        error: 'Access denied',
        message: reason,
      });
      return;
    }

    // Update last login time
    user.last_login_at = new Date();
    await user.save();

    // Attach user to request (excluding sensitive fields)
    req.user = await User.findByPk(user.user_id, {
      include: [
        {
          association: 'Roles',
          include: [
            {
              association: 'Permissions',
            },
          ],
        },
      ],
    });
    req.userId = user.user_id;

    logger.info(`User authenticated: ${user.email}`, {
      userId: user.user_id,
      userType: user.user_type,
      ip: req.ip,
    });

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: 'Access denied',
        message: 'Token expired',
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token',
      });
      return;
    }

    logger.error('Authentication error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Authentication failed',
    });
  }
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  // If token exists, validate it
  await authenticateToken(req, res, next);
};

export default {
  authenticateToken,
  optionalAuth,
};
