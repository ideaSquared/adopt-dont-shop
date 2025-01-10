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
import { verifyPetOwnership } from '../services/petService'

const router = express.Router()

// Get all pets for a rescue
router.get(
  '/',
  authRoleOwnershipMiddleware(),
  attachRescueId,
  getAllPetsByRescueId,
)

// Get single pet
router.get('/:id', authRoleOwnershipMiddleware(), getPetById)

// Create new pet (requires rescue_manager role)
router.post(
  '/',
  authRoleOwnershipMiddleware({ requiredRole: 'rescue_manager' }),
  attachRescueId,
  createPet,
)

// Update pet (requires rescue_manager role and ownership)
router.put(
  '/:id',
  authRoleOwnershipMiddleware({
    requiredRole: 'rescue_manager',
    ownershipCheck: async (req) => {
      if (!req.user?.rescue_id) return false
      return verifyPetOwnership(req.user.rescue_id, req.params.id)
    },
  }),
  updatePet,
)

// Delete pet (requires rescue_manager role and ownership)
router.delete(
  '/:id',
  authRoleOwnershipMiddleware({
    requiredRole: 'rescue_manager',
    ownershipCheck: async (req) => {
      if (!req.user?.rescue_id) return false
      return verifyPetOwnership(req.user.rescue_id, req.params.id)
    },
  }),
  deletePet,
)

export default router
