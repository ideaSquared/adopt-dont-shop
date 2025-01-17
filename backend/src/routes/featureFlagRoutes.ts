import { Router } from 'express'
import {
  createFeatureFlag,
  deleteFeatureFlag,
  getAllFeatureFlags,
  //   getFlagByName,
  updateFeatureFlag,
} from '../controllers/featureFlagController'

const router = Router()

router.get('/', getAllFeatureFlags)
// router.get('/:id', getFlagByName)
router.post('/', createFeatureFlag)
router.put('/', updateFeatureFlag)
router.delete('/:id', deleteFeatureFlag)

export default router
