import express from 'express'
import { getAllRescuesController } from '../controllers/rescueController'
import { createRescueAccountController } from '../controllers/userController'
import { authenticateJWT } from '../middleware/authMiddleware'
import { checkUserRole } from '../middleware/roleCheckMiddleware'

const router = express.Router()

// Route for creating a rescue account
// POST /api/rescue/create-rescue
router.post('/create-rescue', createRescueAccountController)

// GET /api/rescue/rescues
router.get(
  '/rescues',
  authenticateJWT,
  checkUserRole('admin'),
  getAllRescuesController,
)

export default router
