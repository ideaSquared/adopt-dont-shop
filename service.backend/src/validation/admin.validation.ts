import { body, param, query } from 'express-validator';

const USER_ACTIONS = ['suspend', 'unsuspend', 'ban', 'warn', 'restrict', 'activate', 'deactivate'];
const EXPORT_TYPES = ['users', 'pets', 'applications', 'rescues', 'reports', 'audit-logs'];

export const adminValidation = {
  searchUsers: [
    query('page')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Page must be an integer between 1 and 1000')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be an integer between 1 and 100')
      .toInt(),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Search query must be 1-200 characters'),
    query('status')
      .optional()
      .isIn(['active', 'inactive', 'suspended', 'banned'])
      .withMessage('Status must be one of: active, inactive, suspended, banned'),
    query('role')
      .optional()
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Role must be a string of 1-50 characters'),
  ],

  getUserDetails: [
    param('userId')
      .isUUID()
      .withMessage('User ID must be a valid UUID'),
  ],

  performUserAction: [
    param('userId')
      .isUUID()
      .withMessage('User ID must be a valid UUID'),
    body('action')
      .isIn(USER_ACTIONS)
      .withMessage(`Action must be one of: ${USER_ACTIONS.join(', ')}`),
    body('reason')
      .optional()
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Reason must be 1-2000 characters'),
    body('duration')
      .optional()
      .isInt({ min: 1, max: 8760 })
      .withMessage('Duration must be between 1 and 8760 hours'),
  ],

  updateUserProfile: [
    param('userId')
      .isUUID()
      .withMessage('User ID must be a valid UUID'),
  ],

  moderateRescue: [
    param('rescueId')
      .isUUID()
      .withMessage('Rescue ID must be a valid UUID'),
    body('action')
      .optional()
      .isIn(['approve', 'reject', 'suspend', 'unsuspend', 'warn'])
      .withMessage('Action must be one of: approve, reject, suspend, unsuspend, warn'),
    body('reason')
      .optional()
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Reason must be 1-2000 characters'),
  ],

  getAuditLogs: [
    query('page')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Page must be an integer between 1 and 1000')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be an integer between 1 and 100')
      .toInt(),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('userId')
      .optional()
      .isUUID()
      .withMessage('User ID must be a valid UUID'),
    query('action')
      .optional()
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Action filter must be 1-100 characters'),
  ],

  exportData: [
    param('type')
      .isIn(EXPORT_TYPES)
      .withMessage(`Export type must be one of: ${EXPORT_TYPES.join(', ')}`),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('format')
      .optional()
      .isIn(['csv', 'json'])
      .withMessage('Format must be one of: csv, json'),
  ],

  getRescues: [
    query('page')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Page must be an integer between 1 and 1000')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be an integer between 1 and 100')
      .toInt(),
    query('status')
      .optional()
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Status must be 1-50 characters'),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Search query must be 1-200 characters'),
  ],
};
