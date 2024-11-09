import express from 'express'
import {
  deleteStaffController,
  getAllRescuesController,
  getRescueStaffWithRolesController,
  getSingleRescueController,
  inviteUserController,
  updateRescueController,
} from '../controllers/rescueController'
import { createRescueAccountController } from '../controllers/userController'
import { authenticateJWT } from '../middleware/authMiddleware'
import { checkUserRole } from '../middleware/roleCheckMiddleware'

const router = express.Router()

// Route for creating a rescue account
// POST /api/rescues/create-rescue
router.post('/create-rescue', createRescueAccountController)

// GET /api/rescues/rescues
router.get(
  '/rescues',
  authenticateJWT,
  checkUserRole('admin'),
  getAllRescuesController,
)

// GET /api/rescue/:rescueId
// Get a rescue and get all the data
router.get('/rescues/:rescueId', authenticateJWT, getSingleRescueController)

// PUT /api/rescues/rescue/:rescueId
router.put(
  '/rescues/:rescueId',
  authenticateJWT,
  checkUserRole('rescue_manager'),
  updateRescueController,
)

// GET /api/rescues/:rescueId/staff-with-roles
router.get(
  '/rescues/:rescueId/staff-with-roles',
  authenticateJWT,
  getRescueStaffWithRolesController,
)

// DELETE /api/rescues/staff/:userId
router.delete(
  '/staff/:userId',
  authenticateJWT,
  checkUserRole('rescue_manager'),
  deleteStaffController,
)

// DELETE /api/rescue/staff/:userId
router.post(
  '/staff/invite',
  authenticateJWT,
  checkUserRole('rescue_manager'),
  inviteUserController,
)

export default router
