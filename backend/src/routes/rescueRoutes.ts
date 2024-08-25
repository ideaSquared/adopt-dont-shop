import express from 'express'
import { getAllRescues } from '../controllers/rescueController'
import { createRescueAccount } from '../controllers/userController'
import { authenticateJWT } from '../middleware/authMiddleware'
import { checkUserRole } from '../middleware/roleCheckMiddleware'

const router = express.Router()

// Route for creating a rescue account
// POST /api/rescue/create-rescue
router.post('/create-rescue', createRescueAccount)

// GET /api/rescue/rescues
router.get('/rescues', authenticateJWT, checkUserRole('admin'), getAllRescues)

export default router
