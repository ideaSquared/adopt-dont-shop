import { NextFunction, Response } from 'express';
import { UserType } from '../models/User';
import { AuthenticatedRequest, PERMISSIONS } from '../types';
import { isAdminRole } from '../utils/is-admin-role';
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
      res.status(403).json({ error: 'Authorization check failed' });
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
      role.Permissions?.some(permission => permission.permissionName === requiredPermission)
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
      role.Permissions?.some(permission_obj => permission_obj.permissionName === permission)
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

// Tenant scoping for rescue-owned resources. Permission middleware
// (requirePermission) only checks that the caller *has* a permission like
// `rescues.update`; it does not verify the caller belongs to the rescue
// being acted upon. Without this guard, staff of Rescue A holding
// `rescues.update` can mutate Rescue B (cross-tenant write). Platform
// admin / moderator user types bypass — they operate cross-tenant by design.
export const requireRescueTenant = (rescueIdParam: string = 'rescueId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userType = req.user.userType;
    const isPlatformAdmin =
      userType === UserType.ADMIN ||
      userType === UserType.SUPER_ADMIN ||
      userType === UserType.MODERATOR;

    if (isPlatformAdmin) {
      next();
      return;
    }

    const targetRescueId = req.params[rescueIdParam];
    const userRescueId = req.user.rescueId;

    if (userRescueId && targetRescueId && userRescueId === targetRescueId) {
      next();
      return;
    }

    logger.warn('Access denied - rescue tenant mismatch', {
      userId: req.user.userId,
      userType,
      userRescueId,
      targetRescueId,
      endpoint: req.path,
    });

    res.status(403).json({
      error: 'Access denied',
      message: 'You do not have access to this rescue',
    });
  };
};

// Admin only access (SUPER_ADMIN always covers ADMIN).
export const requireAdmin = requireRole(UserType.ADMIN, UserType.SUPER_ADMIN);

// Rescue staff or admin access
export const requireRescue = requireRole(
  UserType.RESCUE_STAFF,
  UserType.ADMIN,
  UserType.SUPER_ADMIN
);

export const requireAdminOrRescue = requireRole(
  UserType.ADMIN,
  UserType.SUPER_ADMIN,
  UserType.RESCUE_STAFF
);

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

      // Admin (and super_admin) can access anything
      if (isAdminRole(userType)) {
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
      res.status(403).json({ error: 'Authorization check failed' });
    }
  };
};

export default {
  requireRole,
  requirePermission,
  requirePermissionOrOwnership,
  requireRescueTenant,
  requireAdmin,
  requireRescue,
  requireAdminOrRescue,
  requireOwnershipOrAdmin,
  PERMISSIONS,
};
