import { Router } from 'express'
import * as applicationController from '../controllers/applicationController'
import { attachRescueId } from '../middleware/attachRescueId'
import { authenticateJWT } from '../middleware/authMiddleware'
import { checkUserRole } from '../middleware/roleCheckMiddleware'

const router = Router()

router.post('/', authenticateJWT, applicationController.createApplication)
router.get(
  '/',
  authenticateJWT,
  checkUserRole('admin'),
  applicationController.getAllApplications,
)
router.get(
  '/rescue',
  authenticateJWT,
  attachRescueId,
  applicationController.getApplicationsByRescueId,
)
router.get('/:id', authenticateJWT, applicationController.getApplicationById)
router.put('/:id', authenticateJWT, applicationController.updateApplication)
router.delete('/:id', authenticateJWT, applicationController.deleteApplication)

export default router
