import express from 'express'
import {
  getAllRescuesController,
  getSingleRescueController,
} from '../controllers/rescueController'
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

// GET /api/rescue/:rescueId
// Get a rescue and get all the data
router.get('/rescues/:rescueId', authenticateJWT, getSingleRescueController)

export default router
