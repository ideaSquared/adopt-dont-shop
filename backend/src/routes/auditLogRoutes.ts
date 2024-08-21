import express from 'express'
import { getAllAuditLogs } from '../controllers/auditLogController'
import { authenticateJWT } from '../middleware/authMiddleware'
import { checkUserRole } from '../middleware/roleCheckMiddleware'

const router = express.Router()

router.get(
  '/audit-logs',
  authenticateJWT,
  checkUserRole('admin'),
  getAllAuditLogs,
)

export default router
