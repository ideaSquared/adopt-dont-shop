import { Router } from 'express';
import chatController from '../controllers/chat.controller';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { UserType } from '../models/User';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all chats for the authenticated user
router.get('/', chatController.getUserChats);

// Create a new chat
router.post('/', chatController.createChat);

// Get specific chat details
router.get('/:chatId', chatController.getChatById);

// Update chat settings
router.put('/:chatId', chatController.updateChat);

// Archive/delete chat
router.delete('/:chatId', chatController.archiveChat);

// Get messages for a specific chat
router.get('/:chatId/messages', chatController.getMessages);

// Send a message in a chat
router.post('/:chatId/messages', chatController.sendMessage);

// Edit a message
router.put('/:chatId/messages/:messageId', chatController.editMessage);

// Delete a message
router.delete('/:chatId/messages/:messageId', chatController.deleteMessage);

// Mark messages as read
router.post('/:chatId/read', chatController.markAsRead);

// Add participant to chat (rescue staff/admin only)
router.post(
  '/:chatId/participants',
  requireRole([UserType.RESCUE_STAFF, UserType.ADMIN]),
  chatController.addParticipant
);

// Remove participant from chat (rescue staff/admin only)
router.delete(
  '/:chatId/participants/:userId',
  requireRole([UserType.RESCUE_STAFF, UserType.ADMIN]),
  chatController.removeParticipant
);

// Get chat participants
router.get('/:chatId/participants', chatController.getParticipants);

// Search messages in a chat
router.get('/:chatId/search', chatController.searchMessages);

// Upload file attachments
router.post('/:chatId/attachments', chatController.uploadAttachment);

export default router;
