import { body, param, query } from 'express-validator';
import { ReportCategory, ReportSeverity, ReportStatus } from '../models/Report';
import { ActionType, ActionSeverity } from '../models/ModeratorAction';

const ENTITY_TYPES = ['user', 'rescue', 'pet', 'application', 'message', 'conversation'];
const RESOLUTION_TYPES = [
  'no_action',
  'warning_issued',
  'content_removed',
  'user_suspended',
  'user_banned',
  'escalated',
];

export const moderationValidation = {
  getReports: [
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
      .isIn(Object.values(ReportStatus))
      .withMessage(`Status must be one of: ${Object.values(ReportStatus).join(', ')}`),
    query('category')
      .optional()
      .isIn(Object.values(ReportCategory))
      .withMessage(`Category must be one of: ${Object.values(ReportCategory).join(', ')}`),
    query('severity')
      .optional()
      .isIn(Object.values(ReportSeverity))
      .withMessage(`Severity must be one of: ${Object.values(ReportSeverity).join(', ')}`),
    query('assignedModerator')
      .optional()
      .isUUID()
      .withMessage('Assigned moderator must be a valid UUID'),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Search query must be 1-200 characters'),
    query('dateFrom').optional().isISO8601().withMessage('dateFrom must be a valid ISO 8601 date'),
    query('dateTo').optional().isISO8601().withMessage('dateTo must be a valid ISO 8601 date'),
  ],

  getReportById: [param('reportId').isUUID().withMessage('Report ID must be a valid UUID')],

  submitReport: [
    body('reportedEntityType')
      .isIn(ENTITY_TYPES)
      .withMessage(`Entity type must be one of: ${ENTITY_TYPES.join(', ')}`),
    body('reportedEntityId').isUUID().withMessage('Reported entity ID must be a valid UUID'),
    body('reportedUserId').optional().isUUID().withMessage('Reported user ID must be a valid UUID'),
    body('category')
      .isIn(Object.values(ReportCategory))
      .withMessage(`Category must be one of: ${Object.values(ReportCategory).join(', ')}`),
    body('severity')
      .optional()
      .isIn(Object.values(ReportSeverity))
      .withMessage(`Severity must be one of: ${Object.values(ReportSeverity).join(', ')}`),
    body('title')
      .trim()
      .isLength({ min: 3, max: 255 })
      .withMessage('Title must be 3-255 characters'),
    body('description')
      .trim()
      .isLength({ min: 10, max: 5000 })
      .withMessage('Description must be 10-5000 characters'),
    body('evidence')
      .optional()
      .isArray({ max: 20 })
      .withMessage('Evidence must be an array with at most 20 items'),
    body('evidence.*.type')
      .if(body('evidence').exists())
      .isIn(['screenshot', 'url', 'text', 'file'])
      .withMessage('Evidence type must be one of: screenshot, url, text, file'),
  ],

  updateReportStatus: [
    param('reportId').isUUID().withMessage('Report ID must be a valid UUID'),
    body('status')
      .isIn(Object.values(ReportStatus))
      .withMessage(`Status must be one of: ${Object.values(ReportStatus).join(', ')}`),
    body('resolution')
      .optional()
      .isIn(RESOLUTION_TYPES)
      .withMessage(`Resolution must be one of: ${RESOLUTION_TYPES.join(', ')}`),
    body('resolutionNotes')
      .optional()
      .trim()
      .isLength({ min: 1, max: 5000 })
      .withMessage('Resolution notes must be 1-5000 characters'),
  ],

  assignReport: [
    param('reportId').isUUID().withMessage('Report ID must be a valid UUID'),
    body('moderatorId').isUUID().withMessage('Moderator ID must be a valid UUID'),
  ],

  escalateReport: [
    param('reportId').isUUID().withMessage('Report ID must be a valid UUID'),
    body('escalatedTo').isUUID().withMessage('Escalated to must be a valid UUID'),
    body('reason')
      .trim()
      .isLength({ min: 3, max: 2000 })
      .withMessage('Escalation reason must be 3-2000 characters'),
  ],

  bulkUpdateReports: [
    body('reportIds')
      .isArray({ min: 1, max: 50 })
      .withMessage('Report IDs must be an array with 1-50 items'),
    body('reportIds.*').isUUID().withMessage('Each report ID must be a valid UUID'),
    body('updates').isObject().withMessage('Updates must be an object'),
    body('updates.status')
      .optional()
      .isIn(Object.values(ReportStatus))
      .withMessage(`Status must be one of: ${Object.values(ReportStatus).join(', ')}`),
    body('updates.resolution')
      .optional()
      .isIn(RESOLUTION_TYPES)
      .withMessage(`Resolution must be one of: ${RESOLUTION_TYPES.join(', ')}`),
  ],

  takeModerationAction: [
    body('reportId').optional().isUUID().withMessage('Report ID must be a valid UUID'),
    body('targetEntityType')
      .isIn(ENTITY_TYPES)
      .withMessage(`Target entity type must be one of: ${ENTITY_TYPES.join(', ')}`),
    body('targetEntityId').isUUID().withMessage('Target entity ID must be a valid UUID'),
    body('targetUserId').optional().isUUID().withMessage('Target user ID must be a valid UUID'),
    body('actionType')
      .isIn(Object.values(ActionType))
      .withMessage(`Action type must be one of: ${Object.values(ActionType).join(', ')}`),
    body('severity')
      .isIn(Object.values(ActionSeverity))
      .withMessage(`Severity must be one of: ${Object.values(ActionSeverity).join(', ')}`),
    body('reason')
      .trim()
      .isLength({ min: 3, max: 500 })
      .withMessage('Reason must be 3-500 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 1, max: 5000 })
      .withMessage('Description must be 1-5000 characters'),
    body('duration')
      .optional()
      .isInt({ min: 1, max: 8760 })
      .withMessage('Duration must be between 1 and 8760 hours'),
  ],

  getActiveActions: [
    query('userId').optional().isUUID().withMessage('User ID must be a valid UUID'),
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
  ],

  getModerationMetrics: [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
    query('period')
      .optional()
      .isIn(['day', 'week', 'month', 'quarter', 'year'])
      .withMessage('Period must be one of: day, week, month, quarter, year'),
  ],
};
