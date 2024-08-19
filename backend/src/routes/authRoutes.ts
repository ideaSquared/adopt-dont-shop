// src/routes/authRoutes.ts
import express from 'express'
import { login } from '../controllers/userController'

const router = express.Router()

// POST /api/auth/login
router.post('/login', login)

export default router
