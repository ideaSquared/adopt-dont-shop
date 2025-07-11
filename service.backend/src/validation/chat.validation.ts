import { body, param, query } from 'express-validator';
import { CHAT_CONSTANTS, ChatStatus, ChatType, MessageType } from '../types/chat';

/**
 * Validation middleware for chat endpoints
 */

export const chatValidation = {
  createChat: [
    body('rescueId').optional().isUUID().withMessage('Rescue ID must be a valid UUID'),
    body('petId')
      .optional()
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('Pet ID must be a valid string'),
    body('applicationId')
      .optional()
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('Application ID must be a valid string'),
    body('type')
      .optional()
      .isIn(Object.values(ChatType))
      .withMessage(`Type must be one of: ${Object.values(ChatType).join(', ')}`),
    body('participantIds')
      .isArray({ min: 1, max: 10 })
      .withMessage('Participant IDs must be an array with 1-10 participants'),
    body('participantIds.*').isUUID().withMessage('Each participant ID must be a valid UUID'),
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Title must be 1-100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be max 500 characters'),
    body('initialMessage')
      .optional()
      .trim()
      .isLength({ min: 1, max: CHAT_CONSTANTS.MAX_MESSAGE_LENGTH })
      .withMessage(`Initial message must be 1-${CHAT_CONSTANTS.MAX_MESSAGE_LENGTH} characters`),
  ],

  updateChat: [
    param('chatId').isString().isLength({ min: 1 }).withMessage('Chat ID is required'),
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Title must be 1-100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be max 500 characters'),
    body('status')
      .optional()
      .isIn(Object.values(ChatStatus))
      .withMessage(`Status must be one of: ${Object.values(ChatStatus).join(', ')}`),
  ],

  sendMessage: [
    param('chatId').isString().isLength({ min: 1 }).withMessage('Chat ID is required'),
    body('content')
      .trim()
      .isLength({ min: 1, max: CHAT_CONSTANTS.MAX_MESSAGE_LENGTH })
      .withMessage(`Message content must be 1-${CHAT_CONSTANTS.MAX_MESSAGE_LENGTH} characters`),
    body('type')
      .optional()
      .isIn(Object.values(MessageType))
      .withMessage(`Message type must be one of: ${Object.values(MessageType).join(', ')}`),
    body('attachments')
      .optional()
      .isArray({ max: CHAT_CONSTANTS.MAX_ATTACHMENTS })
      .withMessage(`Maximum ${CHAT_CONSTANTS.MAX_ATTACHMENTS} attachments allowed`),
    body('attachments.*.filename')
      .if(body('attachments').exists())
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Attachment filename must be 1-255 characters'),
    body('attachments.*.mimeType')
      .if(body('attachments').exists())
      .isIn(CHAT_CONSTANTS.ALLOWED_MIME_TYPES)
      .withMessage('Attachment must be one of allowed file types'),
    body('attachments.*.size')
      .if(body('attachments').exists())
      .isInt({ min: 1, max: CHAT_CONSTANTS.MAX_ATTACHMENT_SIZE })
      .withMessage(`Attachment size must be 1-${CHAT_CONSTANTS.MAX_ATTACHMENT_SIZE} bytes`),
  ],

  getMessages: [
    param('chatId').isString().isLength({ min: 1 }).withMessage('Chat ID is required'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('before').optional().isISO8601().withMessage('Before must be a valid ISO date'),
    query('after').optional().isISO8601().withMessage('After must be a valid ISO date'),
  ],

  getChatById: [param('chatId').isString().isLength({ min: 1 }).withMessage('Chat ID is required')],

  addParticipant: [
    param('chatId').isString().isLength({ min: 1 }).withMessage('Chat ID is required'),
    body('userId').isUUID().withMessage('User ID must be a valid UUID'),
    body('role')
      .optional()
      .isIn(['member', 'admin'])
      .withMessage('Role must be either member or admin'),
  ],

  removeParticipant: [
    param('chatId').isString().isLength({ min: 1 }).withMessage('Chat ID is required'),
    param('userId').isUUID().withMessage('User ID must be a valid UUID'),
  ],

  addReaction: [
    param('messageId').isString().isLength({ min: 1 }).withMessage('Message ID is required'),
    body('emoji').trim().isLength({ min: 1, max: 10 }).withMessage('Emoji must be 1-10 characters'),
  ],

  removeReaction: [
    param('messageId').isString().isLength({ min: 1 }).withMessage('Message ID is required'),
    body('emoji').trim().isLength({ min: 1, max: 10 }).withMessage('Emoji must be 1-10 characters'),
  ],

  markAsRead: [
    param('chatId').isString().isLength({ min: 1 }).withMessage('Chat ID is required'),
    body('messageId')
      .optional()
      .isString()
      .isLength({ min: 1 })
      .withMessage('Message ID must be a valid string'),
  ],

  searchChats: [
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be 1-100 characters'),
    query('petId')
      .optional()
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('Pet ID must be a valid string'),
    query('type')
      .optional()
      .isIn(Object.values(ChatType))
      .withMessage(`Type must be one of: ${Object.values(ChatType).join(', ')}`),
    query('status')
      .optional()
      .isIn(Object.values(ChatStatus))
      .withMessage(`Status must be one of: ${Object.values(ChatStatus).join(', ')}`),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('sortBy')
      .optional()
      .isIn(['created_at', 'updated_at', 'last_message'])
      .withMessage('Sort by must be one of: created_at, updated_at, last_message'),
    query('sortOrder')
      .optional()
      .isIn(['ASC', 'DESC'])
      .withMessage('Sort order must be ASC or DESC'),
  ],
};
