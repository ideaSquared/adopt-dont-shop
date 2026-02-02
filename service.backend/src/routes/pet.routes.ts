import { Router } from 'express';
import { PetController } from '../controllers/pet.controller';
import { authenticateToken, authenticateOptionalToken } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { handleValidationErrors } from '../middleware/validation';
import { petValidation } from '../validation/pet.validation';

const router = Router();
const petController = new PetController();

/**
 * @swagger
 * /api/v1/pets:
 *   get:
 *     tags: [Pet Management]
 *     summary: Search pets
 *     description: Search available pets with filters and pagination
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for pet name or description
 *         example: "Golden Retriever"
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [DOG, CAT, RABBIT, BIRD, OTHER]
 *         description: Filter by pet type
 *       - in: query
 *         name: breed
 *         schema:
 *           type: string
 *         description: Filter by breed
 *       - in: query
 *         name: age
 *         schema:
 *           type: string
 *           enum: [PUPPY, YOUNG, ADULT, SENIOR]
 *         description: Filter by age group
 *       - in: query
 *         name: size
 *         schema:
 *           type: string
 *           enum: [SMALL, MEDIUM, LARGE, EXTRA_LARGE]
 *         description: Filter by size
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           enum: [MALE, FEMALE]
 *         description: Filter by gender
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location/zip code
 *       - in: query
 *         name: distance
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 500
 *         description: Search radius in miles (requires location)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Pets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 pets:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       petId:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                         example: "Buddy"
 *                       type:
 *                         type: string
 *                         example: "DOG"
 *                       breed:
 *                         type: string
 *                         example: "Golden Retriever"
 *                       age:
 *                         type: string
 *                         example: "ADULT"
 *                       size:
 *                         type: string
 *                         example: "LARGE"
 *                       gender:
 *                         type: string
 *                         example: "MALE"
 *                       description:
 *                         type: string
 *                       images:
 *                         type: array
 *                         items:
 *                           type: string
 *                       rescue:
 *                         type: object
 *                         properties:
 *                           rescueId:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           location:
 *                             type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */

/**
 * @swagger
 * /api/v1/:
 *   get:
 *     tags: [Pet Management]
 *     summary: GET /api/v1/
 *     description: Handle GET request for /api/v1/
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/ successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/:
 *   get:
 *     tags: [Pet Management]
 *     summary: GET /api/v1/
 *     description: Handle GET request for /api/v1/
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/ successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get(
  '/',
  authenticateOptionalToken,
  PetController.validateSearchPets,
  petController.searchPets
);

/**
 * @swagger
 * /api/v1/pets/test:
 *   get:
 *     tags: [Pet Management]
 *     summary: Test endpoint
 *     description: Simple test endpoint to verify pet routes are working
 *     responses:
 *       200:
 *         description: Test successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Pet routes are working!"
 */

/**
 * @swagger
 * /api/v1/test:
 *   get:
 *     tags: [Pet Management]
 *     summary: GET /api/v1/test
 *     description: Handle GET request for /api/v1/test
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/test successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/test:
 *   get:
 *     tags: [Pet Management]
 *     summary: GET /api/v1/test
 *     description: Handle GET request for /api/v1/test
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/test successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/test', (req, res) => {
  res.json({ message: 'Pet routes are working!' });
});

/**
 * @swagger
 * /api/v1/pets/featured:
 *   get:
 *     tags: [Pet Management]
 *     summary: Get featured pets
 *     description: Get a list of featured pets for homepage display
 *     responses:
 *       200:
 *         description: Featured pets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 pets:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       petId:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                       breed:
 *                         type: string
 *                       images:
 *                         type: array
 *                         items:
 *                           type: string
 *                       isFeatured:
 *                         type: boolean
 *                         example: true
 */

/**
 * @swagger
 * /api/v1/featured:
 *   get:
 *     tags: [Pet Management]
 *     summary: GET /api/v1/featured
 *     description: Handle GET request for /api/v1/featured
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/featured successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/featured:
 *   get:
 *     tags: [Pet Management]
 *     summary: GET /api/v1/featured
 *     description: Handle GET request for /api/v1/featured
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/featured successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/featured', petController.getFeaturedPets);

/**
 * @swagger
 * /api/v1/pets/recent:
 *   get:
 *     tags: [Pet Management]
 *     summary: Get recently added pets
 *     description: Get a list of recently added pets
 *     responses:
 *       200:
 *         description: Recent pets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 pets:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       petId:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                       breed:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 */

/**
 * @swagger
 * /api/v1/recent:
 *   get:
 *     tags: [Pet Management]
 *     summary: GET /api/v1/recent
 *     description: Handle GET request for /api/v1/recent
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/recent successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/recent:
 *   get:
 *     tags: [Pet Management]
 *     summary: GET /api/v1/recent
 *     description: Handle GET request for /api/v1/recent
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/recent successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/recent', petController.getRecentPets);

/**
 * @swagger
 * /api/v1/pets/types:
 *   get:
 *     tags: [Pet Management]
 *     summary: Get pet types
 *     description: Get available pet types for filtering
 *     responses:
 *       200:
 *         description: Pet types retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 types:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["DOG", "CAT", "RABBIT", "BIRD", "OTHER"]
 */

