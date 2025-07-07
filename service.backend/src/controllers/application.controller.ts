import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ApplicationPriority, ApplicationStatus } from '../models/Application';
import { UserType } from '../models/User';
import { ApplicationService } from '../services/application.service';
import { AuthenticatedRequest } from '../types';
import {
  ApplicationSearchFilters,
  ApplicationSearchOptions,
  ApplicationStatusUpdateRequest,
  CreateApplicationRequest,
} from '../types/application';
import { logger } from '../utils/logger';

export class ApplicationController {
  // Validation rules
  static validateCreateApplication = [
    body('pet_id').isUUID().withMessage('Valid pet ID is required'),
    body('answers').isObject().withMessage('Answers must be an object'),
    body('references')
      .isArray({ min: 1, max: 5 })
      .withMessage('At least 1 reference is required, maximum 5'),
    body('references.*.name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Reference name must be between 2 and 100 characters'),
    body('references.*.relationship')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Reference relationship must be between 2 and 100 characters'),
    body('references.*.phone')
      .matches(/^[+]?[1-9]?[0-9]{7,15}$/)
      .withMessage('Valid reference phone number is required'),
    body('references.*.email')
      .optional()
      .isEmail()
      .withMessage('Valid email address required for reference'),
    body('priority')
      .optional()
      .isIn(Object.values(ApplicationPriority))
      .withMessage('Invalid priority value'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Notes must not exceed 2000 characters'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
  ];

  static validateUpdateApplication = [
    param('applicationId')
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('Valid application ID is required'),
    body('answers').optional().isObject().withMessage('Answers must be an object'),
    body('references').optional().isArray({ max: 5 }).withMessage('Maximum 5 references allowed'),
    body('priority')
      .optional()
      .isIn(Object.values(ApplicationPriority))
      .withMessage('Invalid priority value'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Notes must not exceed 2000 characters'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('interview_notes')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Interview notes must not exceed 2000 characters'),
    body('home_visit_notes')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Home visit notes must not exceed 2000 characters'),
    body('score')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Score must be between 0 and 100'),
  ];

  static validateUpdateApplicationStatus = [
    param('applicationId')
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('Valid application ID is required'),
    body('status').isIn(Object.values(ApplicationStatus)).withMessage('Invalid status value'),
    body('rejection_reason')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Rejection reason must not exceed 1000 characters'),
    body('conditional_requirements')
      .optional()
      .isArray()
      .withMessage('Conditional requirements must be an array'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Notes must not exceed 2000 characters'),
    body('follow_up_date')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('Follow-up date must be a valid date'),
  ];

  static validateApplicationId = [
    param('applicationId')
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('Valid application ID is required'),
  ];

  static validateGetApplications = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('user_id').optional().isUUID().withMessage('Valid user ID required'),
    query('pet_id').optional().isUUID().withMessage('Valid pet ID required'),
    query('rescue_id').optional().isUUID().withMessage('Valid rescue ID required'),
    query('status')
      .optional()
      .isIn(Object.values(ApplicationStatus))
      .withMessage('Invalid status value'),
    query('priority')
      .optional()
      .isIn(Object.values(ApplicationPriority))
      .withMessage('Invalid priority value'),
    query('sortBy')
      .optional()
      .isIn(['created_at', 'updated_at', 'submitted_at', 'status', 'priority', 'score'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['ASC', 'DESC'])
      .withMessage('Sort order must be ASC or DESC'),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
    query('score_min')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Minimum score must be between 0 and 100'),
    query('score_max')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Maximum score must be between 0 and 100'),
  ];

  static validateDocumentUpload = [
    param('applicationId')
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('Valid application ID is required'),
    body('document_type')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Document type is required and must be less than 100 characters'),
    body('file_name')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('File name is required and must be less than 255 characters'),
    body('file_url').isURL().withMessage('Valid file URL is required'),
  ];

  static validateReferenceUpdate = [
    param('applicationId')
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('Valid application ID is required'),
    body('reference_index')
      .isInt({ min: 0, max: 4 })
      .withMessage('Reference index must be between 0 and 4'),
    body('status')
      .isIn(['pending', 'contacted', 'verified', 'failed'])
      .withMessage('Invalid reference status'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes must not exceed 500 characters'),
    body('contacted_at')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('Contacted date must be a valid date'),
  ];

  static validateBulkUpdate = [
    body('application_ids')
      .isArray({ min: 1 })
      .withMessage('Application IDs must be a non-empty array'),
    body('application_ids.*').isUUID().withMessage('Each application ID must be a valid UUID'),
    body('updates').isObject().withMessage('Updates must be an object'),
    body('updates.status')
      .optional()
      .isIn(Object.values(ApplicationStatus))
      .withMessage('Invalid status value'),
    body('updates.priority')
      .optional()
      .isIn(Object.values(ApplicationPriority))
      .withMessage('Invalid priority value'),
    body('updates.tags').optional().isArray().withMessage('Tags must be an array'),
    body('updates.notes')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Notes must not exceed 2000 characters'),
  ];

  // Get applications with filtering and pagination
  getApplications = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const filters: ApplicationSearchFilters = {
        search: req.query.search as string,
        user_id: req.query.user_id as string,
        pet_id: req.query.pet_id as string,
        rescue_id: req.query.rescue_id as string,
        status: req.query.status as ApplicationStatus,
        priority: req.query.priority as ApplicationPriority,
        score_min: req.query.score_min ? parseFloat(req.query.score_min as string) : undefined,
        score_max: req.query.score_max ? parseFloat(req.query.score_max as string) : undefined,
        created_from: req.query.created_from
          ? new Date(req.query.created_from as string)
          : undefined,
        created_to: req.query.created_to ? new Date(req.query.created_to as string) : undefined,
        submitted_from: req.query.submitted_from
          ? new Date(req.query.submitted_from as string)
          : undefined,
        submitted_to: req.query.submitted_to
          ? new Date(req.query.submitted_to as string)
          : undefined,
      };

      const options: ApplicationSearchOptions = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: (req.query.sortBy as string) || 'created_at',
        sortOrder: (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC',
        include_user: true,
        include_pet: true,
        include_rescue: false,
      };

      const result = await ApplicationService.searchApplications(
        filters,
        options,
        req.user!.userId,
        req.user!.userType as UserType
      );

      res.status(200).json({
        success: true,
        data: result.applications,
        pagination: result.pagination,
        filters_applied: result.filters_applied,
        total_filtered: result.total_filtered,
      });
    } catch (error) {
      logger.error('Error getting applications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve applications',
        error:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Unknown error'
            : undefined,
      });
    }
  };

