import express from 'express'
import { getAllUsers } from '../controllers/adminController'
import { getAllRescues } from '../controllers/rescueController'
import { authenticateJWT } from '../middleware/authMiddleware'
import { checkUserRole } from '../middleware/roleCheckMiddleware'

const router = express.Router()

router.get('/users', checkUserRole('admin'), getAllUsers)
router.get('/rescues', authenticateJWT, checkUserRole('admin'), getAllRescues)

export default router