/**
 * @swagger
 * /api/v1/types:
 *   get:
 *     tags: [Pet Management]
 *     summary: GET /api/v1/types
 *     description: Handle GET request for /api/v1/types
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/types successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/types:
 *   get:
 *     tags: [Pet Management]
 *     summary: GET /api/v1/types
 *     description: Handle GET request for /api/v1/types
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/types successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/types', petController.getPetTypes);

/**
 * @swagger
 * /api/v1/pets/breeds/{type}:
 *   get:
 *     tags: [Pet Management]
 *     summary: Get breeds by pet type
 *     description: Get available breeds for a specific pet type
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [DOG, CAT, RABBIT, BIRD, OTHER]
 *         description: Pet type
 *         example: "DOG"
 *     responses:
 *       200:
 *         description: Breeds retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 breeds:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Golden Retriever", "Labrador", "German Shepherd"]
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */

/**
 * @swagger
 * /api/v1/breeds/{type}:
 *   get:
 *     tags: [Pet Management]
 *     summary: GET /api/v1/breeds/{type}
 *     description: Handle GET request for /api/v1/breeds/{type}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/breeds/{type} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/breeds/{type}:
 *   get:
 *     tags: [Pet Management]
 *     summary: GET /api/v1/breeds/{type}
 *     description: Handle GET request for /api/v1/breeds/{type}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/breeds/{type} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/breeds/:type', PetController.validatePetType, petController.getPetBreedsByType);

/**
 * @swagger
 * /api/v1/pets/statistics:
 *   get:
 *     tags: [Pet Management]
 *     summary: Get pet statistics
 *     description: Get general pet statistics for the platform
 *     responses:
 *       200:
 *         description: Pet statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     totalPets:
 *                       type: integer
 *                       example: 2547
 *                     availablePets:
 *                       type: integer
 *                       example: 1823
 *                     adoptedPets:
 *                       type: integer
 *                       example: 724
 *                     petsByType:
 *                       type: object
 *                       properties:
 *                         DOG:
 *                           type: integer
 *                           example: 1200
 *                         CAT:
 *                           type: integer
 *                           example: 800
 *                         RABBIT:
 *                           type: integer
 *                           example: 300
 */

