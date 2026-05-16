import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { UserType } from '../models/User';
import { FieldPermissionService } from '../services/field-permission.service';
import { AuthenticatedRequest } from '../types/auth';
// Model enums are used for service-layer type compatibility within the backend.
// These enums mirror the canonical types in @adopt-dont-shop/lib.types.
import { FieldAccessLevel, FieldPermissionResource } from '../models/FieldPermission';
// lib.types provides the default configurations and is the source of truth
// for permission types and business logic. No frontend dependencies.
import {
  defaultFieldPermissions,
  getFieldAccessMap,
  isSensitiveField,
  SENSITIVE_FIELD_DENYLIST,
} from '@adopt-dont-shop/lib.types';

const router = Router();

const validResources = Object.values(FieldPermissionResource);
const validAccessLevels = Object.values(FieldAccessLevel);
const validRoles = ['admin', 'moderator', 'rescue_staff', 'adopter'];

/**
 * Return all known field names for a resource by reading the admin access map
 * (admin sees the most fields, so its key set is the full field universe).
 */
const getKnownFields = (resource: string): ReadonlySet<string> => {
  const map = getFieldAccessMap(resource as FieldPermissionResource, 'admin');
  return new Set(Object.keys(map));
};

/**
 * Custom express-validator for a single field_name given a companion resource.
 * Used in the single-upsert POST body validator.
 */
const validateFieldNameForResource = (
  value: string,
  { req }: { req: { body?: unknown } }
): true => {
  const resource = (req.body as { resource?: string } | undefined)?.resource;
  if (!resource || !validResources.includes(resource as FieldPermissionResource)) {
    return true; // resource validator will catch an invalid resource
  }
  if (!getKnownFields(resource).has(value)) {
    throw new Error(`Unknown field "${value}" for resource "${resource}"`);
  }
  return true;
};

/**
 * Custom express-validator for a wildcard field_name inside the bulk array.
 * Reads the companion resource at the same array index.
 */
const validateBulkFieldName = (
  value: string,
  { req, path }: { req: { body?: unknown }; path?: string }
): true => {
  const match = /overrides\[(\d+)\]/.exec(path ?? '');
  if (!match) {
    return true;
  }
  const index = parseInt(match[1], 10);
  const overridesArr = (req.body as { overrides?: Array<{ resource?: string }> })?.overrides;
  const resource = overridesArr?.[index]?.resource;
  if (!resource || !validResources.includes(resource as FieldPermissionResource)) {
    return true; // resource validator will catch an invalid resource
  }
  if (!getKnownFields(resource).has(value)) {
    throw new Error(`Unknown field "${value}" for resource "${resource}"`);
  }
  return true;
};

/**
 * Reject any attempt to create or modify an override for a field that is on
 * the sensitive-field denylist (password, tokens, 2FA secrets, etc.). Even
 * admins cannot loosen these — they are hard-coded to 'none' for every role
 * and enforced a second time by the middleware at request time. Rejecting
 * here gives admins a clearer error message than silently coercing the
 * stored override to 'none'.
 */
const rejectSensitiveOverrides = (
  overrides: ReadonlyArray<{ resource: string; field_name: string }>
): string[] => {
  const blocked: string[] = [];
  for (const override of overrides) {
    if (
      (override.resource as keyof typeof SENSITIVE_FIELD_DENYLIST) in SENSITIVE_FIELD_DENYLIST &&
      isSensitiveField(
        override.resource as keyof typeof SENSITIVE_FIELD_DENYLIST,
        override.field_name
      )
    ) {
      blocked.push(`${override.resource}.${override.field_name}`);
    }
  }
  return blocked;
};

/**
 * GET /api/v1/field-permissions/defaults
 * Get the default field permission configuration (no overrides applied).
 * Admin only.
 */
router.get(
  '/defaults',
  authenticateToken,
  requireRole(UserType.ADMIN),
  (_req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: defaultFieldPermissions });
  }
);

/**
 * GET /api/v1/field-permissions/defaults/:resource/:role
 * Get default field access map for a specific resource and role.
 * Admin only.
 */
router.get(
  '/defaults/:resource/:role',
  authenticateToken,
  requireRole(UserType.ADMIN),
  [
    param('resource')
      .isIn(validResources)
      .withMessage(`Resource must be one of: ${validResources.join(', ')}`),
    param('role')
      .isIn(validRoles)
      .withMessage(`Role must be one of: ${validRoles.join(', ')}`),
  ],
  (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { resource, role } = req.params;
    const userRole = role as 'adopter' | 'rescue_staff' | 'admin' | 'moderator' | 'super_admin';
    const accessMap = getFieldAccessMap(resource as keyof typeof defaultFieldPermissions, userRole);
    res.json({ success: true, data: accessMap });
  }
);

