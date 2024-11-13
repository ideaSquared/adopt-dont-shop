import { Router } from 'express'
import * as applicationController from '../controllers/applicationController'

const router = Router()

router.post('/', applicationController.createApplication)
router.get('/', applicationController.getAllApplications)
router.get('/:id', applicationController.getApplicationById)
router.put('/:id', applicationController.updateApplication)
router.delete('/:id', applicationController.deleteApplication)
router.get('/rescue/:rescueId', applicationController.getApplicationsByRescueId)

export default router
