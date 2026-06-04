import { Router } from 'express';
import * as cmsController from '../controllers/cms.controller';
import { authenticateToken } from '../middleware/auth';
import { auditRoute } from '../middleware/audit-route';
import { requireRole } from '../middleware/rbac';
import { UserType } from '../models/User';
import { handleValidationErrors } from '../middleware/validation';
import { cmsValidation } from '../validation/cms.validation';

const router = Router();

const adminRoles = [UserType.ADMIN, UserType.SUPER_ADMIN] as const;

// Public routes - published content only, no auth required
router.get('/public/content', cmsController.listPublicContent);
router.get('/public/content/:slug', cmsController.getPublicContentBySlug);

// Slug generation (utility, read-only)
router.get(
  '/slug',
  authenticateToken,
  requireRole(...adminRoles),
  cmsValidation.generateSlug,
  handleValidationErrors,
  cmsController.generateSlug
);

// Content routes

router.get(
  '/content',
  authenticateToken,
  requireRole(...adminRoles),
  cmsValidation.listContent,
  handleValidationErrors,
  cmsController.listContent
);

router.post(
  '/content',
  authenticateToken,
  requireRole(...adminRoles),
  auditRoute({
    action: 'CMS_CONTENT_CREATED',
    entity: 'CmsContent',
    // ADS-754: controller responds with `{ success, message, content: { contentId, ... } }`
    entityIdFrom: ctx => {
      const r = ctx.response as { content?: { contentId?: string } } | undefined;
      return r?.content?.contentId;
    },
    metadataFrom: ['body.slug', 'body.title', 'body.type'],
  }),
  cmsValidation.createContent,
  handleValidationErrors,
  cmsController.createContent
);

router.get(
  '/content/slug/:slug',
  authenticateToken,
  requireRole(...adminRoles),
  cmsValidation.getContentBySlug,
  handleValidationErrors,
  cmsController.getContentBySlug
);

router.get(
  '/content/:contentId',
  authenticateToken,
  requireRole(...adminRoles),
  cmsValidation.getContent,
  handleValidationErrors,
  cmsController.getContent
);

router.put(
  '/content/:contentId',
  authenticateToken,
  requireRole(...adminRoles),
  auditRoute({
    action: 'CMS_CONTENT_UPDATED',
    entity: 'CmsContent',
    entityIdFrom: 'params.contentId',
  }),
  cmsValidation.updateContent,
  handleValidationErrors,
  cmsController.updateContent
);

router.delete(
  '/content/:contentId',
  authenticateToken,
  requireRole(...adminRoles),
  auditRoute({
    action: 'CMS_CONTENT_DELETED',
    entity: 'CmsContent',
    entityIdFrom: 'params.contentId',
  }),
  cmsValidation.deleteContent,
  handleValidationErrors,
  cmsController.deleteContent
);

// Workflow actions

router.post(
  '/content/:contentId/publish',
  authenticateToken,
  requireRole(...adminRoles),
  auditRoute({
    action: 'CMS_CONTENT_PUBLISHED',
    entity: 'CmsContent',
    entityIdFrom: 'params.contentId',
  }),
  cmsValidation.publishContent,
  handleValidationErrors,
  cmsController.publishContent
);

router.post(
  '/content/:contentId/unpublish',
  authenticateToken,
  requireRole(...adminRoles),
  auditRoute({
    action: 'CMS_CONTENT_UNPUBLISHED',
    entity: 'CmsContent',
    entityIdFrom: 'params.contentId',
  }),
  cmsValidation.unpublishContent,
  handleValidationErrors,
  cmsController.unpublishContent
);

router.post(
  '/content/:contentId/archive',
  authenticateToken,
  requireRole(...adminRoles),
  auditRoute({
    action: 'CMS_CONTENT_ARCHIVED',
    entity: 'CmsContent',
    entityIdFrom: 'params.contentId',
  }),
  cmsValidation.archiveContent,
  handleValidationErrors,
  cmsController.archiveContent
);

// Version history

router.get(
  '/content/:contentId/versions',
  authenticateToken,
  requireRole(...adminRoles),
  cmsValidation.getVersionHistory,
  handleValidationErrors,
  cmsController.getVersionHistory
);

router.post(
  '/content/:contentId/versions/:version/restore',
  authenticateToken,
  requireRole(...adminRoles),
  auditRoute({
    action: 'CMS_CONTENT_VERSION_RESTORED',
    entity: 'CmsContent',
    entityIdFrom: 'params.contentId',
    metadataFrom: ['params.version'],
  }),
  cmsValidation.restoreVersion,
  handleValidationErrors,
  cmsController.restoreVersion
);

// Navigation menus

router.get(
  '/menus',
  authenticateToken,
  requireRole(...adminRoles),
  cmsValidation.listMenus,
  handleValidationErrors,
  cmsController.listMenus
);

router.post(
  '/menus',
  authenticateToken,
  requireRole(...adminRoles),
  auditRoute({
    action: 'CMS_MENU_CREATED',
    entity: 'CmsMenu',
    // ADS-754: controller responds with `{ success, message, menu: { menuId, ... } }`
    entityIdFrom: ctx => {
      const r = ctx.response as { menu?: { menuId?: string } } | undefined;
      return r?.menu?.menuId;
    },
    metadataFrom: ['body.name', 'body.location'],
  }),
  cmsValidation.createMenu,
  handleValidationErrors,
  cmsController.createMenu
);

router.get(
  '/menus/:menuId',
  authenticateToken,
  requireRole(...adminRoles),
  cmsValidation.getMenu,
  handleValidationErrors,
  cmsController.getMenu
);

router.put(
  '/menus/:menuId',
  authenticateToken,
  requireRole(...adminRoles),
  auditRoute({
    action: 'CMS_MENU_UPDATED',
    entity: 'CmsMenu',
    entityIdFrom: 'params.menuId',
  }),
  cmsValidation.updateMenu,
  handleValidationErrors,
  cmsController.updateMenu
);

router.delete(
  '/menus/:menuId',
  authenticateToken,
  requireRole(...adminRoles),
  auditRoute({
    action: 'CMS_MENU_DELETED',
    entity: 'CmsMenu',
    entityIdFrom: 'params.menuId',
  }),
  cmsValidation.deleteMenu,
  handleValidationErrors,
  cmsController.deleteMenu
);

export default router;
