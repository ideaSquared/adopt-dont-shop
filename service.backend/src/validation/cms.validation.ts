import { body, param, query } from 'express-validator';

const contentIdParam = param('contentId').notEmpty().withMessage('contentId is required');
const menuIdParam = param('menuId').notEmpty().withMessage('menuId is required');

const contentTypeValues = ['page', 'blog_post', 'help_article'];
const contentStatusValues = ['draft', 'published', 'archived', 'scheduled'];
const menuLocationValues = ['header', 'footer', 'sidebar'];

export const cmsValidation = {
  listContent: [
    query('contentType')
      .optional()
      .isIn(contentTypeValues)
      .withMessage('Invalid content type'),
    query('status')
      .optional()
      .isIn(contentStatusValues)
      .withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be between 1 and 100'),
  ],

  getContent: [contentIdParam],

  getContentBySlug: [
    param('slug')
      .notEmpty()
      .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .withMessage('Invalid slug format'),
  ],

  createContent: [
    body('title').notEmpty().isLength({ max: 500 }).withMessage('title is required (max 500 chars)'),
    body('slug')
      .optional()
      .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .withMessage('slug must be lowercase alphanumeric with hyphens'),
    body('contentType')
      .notEmpty()
      .isIn(contentTypeValues)
      .withMessage('contentType must be one of: ' + contentTypeValues.join(', ')),
    body('content').notEmpty().withMessage('content is required'),
    body('excerpt').optional().isString(),
    body('metaTitle').optional().isLength({ max: 500 }),
    body('metaDescription').optional().isString(),
    body('metaKeywords').optional().isArray(),
    body('metaKeywords.*').optional().isString(),
    body('featuredImageUrl').optional().isURL(),
    body('scheduledPublishAt').optional().isISO8601(),
    body('scheduledUnpublishAt').optional().isISO8601(),
  ],

  updateContent: [
    contentIdParam,
    body('title').optional().isLength({ min: 1, max: 500 }),
    body('content').optional().isString(),
    body('excerpt').optional().isString(),
    body('metaTitle').optional().isLength({ max: 500 }),
    body('metaDescription').optional().isString(),
    body('metaKeywords').optional().isArray(),
    body('metaKeywords.*').optional().isString(),
    body('featuredImageUrl').optional().isURL(),
    body('scheduledPublishAt').optional().isISO8601(),
    body('scheduledUnpublishAt').optional().isISO8601(),
    body('changeNote').optional().isString(),
  ],

  publishContent: [contentIdParam],
  unpublishContent: [contentIdParam],
  archiveContent: [contentIdParam],
  deleteContent: [contentIdParam],

  getVersionHistory: [contentIdParam],

  restoreVersion: [
    contentIdParam,
    param('version').isInt({ min: 1 }).withMessage('version must be a positive integer'),
  ],

  generateSlug: [
    query('title').notEmpty().withMessage('title query parameter is required'),
  ],

  listMenus: [],
  getMenu: [menuIdParam],

  createMenu: [
    body('name').notEmpty().isLength({ max: 255 }).withMessage('name is required (max 255 chars)'),
    body('location')
      .notEmpty()
      .isIn(menuLocationValues)
      .withMessage('location must be one of: ' + menuLocationValues.join(', ')),
    body('items').optional().isArray(),
    body('isActive').optional().isBoolean(),
  ],

  updateMenu: [
    menuIdParam,
    body('name').optional().isLength({ min: 1, max: 255 }),
    body('location').optional().isIn(menuLocationValues),
    body('items').optional().isArray(),
    body('isActive').optional().isBoolean(),
  ],

  deleteMenu: [menuIdParam],
};
