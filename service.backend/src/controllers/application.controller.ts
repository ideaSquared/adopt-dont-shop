import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { z } from 'zod';
import {
  ApplicationBulkUpdateRequestSchema,
  ApplicationDocumentUploadRequestSchema,
  ApplicationSearchQuerySchema,
  ApplicationStatusUpdateRequestSchema,
  CreateApplicationRequestSchema,
  ReferenceUpdateRequestSchema,
  UpdateApplicationRequestSchema,
} from '@adopt-dont-shop/lib.validation';
import { ApplicationPriority, ApplicationStatus } from '../models/Application';
import { HomeVisitStatus } from '../models/HomeVisit';
import { UserType } from '../models/User';
import { ApplicationService } from '../services/application.service';
import { FileUploadService } from '../services/file-upload.service';
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
import { validateBody, validateParams, validateQuery } from '../middleware/zod-validate';
import { BaseController } from './base.controller';

/** Reusable :applicationId param schema. */
const ApplicationIdParamSchema = z.object({
  applicationId: z
    .string()
    .min(1, 'Valid application ID is required')
    .max(255, 'Valid application ID is required'),
});

export class ApplicationController extends BaseController {
  // Validation rules — backed by canonical Zod schemas in
  // @adopt-dont-shop/lib.validation. Same rules, same error response
  // shape (see middleware/zod-validate), one source of truth shared
  // with the rescue / admin / client frontends.
  static validateCreateApplication = [validateBody(CreateApplicationRequestSchema)];

  static validateUpdateApplication = [
    validateParams(ApplicationIdParamSchema),
    validateBody(UpdateApplicationRequestSchema),
  ];

  static validateUpdateApplicationStatus = [
    validateParams(ApplicationIdParamSchema),
    validateBody(ApplicationStatusUpdateRequestSchema),
  ];

  static validateApplicationId = [validateParams(ApplicationIdParamSchema)];

  static validateGetApplications = [validateQuery(ApplicationSearchQuerySchema)];

  static validateDocumentUpload = [
    validateParams(ApplicationIdParamSchema),
    validateBody(ApplicationDocumentUploadRequestSchema),
  ];

  static validateReferenceUpdate = [
    validateParams(ApplicationIdParamSchema),
    validateBody(ReferenceUpdateRequestSchema),
  ];

  static validateBulkUpdate = [validateBody(ApplicationBulkUpdateRequestSchema)];

  /**
   * Transform database Application model to frontend-compatible format
   */
  protected transformApplicationModel(
    applicationModel: Record<string, unknown>
  ): FrontendApplication {
    const User = applicationModel.User as Record<string, unknown> | undefined;
    const Pet = applicationModel.Pet as Record<string, unknown> | undefined;

    // Extract personal info from answers (common pattern in adoption forms).
    // Answers live in the application_answers typed table now (plan 2.1).
    // The service layer projects them back into the legacy JsonObject
    // shape on `applicationModel.answers`, but eager-loaded reads can
    // also surface them via the `Answers` association — fall back to that
    // shape when the projected object isn't present.
    let answers = (applicationModel.answers as Record<string, unknown>) || {};
    if (Object.keys(answers).length === 0 && Array.isArray(applicationModel.Answers)) {
      const rows = applicationModel.Answers as Array<{
        question_key: string;
        answer_value: unknown;
      }>;
      answers = Object.fromEntries(rows.map(r => [r.question_key, r.answer_value]));
    }

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

    // Add pet information if available. Plan 2.4 — breed name lives
    // on the eager-loaded Breed association, not directly on Pet.
    if (Pet) {
      transformed.petName = Pet.name as string;
      transformed.petType = Pet.type as string;
      const petBreed = Pet.Breed as { name?: string } | undefined;
      transformed.petBreed = petBreed?.name ?? '';
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

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded. Supported formats: PDF, JPG, PNG, DOC, DOCX (max 5MB)',
        });
      }

      const { applicationId } = req.params;
      const documentType: string = req.body.documentType || 'OTHER';

      const uploadResult = await FileUploadService.uploadFile(req.file, 'applications', {
        uploadedBy: req.user!.userId,
        entityId: applicationId,
        entityType: 'application',
        purpose: 'document',
      });

      if (!uploadResult.success || !uploadResult.upload) {
        return res.status(500).json({
          success: false,
          message: 'Failed to store uploaded file',
        });
      }

      const application = await ApplicationService.addDocument(
        applicationId,
        {
          documentType,
          fileName: uploadResult.upload.original_filename,
          fileUrl: uploadResult.upload.url,
        },
        req.user!.userId
      );

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        document: {
          documentId: uploadResult.upload.upload_id,
          fileName: uploadResult.upload.original_filename,
          fileType: uploadResult.upload.mime_type,
          url: uploadResult.upload.url,
          uploadedAt: new Date().toISOString(),
        },
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

  // Remove document from application
  removeDocument = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { applicationId, documentId } = req.params;

      await ApplicationService.removeDocument(applicationId, documentId, req.user!.userId);

      res.status(200).json({
        success: true,
        message: 'Document removed successfully',
      });
    } catch (error) {
      logger.error('Error removing document:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Application not found' || errorMessage === 'Document not found') {
        return res.status(404).json({
          success: false,
          message: errorMessage,
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
        message: 'Failed to remove document',
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
      const HomeVisitStatusTransition = (await import('../models/HomeVisitStatusTransition'))
        .default;

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

      // Seed the transition log with the initial status.
      await HomeVisitStatusTransition.create({
        visitId: visit.visit_id,
        fromStatus: null,
        toStatus: visit.status,
        transitionedBy: req.user?.userId ?? null,
        reason: 'Visit scheduled',
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

      // Convert frontend camelCase to backend snake_case. Note: status is
      // handled separately via the transition log (below); we never write
      // it to the parent row directly.
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

      if (Object.keys(dbUpdateData).length > 0) {
        await visit.update(dbUpdateData);
      }

      // Append a transition row for the status change; the trigger / hook
      // updates home_visits.status.
      if (updateData.status && updateData.status !== visit.status) {
        const HomeVisitStatusTransition = (await import('../models/HomeVisitStatusTransition'))
          .default;
        await HomeVisitStatusTransition.create({
          visitId: visit.visit_id,
          fromStatus: visit.status,
          toStatus: updateData.status,
          transitionedBy: req.user?.userId ?? null,
          reason: updateData.cancelledReason || updateData.rescheduleReason || null,
        });
      }

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
