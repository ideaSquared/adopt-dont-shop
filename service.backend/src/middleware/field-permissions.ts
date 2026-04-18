import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import FieldPermission from '../models/FieldPermission';
import AuditLog from '../models/AuditLog';
import { logger } from '../utils/logger';
import {
  enforceSensitiveDenylist,
  type FieldAccessLevel,
  type FieldPermissionResource,
  getFieldAccessMap,
} from '@adopt-dont-shop/lib.types';

/**
 * Cache for field permission overrides to avoid repeated DB queries.
 * Maps "resource:role" -> { overrides, expires }
 */
const overrideCache = new Map<
  string,
  { overrides: Array<{ field_name: string; access_level: string }>; expires: number }
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
): Promise<Array<{ field_name: string; access_level: string }>> => {
  const cacheKey = `${resource}:${role}`;
  const cached = overrideCache.get(cacheKey);

  if (cached && Date.now() < cached.expires) {
    return cached.overrides;
  }

  try {
    const records = await FieldPermission.findAll({
      where: { resource, role },
    });

    const overrides = records.map(r => ({
      field_name: r.field_name,
      access_level: r.access_level,
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
 * Get the full effective field access map for a resource and role.
 *
 * Layering order (lowest to highest precedence):
 *   1. Hardcoded defaults from lib.types
 *   2. Database overrides (per-field)
 *   3. Sensitive-field denylist — sensitive fields (password, tokens, 2FA
 *      secrets, etc.) are hard-set to 'none' after overrides are applied,
 *      so even a misconfigured override cannot expose them.
 */
const getEffectiveAccessMap = async (
  resource: FieldPermissionResource,
  role: string
): Promise<Record<string, FieldAccessLevel>> => {
  const userRole = role as 'adopter' | 'rescue_staff' | 'admin' | 'moderator';
  const defaults = getFieldAccessMap(resource, userRole);
  const overrides = await getOverrides(resource, role);

  const effective: Record<string, FieldAccessLevel> = { ...defaults };
  for (const override of overrides) {
    effective[override.field_name] = override.access_level as FieldAccessLevel;
  }

  return enforceSensitiveDenylist(resource, effective);
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
    if (level === undefined || level === 'none') {
      continue;
    }

    if (action === 'read' && (level === 'read' || level === 'write')) {
      masked[key] = value;
    } else if (action === 'write' && level === 'write') {
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

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Treat unauthenticated requests as the most restrictive public role ('adopter').
    // This ensures routes that allow optional auth (e.g. public GET /pets) still
    // strip sensitive fields (medical_notes, internal notes, etc.) for anonymous
    // callers rather than returning the raw model.
    const role = req.user?.userType ?? 'adopter';

    let accessMap: Record<string, FieldAccessLevel>;
    try {
      accessMap = await getEffectiveAccessMap(resource, role);
    } catch (error) {
      logger.error('Failed to fetch field access map — failing closed', { error, resource, role });
      res.status(500).json({ error: 'Field permission check failed' });
      return;
    }

    const originalJson = res.json.bind(res);

    /**
     * Normalize a value to a plain object if it has a toJSON() method
     * (e.g. Sequelize model instances). Express normally calls toJSON()
     * during JSON.stringify, but our override runs before that — so we
     * must call it ourselves before reading Object.keys / Object.entries.
     */
    const toPlain = (value: unknown): unknown => {
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        typeof (value as Record<string, unknown>).toJSON === 'function'
      ) {
        return (value as { toJSON: () => unknown }).toJSON();
      }
      return value;
    };

    const maskItem = (item: unknown): unknown => {
      const plain = toPlain(item);
      if (plain && typeof plain === 'object' && !Array.isArray(plain)) {
        return maskResponseFields(plain as Record<string, unknown>, accessMap, 'read');
      }
      return plain;
    };

    const auditMasking = (originalFields: string[], visibleFields: string[]): void => {
      if (!audit) {
        return;
      }
      const resourceId = req.params[resourceIdParam] || '';
      const maskedFields = originalFields.filter(f => !visibleFields.includes(f));
      void logFieldAccess(
        req.user?.userId ?? 'unknown',
        resource,
        resourceId,
        visibleFields,
        maskedFields,
        'read',
        req.ip,
        req.get('User-Agent')
      );
    };

    /**
     * Heuristic: does this object look like a single resource, i.e. does at least
     * one of its top-level keys match a field in the access map? If so, we treat
     * it as a resource and run masking. Otherwise we leave it alone — this keeps
     * metadata-only responses (e.g. health checks, stats) untouched.
     */
    const looksLikeResource = (obj: Record<string, unknown>): boolean => {
      for (const key of Object.keys(obj)) {
        if (key in accessMap) {
          return true;
        }
      }
      return false;
    };

    res.json = function (body: Record<string, unknown>) {
      try {
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          return originalJson(body);
        }

        // Never mask error responses
        if ('error' in body || ('success' in body && body.success === false)) {
          return originalJson(body);
        }

        // Pattern 1: { success, data, ... } or { data } wrapper
        if ('data' in body && body.data !== null && body.data !== undefined) {
          const data = body.data;

          if (Array.isArray(data)) {
            const maskedItems = data.map(maskItem);
            // Use the normalized first item for audit key counts
            const firstPlain = toPlain(data[0]) as Record<string, unknown> | undefined;
            const firstMasked = maskedItems[0] as Record<string, unknown> | undefined;
            auditMasking(
              firstPlain ? Object.keys(firstPlain) : [],
              firstMasked ? Object.keys(firstMasked) : []
            );
            return originalJson({ ...body, data: maskedItems });
          }

          if (typeof data === 'object') {
            const dataObj = toPlain(data) as Record<string, unknown>;
            const maskedData = maskResponseFields(dataObj, accessMap, 'read');
            auditMasking(Object.keys(dataObj), Object.keys(maskedData));
            return originalJson({ ...body, data: maskedData });
          }

          // Primitive data payload — nothing to mask
          return originalJson(body);
        }

        // Pattern 2: composite response keyed by resource name,
        // e.g. { users: [...], total, page, totalPages } from /users/search.
        // We mask the nested resource list/object but preserve the pagination
        // metadata alongside it.
        if (resource in body) {
          const nested = body[resource];

          if (Array.isArray(nested)) {
            const maskedItems = nested.map(maskItem);
            const firstPlain = toPlain(nested[0]) as Record<string, unknown> | undefined;
            const firstMasked = maskedItems[0] as Record<string, unknown> | undefined;
            auditMasking(
              firstPlain ? Object.keys(firstPlain) : [],
              firstMasked ? Object.keys(firstMasked) : []
            );
            return originalJson({ ...body, [resource]: maskedItems });
          }

          if (nested && typeof nested === 'object') {
            const nestedObj = toPlain(nested) as Record<string, unknown>;
            const maskedNested = maskResponseFields(nestedObj, accessMap, 'read');
            auditMasking(Object.keys(nestedObj), Object.keys(maskedNested));
            return originalJson({ ...body, [resource]: maskedNested });
          }
        }

        // Pattern 3: direct resource-shaped object (no wrapper),
        // e.g. GET /users/profile returns the user object directly.
        // Normalize before heuristic check so Sequelize instances are
        // evaluated against their actual attributes, not their wrapper keys.
        const plainBody = toPlain(body) as Record<string, unknown>;
        if (looksLikeResource(plainBody)) {
          const maskedBody = maskResponseFields(plainBody, accessMap, 'read');
          auditMasking(Object.keys(plainBody), Object.keys(maskedBody));
          return originalJson(maskedBody);
        }

        // Nothing resource-shaped found — passthrough untouched
        return originalJson(body);
      } catch (error) {
        logger.error('Field masking middleware error — failing closed', { error, resource, role });
        // Fail closed: sending the unmasked body risks exposing restricted fields.
        // Use originalJson directly (not the overridden res.json) to avoid recursion.
        res.status(500);
        return originalJson({ error: 'Internal server error' });
      }
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
  options: { audit?: boolean; resourceIdParam?: string } = {}
) => {
  const { audit = false, resourceIdParam = 'id' } = options;

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
      const blockedFields = requestedFields.filter(field => {
        const level = accessMap[field];
        return level !== 'write';
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
            req.params[resourceIdParam] || '',
            requestedFields.filter(f => !blockedFields.includes(f)),
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
