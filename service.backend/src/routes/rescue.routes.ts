import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { RescueController } from '../controllers/rescue.controller';
import { authenticateToken } from '../middleware/auth';
import { isUKPostcode, isUKPhoneNumber } from '../utils/uk-validators-middleware';
import { requirePermission } from '../middleware/rbac';

const router = Router();
const rescueController = new RescueController();

// Validation middleware
const validateRescueId = param('rescueId').isUUID().withMessage('Invalid rescue ID format');
const validateUserId = param('userId').notEmpty().withMessage('User ID is required');

const validateCreateRescue = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').optional().custom(isUKPhoneNumber).withMessage('Valid phone number required'),
  body('address')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Address must be 5-255 characters'),
  body('city').trim().isLength({ min: 2, max: 100 }).withMessage('City must be 2-100 characters'),
  body('county').optional().trim().isLength({ min: 2, max: 100 }).withMessage('County must be 2-100 characters'),
  body('postcode').trim().custom(isUKPostcode).withMessage('Please enter a valid UK postcode'),
  body('country')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Country must be 2-100 characters'),
  body('website').optional().isURL().withMessage('Valid website URL required'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be max 1000 characters'),
  body('mission')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Mission must be max 500 characters'),
  body('ein').optional().isLength({ min: 9, max: 10 }).withMessage('EIN must be 9-10 characters'),
  body('registrationNumber')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Registration number must be max 50 characters'),
  body('contactPerson')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Contact person must be 2-100 characters'),
  body('contactTitle')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Contact title must be max 100 characters'),
  body('contactEmail').optional().isEmail().withMessage('Valid contact email required'),
  body('contactPhone').optional().custom(isUKPhoneNumber).withMessage('Valid contact phone required'),
];

const validateUpdateRescue = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().custom(isUKPhoneNumber).withMessage('Valid phone number required'),
  body('address')
    .optional()
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Address must be 5-255 characters'),
  body('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be 2-100 characters'),
  body('county')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('County must be 2-100 characters'),
  body('postcode')
    .optional()
    .trim()
    .custom(isUKPostcode)
    .withMessage('Please enter a valid UK postcode'),
  body('country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Country must be 2-100 characters'),
  body('website').optional().isURL().withMessage('Valid website URL required'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be max 1000 characters'),
  body('mission')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Mission must be max 500 characters'),
  body('ein').optional().isLength({ min: 9, max: 10 }).withMessage('EIN must be 9-10 characters'),
  body('registrationNumber')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Registration number must be max 50 characters'),
  body('contactPerson')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Contact person must be 2-100 characters'),
  body('contactTitle')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Contact title must be max 100 characters'),
  body('contactEmail').optional().isEmail().withMessage('Valid contact email required'),
  body('contactPhone').optional().custom(isUKPhoneNumber).withMessage('Valid contact phone required'),
];

const validateSearchQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term max 100 characters'),
  query('status')
    .optional()
    .isIn(['pending', 'verified', 'suspended', 'inactive'])
    .withMessage('Invalid status'),
  query('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location max 100 characters'),
  query('sortBy')
    .optional()
    .isIn(['name', 'createdAt', 'verifiedAt'])
    .withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('Sort order must be ASC or DESC'),
];

const validateStaffMember = [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Title must be max 100 characters'),
];

const validateVerification = [
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes must be max 500 characters'),
];


