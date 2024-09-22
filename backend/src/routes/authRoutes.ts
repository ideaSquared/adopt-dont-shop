// src/routes/authRoutes.ts
import express from 'express'
import {
  changePasswordController,
  createUserAccountController,
  forgotPasswordController,
  getAllUsersController,
  loginController,
  resetPasswordController,
  updateUserController,
  verifyEmailController,
} from '../controllers/userController'
import { authenticateJWT } from '../middleware/authMiddleware'
import { checkUserRole } from '../middleware/roleCheckMiddleware'

const router = express.Router()

// POST /api/auth/login
router.post('/login', loginController)

// GET /api/auth/verify-email
router.get('/verify-email', verifyEmailController)

// PUT /api/users/:userId
router.put('/users/:userId', authenticateJWT, updateUserController)

// PUT /api/users/:userId/change-password
router.put(
  '/users/:userId/change-password',
  authenticateJWT,
  changePasswordController,
)

router.post('/forgot-password', forgotPasswordController)
router.post('/reset-password', resetPasswordController)

// Route for creating a user account
router.post('/create-user', createUserAccountController)

router.get(
  '/users',
  authenticateJWT,
  checkUserRole('admin'),
  getAllUsersController,
)

export default router
