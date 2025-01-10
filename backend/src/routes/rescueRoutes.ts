import express from 'express'
import {
  addRoleToUserController,
  getSingleRescueController,
  inviteUserController,
  removeRoleFromUserController,
  updateRescueController,
} from '../controllers/rescueController'
import { createRescueAccountController } from '../controllers/userController'
import { authRoleOwnershipMiddleware } from '../middleware/authRoleOwnershipMiddleware'

const router = express.Router()

// Get single rescue
router.get(
  '/:rescueId',
  authRoleOwnershipMiddleware({ verifyRescueOwnership: true }),
  getSingleRescueController,
)

// Create rescue (rescue_manager only)
router.post(
  '/',
  authRoleOwnershipMiddleware({ requiredRole: 'rescue_manager' }),
  createRescueAccountController,
)

// Update rescue (rescue_manager and ownership required)
router.put(
  '/:rescueId',
  authRoleOwnershipMiddleware({
    requiredRole: 'rescue_manager',
    verifyRescueOwnership: true,
  }),
  updateRescueController,
)

// Invite user to rescue (rescue_manager and ownership required)
router.post(
  '/:rescueId/invite',
  authRoleOwnershipMiddleware({
    requiredRole: 'rescue_manager',
    verifyRescueOwnership: true,
  }),
  inviteUserController,
)

// Add role to user (rescue_manager and ownership required)
router.post(
  '/:rescueId/users/:userId/roles',
  authRoleOwnershipMiddleware({
    requiredRole: 'rescue_manager',
    verifyRescueOwnership: true,
  }),
  addRoleToUserController,
)

// Remove role from user (rescue_manager and ownership required)
router.delete(
  '/:rescueId/users/:userId/roles/:roleId',
  authRoleOwnershipMiddleware({
    requiredRole: 'rescue_manager',
    verifyRescueOwnership: true,
  }),
  removeRoleFromUserController,
)

export default router
