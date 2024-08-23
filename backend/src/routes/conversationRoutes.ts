import { Router } from 'express'
import * as conversationController from '../controllers/conversationController'
import { authenticateJWT } from '../middleware/authMiddleware'
import { checkUserRole } from '../middleware/roleCheckMiddleware'

const router = Router()

router.get(
  '/',
  authenticateJWT,
  checkUserRole('admin'),
  conversationController.getAllConversations,
)

export default router
