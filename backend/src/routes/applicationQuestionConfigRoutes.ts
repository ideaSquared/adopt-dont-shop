import express from 'express'
import {
  bulkUpdateQuestionConfigs,
  getQuestionConfigsByRescueId,
  updateQuestionConfig,
  validateApplicationAnswers,
} from '../controllers/applicationQuestionConfigController'
import { authRoleOwnershipMiddleware } from '../middleware/authRoleOwnershipMiddleware'

const router = express.Router()

// Get question configs for a rescue - allow staff and admins to view
router.get(
  '/rescue/:rescueId',
  authRoleOwnershipMiddleware({
    requiredRole: ['rescue_manager', 'staff', 'admin'],
    verifyRescueOwnership: false,
  }),
  getQuestionConfigsByRescueId,
)

// Update a single question config - only rescue managers can update
router.put(
  '/:configId',
  authRoleOwnershipMiddleware({
    requiredRole: 'rescue_manager',
    verifyRescueOwnership: true,
  }),
  updateQuestionConfig,
)

// Bulk update question configs for a rescue - only rescue managers can update
router.put(
  '/rescue/:rescueId/bulk',
  authRoleOwnershipMiddleware({
    requiredRole: 'rescue_manager',
    verifyRescueOwnership: true,
  }),
  bulkUpdateQuestionConfigs,
)

// Validate application answers - no specific role required, just authentication
router.post(
  '/rescue/:rescueId/validate',
  authRoleOwnershipMiddleware(),
  validateApplicationAnswers,
)

export default router