const validateRejection = [
  body('reason').optional().isLength({ max: 500 }).withMessage('Reason must be max 500 characters'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes must be max 500 characters'),
];
const validateDeletion = [
  body('reason').optional().isLength({ max: 500 }).withMessage('Reason must be max 500 characters'),
];


const validateSendEmail = [
  body('subject')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Subject is required and must be max 200 characters'),
  body('body')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Body is required and must be max 5000 characters'),
  body('template')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Template must be max 50 characters'),
];

// Public routes (no authentication required)

/**
 * @swagger
 * /api/v1/rescues:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: Search rescue organizations
 *     description: Search and filter rescue organizations with pagination
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for rescue name or location
 *         example: "Golden Retriever Rescue"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, verified, suspended, inactive]
 *         description: Filter by verification status
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *         example: "New York"
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, verifiedAt]
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *         description: Sort order
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
 *         description: Rescue organizations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 rescues:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       rescueId:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                         example: "Golden Hearts Rescue"
 *                       location:
 *                         type: string
 *                         example: "New York, NY"
 *                       description:
 *                         type: string
 *                       website:
 *                         type: string
 *                         format: uri
 *                       isVerified:
 *                         type: boolean
 *                       petCount:
 *                         type: integer
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */

/**
 * @swagger
 * /api/v1/:
 *   get:
 *     tags: [Rescue Organizations]
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
 *     tags: [Rescue Organizations]
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
 *     tags: [Rescue Organizations]
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
 *     tags: [Rescue Organizations]
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
router.get('/', validateSearchQuery, rescueController.searchRescues);

/**
 * @swagger
 * /api/v1/rescues/{rescueId}:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: Get rescue organization details
 *     description: Get detailed information about a specific rescue organization
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
 *         description: Rescue organization details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 rescue:
 *                   type: object
 *                   properties:
 *                     rescueId:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                     phone:
 *                       type: string
 *                     address:
 *                       type: string
 *                     city:
 *                       type: string
 *                     state:
 *                       type: string
 *                     zipCode:
 *                       type: string
 *                     country:
 *                       type: string
 *                     website:
 *                       type: string
 *                       format: uri
 *                     description:
 *                       type: string
 *                     mission:
 *                       type: string
 *                     isVerified:
 *                       type: boolean
 *                     contactPerson:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{rescueId}:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: GET /api/v1/{rescueId}
 *     description: Handle GET request for /api/v1/{rescueId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{rescueId} successful
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
 * /api/v1/{rescueId}:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: GET /api/v1/{rescueId}
 *     description: Handle GET request for /api/v1/{rescueId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{rescueId} successful
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
 * /api/v1/{rescueId}:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: GET /api/v1/{rescueId}
 *     description: Handle GET request for /api/v1/{rescueId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{rescueId} successful
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
 * /api/v1/{rescueId}:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: GET /api/v1/{rescueId}
 *     description: Handle GET request for /api/v1/{rescueId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{rescueId} successful
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
router.get('/:rescueId', validateRescueId, rescueController.getRescueById);

/**
 * @swagger
 * /api/v1/rescues/{rescueId}/pets:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: Get pets from rescue organization
 *     description: Get all pets available from a specific rescue organization
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
 *                       age:
 *                         type: string
 *                       size:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [AVAILABLE, PENDING, ADOPTED]
 *                       images:
 *                         type: array
 *                         items:
 *                           type: string
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{rescueId}/pets:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: GET /api/v1/{rescueId}/pets
 *     description: Handle GET request for /api/v1/{rescueId}/pets
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{rescueId}/pets successful
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
 * /api/v1/{rescueId}/pets:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: GET /api/v1/{rescueId}/pets
 *     description: Handle GET request for /api/v1/{rescueId}/pets
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{rescueId}/pets successful
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
 * /api/v1/{rescueId}/pets:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: GET /api/v1/{rescueId}/pets
 *     description: Handle GET request for /api/v1/{rescueId}/pets
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{rescueId}/pets successful
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
 * /api/v1/{rescueId}/pets:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: GET /api/v1/{rescueId}/pets
 *     description: Handle GET request for /api/v1/{rescueId}/pets
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{rescueId}/pets successful
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
router.get('/:rescueId/pets', validateRescueId, rescueController.getRescuePets);

// Get adoption policies (public route)
router.get('/:rescueId/adoption-policies', validateRescueId, rescueController.getAdoptionPolicies);

// Routes requiring authentication
router.use(authenticateToken);

// Create rescue (any authenticated user can apply)

/**
 * @swagger
 * /api/v1/:
 *   post:
 *     tags: [Rescue Organizations]
 *     summary: POST /api/v1/
 *     description: Handle POST request for /api/v1/
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/ successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/ successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/:
 *   post:
 *     tags: [Rescue Organizations]
 *     summary: POST /api/v1/
 *     description: Handle POST request for /api/v1/
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/ successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/ successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/:
 *   post:
 *     tags: [Rescue Organizations]
 *     summary: POST /api/v1/
 *     description: Handle POST request for /api/v1/
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/ successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/ successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/:
 *   post:
 *     tags: [Rescue Organizations]
 *     summary: POST /api/v1/
 *     description: Handle POST request for /api/v1/
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/ successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/ successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/', validateCreateRescue, rescueController.createRescue);

// Update rescue (rescue admin or staff)
router.put(
  '/:rescueId',
  validateRescueId,
  validateUpdateRescue,
  requirePermission('rescues.update'),
  rescueController.updateRescue
);

router.patch(
  '/:rescueId',
  validateRescueId,
  validateUpdateRescue,
  requirePermission('rescues.update'),
  rescueController.updateRescue
);

// Staff management (rescue admin)
router.get(
  '/:rescueId/staff',
  validateRescueId,
  requirePermission('staff.read'),
  rescueController.getRescueStaff
);

router.post(
  '/:rescueId/staff',
  validateRescueId,
  validateStaffMember,
  requirePermission('staff.create'),
  rescueController.addStaffMember
);

router.put(
  '/:rescueId/staff/:userId',
  validateRescueId,
  validateUserId,
  [
    body('title')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Title must be max 100 characters'),
  ],
  requirePermission('staff.update'),
  rescueController.updateStaffMember
);

router.delete(
  '/:rescueId/staff/:userId',
  validateRescueId,
  validateUserId,
  requirePermission('staff.delete'),
  rescueController.removeStaffMember
);

// Staff invitation management (rescue admin)
router.post(
  '/:rescueId/invitations',
  validateRescueId,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('title')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Title must be max 100 characters'),
  ],
  requirePermission('staff.create'),
  rescueController.inviteStaffMember
);

router.get(
  '/:rescueId/invitations',
  validateRescueId,
  requirePermission('staff.read'),
  rescueController.getPendingInvitations
);

router.delete(
  '/:rescueId/invitations/:invitationId',
  validateRescueId,
  param('invitationId').isInt().withMessage('Invalid invitation ID'),
  requirePermission('staff.delete'),
  rescueController.cancelInvitation
);

// Analytics (rescue admin/staff)
router.get(
  '/:rescueId/analytics',
  validateRescueId,
  requirePermission('admin.reports'),
  rescueController.getRescueAnalytics
);

// Adoption policies (rescue admin/staff can update, public can read)
router.put(
  '/:rescueId/adoption-policies',
  validateRescueId,
  [
    body('requireHomeVisit').isBoolean().withMessage('requireHomeVisit must be a boolean'),
    body('requireReferences').isBoolean().withMessage('requireReferences must be a boolean'),
    body('minimumReferenceCount').isInt({ min: 0, max: 10 }).withMessage('minimumReferenceCount must be 0-10'),
    body('requireVeterinarianReference').isBoolean().withMessage('requireVeterinarianReference must be a boolean'),
    body('adoptionFeeRange.min').isFloat({ min: 0 }).withMessage('Minimum fee must be 0 or greater'),
    body('adoptionFeeRange.max').isFloat({ min: 0 }).withMessage('Maximum fee must be 0 or greater'),
    body('requirements').isArray().withMessage('requirements must be an array'),
    body('policies').isArray().withMessage('policies must be an array'),
    body('returnPolicy').optional().isString().isLength({ max: 1000 }).withMessage('returnPolicy must be max 1000 characters'),
    body('spayNeuterPolicy').optional().isString().isLength({ max: 1000 }).withMessage('spayNeuterPolicy must be max 1000 characters'),
    body('followUpPolicy').optional().isString().isLength({ max: 1000 }).withMessage('followUpPolicy must be max 1000 characters'),
  ],
  requirePermission('rescues.update'),
  rescueController.updateAdoptionPolicies
);

// Admin-only routes
router.post(
  '/:rescueId/verify',
  validateRescueId,
  validateVerification,
  requirePermission('rescues.verify'),
  rescueController.verifyRescue
);

router.post(
  '/:rescueId/reject',
  validateRescueId,
  validateRejection,
  requirePermission('rescues.verify'),
  rescueController.rejectRescue
);

router.delete(
  '/:rescueId',
  validateRescueId,
  validateDeletion,
  requirePermission('rescues.delete'),
  rescueController.deleteRescue
);


// Send email to rescue organization (admin only)
router.post(
  '/:rescueId/send-email',
  validateRescueId,
  validateSendEmail,
  requirePermission('rescues.update'),
  rescueController.sendEmail
);

export default router;
