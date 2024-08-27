import { Router } from 'express'
import { getAllConversationsController } from '../controllers/conversationController'
import { authenticateJWT } from '../middleware/authMiddleware'
import { checkUserRole } from '../middleware/roleCheckMiddleware'

const router = Router()

router.get(
  '/',
  authenticateJWT,
  checkUserRole('admin'),
  getAllConversationsController,
)

export default router
