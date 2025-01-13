import express from 'express'
import {
  createMessageController,
  getAllMessagesController,
  getMessageByIdController,
} from '../controllers/messageController'
import { authRoleOwnershipMiddleware } from '../middleware/authRoleOwnershipMiddleware'

const router = express.Router()

// Get all messages (admin only)
router.get(
  '/',
  authRoleOwnershipMiddleware({ requiredRole: 'admin' }),
  getAllMessagesController,
)

// Get message by ID
router.get('/:id', authRoleOwnershipMiddleware(), getMessageByIdController)

// Create message
router.post('/', authRoleOwnershipMiddleware(), createMessageController)

// Delete message
// router.delete('/:id', authRoleOwnershipMiddleware(), deleteMessageController)

export default router