/**
 * GET /api/v1/field-permissions/:resource
 * Get all overrides for a resource.
 * Admin only.
 */
router.get(
  '/:resource',
  authenticateToken,
  requireRole(UserType.ADMIN),
  [
    param('resource')
      .isIn(validResources)
      .withMessage(`Resource must be one of: ${validResources.join(', ')}`),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const overrides = await FieldPermissionService.getByResource(
      req.params.resource as FieldPermissionResource
    );
    res.json({ success: true, data: overrides });
  }
);

/**
 * GET /api/v1/field-permissions/:resource/:role
 * Get overrides for a specific resource and role.
 * Admin only.
 */
router.get(
  '/:resource/:role',
  authenticateToken,
  requireRole(UserType.ADMIN),
  [
    param('resource')
      .isIn(validResources)
      .withMessage(`Resource must be one of: ${validResources.join(', ')}`),
    param('role')
      .isIn(validRoles)
      .withMessage(`Role must be one of: ${validRoles.join(', ')}`),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const overrides = await FieldPermissionService.getByResourceAndRole(
      req.params.resource as FieldPermissionResource,
      req.params.role
    );
    res.json({ success: true, data: overrides });
  }
);

/**
 * POST /api/v1/field-permissions
 * Create or update a field permission override.
 * Admin only.
 */
router.post(
  '/',
  authenticateToken,
  requireRole(UserType.ADMIN),
  [
    body('resource')
      .isIn(validResources)
      .withMessage(`Resource must be one of: ${validResources.join(', ')}`),
    body('field_name')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Field name is required')
      .custom(validateFieldNameForResource),
    body('role')
      .isIn(validRoles)
      .withMessage(`Role must be one of: ${validRoles.join(', ')}`),
    body('access_level')
      .isIn(validAccessLevels)
      .withMessage(`Access level must be one of: ${validAccessLevels.join(', ')}`),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { resource, field_name, role, access_level } = req.body;

    const blocked = rejectSensitiveOverrides([{ resource, field_name }]);
    if (blocked.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Cannot override sensitive fields',
        blockedFields: blocked,
      });
      return;
    }

    const userId = req.user?.userId ?? 'unknown';

    const record = await FieldPermissionService.upsert(
      resource as FieldPermissionResource,
      field_name,
      role,
      access_level as FieldAccessLevel,
      userId
    );

    res.status(200).json({ success: true, data: record });
  }
);

/**
 * POST /api/v1/field-permissions/bulk
 * Bulk create or update field permission overrides.
 * Admin only.
 */
router.post(
  '/bulk',
  authenticateToken,
  requireRole(UserType.ADMIN),
  [
    body('overrides').isArray({ min: 1 }).withMessage('Overrides must be a non-empty array'),
    body('overrides.*.resource')
      .isIn(validResources)
      .withMessage(`Resource must be one of: ${validResources.join(', ')}`),
    body('overrides.*.field_name')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Field name is required')
      .custom(validateBulkFieldName),
    body('overrides.*.role')
      .isIn(validRoles)
      .withMessage(`Role must be one of: ${validRoles.join(', ')}`),
    body('overrides.*.access_level')
      .isIn(validAccessLevels)
      .withMessage(`Access level must be one of: ${validAccessLevels.join(', ')}`),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const overrides = req.body.overrides as ReadonlyArray<{
      resource: string;
      field_name: string;
    }>;

    const blocked = rejectSensitiveOverrides(overrides);
    if (blocked.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Cannot override sensitive fields',
        blockedFields: blocked,
      });
      return;
    }

    const userId = req.user?.userId ?? 'unknown';
    const records = await FieldPermissionService.bulkUpsert(req.body.overrides, userId);
    res.status(200).json({ success: true, data: records });
  }
);

/**
 * DELETE /api/v1/field-permissions/:resource/:role/:field_name
 * Delete a single field permission override.
 * Admin only.
 */
router.delete(
  '/:resource/:role/:field_name',
  authenticateToken,
  requireRole(UserType.ADMIN),
  [
    param('resource')
      .isIn(validResources)
      .withMessage(`Resource must be one of: ${validResources.join(', ')}`),
    param('role')
      .isIn(validRoles)
      .withMessage(`Role must be one of: ${validRoles.join(', ')}`),
    param('field_name').isString().trim().notEmpty().withMessage('Field name is required'),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { resource, role, field_name } = req.params;
    const userId = req.user?.userId ?? 'unknown';

    const deleted = await FieldPermissionService.deleteOverride(
      resource as FieldPermissionResource,
      role,
      field_name,
      userId
    );

    if (!deleted) {
      res.status(404).json({ success: false, message: 'Field permission override not found' });
      return;
    }

    res.json({ success: true, message: 'Field permission override deleted' });
  }
);

export default router;
