import express from 'express'
import {
  addRoleToUserController,
  cancelInvitationController,
  deleteStaffController,
  getAllRescuesController,
  getRescueStaffWithRolesController,
  getSingleRescueController,
  inviteUserController,
  removeRoleFromUserController,
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

// POST /api/rescue/staff/:userId
router.post(
  '/staff/invite',
  authenticateJWT,
  checkUserRole('rescue_manager'),
  inviteUserController,
)

// POST /api/rescue/staff/cancel-invite
router.post(
  '/staff/cancel-invite',
  authenticateJWT,
  checkUserRole('rescue_manager'),
  cancelInvitationController,
)

// POST /api/rescue/staff/:userId/add-role
router.post(
  '/staff/:userId/add-role',
  authenticateJWT,
  checkUserRole('rescue_manager'),
  addRoleToUserController,
)

// DELETE /api/rescue/staff/:userId/roles/:roleId
router.delete(
  '/staff/:userId/roles/:roleId',
  authenticateJWT,
  checkUserRole('rescue_manager'),
  removeRoleFromUserController,
)

export default router
