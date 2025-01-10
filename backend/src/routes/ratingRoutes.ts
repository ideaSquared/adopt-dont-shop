import express from 'express'
import {
  createRatingController,
  deleteRatingController,
  getAllRatingsController,
  getRatingByIdController,
  getRatingsByPetIdController,
  getRatingsByUserIdController,
  updateRatingController,
} from '../controllers/ratingController'
import { authRoleOwnershipMiddleware } from '../middleware/authRoleOwnershipMiddleware'

const router = express.Router()

router.post('/', authRoleOwnershipMiddleware(), createRatingController)
router.get('/', authRoleOwnershipMiddleware(), getAllRatingsController)
router.get('/:id', authRoleOwnershipMiddleware(), getRatingByIdController)
router.get(
  '/user/:userId',
  authRoleOwnershipMiddleware(),
  getRatingsByUserIdController,
)
router.get(
  '/pet/:petId',
  authRoleOwnershipMiddleware(),
  getRatingsByPetIdController,
)
router.put('/:id', authRoleOwnershipMiddleware(), updateRatingController)
router.delete('/:id', authRoleOwnershipMiddleware(), deleteRatingController)

export default router
