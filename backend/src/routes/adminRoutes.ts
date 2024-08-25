import express from 'express'
import { getAllRescues } from '../controllers/rescueController'
import { authenticateJWT } from '../middleware/authMiddleware'
import { checkUserRole } from '../middleware/roleCheckMiddleware'

const router = express.Router()

router.get('/rescues', authenticateJWT, checkUserRole('admin'), getAllRescues)

export default router
