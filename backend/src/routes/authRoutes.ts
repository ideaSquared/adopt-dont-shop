// src/routes/authRoutes.ts
import express from 'express'
import {
  changePasswordHandler,
  login,
  updateUser,
} from '../controllers/userController'
import { authenticateJWT } from '../middlewares/authMiddleware'

const router = express.Router()

// POST /api/auth/login
router.post('/login', login)

// PUT /api/users/:userId
router.put('/users/:userId', authenticateJWT, updateUser)

// PUT /api/users/:userId/change-password
router.put(
  '/users/:userId/change-password',
  authenticateJWT,
  changePasswordHandler,
)

export default router
