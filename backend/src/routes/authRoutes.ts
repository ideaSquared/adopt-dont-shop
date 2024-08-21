// src/routes/authRoutes.ts
import express from 'express'
import {
  changePasswordHandler,
  createUserAccount,
  forgotPasswordHandler,
  login,
  resetPasswordHandler,
  updateUser,
  verifyEmail,
} from '../controllers/userController'
import { authenticateJWT } from '../middleware/authMiddleware'

const router = express.Router()

// POST /api/auth/login
router.post('/login', login)

// GET /api/auth/verify-email
router.get('/verify-email', verifyEmail)

// PUT /api/users/:userId
router.put('/users/:userId', authenticateJWT, updateUser)

// PUT /api/users/:userId/change-password
router.put(
  '/users/:userId/change-password',
  authenticateJWT,
  changePasswordHandler,
)

router.post('/forgot-password', forgotPasswordHandler)
router.post('/reset-password', resetPasswordHandler)

// Route for creating a user account
router.post('/create-user', createUserAccount)

export default router
