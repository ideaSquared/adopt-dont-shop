import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ApplicationPriority, ApplicationStatus } from '../models/Application';
import { HomeVisitStatus } from '../models/HomeVisit';
import { UserType } from '../models/User';
import { ApplicationService } from '../services/application.service';
import { AuthenticatedRequest } from '../types';
import {
  ApplicationDocument,
  ApplicationSearchFilters,
  ApplicationSearchOptions,
  ApplicationStatusUpdateRequest,
  CreateApplicationRequest,
  FrontendApplication,
} from '../types/application';
import { logger } from '../utils/logger';
import { RichTextProcessingService } from '../services/rich-text-processing.service';
import { BaseController } from './base.controller';

export class ApplicationController extends BaseController {
  // Validation rules
  static validateCreateApplication = [
    body('petId').isString().notEmpty().withMessage('Valid pet ID is required'),
    body('answers').isObject().withMessage('Answers must be an object'),
    body('references')
      .optional()
      .isArray({ max: 5 })
      .withMessage('Maximum 5 references allowed'),
    body('references.*.name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Reference name must be between 2 and 100 characters'),
    body('references.*.relationship')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Reference relationship must be between 2 and 100 characters'),
    body('references.*.phone')
      .optional()
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
    body('interviewNotes')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Interview notes must not exceed 2000 characters'),
    body('homeVisitNotes')
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
    body('rejectionReason')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Rejection reason must not exceed 1000 characters'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Notes must not exceed 2000 characters'),
    body('followUpDate')
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
    query('userId').optional().isUUID().withMessage('Valid user ID required'),
    query('petId').optional().isUUID().withMessage('Valid pet ID required'),
    query('rescueId').optional().isUUID().withMessage('Valid rescue ID required'),
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
      .isIn(['createdAt', 'updatedAt', 'submittedAt', 'status', 'priority', 'score'])
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
    body('documentType')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Document type is required and must be less than 100 characters'),
    body('fileName')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('File name is required and must be less than 255 characters'),
    body('fileUrl').isURL().withMessage('Valid file URL is required'),
  ];

  static validateReferenceUpdate = [
    param('applicationId')
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('Valid application ID is required'),
    // Support both reference_index and referenceId approaches for flexible reference handling
    body().custom(value => {
      if (!value.reference_index && !value.referenceId) {
        throw new Error('Either reference_index or referenceId is required');
      }
      return true;
    }),
    body('referenceIndex')
      .optional()
      .isInt({ min: 0, max: 4 })
      .withMessage('Reference index must be between 0 and 4'),
    body('referenceId')
      .optional()
      .matches(/^ref-\d+$/)
      .withMessage('Reference ID must be in format ref-X (e.g., ref-0, ref-1)'),
    body('status')
      .isIn(['pending', 'contacted', 'verified', 'failed'])
      .withMessage('Invalid reference status'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes must not exceed 500 characters'),
    body('contactedAt')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('Contacted date must be a valid date'),
  ];

  static validateBulkUpdate = [
    body('applicationIds')
      .isArray({ min: 1 })
      .withMessage('Application IDs must be a non-empty array'),
    body('applicationIds.*').isUUID().withMessage('Each application ID must be a valid UUID'),
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

  /**
   * Transform database Application model to frontend-compatible format
   */
  protected transformApplicationModel(
    applicationModel: Record<string, unknown>
  ): FrontendApplication {
    const User = applicationModel.User as Record<string, unknown> | undefined;
    const Pet = applicationModel.Pet as Record<string, unknown> | undefined;

    // Extract personal info from answers (common pattern in adoption forms)
    const answers = (applicationModel.answers as Record<string, unknown>) || {};

    const personalInfo = {
      firstName:
        (User?.firstName as string) ||
        (answers.firstName as string) ||
        (answers.first_name as string),
      lastName:
        (User?.lastName as string) || (answers.lastName as string) || (answers.last_name as string),
      email: (User?.email as string) || (answers.email as string),
      phone:
        (User?.phoneNumber as string) ||
        (answers.phone as string) ||
        (answers.phoneNumber as string) ||
        (answers.phone_number as string),
      address:
        (User?.addressLine1 as string) ||
        (answers.address as string) ||
        (answers.street_address as string),
      city: (User?.city as string) || (answers.city as string),
      state: answers.state as string, // State typically comes from form answers
      zipCode:
        (User?.postalCode as string) || (answers.zipCode as string) || (answers.zip_code as string),
      dateOfBirth: User?.dateOfBirth
        ? new Date(User.dateOfBirth as string).toISOString().split('T')[0]
        : (answers.dateOfBirth as string),
      occupation: answers.occupation as string, // Occupation typically comes from form answers
    };

    // Extract living situation from answers
    const livingsituation = {
      housingType: answers.housing_type as string,
      isOwned: answers.home_ownership === 'owned',
      hasYard: answers.yard_fenced as boolean,
      householdSize: answers.household_members
        ? (answers.household_members as Record<string, unknown>[]).length
        : 1,
      hasAllergies: false, // Not in current data, could be added to form
    };

    // Extract pet experience from answers
    const petExperience = {
      hasPetsCurrently: (answers.current_pets as Record<string, unknown>[])?.length > 0,
      experienceLevel: answers.experience_level as string,
      willingToTrain: answers.training_experience !== 'No experience',
      hoursAloneDaily: answers.hours_alone as string,
      exercisePlans: answers.exercise_plan as string,
    };

    // Extract references from answers
    const references = {
      personal: answers.emergency_contact
        ? [
            {
              name: (answers.emergency_contact as Record<string, string>).name,
              phone: (answers.emergency_contact as Record<string, string>).phone,
              relationship: (answers.emergency_contact as Record<string, string>).relationship,
              yearsKnown: 'Unknown', // Not in current data
            },
          ]
        : [],
      veterinarian: answers.veterinarian
        ? {
            name: (answers.veterinarian as Record<string, string>).name,
            phone: (answers.veterinarian as Record<string, string>).phone,
            clinicName: (answers.veterinarian as Record<string, string>).clinic,
          }
        : undefined,
    };

    // Type assertion justified: The data structure is intentionally flexible to accommodate
    // varying application form schemas across different rescues
    const transformed: FrontendApplication = {
      id: applicationModel.applicationId as string,
      petId: applicationModel.petId as string,
      userId: applicationModel.userId as string,
      rescueId: applicationModel.rescueId as string,
      status: applicationModel.status as ApplicationStatus,
      submittedAt: applicationModel.submittedAt as string,
      reviewedAt: applicationModel.reviewedAt as string,
      reviewedBy: applicationModel.actionedBy as string,
      reviewNotes: applicationModel.notes as string,
      data: {
        personalInfo,
        livingConditions:
          livingsituation as unknown as FrontendApplication['data']['livingConditions'],
        petExperience: petExperience as unknown as FrontendApplication['data']['petExperience'],
        references: references as unknown as FrontendApplication['data']['references'],
        answers: answers,
      },
      documents:
        (applicationModel.documents as ApplicationDocument[])?.map(doc => ({
          id: doc.documentId,
          type: doc.documentType,
          filename: doc.fileName,
          url: doc.fileUrl,
          uploadedAt: doc.uploadedAt?.toString() || new Date().toISOString(),
        })) || [],
      createdAt: applicationModel.createdAt as string,
      updatedAt: applicationModel.updatedAt as string,
    };

    // Add pet information if available
    if (Pet) {
      transformed.petName = Pet.name as string;
      transformed.petType = Pet.type as string;
      transformed.petBreed = Pet.breed as string;
    }

    // Add user information if available
    if (User) {
      transformed.userName = `${User.firstName as string} ${User.lastName as string}`.trim();
      transformed.userEmail = User.email as string;
    }

    return transformed;
  }

  // Get applications with filtering and pagination
  getApplications = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.sendValidationError(res, errors.array());
      }

      const filters: ApplicationSearchFilters = {
        search: req.query.search as string,
        userId: req.query.userId as string,
        petId: req.query.petId as string,
        rescueId: req.query.rescueId as string,
        status: req.query.status as ApplicationStatus,
        priority: req.query.priority as ApplicationPriority,
        score_min: req.query.score_min ? parseFloat(req.query.score_min as string) : undefined,
        score_max: req.query.score_max ? parseFloat(req.query.score_max as string) : undefined,
        createdFrom: req.query.createdFrom ? new Date(req.query.createdFrom as string) : undefined,
        createdTo: req.query.createdTo ? new Date(req.query.createdTo as string) : undefined,
        submittedFrom: req.query.submittedFrom
          ? new Date(req.query.submittedFrom as string)
          : undefined,
        submittedTo: req.query.submittedTo ? new Date(req.query.submittedTo as string) : undefined,
      };

      const options: ApplicationSearchOptions = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: (req.query.sortBy as string) || 'createdAt',
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

      // Transform the applications to frontend format
      const transformedApplications = result.applications.map(app =>
        this.transformApplicationModel(app as unknown as Record<string, unknown>)
      );

      return this.sendPaginatedSuccess(res, transformedApplications, {
        total: result.total_filtered || 0,
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalPages: result.pagination.totalPages,
      });
    } catch (error) {
      logger.error('Error getting applications:', error);
      return this.sendError(
        res,
        'Failed to retrieve applications',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
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
        petId: req.body.petId,
        answers: req.body.answers,
        references: req.body.references,
        priority: req.body.priority,
        notes:
          req.body.notes !== undefined
            ? RichTextProcessingService.sanitize(req.body.notes)
            : undefined,
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

      // Transform the raw application data to frontend format
      const transformedApplication = this.transformApplicationModel(
        application as unknown as Record<string, unknown>
      );

      res.status(200).json({
        success: true,
        data: transformedApplication,
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
      if (typeof req.body.notes === 'string') {
        req.body.notes = RichTextProcessingService.sanitize(req.body.notes);
      }
      if (typeof req.body.interviewNotes === 'string') {
        req.body.interviewNotes = RichTextProcessingService.sanitize(req.body.interviewNotes);
      }
      if (typeof req.body.homeVisitNotes === 'string') {
        req.body.homeVisitNotes = RichTextProcessingService.sanitize(req.body.homeVisitNotes);
      }
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
        actionedBy: req.user!.userId,
        rejectionReason:
          typeof req.body.rejectionReason === 'string'
            ? RichTextProcessingService.sanitize(req.body.rejectionReason)
            : req.body.rejectionReason,
        notes:
          typeof req.body.notes === 'string'
            ? RichTextProcessingService.sanitize(req.body.notes)
            : req.body.notes,
        followUpDate: req.body.followUpDate,
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

  // Application history now provided by timeline events
  getApplicationHistory = async (req: Request, res: Response) => {
    try {
      // Application history is now handled by the timeline system
      res.status(200).json({
        success: true,
        data: [],
        message: 'Application history is now available through timeline events',
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

  // Home Visits CRUD operations
  getHomeVisits = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { applicationId } = req.params;
      const HomeVisit = (await import('../models/HomeVisit')).default;

      const visits = await HomeVisit.findAll({
        where: { application_id: applicationId },
        order: [['created_at', 'DESC']],
      });

      // If no visits exist, return empty array
      if (visits.length === 0) {
        return res.json({
          success: true,
          visits: [],
        });
      }

      // Convert to frontend format
      const formattedVisits = visits.map(visit => ({
        id: visit.visit_id,
        applicationId: visit.application_id,
        scheduledDate: visit.scheduled_date,
        scheduledTime: visit.scheduled_time,
        assignedStaff: visit.assigned_staff,
        status: visit.status,
        notes: visit.notes,
        outcome: visit.outcome,
        outcomeNotes: visit.outcome_notes,
        rescheduleReason: visit.reschedule_reason,
        cancelledReason: visit.cancelled_reason,
        completedAt: visit.completed_at?.toISOString(),
      }));

      res.json({
        success: true,
        visits: formattedVisits,
      });
    } catch (error) {
      logger.error('Error getting home visits:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve home visits',
      });
    }
  };

  scheduleHomeVisit = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { applicationId } = req.params;
      const { scheduled_date, scheduled_time, assigned_staff, notes } = req.body;

      if (!scheduled_date || !scheduled_time || !assigned_staff) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: scheduled_date, scheduled_time, assigned_staff',
        });
      }

      const HomeVisit = (await import('../models/HomeVisit')).default;

      // Generate a unique visit_id
      const visitId = `visit_${applicationId}_${Date.now()}`;

      const visit = await HomeVisit.create({
        visit_id: visitId,
        application_id: applicationId,
        scheduled_date,
        scheduled_time,
        assigned_staff,
        notes,
        status: HomeVisitStatus.SCHEDULED,
      });

      // Update application status to indicate scheduling progress
      const Application = (await import('../models/Application')).default;
      await Application.update(
        { status: ApplicationStatus.SUBMITTED },
        { where: { applicationId: applicationId } }
      );

      res.status(201).json({
        success: true,
        message: 'Home visit scheduled successfully',
        visit: {
          id: visit.visit_id,
          applicationId: visit.application_id,
          scheduledDate: visit.scheduled_date,
          scheduledTime: visit.scheduled_time,
          assignedStaff: visit.assigned_staff,
          status: visit.status,
          notes: visit.notes,
        },
      });
    } catch (error) {
      logger.error('Error scheduling home visit:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to schedule home visit',
      });
    }
  };

  updateHomeVisit = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { applicationId, visitId } = req.params;
      const updateData = req.body;

      const HomeVisit = (await import('../models/HomeVisit')).default;

      const visit = await HomeVisit.findOne({
        where: { visit_id: visitId, application_id: applicationId },
      });

      if (!visit) {
        return res.status(404).json({
          success: false,
          message: 'Home visit not found',
        });
      }

      // Convert frontend camelCase to backend snake_case
      const dbUpdateData: Record<string, string | Date | null> = {};
      if (updateData.scheduledDate) {
        dbUpdateData.scheduled_date = updateData.scheduledDate;
      }
      if (updateData.scheduledTime) {
        dbUpdateData.scheduled_time = updateData.scheduledTime;
      }
      if (updateData.assignedStaff) {
        dbUpdateData.assigned_staff = updateData.assignedStaff;
      }
      if (updateData.status) {
        dbUpdateData.status = updateData.status;
      }
      if (updateData.notes !== undefined) {
        dbUpdateData.notes = updateData.notes;
      }
      if (updateData.outcome) {
        dbUpdateData.outcome = updateData.outcome;
      }
      if (updateData.outcomeNotes !== undefined) {
        dbUpdateData.outcome_notes = updateData.outcomeNotes;
      }
      if (updateData.rescheduleReason !== undefined) {
        dbUpdateData.reschedule_reason = updateData.rescheduleReason;
      }
      if (updateData.cancelledReason !== undefined) {
        dbUpdateData.cancelled_reason = updateData.cancelledReason;
      }

      // Set completed_at when status changes to completed
      if (updateData.status === 'completed' && visit.status !== 'completed') {
        dbUpdateData.completed_at = new Date();
      }

      await visit.update(dbUpdateData);

      // Update application status based on visit outcome
      if (updateData.status === 'completed' && updateData.outcome) {
        const Application = (await import('../models/Application')).default;
        let applicationStatus: ApplicationStatus = ApplicationStatus.SUBMITTED;

        if (updateData.outcome === 'approved') {
          applicationStatus = ApplicationStatus.APPROVED;
        } else if (updateData.outcome === 'conditional') {
          applicationStatus = ApplicationStatus.APPROVED; // Treat conditional as approved
        } else if (updateData.outcome === 'rejected') {
          applicationStatus = ApplicationStatus.REJECTED;
        }

        await Application.update(
          { status: applicationStatus },
          { where: { applicationId: applicationId } }
        );
      }

      res.json({
        success: true,
        message: 'Home visit updated successfully',
        visit: {
          id: visit.visit_id,
          applicationId: visit.application_id,
          scheduledDate: visit.scheduled_date,
          scheduledTime: visit.scheduled_time,
          assignedStaff: visit.assigned_staff,
          status: visit.status,
          notes: visit.notes,
          outcome: visit.outcome,
          outcomeNotes: visit.outcome_notes,
          rescheduleReason: visit.reschedule_reason,
          cancelledReason: visit.cancelled_reason,
          completedAt: visit.completed_at?.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error updating home visit:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update home visit',
      });
    }
  };
}

export default new ApplicationController();
