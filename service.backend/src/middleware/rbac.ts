import { NextFunction, Response } from 'express';
import { UserType } from '../models/User';
import Permission from '../models/Permission';
import { AuthenticatedRequest, PERMISSIONS } from '../types';
import { logger } from '../utils/logger';
// Import the actual model types instead of defining local interfaces

// Role-based permission checks
export const requireRole = (...allowedRoles: UserType[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const userType = req.user.userType;

      if (!userType || !allowedRoles.includes(userType as UserType)) {
        logger.warn('Access denied - insufficient permissions', {
          userId: req.user.userId,
          userType,
          requiredRoles: allowedRoles,
        });

        res.status(403).json({
          error: 'Access denied',
          message: 'Insufficient permissions',
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('RBAC middleware error:', error);
      res.status(500).json({ error: 'Authorization error' });
    }
  };
};

// Permission-based access control
export const requirePermission = (requiredPermission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated',
      });
      return;
    }

    // Check if user has the required permission through roles
    const hasPermission = req.user.Roles?.some(role =>
      role.Permissions?.some(
        permission => (permission as unknown).permissionName === requiredPermission
      )
    );

    if (!hasPermission) {
      logger.warn(`Access denied - missing permission: ${requiredPermission}`, {
        userId: req.user.userId,
        userType: req.user.userType,
        requiredPermission,
        endpoint: req.path,
      });

      res.status(403).json({
        error: 'Access denied',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

// Resource ownership check
export const requireOwnership = (resourceIdParam: string = 'id') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated',
      });
      return;
    }

    const resourceId = req.params[resourceIdParam];
    const userId = req.user.userId;

    // For user resources, check if user owns the resource
    if (resourceIdParam === 'userId' && resourceId !== userId) {
      logger.warn(`Access denied - resource ownership check failed`, {
        userId,
        resourceId,
        resourceParam: resourceIdParam,
        endpoint: req.path,
      });

      res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own resources',
      });
      return;
    }

    // Store resource ID for use in controller - using proper typing
    (req as AuthenticatedRequest & { resourceId: string }).resourceId = resourceId;
    next();
  };
};

// Combined permission and ownership check
export const requirePermissionOrOwnership = (
  permission: string,
  resourceIdParam: string = 'id'
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated',
      });
      return;
    }

    // Check if user has the required permission
    const hasPermission = req.user.Roles?.some(role =>
      role.Permissions?.some(perm => perm.name === permission)
    );

    if (hasPermission) {
      next();
      return;
    }

    // If no permission, check ownership
    const resourceId = req.params[resourceIdParam];
    const userId = req.user.userId;

    if (resourceIdParam === 'userId' && resourceId === userId) {
      next();
      return;
    }

    logger.warn(`Access denied - neither permission nor ownership`, {
      userId,
      permission,
      resourceId,
      endpoint: req.path,
    });

    res.status(403).json({
      error: 'Access denied',
      message: 'Insufficient permissions',
    });
  };
};

// Admin only access
export const requireAdmin = requireRole(UserType.ADMIN);

// Rescue staff or admin access
export const requireRescue = requireRole(UserType.RESCUE_STAFF, UserType.ADMIN);

export const requireAdminOrRescue = requireRole(UserType.ADMIN, UserType.RESCUE_STAFF);

export const requireOwnershipOrAdmin = (
  getResourceUserId: (req: AuthenticatedRequest) => string | undefined
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const resourceUserId = getResourceUserId(req);
      const currentUserId = req.user.userId;
      const userType = req.user.userType;

      // Admin can access anything
      if (userType === UserType.ADMIN) {
        next();
        return;
      }

      // User can access their own resources
      if (resourceUserId && resourceUserId === currentUserId) {
        next();
        return;
      }

      logger.warn('Access denied - not owner or admin', {
        userId: currentUserId,
        resourceUserId,
        userType,
      });

      res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own resources',
      });
    } catch (error) {
      logger.error('Ownership middleware error:', error);
      res.status(500).json({ error: 'Authorization error' });
    }
  };
};

export default {
  requireRole,
  requirePermission,
  requireOwnership,
  requirePermissionOrOwnership,
  requireAdmin,
  requireRescue,
  requireAdminOrRescue,
  requireOwnershipOrAdmin,
  PERMISSIONS,
};
