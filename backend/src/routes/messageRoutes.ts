import { Router } from 'express'
import * as messageController from '../controllers/messageController'
import { authenticateJWT } from '../middleware/authMiddleware'
import { checkUserRole } from '../middleware/roleCheckMiddleware'

const router = Router()

router.get(
  '/',
  authenticateJWT,
  checkUserRole('admin'),
  messageController.getAllMessages,
)
router.get('/:id', authenticateJWT, messageController.getMessageById)
router.post('/', authenticateJWT, messageController.createMessage)
router.get(
  '/conversation/:conversationId',
  authenticateJWT,
  messageController.getMessagesByConversationId,
)

export default router
