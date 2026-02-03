import { body, param, query } from 'express-validator';

const TEMPLATE_TYPES = [
  'WELCOME',
  'APPLICATION_RECEIVED',
  'APPLICATION_APPROVED',
  'APPLICATION_REJECTED',
  'REMINDER',
  'NEWSLETTER',
];

const QUEUE_STATUSES = ['PENDING', 'PROCESSING', 'SENT', 'FAILED', 'RETRY'];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH'];
const FREQUENCY_OPTIONS = ['IMMEDIATE', 'DAILY', 'WEEKLY'];

export const emailValidation = {
  getTemplates: [
    query('type')
      .optional()
      .isIn(TEMPLATE_TYPES)
      .withMessage(`Template type must be one of: ${TEMPLATE_TYPES.join(', ')}`),
    query('active').optional().isBoolean().withMessage('Active must be a boolean value'),
  ],

  getTemplateById: [param('templateId').isUUID().withMessage('Template ID must be a valid UUID')],

  createTemplate: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Template name must be 1-100 characters'),
    body('type')
      .isIn(TEMPLATE_TYPES)
      .withMessage(`Template type must be one of: ${TEMPLATE_TYPES.join(', ')}`),
    body('subject')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Subject must be 1-255 characters'),
    body('htmlContent')
      .isString()
      .isLength({ min: 1, max: 100000 })
      .withMessage('HTML content is required and must be under 100000 characters'),
    body('textContent')
      .optional()
      .isString()
      .isLength({ max: 50000 })
      .withMessage('Text content must be under 50000 characters'),
    body('variables')
      .optional()
      .isArray({ max: 50 })
      .withMessage('Variables must be an array with at most 50 items'),
    body('variables.*')
      .if(body('variables').exists())
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Each variable must be a string of 1-100 characters'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  ],

  updateTemplate: [
    param('templateId').isUUID().withMessage('Template ID must be a valid UUID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Template name must be 1-100 characters'),
    body('subject')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Subject must be 1-255 characters'),
    body('htmlContent')
      .optional()
      .isString()
      .isLength({ min: 1, max: 100000 })
      .withMessage('HTML content must be under 100000 characters'),
    body('textContent')
      .optional()
      .isString()
      .isLength({ max: 50000 })
      .withMessage('Text content must be under 50000 characters'),
    body('variables')
      .optional()
      .isArray({ max: 50 })
      .withMessage('Variables must be an array with at most 50 items'),
    body('variables.*')
      .if(body('variables').exists())
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Each variable must be a string of 1-100 characters'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  ],

  deleteTemplate: [param('templateId').isUUID().withMessage('Template ID must be a valid UUID')],

  previewTemplate: [
    param('templateId').isUUID().withMessage('Template ID must be a valid UUID'),
    body('variables').optional().isObject().withMessage('Variables must be an object'),
  ],

  sendTestEmail: [
    param('templateId').isUUID().withMessage('Template ID must be a valid UUID'),
    body('testEmail')
      .isEmail()
      .normalizeEmail()
      .withMessage('Test email must be a valid email address'),
    body('variables').optional().isObject().withMessage('Variables must be an object'),
  ],

  sendEmail: [
    body('to').isEmail().normalizeEmail().withMessage('Recipient must be a valid email address'),
    body('templateId').optional().isUUID().withMessage('Template ID must be a valid UUID'),
    body('subject')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Subject must be 1-255 characters'),
    body('htmlContent')
      .optional()
      .isString()
      .isLength({ min: 1, max: 100000 })
      .withMessage('HTML content must be under 100000 characters'),
    body('textContent')
      .optional()
      .isString()
      .isLength({ max: 50000 })
      .withMessage('Text content must be under 50000 characters'),
    body('variables').optional().isObject().withMessage('Variables must be an object'),
    body('priority')
      .optional()
      .isIn(PRIORITIES)
      .withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}`),
  ],

  sendBulkEmail: [
    body('templateId').isUUID().withMessage('Template ID must be a valid UUID'),
    body('recipients')
      .isArray({ min: 1, max: 1000 })
      .withMessage('Recipients must be an array with 1-1000 items'),
    body('recipients.*.email')
      .isEmail()
      .withMessage('Each recipient email must be a valid email address'),
    body('recipients.*.variables')
      .optional()
      .isObject()
      .withMessage('Recipient variables must be an object'),
    body('scheduleFor')
      .optional()
      .isISO8601()
      .withMessage('Schedule time must be a valid ISO 8601 date'),
    body('priority')
      .optional()
      .isIn(PRIORITIES)
      .withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}`),
  ],

  getQueueStatus: [
    query('status')
      .optional()
      .isIn(QUEUE_STATUSES)
      .withMessage(`Queue status must be one of: ${QUEUE_STATUSES.join(', ')}`),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be an integer between 1 and 100')
      .toInt(),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer')
      .toInt(),
  ],

  processQueue: [
    body('priority')
      .optional()
      .isIn(PRIORITIES)
      .withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}`),
    body('maxItems')
      .optional()
      .isInt({ min: 1, max: 500 })
      .withMessage('Max items must be between 1 and 500'),
  ],

  retryFailedEmails: [
    body('queueIds')
      .optional()
      .isArray({ max: 100 })
      .withMessage('Queue IDs must be an array with at most 100 items'),
    body('queueIds.*')
      .if(body('queueIds').exists())
      .isUUID()
      .withMessage('Each queue ID must be a valid UUID'),
    body('maxRetries')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Max retries must be between 1 and 5'),
  ],

  getEmailAnalytics: [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
    query('templateId').optional().isUUID().withMessage('Template ID must be a valid UUID'),
    query('groupBy')
      .optional()
      .isIn(['day', 'week', 'month', 'template', 'recipient_domain'])
      .withMessage('Group by must be one of: day, week, month, template, recipient_domain'),
  ],

  getTemplateAnalytics: [
    param('templateId').isUUID().withMessage('Template ID must be a valid UUID'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
    query('includeRecipients')
      .optional()
      .isBoolean()
      .withMessage('Include recipients must be a boolean'),
  ],

  getUserPreferences: [param('userId').isUUID().withMessage('User ID must be a valid UUID')],

  updateUserPreferences: [
    param('userId').isUUID().withMessage('User ID must be a valid UUID'),
    body('emailNotifications')
      .optional()
      .isBoolean()
      .withMessage('Email notifications must be a boolean'),
    body('applicationUpdates')
      .optional()
      .isBoolean()
      .withMessage('Application updates must be a boolean'),
    body('rescueUpdates').optional().isBoolean().withMessage('Rescue updates must be a boolean'),
    body('newsletters').optional().isBoolean().withMessage('Newsletters must be a boolean'),
    body('marketingEmails')
      .optional()
      .isBoolean()
      .withMessage('Marketing emails must be a boolean'),
    body('frequency')
      .optional()
      .isIn(FREQUENCY_OPTIONS)
      .withMessage(`Frequency must be one of: ${FREQUENCY_OPTIONS.join(', ')}`),
  ],

  unsubscribe: [
    param('token')
      .isString()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Unsubscribe token is required and must be under 500 characters'),
  ],

  deliveryWebhook: [
    body('eventType')
      .optional()
      .isIn(['delivered', 'bounced', 'complained', 'opened', 'clicked'])
      .withMessage('Event type must be one of: delivered, bounced, complained, opened, clicked'),
    body('messageId')
      .optional()
      .isString()
      .isLength({ min: 1, max: 500 })
      .withMessage('Message ID must be a string under 500 characters'),
    body('email').optional().isEmail().withMessage('Email must be a valid email address'),
    body('timestamp').optional().isISO8601().withMessage('Timestamp must be a valid ISO 8601 date'),
  ],
};
