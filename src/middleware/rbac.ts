import { NextFunction, Response } from 'express';
import { UserType } from '../models/User';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from './auth';

export interface Permission {
  permission_id: string;
  name: string;
  resource: string;
  action: string;
}

export interface Role {
  role_id: string;
  name: string;
  Permissions: Permission[];
}

// Define system permissions
export const PERMISSIONS = {
  // User Management
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_READ_OWN: 'user:read:own',
  USER_UPDATE_OWN: 'user:update:own',

  // Pet Management
  PET_CREATE: 'pet:create',
  PET_READ: 'pet:read',
  PET_UPDATE: 'pet:update',
  PET_DELETE: 'pet:delete',
  PET_MANAGE_OWN: 'pet:manage:own',

  // Application Management
  APPLICATION_CREATE: 'application:create',
  APPLICATION_READ: 'application:read',
  APPLICATION_UPDATE: 'application:update',
  APPLICATION_DELETE: 'application:delete',
  APPLICATION_MANAGE_OWN: 'application:manage:own',
  APPLICATION_APPROVE: 'application:approve',
  APPLICATION_REJECT: 'application:reject',

  // Rescue Management
  RESCUE_CREATE: 'rescue:create',
  RESCUE_READ: 'rescue:read',
  RESCUE_UPDATE: 'rescue:update',
  RESCUE_DELETE: 'rescue:delete',
  RESCUE_MANAGE_OWN: 'rescue:manage:own',

  // Chat/Communication
  CHAT_CREATE: 'chat:create',
  CHAT_READ: 'chat:read',
  CHAT_UPDATE: 'chat:update',
  CHAT_DELETE: 'chat:delete',
  CHAT_PARTICIPATE: 'chat:participate',

  // Admin Functions
  ADMIN_PANEL: 'admin:panel',
  ADMIN_USERS: 'admin:users',
  ADMIN_REPORTS: 'admin:reports',
  ADMIN_SYSTEM: 'admin:system',

  // System
  AUDIT_LOG_READ: 'audit:read',
  FEATURE_FLAG_MANAGE: 'feature:manage',
} as const;

// Role-based permission checks
export const requireRole = (allowedRoles: UserType[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.user_type)) {
      logger.warn(`Access denied - insufficient role: ${req.user.user_type}`, {
        userId: req.user.user_id,
        requiredRoles: allowedRoles,
        userRole: req.user.user_type,
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
    const hasPermission = req.user.Roles?.some((role: Role) =>
      role.Permissions?.some((permission: Permission) => permission.name === requiredPermission)
    );

    if (!hasPermission) {
      logger.warn(`Access denied - missing permission: ${requiredPermission}`, {
        userId: req.user.user_id,
        userType: req.user.user_type,
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
    const userId = req.user.user_id;

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

    // Store resource ID for use in controller
    req.resourceId = resourceId;
    next();
  };
};

// Rescue staff check - ensures user belongs to the rescue
export const requireRescueAccess = (rescueIdParam: string = 'rescueId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated',
      });
      return;
    }

    const rescueId = req.params[rescueIdParam];
    const userRescueId = req.user.rescue_id;

    // Admin users can access any rescue
    if (req.user.user_type === UserType.ADMIN) {
      next();
      return;
    }

    // Check if user belongs to the rescue
    if (!userRescueId || userRescueId !== rescueId) {
      logger.warn(`Access denied - rescue access check failed`, {
        userId: req.user.user_id,
        userRescueId,
        requestedRescueId: rescueId,
        endpoint: req.path,
      });

      res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your rescue resources',
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
    const hasPermission = req.user.Roles?.some((role: Role) =>
      role.Permissions?.some((perm: Permission) => perm.name === permission)
    );

    if (hasPermission) {
      next();
      return;
    }

    // If no permission, check ownership
    const resourceId = req.params[resourceIdParam];
    const userId = req.user.user_id;

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
export const requireAdmin = requireRole([UserType.ADMIN]);

// Rescue staff or admin access
export const requireRescueStaffOrAdmin = requireRole([UserType.RESCUE_STAFF, UserType.ADMIN]);

// Add resource ID to request interface
declare module 'express' {
  interface Request {
    resourceId?: string;
  }
}

export default {
  requireRole,
  requirePermission,
  requireOwnership,
  requireRescueAccess,
  requirePermissionOrOwnership,
  requireAdmin,
  requireRescueStaffOrAdmin,
  PERMISSIONS,
};
