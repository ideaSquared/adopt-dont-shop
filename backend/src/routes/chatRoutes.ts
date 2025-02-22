import express from 'express'
import * as chatController from '../controllers/chatController'
import * as participantController from '../controllers/chatParticipantController'
import * as messageController from '../controllers/messageController'
import { attachRescueId } from '../middleware/attachRescueId'
import { authRoleOwnershipMiddleware } from '../middleware/authRoleOwnershipMiddleware'
import { apiRateLimiter, chatRateLimiter } from '../middleware/rateLimiter'
import { validateChatAccess } from '../middleware/validateChatAccess'
import { upload } from '../services/fileUploadService'

const router = express.Router()

// Apply authentication middleware to all chat routes
router.use(authRoleOwnershipMiddleware())

// Apply general rate limiting to all chat routes
router.use(apiRateLimiter)

// Admin routes
router.get('/admin/conversations', chatController.getAllConversationsAdmin)

// Rescue dashboard routes
router.get(
  '/rescue/conversations',
  attachRescueId,
  chatController.getChatsByRescueId,
)

// Protected chat routes (require chat access validation)
router.get('/:chat_id', validateChatAccess, chatController.getChatById)
router.put('/:chat_id', validateChatAccess, chatController.updateChat)
router.delete('/:chat_id', validateChatAccess, chatController.deleteChat)

// Message routes (nested under chats)
router.get(
  '/:chat_id/messages',
  validateChatAccess,
  messageController.getAllMessages,
)
router.post(
  '/:chat_id/messages',
  validateChatAccess,
  chatRateLimiter,
  upload.array('attachments', 5),
  messageController.createMessage,
)
router.put(
  '/:chat_id/messages/:message_id',
  validateChatAccess,
  upload.array('attachments', 5),
  messageController.updateMessage,
)
router.delete(
  '/:chat_id/messages/:message_id',
  validateChatAccess,
  messageController.deleteMessage,
)

// Search within a specific chat
router.get(
  '/:chat_id/messages/search',
  validateChatAccess,
  messageController.searchMessages,
)

// Participant management routes
router.get(
  '/:chat_id/participants',
  validateChatAccess,
  participantController.getAllParticipants,
)
router.post(
  '/:chat_id/participants',
  validateChatAccess,
  participantController.createParticipant,
)
router.delete(
  '/:chat_id/participants/:participant_id',
  validateChatAccess,
  participantController.deleteParticipant,
)

export default router
