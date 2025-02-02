import express from 'express'
import {
  bulkUpdateQuestionConfigs,
  getQuestionConfigsByRescueId,
  updateQuestionConfig,
  validateApplicationAnswers,
} from '../controllers/applicationQuestionConfigController'
import { authRoleOwnershipMiddleware } from '../middleware/authRoleOwnershipMiddleware'

const router = express.Router()

// Get question configs for a rescue
router.get(
  '/rescue/:rescueId',
  authRoleOwnershipMiddleware({
    requiredRole: 'rescue_manager',
    verifyRescueOwnership: true,
  }),
  getQuestionConfigsByRescueId,
)

// Update a single question config
router.put(
  '/:configId',
  authRoleOwnershipMiddleware({
    requiredRole: 'rescue_manager',
    verifyRescueOwnership: true,
  }),
  updateQuestionConfig,
)

// Bulk update question configs for a rescue
router.put(
  '/rescue/:rescueId/bulk',
  authRoleOwnershipMiddleware({
    requiredRole: 'rescue_manager',
    verifyRescueOwnership: true,
  }),
  bulkUpdateQuestionConfigs,
)

// Validate application answers
router.post(
  '/rescue/:rescueId/validate',
  authRoleOwnershipMiddleware(),
  validateApplicationAnswers,
)

export default router