  // Create new application
  createApplication = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const applicationData: CreateApplicationRequest = {
        pet_id: req.body.pet_id,
        answers: req.body.answers,
        references: req.body.references,
        priority: req.body.priority,
        notes: req.body.notes,
        tags: req.body.tags,
      };

      const application = await ApplicationService.createApplication(
        applicationData,
        req.user!.userId
      );

      res.status(201).json({
        success: true,
        message: 'Application created successfully',
        data: application,
      });
    } catch (error) {
      logger.error('Error creating application:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: errorMessage,
        });
      }

      if (
        errorMessage.includes('not available') ||
        errorMessage.includes('already have an active')
      ) {
        return res.status(409).json({
          success: false,
          message: errorMessage,
        });
      }

      if (errorMessage.includes('validation failed')) {
        return res.status(400).json({
          success: false,
          message: errorMessage,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create application',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      });
    }
  };

  // Get application by ID
  getApplicationById = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { applicationId } = req.params;
      const application = await ApplicationService.getApplicationById(
        applicationId,
        req.user!.userId,
        req.user!.userType as UserType
      );

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found',
        });
      }

      res.status(200).json({
        success: true,
        data: application,
      });
    } catch (error) {
      logger.error('Error getting application by ID:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Access denied') {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve application',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      });
    }
  };

  // Update application
  updateApplication = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { applicationId } = req.params;
      const application = await ApplicationService.updateApplication(
        applicationId,
        req.body,
        req.user!.userId
      );

      res.status(200).json({
        success: true,
        message: 'Application updated successfully',
        data: application,
      });
    } catch (error) {
      logger.error('Error updating application:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Application not found') {
        return res.status(404).json({
          success: false,
          message: 'Application not found',
        });
      }

      if (errorMessage === 'Access denied') {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      if (errorMessage.includes('cannot be updated')) {
        return res.status(409).json({
          success: false,
          message: errorMessage,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update application',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      });
    }
  };

  // Submit application
  submitApplication = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { applicationId } = req.params;
      const application = await ApplicationService.submitApplication(
        applicationId,
        req.user!.userId
      );

      res.status(200).json({
        success: true,
        message: 'Application submitted successfully',
        data: application,
      });
    } catch (error) {
      logger.error('Error submitting application:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Application not found') {
        return res.status(404).json({
          success: false,
          message: 'Application not found',
        });
      }

      if (errorMessage === 'Access denied') {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      if (errorMessage.includes('Only draft applications') || errorMessage.includes('incomplete')) {
        return res.status(400).json({
          success: false,
          message: errorMessage,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to submit application',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      });
    }
  };

  // Update application status
  updateApplicationStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { applicationId } = req.params;
      const statusUpdate: ApplicationStatusUpdateRequest = {
        status: req.body.status,
        actioned_by: req.user!.userId,
        rejection_reason: req.body.rejection_reason,
        conditional_requirements: req.body.conditional_requirements,
        notes: req.body.notes,
        follow_up_date: req.body.follow_up_date,
      };

      const application = await ApplicationService.updateApplicationStatus(
        applicationId,
        statusUpdate,
        req.user!.userId
      );

      res.status(200).json({
        success: true,
        message: 'Application status updated successfully',
        data: application,
      });
    } catch (error) {
      logger.error('Error updating application status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Application not found') {
        return res.status(404).json({
          success: false,
          message: 'Application not found',
        });
      }

      if (errorMessage.includes('Cannot transition')) {
        return res.status(400).json({
          success: false,
          message: errorMessage,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update application status',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      });
    }
  };

  // Withdraw application
  withdrawApplication = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { applicationId } = req.params;
      const application = await ApplicationService.withdrawApplication(
        applicationId,
        req.user!.userId
      );

      res.status(200).json({
        success: true,
        message: 'Application withdrawn successfully',
        data: application,
      });
    } catch (error) {
      logger.error('Error withdrawing application:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Application not found') {
        return res.status(404).json({
          success: false,
          message: 'Application not found',
        });
      }

      if (errorMessage === 'Access denied') {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      if (errorMessage.includes('cannot be withdrawn')) {
        return res.status(400).json({
          success: false,
          message: errorMessage,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to withdraw application',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      });
    }
  };

  // Add document to application
  addDocument = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { applicationId } = req.params;
      const application = await ApplicationService.addDocument(
        applicationId,
        req.body,
        req.user!.userId
      );

      res.status(200).json({
        success: true,
        message: 'Document added successfully',
        data: application,
      });
    } catch (error) {
      logger.error('Error adding document:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Application not found') {
        return res.status(404).json({
          success: false,
          message: 'Application not found',
        });
      }

      if (errorMessage === 'Access denied') {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to add document',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      });
    }
  };

  // Update reference
  updateReference = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { applicationId } = req.params;
      const application = await ApplicationService.updateReference(
        applicationId,
        req.body,
        req.user!.userId
      );

      res.status(200).json({
        success: true,
        message: 'Reference updated successfully',
        data: application,
      });
    } catch (error) {
      logger.error('Error updating reference:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Application not found') {
        return res.status(404).json({
          success: false,
          message: 'Application not found',
        });
      }

      if (errorMessage.includes('index out of bounds')) {
        return res.status(400).json({
          success: false,
          message: errorMessage,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update reference',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      });
    }
  };

  // Get application form structure
  getApplicationFormStructure = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { rescueId } = req.params;
      const formStructure = await ApplicationService.getApplicationFormStructure(rescueId);

      res.status(200).json({
        success: true,
        data: formStructure,
      });
    } catch (error) {
      logger.error('Error getting application form structure:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get application form structure',
        error:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Unknown error'
            : undefined,
      });
    }
  };

  // Get application statistics
  getApplicationStatistics = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rescueId = req.query.rescueId as string;
      const statistics = await ApplicationService.getApplicationStatistics(rescueId);

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      logger.error('Error getting application statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve application statistics',
        error:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Unknown error'
            : undefined,
      });
    }
  };

  // Bulk update applications
  bulkUpdateApplications = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const result = await ApplicationService.bulkUpdateApplications(req.body, req.user!.userId);

      res.status(200).json({
        success: true,
        message: 'Bulk update completed',
        data: result,
      });
    } catch (error) {
      logger.error('Error performing bulk update:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk update',
        error:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Unknown error'
            : undefined,
      });
    }
  };

  // Delete application
  deleteApplication = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { applicationId } = req.params;
      await ApplicationService.deleteApplication(applicationId, req.user!.userId);

      res.status(200).json({
        success: true,
        message: 'Application deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting application:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Application not found') {
        return res.status(404).json({
          success: false,
          message: 'Application not found',
        });
      }

      if (errorMessage === 'Access denied') {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete application',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      });
    }
  };

  // Validate application answers
  validateApplicationAnswers = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { rescueId } = req.params;
      const { answers } = req.body;

      if (!answers || typeof answers !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Answers object is required',
        });
      }

      const validation = await ApplicationService.validateApplicationAnswers(answers, rescueId);

      res.status(200).json({
        success: true,
        data: validation,
      });
    } catch (error) {
      logger.error('Error validating application answers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate application answers',
        error:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Unknown error'
            : undefined,
      });
    }
  };

  // Legacy methods for backwards compatibility
  getApplicationHistory = async (req: Request, res: Response) => {
    try {
      // This would need to be implemented with a proper audit/history system
      // For now, return empty array
      res.status(200).json({
        success: true,
        data: [],
        message: 'Application history feature not yet implemented',
      });
    } catch (error) {
      logger.error('Error getting application history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve application history',
      });
    }
  };

  scheduleVisit = async (req: AuthenticatedRequest, res: Response) => {
    try {
      // This would need to be implemented with visit scheduling functionality
      res.status(501).json({
        success: false,
        message: 'Visit scheduling feature not yet implemented',
      });
    } catch (error) {
      logger.error('Error scheduling visit:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to schedule visit',
      });
    }
  };
}

export default new ApplicationController();
