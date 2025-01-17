import express from 'express'
import {
  getAllAuditLogsController,
  getLogsByCategoryController,
  getLogsByDateRangeController,
  getLogsByUserIdController,
} from '../controllers/auditLogController'
import { authRoleOwnershipMiddleware } from '../middleware/authRoleOwnershipMiddleware'

const router = express.Router()

// All routes require admin role
const adminMiddleware = authRoleOwnershipMiddleware({ requiredRole: 'admin' })

// Get all audit logs with filtering
router.get('/', adminMiddleware, getAllAuditLogsController)

// Get logs by user ID
router.get('/user/:userId', adminMiddleware, getLogsByUserIdController)

// Get logs by date range
router.get('/date-range', adminMiddleware, getLogsByDateRangeController)

// Get logs by category
router.get('/category/:category', adminMiddleware, getLogsByCategoryController)

export default router
