// src/routes/authRoutes.ts
import express from 'express'
import {
  changePasswordHandler,
  createRescueAccount,
  createUserAccount,
  forgotPasswordHandler,
  login,
  resetPasswordHandler,
  updateUser,
  verifyEmail,
} from '../controllers/userController'
import { authenticateJWT } from '../middlewares/authMiddleware'

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

// Route for creating a rescue account
router.post('/create-rescue', createRescueAccount)

export default router
