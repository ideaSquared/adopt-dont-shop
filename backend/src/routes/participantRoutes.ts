import { Router } from 'express'
import {
  createParticipantController,
  getAllParticipantsController,
  getParticipantByIdController,
} from '../controllers/participantController'
import { authenticateJWT } from '../middleware/authMiddleware'
import { checkUserRole } from '../middleware/roleCheckMiddleware'

const router = Router()

router.get(
  '/',
  authenticateJWT,
  checkUserRole('admin'),
  getAllParticipantsController,
)
router.get('/:id', authenticateJWT, getParticipantByIdController)
router.post('/', authenticateJWT, createParticipantController)

export default router
