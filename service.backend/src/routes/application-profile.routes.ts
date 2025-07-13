import { Router } from 'express';
import { body, query } from 'express-validator';
import { ApplicationProfileController } from '../controllers/application-profile.controller';
import { authenticateToken } from '../middleware/auth';

/**
 * Phase 1 - Application Profile Routes
 * API endpoints for managing user application defaults and pre-population
 */
const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/v1/profile/application-defaults:
 *   get:
 *     tags: [Application Profile]
 *     summary: Get user's application defaults
 *     description: Retrieve the user's saved application default data for form pre-population
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Application defaults retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ApplicationDefaults'
 */
router.get('/application-defaults', ApplicationProfileController.getApplicationDefaults);

/**
 * @swagger
 * /api/v1/profile/application-defaults:
 *   put:
 *     tags: [Application Profile]
 *     summary: Update user's application defaults
 *     description: Update the user's default application data for future pre-population
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               applicationDefaults:
 *                 $ref: '#/components/schemas/ApplicationDefaults'
 *     responses:
 *       200:
 *         description: Application defaults updated successfully
 */
router.put(
  '/application-defaults',
  [
    body('applicationDefaults').isObject().withMessage('Application defaults must be an object'),
    body('applicationDefaults.personalInfo.firstName')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('First name must be 1-100 characters'),
    body('applicationDefaults.personalInfo.email')
      .optional()
      .isEmail()
      .withMessage('Must be a valid email address'),
    body('applicationDefaults.personalInfo.phone')
      .optional()
      .isMobilePhone('en-GB')
      .withMessage('Must be a valid UK mobile number'),
  ],
  ApplicationProfileController.updateApplicationDefaults
);

/**
 * @swagger
 * /api/v1/profile/application-preferences:
 *   get:
 *     tags: [Application Profile]
 *     summary: Get user's application preferences
 *     description: Retrieve the user's application behavior preferences
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Application preferences retrieved successfully
 */
router.get('/application-preferences', ApplicationProfileController.getApplicationPreferences);

/**
 * @swagger
 * /api/v1/profile/application-preferences:
 *   put:
 *     tags: [Application Profile]
 *     summary: Update user's application preferences
 *     description: Update the user's application behavior preferences
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               applicationPreferences:
 *                 $ref: '#/components/schemas/ApplicationPreferences'
 *     responses:
 *       200:
 *         description: Application preferences updated successfully
 */
router.put(
  '/application-preferences',
  [
    body('applicationPreferences')
      .isObject()
      .withMessage('Application preferences must be an object'),
    body('applicationPreferences.auto_populate')
      .optional()
      .isBoolean()
      .withMessage('auto_populate must be a boolean'),
    body('applicationPreferences.save_drafts')
      .optional()
      .isBoolean()
      .withMessage('save_drafts must be a boolean'),
    body('applicationPreferences.quick_apply_enabled')
      .optional()
      .isBoolean()
      .withMessage('quick_apply_enabled must be a boolean'),
  ],
  ApplicationProfileController.updateApplicationPreferences
);

/**
 * @swagger
 * /api/v1/profile/completion:
 *   get:
 *     tags: [Application Profile]
 *     summary: Get profile completion status
 *     description: Get the completion status of the user's application profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile completion status retrieved successfully
 */
router.get('/completion', ApplicationProfileController.getProfileCompletion);

/**
 * @swagger
 * /api/v1/profile/pre-population:
 *   get:
 *     tags: [Application Profile]
 *     summary: Get pre-population data
 *     description: Get data for pre-populating application forms
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: petId
 *         schema:
 *           type: string
 *         description: Optional pet ID for pet-specific customizations
 *     responses:
 *       200:
 *         description: Pre-population data retrieved successfully
 */
router.get(
  '/pre-population',
  [query('petId').optional().isString().withMessage('Pet ID must be a string')],
  ApplicationProfileController.getPrePopulationData
);

/**
 * @swagger
 * /api/v1/profile/quick-application:
 *   post:
 *     tags: [Application Profile]
 *     summary: Process quick application request
 *     description: Validate if user can proceed with quick application and get pre-population data
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - petId
 *               - useDefaultData
 *             properties:
 *               petId:
 *                 type: string
 *                 description: ID of the pet to apply for
 *               useDefaultData:
 *                 type: boolean
 *                 description: Whether to use default profile data
 *               customizations:
 *                 type: object
 *                 description: Optional pet-specific customizations
 *     responses:
 *       200:
 *         description: Quick application can proceed
 *       400:
 *         description: Profile not complete enough for quick application
 */
router.post(
  '/quick-application',
  [
    body('petId').notEmpty().isString().withMessage('Pet ID is required and must be a string'),
    body('useDefaultData').isBoolean().withMessage('useDefaultData must be a boolean'),
    body('customizations').optional().isObject().withMessage('customizations must be an object'),
  ],
  ApplicationProfileController.processQuickApplication
);

export default router;
