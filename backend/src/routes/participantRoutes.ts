import { Router } from 'express'
import * as participantController from '../controllers/participantController'
import { authenticateJWT } from '../middleware/authMiddleware'
import { checkUserRole } from '../middleware/roleCheckMiddleware'

const router = Router()

router.get(
  '/',
  authenticateJWT,
  checkUserRole('admin'),
  participantController.getAllParticipants,
)
router.get('/:id', authenticateJWT, participantController.getParticipantById)
router.post('/', authenticateJWT, participantController.createParticipant)

export default router
