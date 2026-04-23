import { Router } from 'express';
import * as cmsController from '../controllers/cms.controller';
import { authenticateToken, requireRole } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import { cmsValidation } from '../validation/cms.validation';

const router = Router();

const adminRoles = ['admin', 'super_admin'];

// Public routes - published content only, no auth required
router.get('/public/content', cmsController.listPublicContent);
router.get('/public/content/:slug', cmsController.getPublicContentBySlug);

// Slug generation (utility, read-only)
router.get(
  '/slug',
  authenticateToken,
  requireRole(adminRoles),
  cmsValidation.generateSlug,
  handleValidationErrors,
  cmsController.generateSlug
);

// Content routes

router.get(
  '/content',
  authenticateToken,
  requireRole(adminRoles),
  cmsValidation.listContent,
  handleValidationErrors,
  cmsController.listContent
);

router.post(
  '/content',
  authenticateToken,
  requireRole(adminRoles),
  cmsValidation.createContent,
  handleValidationErrors,
  cmsController.createContent
);

router.get(
  '/content/slug/:slug',
  authenticateToken,
  requireRole(adminRoles),
  cmsValidation.getContentBySlug,
  handleValidationErrors,
  cmsController.getContentBySlug
);

router.get(
  '/content/:contentId',
  authenticateToken,
  requireRole(adminRoles),
  cmsValidation.getContent,
  handleValidationErrors,
  cmsController.getContent
);

router.put(
  '/content/:contentId',
  authenticateToken,
  requireRole(adminRoles),
  cmsValidation.updateContent,
  handleValidationErrors,
  cmsController.updateContent
);

router.delete(
  '/content/:contentId',
  authenticateToken,
  requireRole(adminRoles),
  cmsValidation.deleteContent,
  handleValidationErrors,
  cmsController.deleteContent
);

// Workflow actions

router.post(
  '/content/:contentId/publish',
  authenticateToken,
  requireRole(adminRoles),
  cmsValidation.publishContent,
  handleValidationErrors,
  cmsController.publishContent
);

router.post(
  '/content/:contentId/unpublish',
  authenticateToken,
  requireRole(adminRoles),
  cmsValidation.unpublishContent,
  handleValidationErrors,
  cmsController.unpublishContent
);

router.post(
  '/content/:contentId/archive',
  authenticateToken,
  requireRole(adminRoles),
  cmsValidation.archiveContent,
  handleValidationErrors,
  cmsController.archiveContent
);

// Version history

router.get(
  '/content/:contentId/versions',
  authenticateToken,
  requireRole(adminRoles),
  cmsValidation.getVersionHistory,
  handleValidationErrors,
  cmsController.getVersionHistory
);

router.post(
  '/content/:contentId/versions/:version/restore',
  authenticateToken,
  requireRole(adminRoles),
  cmsValidation.restoreVersion,
  handleValidationErrors,
  cmsController.restoreVersion
);

// Navigation menus

router.get(
  '/menus',
  authenticateToken,
  requireRole(adminRoles),
  cmsValidation.listMenus,
  handleValidationErrors,
  cmsController.listMenus
);

router.post(
  '/menus',
  authenticateToken,
  requireRole(adminRoles),
  cmsValidation.createMenu,
  handleValidationErrors,
  cmsController.createMenu
);

router.get(
  '/menus/:menuId',
  authenticateToken,
  requireRole(adminRoles),
  cmsValidation.getMenu,
  handleValidationErrors,
  cmsController.getMenu
);

router.put(
  '/menus/:menuId',
  authenticateToken,
  requireRole(adminRoles),
  cmsValidation.updateMenu,
  handleValidationErrors,
  cmsController.updateMenu
);

router.delete(
  '/menus/:menuId',
  authenticateToken,
  requireRole(adminRoles),
  cmsValidation.deleteMenu,
  handleValidationErrors,
  cmsController.deleteMenu
);

export default router;
