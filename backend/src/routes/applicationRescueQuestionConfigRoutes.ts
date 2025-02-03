import express from 'express'
import {
  bulkUpdateRescueQuestionConfigs,
  getRescueQuestionConfigs,
  updateRescueQuestionConfig,
} from '../controllers/applicationRescueQuestionConfigController'
import { authRoleOwnershipMiddleware } from '../middleware/authRoleOwnershipMiddleware'

const router = express.Router()

// Get rescue's question configurations
router.get(
  '/rescue/:rescueId',
  authRoleOwnershipMiddleware({
    requiredRole: ['rescue_manager', 'staff', 'admin'],
    verifyRescueOwnership: true,
  }),
  getRescueQuestionConfigs,
)

// Update a single question configuration
router.put(
  '/:configId',
  authRoleOwnershipMiddleware({
    requiredRole: 'rescue_manager',
    verifyRescueOwnership: true,
  }),
  updateRescueQuestionConfig,
)

// Bulk update question configurations for a rescue
router.put(
  '/rescue/:rescueId/bulk',
  authRoleOwnershipMiddleware({
    requiredRole: 'rescue_manager',
    verifyRescueOwnership: true,
  }),
  bulkUpdateRescueQuestionConfigs,
)

export default router
