import { Router } from 'express'
import * as applicationController from '../controllers/applicationController'
import { authenticateJWT } from '../middleware/authMiddleware'

const router = Router()

router.post('/', authenticateJWT, applicationController.createApplication)
router.get('/', authenticateJWT, applicationController.getAllApplications)
router.get('/:id', authenticateJWT, applicationController.getApplicationById)
router.put('/:id', authenticateJWT, applicationController.updateApplication)
router.delete('/:id', authenticateJWT, applicationController.deleteApplication)
router.get(
  '/rescue/:rescueId',
  authenticateJWT,
  applicationController.getApplicationsByRescueId,
)

export default router
