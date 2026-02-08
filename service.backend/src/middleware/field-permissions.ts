import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { UserType } from '../models/User';
import FieldPermission, {
  FieldAccessLevel,
  FieldPermissionResource,
} from '../models/FieldPermission';
import AuditLog from '../models/AuditLog';
import { logger } from '../utils/logger';
import {
  getDefaultFieldAccess,
  getFieldAccessMap,
} from '@adopt-dont-shop/lib.permissions';

/**
 * Cache for field permission overrides to avoid repeated DB queries.
 * Maps "resource:role" -> { overrides, expires }
 */
const overrideCache = new Map<
  string,
  { overrides: Array<{ fieldName: string; accessLevel: string }>; expires: number }
>();

const CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Clear the field permission override cache.
 * Call this after updating field permissions.
 */
export const clearFieldPermissionCache = (resource?: string, role?: string): void => {
  if (resource && role) {
    overrideCache.delete(`${resource}:${role}`);
  } else {
    overrideCache.clear();
  }
};

/**
 * Fetch overrides from the database, with caching.
 */
const getOverrides = async (
  resource: string,
  role: string
): Promise<Array<{ fieldName: string; accessLevel: string }>> => {
  const cacheKey = `${resource}:${role}`;
  const cached = overrideCache.get(cacheKey);

  if (cached && Date.now() < cached.expires) {
    return cached.overrides;
  }

  try {
    const records = await FieldPermission.findAll({
      where: { resource, role },
    });

    const overrides = records.map((r) => ({
      fieldName: r.fieldName,
      accessLevel: r.accessLevel,
    }));

    overrideCache.set(cacheKey, {
      overrides,
      expires: Date.now() + CACHE_TTL,
    });

    return overrides;
  } catch (error) {
    logger.error('Failed to fetch field permission overrides', { resource, role, error });
    return [];
  }
};

/**
 * Resolve the effective access level for a field, considering overrides.
 */
const resolveFieldAccess = async (
  resource: FieldPermissionResource,
  role: string,
  fieldName: string
): Promise<string> => {
  const overrides = await getOverrides(resource, role);
  const override = overrides.find((o) => o.fieldName === fieldName);

  if (override) {
    return override.accessLevel;
  }

  // Map UserType to the UserRole expected by lib.permissions
  const userRole = role as 'adopter' | 'rescue_staff' | 'admin' | 'moderator';
  return getDefaultFieldAccess(resource, userRole, fieldName);
};

/**
 * Get the full effective field access map for a resource and role.
 */
const getEffectiveAccessMap = async (
  resource: FieldPermissionResource,
  role: string
): Promise<Record<string, string>> => {
  const userRole = role as 'adopter' | 'rescue_staff' | 'admin' | 'moderator';
  const defaults = getFieldAccessMap(resource, userRole);
  const overrides = await getOverrides(resource, role);

  const effective: Record<string, string> = { ...defaults };
  for (const override of overrides) {
    effective[override.fieldName] = override.accessLevel;
  }

  return effective;
};

/**
 * Mask fields in a data object based on the user's role and access level.
 * Returns a new object with restricted fields removed.
 */
export const maskResponseFields = <T extends Record<string, unknown>>(
  data: T,
  accessMap: Record<string, string>,
  action: 'read' | 'write'
): Partial<T> => {
  const masked: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const level = accessMap[key];

    // If field not in access map, exclude it (secure by default)
    if (level === undefined || level === FieldAccessLevel.NONE) {
      continue;
    }

    if (action === 'read' && (level === FieldAccessLevel.READ || level === FieldAccessLevel.WRITE)) {
      masked[key] = value;
    } else if (action === 'write' && level === FieldAccessLevel.WRITE) {
      masked[key] = value;
    }
  }

  return masked as Partial<T>;
};

/**
 * Log field access to the audit log.
 */
const logFieldAccess = async (
  userId: string,
  resource: string,
  resourceId: string,
  fieldsAccessed: string[],
  fieldsMasked: string[],
  action: 'read' | 'write',
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  try {
    await AuditLog.create({
      service: 'field-permissions',
      user: userId,
      action: `field_${action}_access`,
      level: 'INFO',
      status: 'success',
      category: 'FIELD_ACCESS',
      metadata: {
        resource,
        resourceId,
        fieldsAccessed,
        fieldsMasked,
        fieldCount: fieldsAccessed.length,
        maskedCount: fieldsMasked.length,
      },
      ip_address: ipAddress ?? null,
      user_agent: userAgent ?? null,
    });
  } catch (error) {
    // Log but don't fail the request
    logger.error('Failed to create field access audit log', { error });
  }
};

