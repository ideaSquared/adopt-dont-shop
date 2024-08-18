// src/routes/authRoutes.ts
import express from 'express'
import { login, logout } from '../controllers/userController'

const router = express.Router()

// POST /api/auth/login
router.post('/login', login)

// POST /api/auth/logout
router.post('/logout', logout)

export default router
