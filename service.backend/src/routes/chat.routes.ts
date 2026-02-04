import express from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { authLimiter, generalLimiter, uploadLimiter } from '../middleware/rate-limiter';
import { handleValidationErrors } from '../middleware/validation';
import { chatAttachmentUpload } from '../services/file-upload.service';
import { chatValidation } from '../validation/chat.validation';
import { PERMISSIONS } from '../types/rbac';

const router = express.Router();

// Apply authentication to all chat routes
router.use(authenticateToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     Chat:
 *       type: object
 *       properties:
 *         chat_id:
 *           type: string
 *           example: "chat_abc123def456"
 *         rescue_id:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440001"
 *         pet_id:
 *           type: string
 *           example: "pet_abc123"
 *         application_id:
 *           type: string
 *           example: "app_xyz789"
 *         status:
 *           type: string
 *           enum: [active, locked, archived]
 *           example: "active"
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     Message:
 *       type: object
 *       properties:
 *         message_id:
 *           type: string
 *           example: "msg_abc123def456"
 *         chat_id:
 *           type: string
 *           example: "chat_abc123def456"
 *         sender_id:
 *           type: string
 *           format: uuid
 *         content:
 *           type: string
 *           example: "Hello, I'm interested in adopting this pet."
 *         content_format:
 *           type: string
 *           enum: [plain, markdown, html]
 *           default: plain
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               filename:
 *                 type: string
 *               url:
 *                 type: string
 *               mimeType:
 *                 type: string
 *               size:
 *                 type: number
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/chats:
 *   post:
 *     tags: [Messaging]
 *     summary: Create a new chat conversation
 *     description: Create a new chat conversation between users and rescue organizations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participantIds
 *             properties:
 *               participantIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 10
 *                 example: ["550e8400-e29b-41d4-a716-446655440001"]
 *               rescueId:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440001"
 *               petId:
 *                 type: string
 *                 example: "pet_abc123"
 *               applicationId:
 *                 type: string
 *                 example: "app_xyz789"
 *               type:
 *                 type: string
 *                 enum: [direct, group, application, general, support]
 *                 default: application
 *               title:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               initialMessage:
 *                 type: string
 *                 maxLength: 10000
 *     responses:
 *       201:
 *         description: Chat created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Chat'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post(
  '/',
  authLimiter,
  chatValidation.createChat,
  handleValidationErrors,
  ChatController.createChat
);

