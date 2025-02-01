import express from 'express'
import {
  getAdminDashboard,
  getRescueDashboard,
} from '../controllers/dashboardController'
import { attachRescueId } from '../middleware/attachRescueId'
import { authRoleOwnershipMiddleware } from '../middleware/authRoleOwnershipMiddleware'

const router = express.Router()

// Get rescue dashboard data - requires rescue role
router.get(
  '/rescue',
  authRoleOwnershipMiddleware({
    requiredRole: 'staff',
  }),
  attachRescueId,
  getRescueDashboard,
)

// Get admin dashboard data - requires admin role
router.get(
  '/admin',
  authRoleOwnershipMiddleware({ requiredRole: 'admin' }),
  getAdminDashboard,
)

export default router