/**
 * @swagger
 * /api/v1/statistics:
 *   get:
 *     tags: [Pet Management]
 *     summary: GET /api/v1/statistics
 *     description: Handle GET request for /api/v1/statistics
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/statistics successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/statistics:
 *   get:
 *     tags: [Pet Management]
 *     summary: GET /api/v1/statistics
 *     description: Handle GET request for /api/v1/statistics
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/statistics successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/statistics', petController.getPetStatistics);

/**
 * @swagger
 * /api/v1/pets/rescue/{rescueId}:
 *   get:
 *     tags: [Pet Management]
 *     summary: Get pets by rescue organization
 *     description: Get all pets from a specific rescue organization
 *     parameters:
 *       - in: path
 *         name: rescueId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rescue organization ID
 *     responses:
 *       200:
 *         description: Rescue pets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 pets:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       petId:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                       breed:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [AVAILABLE, PENDING, ADOPTED]
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/rescue/{rescueId}:
 *   get:
 *     tags: [Pet Management]
 *     summary: GET /api/v1/rescue/{rescueId}
 *     description: Handle GET request for /api/v1/rescue/{rescueId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/rescue/{rescueId} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/rescue/{rescueId}:
 *   get:
 *     tags: [Pet Management]
 *     summary: GET /api/v1/rescue/{rescueId}
 *     description: Handle GET request for /api/v1/rescue/{rescueId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/rescue/{rescueId} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/pets/rescue/my:
 *   get:
 *     tags: [Pet Management]
 *     summary: Get pets for the authenticated user's rescue
 *     description: Retrieve all pets belonging to the authenticated user's rescue organization
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of pets per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, pending, adopted, on_hold]
 *         description: Filter pets by status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search pets by name, breed, or description
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: created_at
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *     responses:
 *       200:
 *         description: My rescue pets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Pet'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: User not associated with a rescue
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/rescue/my', authenticateToken, petController.getMyRescuePets);

router.get('/rescue/:rescueId', petValidation.getPetsByRescue, handleValidationErrors, petController.getPetsByRescue);

/**
 * @swagger
 * /api/v1/pets/favorites/user:
 *   get:
 *     tags: [Pet Management]
 *     summary: Get user's favorite pets
 *     description: Get all pets favorited by the authenticated user
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User favorites retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 favorites:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       petId:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                       breed:
 *                         type: string
 *                       images:
 *                         type: array
 *                         items:
 *                           type: string
 *                       favoritedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/favorites/user:
 *   get:
 *     tags: [Pet Management]
 *     summary: GET /api/v1/favorites/user
 *     description: Handle GET request for /api/v1/favorites/user
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/favorites/user successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/favorites/user:
 *   get:
 *     tags: [Pet Management]
 *     summary: GET /api/v1/favorites/user
 *     description: Handle GET request for /api/v1/favorites/user
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/favorites/user successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/favorites/user', authenticateToken, petController.getUserFavorites);

/**
 * @swagger
 * /api/v1/pets/{petId}:
 *   get:
 *     tags: [Pet Management]
 *     summary: Get pet details by ID
 *     description: Get detailed information about a specific pet
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Pet ID
 *     responses:
 *       200:
 *         description: Pet details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 pet:
 *                   type: object
 *                   properties:
 *                     petId:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                       example: "Buddy"
 *                     type:
 *                       type: string
 *                       example: "DOG"
 *                     breed:
 *                       type: string
 *                       example: "Golden Retriever"
 *                     age:
 *                       type: string
 *                       example: "ADULT"
 *                     size:
 *                       type: string
 *                       example: "LARGE"
 *                     gender:
 *                       type: string
 *                       example: "MALE"
 *                     description:
 *                       type: string
 *                     specialNeeds:
 *                       type: string
 *                     goodWithKids:
 *                       type: boolean
 *                     goodWithPets:
 *                       type: boolean
 *                     energyLevel:
 *                       type: string
 *                       enum: [LOW, MODERATE, HIGH]
 *                     images:
 *                       type: array
 *                       items:
 *                         type: string
 *                     status:
 *                       type: string
 *                       enum: [AVAILABLE, PENDING, ADOPTED]
 *                     rescue:
 *                       type: object
 *                       properties:
 *                         rescueId:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 *                         location:
 *                           type: string
 *                         contact:
 *                           type: object
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{petId}:
 *   get:
 *     tags: [Pet Management]
 *     summary: GET /api/v1/{petId}
 *     description: Handle GET request for /api/v1/{petId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{petId} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{petId}:
 *   get:
 *     tags: [Pet Management]
 *     summary: GET /api/v1/{petId}
 *     description: Handle GET request for /api/v1/{petId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{petId} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:petId', PetController.validatePetId, petController.getPetById);

/**
 * @swagger
 * /api/v1/pets/{petId}/similar:
 *   get:
 *     tags: [Pet Management]
 *     summary: Get similar pets
 *     description: Get pets similar to the specified pet based on breed, age, and size
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Pet ID
 *     responses:
 *       200:
 *         description: Similar pets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 similarPets:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       petId:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                       breed:
 *                         type: string
 *                       similarityScore:
 *                         type: number
 *                         example: 0.85
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{petId}/similar:
 *   get:
 *     tags: [Pet Management]
 *     summary: GET /api/v1/{petId}/similar
 *     description: Handle GET request for /api/v1/{petId}/similar
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{petId}/similar successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{petId}/similar:
 *   get:
 *     tags: [Pet Management]
 *     summary: GET /api/v1/{petId}/similar
 *     description: Handle GET request for /api/v1/{petId}/similar
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{petId}/similar successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:petId/similar', PetController.validatePetId, petController.getSimilarPets);

/**
 * @swagger
 * /api/v1/pets/{petId}/activity:
 *   get:
 *     tags: [Pet Management]
 *     summary: Get pet activity history
 *     description: Get activity history and statistics for a specific pet
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Pet ID
 *     responses:
 *       200:
 *         description: Pet activity retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 activity:
 *                   type: object
 *                   properties:
 *                     views:
 *                       type: integer
 *                       example: 245
 *                     favorites:
 *                       type: integer
 *                       example: 23
 *                     applications:
 *                       type: integer
 *                       example: 5
 *                     recentViews:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           userId:
 *                             type: string
 *                             format: uuid
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

// Protected routes (authentication required)
router.post(
  '/',
  authenticateToken,
  requirePermission('pets.create'),
  PetController.validateCreatePet,
  petController.createPet
);

router.put(
  '/:petId',
  authenticateToken,
  requirePermission('pets.update'),
  PetController.validateUpdatePet,
  petController.updatePet
);

router.patch(
  '/:petId',
  authenticateToken,
  requirePermission('pets.update'),
  PetController.validateUpdatePet,
  petController.updatePet
);

router.delete(
  '/:petId',
  authenticateToken,
  requirePermission('pets.delete'),
  PetController.validatePetId,
  petController.deletePet
);

router.post(
  '/:petId/images',
  authenticateToken,
  requirePermission('pets.update'),
  PetController.validatePetId,
  petController.updatePetImages
);

router.delete(
  '/:petId/images',
  authenticateToken,
  requirePermission('pets.update'),
  PetController.validatePetId,
  petController.removePetImage
);

router.patch(
  '/:petId/status',
  authenticateToken,
  requirePermission('pets.update'),
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

router.post(
  '/:petId/report',
  authenticateToken,
  PetController.validateReportPet,
  petController.reportPet
);

export default router;
