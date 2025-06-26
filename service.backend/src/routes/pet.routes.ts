import { Router } from 'express';
import { PetController } from '../controllers/pet.controller';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();
const petController = new PetController();

// Public routes (no authentication required)
router.get('/', PetController.validateSearchPets, petController.searchPets);

router.get('/test', (req, res) => {
  res.json({ message: 'Pet routes are working!' });
});

router.get('/featured', petController.getFeaturedPets);

router.get('/statistics', petController.getPetStatistics);

router.get('/rescue/:rescueId', petController.getPetsByRescue);

router.get('/favorites/user', authenticateToken, petController.getUserFavorites);

// Parameterized routes (must come after specific routes)
router.get('/:petId', PetController.validatePetId, petController.getPetById);

router.get('/:petId/activity', PetController.validatePetId, petController.getPetActivity);

// Protected routes (authentication required)
router.post(
  '/',
  authenticateToken,
  requirePermission('pets:create'),
  PetController.validateCreatePet,
  petController.createPet
);

router.put(
  '/:petId',
  authenticateToken,
  requirePermission('pets:update'),
  PetController.validateUpdatePet,
  petController.updatePet
);

router.patch(
  '/:petId',
  authenticateToken,
  requirePermission('pets:update'),
  PetController.validateUpdatePet,
  petController.updatePet
);

router.delete(
  '/:petId',
  authenticateToken,
  requirePermission('pets:delete'),
  PetController.validatePetId,
  petController.deletePet
);

router.post(
  '/:petId/images',
  authenticateToken,
  requirePermission('pets:update'),
  PetController.validatePetId,
  petController.updatePetImages
);

router.delete(
  '/:petId/images',
  authenticateToken,
  requirePermission('pets:update'),
  PetController.validatePetId,
  petController.removePetImage
);

router.patch(
  '/:petId/status',
  authenticateToken,
  requirePermission('pets:update'),
  PetController.validatePetId,
  petController.updatePetStatus
);

// Favorite pets routes
router.post(
  '/:petId/favorite',
  authenticateToken,
  PetController.validatePetId,
  petController.addToFavorites
);

router.delete(
  '/:petId/favorite',
  authenticateToken,
  PetController.validatePetId,
  petController.removeFromFavorites
);

router.get(
  '/:petId/favorite/status',
  authenticateToken,
  PetController.validatePetId,
  petController.checkFavoriteStatus
);

export default router;

