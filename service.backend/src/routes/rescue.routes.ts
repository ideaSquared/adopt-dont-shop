import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { RescueController } from '../controllers/rescue.controller';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();
const rescueController = new RescueController();

// Validation middleware
const validateRescueId = param('rescueId').isUUID().withMessage('Invalid rescue ID format');
const validateUserId = param('userId').isUUID().withMessage('Invalid user ID format');

const validateCreateRescue = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').optional().isMobilePhone('any').withMessage('Valid phone number required'),
  body('address')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Address must be 5-255 characters'),
  body('city').trim().isLength({ min: 2, max: 100 }).withMessage('City must be 2-100 characters'),
  body('state').trim().isLength({ min: 2, max: 100 }).withMessage('State must be 2-100 characters'),
  body('zipCode')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('ZIP code must be 3-20 characters'),
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
  body('contactPhone').optional().isMobilePhone('any').withMessage('Valid contact phone required'),
];

const validateUpdateRescue = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().isMobilePhone('any').withMessage('Valid phone number required'),
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
  body('state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('State must be 2-100 characters'),
  body('zipCode')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('ZIP code must be 3-20 characters'),
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
  body('contactPhone').optional().isMobilePhone('any').withMessage('Valid contact phone required'),
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
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Title must be max 100 characters'),
];

const validateVerification = [
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes must be max 500 characters'),
];

const validateDeletion = [
  body('reason').optional().isLength({ max: 500 }).withMessage('Reason must be max 500 characters'),
];

// Public routes (no authentication required)
router.get('/', validateSearchQuery, rescueController.searchRescues);
router.get('/:rescueId', validateRescueId, rescueController.getRescueById);
router.get('/:rescueId/pets', validateRescueId, rescueController.getRescuePets);

// Routes requiring authentication
router.use(authenticateToken);

// Create rescue (any authenticated user can apply)
router.post('/', validateCreateRescue, rescueController.createRescue);

// Update rescue (rescue admin or staff)
router.put(
  '/:rescueId',
  validateRescueId,
  validateUpdateRescue,
  requirePermission('RESCUE_MANAGEMENT'),
  rescueController.updateRescue
);

router.patch(
  '/:rescueId',
  validateRescueId,
  validateUpdateRescue,
  requirePermission('RESCUE_MANAGEMENT'),
  rescueController.updateRescue
);

// Staff management (rescue admin)
router.get(
  '/:rescueId/staff',
  validateRescueId,
  requirePermission('RESCUE_MANAGEMENT'),
  rescueController.getRescueStaff
);

router.post(
  '/:rescueId/staff',
  validateRescueId,
  validateStaffMember,
  requirePermission('RESCUE_MANAGEMENT'),
  rescueController.addStaffMember
);

router.delete(
  '/:rescueId/staff/:userId',
  validateRescueId,
  validateUserId,
  requirePermission('RESCUE_MANAGEMENT'),
  rescueController.removeStaffMember
);

// Analytics (rescue admin/staff)
router.get(
  '/:rescueId/analytics',
  validateRescueId,
  requirePermission('RESCUE_MANAGEMENT'),
  rescueController.getRescueAnalytics
);

// Admin-only routes
router.post(
  '/:rescueId/verify',
  validateRescueId,
  validateVerification,
  requirePermission('ADMIN_RESCUE_MANAGEMENT'),
  rescueController.verifyRescue
);

router.delete(
  '/:rescueId',
  validateRescueId,
  validateDeletion,
  requirePermission('ADMIN_RESCUE_MANAGEMENT'),
  rescueController.deleteRescue
);

export default router;
