import express from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticateToken, requireRole } from '../middleware/auth';
import { authLimiter, generalLimiter } from '../middleware/rate-limiter';

const router = express.Router();

// Apply authentication to all chat routes
router.use(authenticateToken);

// Chat management routes
router.post('/', authLimiter, ChatController.createChat);

router.get('/', generalLimiter, ChatController.getChats);

router.get('/search', generalLimiter, ChatController.searchConversations);

router.get('/:chatId', generalLimiter, ChatController.getChatById);

router.patch('/:chatId', authLimiter, ChatController.updateChat);

router.delete('/:chatId', authLimiter, ChatController.deleteChat);

// Message routes
router.post('/:chatId/messages', authLimiter, ChatController.sendMessage);

router.get('/:chatId/messages', generalLimiter, ChatController.getMessages);

router.patch('/:chatId/read', generalLimiter, ChatController.markAsRead);

router.get('/:chatId/unread-count', generalLimiter, ChatController.getUnreadCount);

// Participant management routes
router.post('/:chatId/participants', authLimiter, ChatController.addParticipant);

router.delete('/:chatId/participants/:userId', authLimiter, ChatController.removeParticipant);

// Message reaction routes
router.post('/messages/:messageId/reactions', generalLimiter, ChatController.addReaction);

router.delete('/messages/:messageId/reactions', generalLimiter, ChatController.removeReaction);

// Analytics routes (rescue organizations only)
router.get(
  '/analytics/overview',
  requireRole(['RESCUE_STAFF', 'RESCUE_ADMIN']),
  generalLimiter,
  ChatController.getChatAnalytics
);

export default router;
