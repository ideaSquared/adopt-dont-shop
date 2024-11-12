import { Router } from 'express'
import {
  createRatingController,
  deleteRatingController,
  getAllRatingsController,
  getRatingByIdController,
  getRatingsByPetIdController,
  getRatingsByUserIdController,
  updateRatingController,
} from '../controllers/ratingController'
import { authenticateJWT } from '../middleware/authMiddleware'

const router = Router()

router.post('/', authenticateJWT, createRatingController)
router.get('/', authenticateJWT, getAllRatingsController)
router.get('/:id', authenticateJWT, getRatingByIdController)
router.get('/user/:userId', authenticateJWT, getRatingsByUserIdController)
router.get('/pet/:petId', authenticateJWT, getRatingsByPetIdController)
router.put('/:id', authenticateJWT, updateRatingController)
router.delete('/:id', authenticateJWT, deleteRatingController)

export default router
