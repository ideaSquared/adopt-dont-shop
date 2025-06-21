import express from 'express';
import { ApplicationController } from '../controllers/application.controller';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { UserType } from '../models/User';

const router = express.Router();
const applicationController = new ApplicationController();

// Public routes (no authentication required)
// None for applications - all require authentication

// Routes requiring authentication
router.use(authenticateToken);

// Get applications with filtering and pagination
router.get(
  '/',
  ApplicationController.validateGetApplications,
  applicationController.getApplications
);

// Create new application (adopters only)
router.post(
  '/',
  requireRole(UserType.ADOPTER),
  ApplicationController.validateCreateApplication,
  applicationController.createApplication
);

// Get application by ID
router.get(
  '/:applicationId',
  ApplicationController.validateApplicationId,
  applicationController.getApplicationById
);

// Update application (owner only for draft/submitted)
router.put(
  '/:applicationId',
  ApplicationController.validateUpdateApplication,
  applicationController.updateApplication
);

// Submit application for review (owner only)
router.post(
  '/:applicationId/submit',
  ApplicationController.validateApplicationId,
  applicationController.submitApplication
);

// Update application status (rescue staff/admin only)
router.patch(
  '/:applicationId/status',
  requireRole(UserType.RESCUE_STAFF, UserType.ADMIN),
  ApplicationController.validateUpdateApplicationStatus,
  applicationController.updateApplicationStatus
);

// Withdraw application (owner only)
router.post(
  '/:applicationId/withdraw',
  ApplicationController.validateApplicationId,
  applicationController.withdrawApplication
);

// Delete application (owner only)
router.delete(
  '/:applicationId',
  ApplicationController.validateApplicationId,
  applicationController.deleteApplication
);

// Add document to application (owner only)
router.post(
  '/:applicationId/documents',
  ApplicationController.validateDocumentUpload,
  applicationController.addDocument
);

// Update reference status (rescue staff/admin only)
router.patch(
  '/:applicationId/references',
  requireRole(UserType.RESCUE_STAFF, UserType.ADMIN),
  ApplicationController.validateReferenceUpdate,
  applicationController.updateReference
);

// Get application form structure for a rescue
router.get('/form-structure/:rescueId', applicationController.getApplicationFormStructure);

// Validate application answers
router.post('/validate/:rescueId', applicationController.validateApplicationAnswers);

// Get application statistics (rescue staff/admin only)
router.get(
  '/statistics',
  requireRole(UserType.RESCUE_STAFF, UserType.ADMIN),
  applicationController.getApplicationStatistics
);

// Bulk update applications (admin only)
router.patch(
  '/bulk-update',
  requireRole(UserType.ADMIN),
  ApplicationController.validateBulkUpdate,
  applicationController.bulkUpdateApplications
);

// Legacy routes for backwards compatibility
router.get(
  '/:applicationId/history',
  ApplicationController.validateApplicationId,
  applicationController.getApplicationHistory
);

router.post(
  '/:applicationId/schedule-visit',
  requireRole(UserType.RESCUE_STAFF, UserType.ADMIN),
  ApplicationController.validateApplicationId,
  applicationController.scheduleVisit
);

export default router;
