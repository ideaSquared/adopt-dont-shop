import { Router } from 'express'
import FeatureFlagController from '../controllers/featureFlagController'

const router = Router()

router.get('/', FeatureFlagController.getAllFlags)
router.get('/:id', FeatureFlagController.getFlagByName)
router.post('/', FeatureFlagController.createFlag)
router.put('/', FeatureFlagController.updateFlag)
router.delete('/:id', FeatureFlagController.deleteFlag)

export default router
