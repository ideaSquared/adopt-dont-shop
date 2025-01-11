import express from 'express'
import {
  createPet,
  deletePet,
  getAllPetsByRescueId,
  getPetById,
  updatePet,
} from '../controllers/petController'
import { attachRescueId } from '../middleware/attachRescueId'
import { authRoleOwnershipMiddleware } from '../middleware/authRoleOwnershipMiddleware'

const router = express.Router()

// Get all pets for a rescue
router.get(
  '/',
  authRoleOwnershipMiddleware(),
  attachRescueId,
  getAllPetsByRescueId,
)

// Get single pet
router.get('/:pet_id', authRoleOwnershipMiddleware(), getPetById)

// Create new pet (requires rescue_manager role)
router.post(
  '/',
  authRoleOwnershipMiddleware({ requiredRole: 'rescue_manager' }),
  attachRescueId,
  createPet,
)

// Update pet (requires rescue_manager role and ownership)
router.put(
  '/:pet_id',
  authRoleOwnershipMiddleware({
    requiredRole: 'rescue_manager',
    verifyPetOwnership: true,
  }),
  updatePet,
)

// Delete pet (requires rescue_manager role and ownership)
router.delete(
  '/:pet_id',
  authRoleOwnershipMiddleware({
    requiredRole: 'rescue_manager',
    verifyPetOwnership: true,
  }),
  deletePet,
)

export default router
