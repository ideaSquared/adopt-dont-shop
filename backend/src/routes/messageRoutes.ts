import { Router } from 'express'
import {
  createMessageController,
  getAllMessagesController,
  getMessageByIdController,
  getMessagesByConversationIdController,
} from '../controllers/messageController'
import { authenticateJWT } from '../middleware/authMiddleware'
import { checkUserRole } from '../middleware/roleCheckMiddleware'

const router = Router()

router.get(
  '/',
  authenticateJWT,
  checkUserRole('admin'),
  getAllMessagesController,
)
router.get('/:id', authenticateJWT, getMessageByIdController)
router.post('/', authenticateJWT, createMessageController)
router.get(
  '/conversation/:conversationId',
  authenticateJWT,
  getMessagesByConversationIdController,
)

export default router
