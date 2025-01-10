import express from 'express'
import { getAllConversationsController } from '../controllers/conversationController'
import { authRoleOwnershipMiddleware } from '../middleware/authRoleOwnershipMiddleware'

const router = express.Router()

// Get all conversations (admin only)
router.get(
  '/',
  authRoleOwnershipMiddleware({ requiredRole: 'admin' }),
  getAllConversationsController,
)

export default router
