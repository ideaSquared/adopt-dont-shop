import { Router } from 'express'
import {
  createParticipantController,
  getAllParticipantsController,
  getParticipantByIdController,
} from '../controllers/participantController'
import { authRoleOwnershipMiddleware } from '../middleware/authRoleOwnershipMiddleware'

const router = Router()

router.get(
  '/',
  authRoleOwnershipMiddleware({ requiredRole: 'admin' }),
  getAllParticipantsController,
)
router.get('/:id', authRoleOwnershipMiddleware(), getParticipantByIdController)
router.post('/', authRoleOwnershipMiddleware(), createParticipantController)

export default router
