import express from 'express'
import { getAllAuditLogsController } from '../controllers/auditLogController'
import { authenticateJWT } from '../middleware/authMiddleware'
import { checkUserRole } from '../middleware/roleCheckMiddleware'

const router = express.Router()

router.get(
  '/audit-logs',
  authenticateJWT,
  checkUserRole('admin'),
  getAllAuditLogsController,
)

export default router
