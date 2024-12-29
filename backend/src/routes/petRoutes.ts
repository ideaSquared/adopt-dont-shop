import { Router } from 'express'
import {
  createPet,
  deletePet,
  getAllPets,
  getAllPetsByRescueId,
  getPetById,
  updatePet,
} from '../controllers/petController'
import { attachRescueId } from '../middleware/attachRescueId'
import { authenticateJWT } from '../middleware/authMiddleware'
import { checkRoleAndOwnership } from '../middleware/checkRoleAndOwnership'
import { checkUserRole } from '../middleware/roleCheckMiddleware'

const router = Router()

router.get('/', authenticateJWT, attachRescueId, getAllPetsByRescueId)
router.get('/admin', authenticateJWT, checkUserRole('admin'), getAllPets)
// TODO: Verify role
router.get('/:id', authenticateJWT, getPetById)
router.post('/', authenticateJWT, createPet)
router.put(
  '/:id',
  authenticateJWT,
  attachRescueId,
  checkRoleAndOwnership('pet_manager'),
  updatePet,
)

router.delete(
  '/:id',
  authenticateJWT,
  attachRescueId,
  checkRoleAndOwnership('pet_manager'),
  deletePet,
)
export default router
