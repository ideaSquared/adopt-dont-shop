// src/routes/authRoutes.ts
import express from 'express'
import {
  changePasswordController,
  completeAccountSetupController,
  createUserAccountController,
  forgotPasswordController,
  getAllUsersController,
  loginController,
  resetPasswordController,
  updateUserController,
  verifyEmailController,
} from '../controllers/userController'
import { authRoleOwnershipMiddleware } from '../middleware/authRoleOwnershipMiddleware'

const router = express.Router()

// Public routes
router.post('/login', loginController)
router.get('/verify-email', verifyEmailController)
router.post('/forgot-password', forgotPasswordController)
router.post('/reset-password', resetPasswordController)
router.post('/create-user', createUserAccountController)
router.post('/complete-account-setup', completeAccountSetupController)

// Protected routes
router.put(
  '/users/:userId',
  authRoleOwnershipMiddleware(),
  updateUserController,
)

router.put(
  '/users/:userId/change-password',
  authRoleOwnershipMiddleware(),
  changePasswordController,
)

router.get(
  '/users',
  authRoleOwnershipMiddleware({ requiredRole: 'admin' }),
  getAllUsersController,
)

export default router
