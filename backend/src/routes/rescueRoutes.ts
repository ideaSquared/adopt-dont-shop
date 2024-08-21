import express from 'express'
import { createRescueAccount } from '../controllers/userController'

const router = express.Router()

// Route for creating a rescue account
// POST /api/rescue/create-rescue
router.post('/create-rescue', createRescueAccount)

export default router