/**
 * Middleware that masks response fields based on the user's role.
 *
 * Usage:
 *   router.get('/users/:userId', authenticateToken, fieldMask('users'), controller.getUser);
 *
 * This middleware intercepts `res.json()` to filter the response data.
 * It uses the authenticated user's role to determine which fields to include.
 */
export const fieldMask = (
  resource: FieldPermissionResource,
  options: { audit?: boolean; resourceIdParam?: string } = {}
) => {
  const { audit = false, resourceIdParam = 'id' } = options;

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);

    res.json = function (body: Record<string, unknown>) {
      // If no authenticated user, pass through unmodified
      if (!req.user) {
        return originalJson(body);
      }

      const role = req.user.userType;

      // Wrap the async masking in a promise
      const maskAndSend = async () => {
        try {
          const accessMap = await getEffectiveAccessMap(resource, role);
          const resourceId = req.params[resourceIdParam] || '';

          if (body && typeof body === 'object') {
            // Handle { data: ... } wrapper pattern
            if ('data' in body && body.data !== null && body.data !== undefined) {
              const data = body.data;

              if (Array.isArray(data)) {
                const maskedItems = data.map((item) => {
                  if (item && typeof item === 'object') {
                    return maskResponseFields(item as Record<string, unknown>, accessMap, 'read');
                  }
                  return item;
                });

                if (audit) {
                  const allFields = data.length > 0
                    ? Object.keys(data[0] as Record<string, unknown>)
                    : [];
                  const visibleFields = maskedItems.length > 0
                    ? Object.keys(maskedItems[0])
                    : [];
                  const maskedFields = allFields.filter((f) => !visibleFields.includes(f));

                  await logFieldAccess(
                    req.user?.userId ?? 'unknown',
                    resource,
                    resourceId,
                    visibleFields,
                    maskedFields,
                    'read',
                    req.ip,
                    req.get('User-Agent')
                  );
                }

                return originalJson({ ...body, data: maskedItems });
              }

              if (typeof data === 'object') {
                const maskedData = maskResponseFields(
                  data as Record<string, unknown>,
                  accessMap,
                  'read'
                );

                if (audit) {
                  const allFields = Object.keys(data as Record<string, unknown>);
                  const visibleFields = Object.keys(maskedData);
                  const maskedFields = allFields.filter((f) => !visibleFields.includes(f));

                  await logFieldAccess(
                    req.user?.userId ?? 'unknown',
                    resource,
                    resourceId,
                    visibleFields,
                    maskedFields,
                    'read',
                    req.ip,
                    req.get('User-Agent')
                  );
                }

                return originalJson({ ...body, data: maskedData });
              }
            }

            // Handle direct object response (no wrapper)
            if (!('data' in body) && !('error' in body)) {
              const maskedBody = maskResponseFields(body, accessMap, 'read');
              return originalJson(maskedBody);
            }
          }

          return originalJson(body);
        } catch (error) {
          logger.error('Field masking middleware error', { error, resource, role });
          // On error, return the original response to avoid breaking the API
          return originalJson(body);
        }
      };

      maskAndSend();
      // Return res to maintain chainability expected by Express
      return res;
    } as Response['json'];

    next();
  };
};

/**
 * Middleware that validates write access to fields in the request body.
 *
 * Usage:
 *   router.put('/users/:userId', authenticateToken, fieldWriteGuard('users'), controller.updateUser);
 *
 * Rejects the request if the body contains fields the user cannot write to.
 */
export const fieldWriteGuard = (
  resource: FieldPermissionResource,
  options: { audit?: boolean } = {}
) => {
  const { audit = false } = options;

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const role = req.user.userType;
    const body = req.body;

    if (!body || typeof body !== 'object') {
      next();
      return;
    }

    try {
      const accessMap = await getEffectiveAccessMap(resource, role);
      const requestedFields = Object.keys(body);
      const blockedFields = requestedFields.filter((field) => {
        const level = accessMap[field];
        return level !== FieldAccessLevel.WRITE;
      });

      if (blockedFields.length > 0) {
        logger.warn('Field write access denied', {
          userId: req.user.userId,
          role,
          resource,
          blockedFields,
          endpoint: req.path,
        });

        if (audit) {
          await logFieldAccess(
            req.user.userId,
            resource,
            req.params.id || '',
            requestedFields.filter((f) => !blockedFields.includes(f)),
            blockedFields,
            'write',
            req.ip,
            req.get('User-Agent')
          );
        }

        res.status(403).json({
          error: 'Field access denied',
          message: `You do not have write access to the following fields: ${blockedFields.join(', ')}`,
          blockedFields,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Field write guard middleware error', { error, resource, role });
      res.status(500).json({ error: 'Field permission check failed' });
    }
  };
};

export default {
  fieldMask,
  fieldWriteGuard,
  clearFieldPermissionCache,
  maskResponseFields,
};
