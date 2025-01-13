import express from 'express'
import {
  createApplication,
  deleteApplication,
  getAllApplications,
  getApplicationById,
  getApplicationsByRescueId,
  updateApplication,
} from '../controllers/applicationController'
import { authRoleOwnershipMiddleware } from '../middleware/authRoleOwnershipMiddleware'

const router = express.Router()

// Create application
router.post('/', authRoleOwnershipMiddleware(), createApplication)

// Get all applications (admin only)
router.get(
  '/',
  authRoleOwnershipMiddleware({ requiredRole: 'admin' }),
  getAllApplications,
)

// Get applications for a rescue
router.get(
  '/rescue/:rescueId',
  authRoleOwnershipMiddleware({
    requiredRole: 'rescue_manager',
    verifyRescueOwnership: true,
  }),
  getApplicationsByRescueId,
)

// Get application by ID
router.get('/:id', authRoleOwnershipMiddleware(), getApplicationById)

// Update application
router.put('/:id', authRoleOwnershipMiddleware(), updateApplication)

// Delete application
router.delete('/:id', authRoleOwnershipMiddleware(), deleteApplication)

export default router
