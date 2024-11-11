import { Router } from 'express'
import {
  createPet,
  deletePet,
  getAllPets,
  getPetById,
  updatePet,
} from '../controllers/petController'
import { authenticateJWT } from '../middleware/authMiddleware'

const router = Router()

router.get('/', authenticateJWT, getAllPets)
router.get('/:id', authenticateJWT, getPetById)
router.post('/', authenticateJWT, createPet)
router.put('/:id', authenticateJWT, updatePet)
router.delete('/:id', authenticateJWT, deletePet)

export default router