/**
 * @swagger
 * /api/v1/chats:
 *   get:
 *     tags: [Messaging]
 *     summary: Get user's chat conversations
 *     description: Retrieve a list of chat conversations for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Search term for conversations
 *       - in: query
 *         name: petId
 *         schema:
 *           type: string
 *         description: Filter by pet ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [direct, group, application, general, support]
 *         description: Filter by conversation type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, locked, archived]
 *         description: Filter by conversation status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of conversations per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [created_at, updated_at, last_message]
 *           default: updated_at
 *         description: Sort conversations by field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     chats:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Chat'
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  '/',
  generalLimiter,
  chatValidation.searchChats,
  handleValidationErrors,
  ChatController.getChats
);

/**
 * @swagger
 * /api/v1/chats/search:
 *   get:
 *     tags: [Messaging]
 *     summary: Search conversations with text search
 *     description: Search conversations using full-text search capabilities
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description: Search query text
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/search', generalLimiter, ChatController.searchConversations);

/**
 * @swagger
 * /api/v1/chats/{chatId}:
 *   get:
 *     tags: [Messaging]
 *     summary: Get chat conversation by ID
 *     description: Retrieve a specific chat conversation with its details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat conversation ID
 *     responses:
 *       200:
 *         description: Chat retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Chat'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get(
  '/:chatId',
  generalLimiter,
  chatValidation.getChatById,
  handleValidationErrors,
  ChatController.getChatById
);

/**
 * @swagger
 * /api/v1/chats/{chatId}:
 *   put:
 *     tags: [Messaging]
 *     summary: Update chat conversation
 *     description: Update chat conversation details (title, description, status)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               status:
 *                 type: string
 *                 enum: [active, locked, archived]
 *     responses:
 *       200:
 *         description: Chat updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put(
  '/:chatId',
  authLimiter,
  chatValidation.updateChat,
  handleValidationErrors,
  ChatController.updateChat
);
/**
 * @swagger
 * /api/v1/chats/{chatId}:
 *   patch:
 *     tags: [Messaging]
 *     summary: Update chat conversation (partial)
 *     description: Partially update chat conversation details (title, description, status)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               status:
 *                 type: string
 *                 enum: [active, locked, archived]
 *     responses:
 *       200:
 *         description: Chat updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.patch(
  '/:chatId',
  authLimiter,
  chatValidation.updateChat,
  handleValidationErrors,
  ChatController.updateChat
);

/**
 * @swagger
 * /api/v1/chats/{chatId}:
 *   delete:
 *     tags: [Messaging]
 *     summary: Delete/archive chat conversation
 *     description: Delete or archive a chat conversation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat conversation ID
 *     responses:
 *       200:
 *         description: Chat deleted successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete(
  '/:chatId',
  authLimiter,
  chatValidation.getChatById,
  handleValidationErrors,
  ChatController.deleteChat
);

/**
 * @swagger
 * /api/v1/chats/{chatId}/messages:
 *   post:
 *     tags: [Messaging]
 *     summary: Send a message in a chat
 *     description: Send a new message in a chat conversation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 10000
 *                 example: "Thank you for your interest in our rescue!"
 *               type:
 *                 type: string
 *                 enum: [text, image, file]
 *                 default: text
 *               attachments:
 *                 type: array
 *                 maxItems: 10
 *                 items:
 *                   type: object
 *                   properties:
 *                     filename:
 *                       type: string
 *                       maxLength: 255
 *                     mimeType:
 *                       type: string
 *                       enum: [image/jpeg, image/png, image/gif, image/webp, application/pdf, text/plain, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document]
 *                     size:
 *                       type: integer
 *                       minimum: 1
 *                       maximum: 52428800
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post(
  '/:chatId/messages',
  authLimiter,
  chatValidation.sendMessage,
  handleValidationErrors,
  ChatController.sendMessage
);

/**
 * @swagger
 * /api/v1/chats/{chatId}/messages:
 *   get:
 *     tags: [Messaging]
 *     summary: Get messages in a chat
 *     description: Retrieve messages from a chat conversation with pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat conversation ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages before this timestamp
 *       - in: query
 *         name: after
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages after this timestamp
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     messages:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Message'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get(
  '/:chatId/messages',
  generalLimiter,
  chatValidation.getMessages,
  handleValidationErrors,
  ChatController.getMessages
);

/**
 * @swagger
 * /api/v1/chats/{chatId}/messages/{messageId}:
 *   delete:
 *     tags: [Messaging]
 *     summary: Delete a message
 *     description: Delete a specific message from a chat conversation (admin/moderator only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat conversation ID
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID to delete
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for deletion (optional)
 *                 example: "Inappropriate content"
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Message deleted successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete(
  '/:chatId/messages/:messageId',
  requirePermission(PERMISSIONS.MESSAGE_DELETE),
  authLimiter,
  ChatController.deleteMessage
);

/**
 * @swagger
 * /api/v1/chats/{chatId}/read:
 *   post:
 *     tags: [Messaging]
 *     summary: Mark messages as read
 *     description: Mark messages in a chat as read by the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat conversation ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messageId:
 *                 type: string
 *                 description: Specific message ID to mark as read (optional)
 *     responses:
 *       200:
 *         description: Messages marked as read successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post(
  '/:chatId/read',
  generalLimiter,
  chatValidation.markAsRead,
  handleValidationErrors,
  ChatController.markAsRead
);

/**
 * @swagger
 * /api/v1/chats/{chatId}/unread-count:
 *   get:
 *     tags: [Messaging]
 *     summary: Get unread message count
 *     description: Get the number of unread messages in a chat for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat conversation ID
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       example: 5
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get(
  '/:chatId/unread-count',
  generalLimiter,
  chatValidation.getChatById,
  handleValidationErrors,
  ChatController.getUnreadCount
);

/**
 * @swagger
 * /api/v1/chats/{chatId}/participants:
 *   post:
 *     tags: [Messaging]
 *     summary: Add participant to chat
 *     description: Add a new participant to a chat conversation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440002"
 *               role:
 *                 type: string
 *                 enum: [member, admin]
 *                 default: member
 *     responses:
 *       200:
 *         description: Participant added successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post(
  '/:chatId/participants',
  authLimiter,
  chatValidation.addParticipant,
  handleValidationErrors,
  ChatController.addParticipant
);

/**
 * @swagger
 * /api/v1/chats/{chatId}/participants/{userId}:
 *   delete:
 *     tags: [Messaging]
 *     summary: Remove participant from chat
 *     description: Remove a participant from a chat conversation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat conversation ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID to remove
 *     responses:
 *       200:
 *         description: Participant removed successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete(
  '/:chatId/participants/:userId',
  authLimiter,
  chatValidation.removeParticipant,
  handleValidationErrors,
  ChatController.removeParticipant
);

/**
 * @swagger
 * /api/v1/chats/messages/{messageId}/reactions:
 *   post:
 *     tags: [Messaging]
 *     summary: Add reaction to message
 *     description: Add an emoji reaction to a message
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emoji
 *             properties:
 *               emoji:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 10
 *                 example: "👍"
 *     responses:
 *       200:
 *         description: Reaction added successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post(
  '/messages/:messageId/reactions',
  generalLimiter,
  chatValidation.addReaction,
  handleValidationErrors,
  ChatController.addReaction
);

/**
 * @swagger
 * /api/v1/chats/messages/{messageId}/reactions:
 *   delete:
 *     tags: [Messaging]
 *     summary: Remove reaction from message
 *     description: Remove an emoji reaction from a message
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emoji
 *             properties:
 *               emoji:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 10
 *                 example: "👍"
 *     responses:
 *       200:
 *         description: Reaction removed successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete(
  '/messages/:messageId/reactions',
  generalLimiter,
  chatValidation.removeReaction,
  handleValidationErrors,
  ChatController.removeReaction
);

/**
 * @swagger
 * /api/v1/chats/analytics:
 *   get:
 *     tags: [Messaging]
 *     summary: Get chat analytics
 *     description: Get analytics and statistics for chat usage (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalChats:
 *                       type: integer
 *                       example: 1250
 *                     totalMessages:
 *                       type: integer
 *                       example: 15680
 *                     activeChats:
 *                       type: integer
 *                       example: 342
 *                     averageMessagesPerChat:
 *                       type: number
 *                       example: 12.5
 *                     messageGrowthRate:
 *                       type: number
 *                       example: 0.15
 *                     userEngagement:
 *                       type: number
 *                       example: 0.78
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get(
  '/analytics',
  requirePermission(PERMISSIONS.CHAT_ANALYTICS_READ),
  generalLimiter,
  ChatController.getChatAnalytics
);

/**
 * @swagger
 * /api/chats/{conversationId}/attachments/upload:
 *   post:
 *     summary: Upload attachment for chat conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The chat conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file to upload
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "550e8400-e29b-41d4-a716-446655440001"
 *                     filename:
 *                       type: string
 *                       example: "document.pdf"
 *                     url:
 *                       type: string
 *                       example: "/uploads/chat/document.pdf"
 *                     mimeType:
 *                       type: string
 *                       example: "application/pdf"
 *                     size:
 *                       type: number
 *                       example: 1048576
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post(
  '/:conversationId/attachments/upload',
  uploadLimiter,
  authenticateToken,
  chatAttachmentUpload.single('file'),
  ChatController.uploadAttachment
);

export default router;
