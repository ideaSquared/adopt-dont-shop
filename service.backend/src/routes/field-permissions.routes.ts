import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { UserType } from '../models/User';
import { FieldPermissionService } from '../services/field-permission.service';
import { AuthenticatedRequest } from '../types/auth';
import { logger } from '../utils/logger';
// Model enums are used for service-layer type compatibility within the backend.
// These enums mirror the canonical types in @adopt-dont-shop/lib.permissions.
import { FieldAccessLevel, FieldPermissionResource } from '../models/FieldPermission';
// lib.permissions provides the default configurations and is the source of truth
// for field permission business logic.
import { defaultFieldPermissions, getFieldAccessMap } from '@adopt-dont-shop/lib.permissions';

const router = Router();

const validResources = Object.values(FieldPermissionResource);
const validAccessLevels = Object.values(FieldAccessLevel);
const validRoles = ['admin', 'moderator', 'rescue_staff', 'adopter'];

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
    const userRole = role as 'adopter' | 'rescue_staff' | 'admin' | 'moderator';
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

    try {
      const overrides = await FieldPermissionService.getByResource(
        req.params.resource as FieldPermissionResource
      );
      res.json({ success: true, data: overrides });
    } catch (error) {
      logger.error('Failed to get field permissions', { error });
      res.status(500).json({ success: false, message: 'Failed to get field permissions' });
    }
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

    try {
      const overrides = await FieldPermissionService.getByResourceAndRole(
        req.params.resource as FieldPermissionResource,
        req.params.role
      );
      res.json({ success: true, data: overrides });
    } catch (error) {
      logger.error('Failed to get field permissions', { error });
      res.status(500).json({ success: false, message: 'Failed to get field permissions' });
    }
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
    body('fieldName').isString().trim().notEmpty().withMessage('Field name is required'),
    body('role')
      .isIn(validRoles)
      .withMessage(`Role must be one of: ${validRoles.join(', ')}`),
    body('accessLevel')
      .isIn(validAccessLevels)
      .withMessage(`Access level must be one of: ${validAccessLevels.join(', ')}`),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    try {
      const { resource, fieldName, role, accessLevel } = req.body;
      const userId = req.user?.userId ?? 'unknown';

      const record = await FieldPermissionService.upsert(
        resource as FieldPermissionResource,
        fieldName,
        role,
        accessLevel as FieldAccessLevel,
        userId
      );

      res.status(200).json({ success: true, data: record });
    } catch (error) {
      logger.error('Failed to upsert field permission', { error });
      res.status(500).json({ success: false, message: 'Failed to update field permission' });
    }
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
    body('overrides.*.fieldName')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Field name is required'),
    body('overrides.*.role')
      .isIn(validRoles)
      .withMessage(`Role must be one of: ${validRoles.join(', ')}`),
    body('overrides.*.accessLevel')
      .isIn(validAccessLevels)
      .withMessage(`Access level must be one of: ${validAccessLevels.join(', ')}`),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    try {
      const userId = req.user?.userId ?? 'unknown';
      const records = await FieldPermissionService.bulkUpsert(req.body.overrides, userId);
      res.status(200).json({ success: true, data: records });
    } catch (error) {
      logger.error('Failed to bulk upsert field permissions', { error });
      res.status(500).json({ success: false, message: 'Failed to bulk update field permissions' });
    }
  }
);

/**
 * DELETE /api/v1/field-permissions/:resource/:role/:fieldName
 * Delete a single field permission override.
 * Admin only.
 */
router.delete(
  '/:resource/:role/:fieldName',
  authenticateToken,
  requireRole(UserType.ADMIN),
  [
    param('resource')
      .isIn(validResources)
      .withMessage(`Resource must be one of: ${validResources.join(', ')}`),
    param('role')
      .isIn(validRoles)
      .withMessage(`Role must be one of: ${validRoles.join(', ')}`),
    param('fieldName').isString().trim().notEmpty().withMessage('Field name is required'),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    try {
      const { resource, role, fieldName } = req.params;
      const userId = req.user?.userId ?? 'unknown';

      const deleted = await FieldPermissionService.deleteOverride(
        resource as FieldPermissionResource,
        role,
        fieldName,
        userId
      );

      if (!deleted) {
        res.status(404).json({ success: false, message: 'Field permission override not found' });
        return;
      }

      res.json({ success: true, message: 'Field permission override deleted' });
    } catch (error) {
      logger.error('Failed to delete field permission', { error });
      res.status(500).json({ success: false, message: 'Failed to delete field permission' });
    }
  }
);

export default router;
