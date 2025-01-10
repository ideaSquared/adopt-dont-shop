import express from 'express'
import { getAllAuditLogsController } from '../controllers/auditLogController'
import { authRoleOwnershipMiddleware } from '../middleware/authRoleOwnershipMiddleware'

const router = express.Router()

// Get all audit logs (admin only)
router.get(
  '/',
  authRoleOwnershipMiddleware({ requiredRole: 'admin' }),
  getAllAuditLogsController,
)

export default router
