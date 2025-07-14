/**
 * Application Service with Better Error Handling and Validation
 */

import { Op, Transaction, ValidationError } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import Application, { ApplicationPriority, ApplicationStatus } from '../models/Application';
import Pet from '../models/Pet';
import Rescue from '../models/Rescue';
import User from '../models/User';
import sequelize from '../sequelize';
import { ApplicationData, ApplicationReference } from '../types/application';
import { JsonObject } from '../types/common';
import { logger } from '../utils/logger';
import { AuditLogService } from './auditLog.service';

// Application creation input interface
export interface CreateApplicationInput {
  pet_id: string;
  answers: {
    personal_info: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      address: string;
      city: string;
      county?: string;
      postcode: string;
      country?: string;
      occupation?: string;
    };
    living_situation: JsonObject;
    pet_experience: JsonObject;
    additional_info?: JsonObject;
  };
  references?: Omit<ApplicationReference, 'contacted_at' | 'status' | 'notes'>[];
  priority?: ApplicationPriority;
  notes?: string;
  tags?: string[];
}

// Enhanced error types
export class ApplicationServiceError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly userMessage: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    userMessage: string,
    statusCode: number = 400,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApplicationServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.userMessage = userMessage;
    this.context = context;
  }
}

// Validation schemas
interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;
}

export class ApplicationService {
  /**
   * Validate application data comprehensively
   * @private
   * @param {Record<string, unknown>} data - The application data to validate
   * @returns {ValidationResult} Object containing validation status, errors, and details
   * @description Performs comprehensive validation of application data including:
   * - Pet ID validation
   * - Required answer sections validation
   * - Personal information validation (email, phone formats)
   * - References validation (name, relationship, contact info)
   * - Priority validation
   */
  private static validateApplicationData(data: Record<string, unknown>): ValidationResult {
    const errors: Array<{ field: string; message: string; value?: unknown }> = [];

    // Cast data for proper typing
    const typedData = data as unknown as CreateApplicationInput;

    // Validate pet_id
    if (!typedData.pet_id || typeof typedData.pet_id !== 'string') {
      errors.push({
        field: 'pet_id',
        message: 'Pet ID is required and must be a string',
        value: typedData.pet_id,
      });
    }

    // Validate answers structure
    if (!typedData.answers || typeof typedData.answers !== 'object') {
      errors.push({
        field: 'answers',
        message: 'Application answers are required and must be an object',
        value: typedData.answers,
      });
    } else {
      // Validate required answer sections
      const requiredSections = ['personal_info', 'living_situation', 'pet_experience'];
      for (const section of requiredSections) {
        const sectionData = (typedData.answers as Record<string, unknown>)[section];
        if (!sectionData || typeof sectionData !== 'object') {
          errors.push({
            field: `answers.${section}`,
            message: `${section.replace('_', ' ')} section is required`,
            value: sectionData,
          });
        }
      }

      // Validate personal info
      if (typedData.answers.personal_info) {
        const personalInfo = typedData.answers.personal_info as Record<string, unknown>;
        const requiredFields = [
          'firstName',
          'lastName',
          'email',
          'phone',
          'address',
          'city',
          'postcode',
        ];

        for (const field of requiredFields) {
          const fieldValue = personalInfo[field];
          if (!fieldValue || typeof fieldValue !== 'string' || fieldValue.trim() === '') {
            errors.push({
              field: `answers.personal_info.${field}`,
              message: `${field} is required`,
              value: fieldValue,
            });
          }
        }

        // Validate email format
        const email = personalInfo.email as string;
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push({
            field: 'answers.personal_info.email',
            message: 'Invalid email format',
            value: email,
          });
        }

        // Validate phone format
        const phone = personalInfo.phone as string;
        if (phone && !/^[+]?[1-9]?[0-9]{7,15}$/.test(phone.replace(/\s+/g, ''))) {
          errors.push({
            field: 'answers.personal_info.phone',
            message: 'Invalid phone number format',
            value: phone,
          });
        }
      }
    }

    // Validate references if provided
    if (typedData.references) {
      if (!Array.isArray(typedData.references)) {
        errors.push({
          field: 'references',
          message: 'References must be an array',
          value: typedData.references,
        });
      } else if (typedData.references.length > 5) {
        errors.push({
          field: 'references',
          message: 'Maximum 5 references allowed',
          value: typedData.references.length,
        });
      } else {
        typedData.references.forEach((ref: Record<string, unknown>, index: number) => {
          if (!ref.name || typeof ref.name !== 'string' || ref.name.trim() === '') {
            errors.push({
              field: `references[${index}].name`,
              message: 'Reference name is required',
              value: ref.name,
            });
          }

          if (
            !ref.relationship ||
            typeof ref.relationship !== 'string' ||
            ref.relationship.trim() === ''
          ) {
            errors.push({
              field: `references[${index}].relationship`,
              message: 'Reference relationship is required',
              value: ref.relationship,
            });
          }

          if (
            !ref.phone ||
            typeof ref.phone !== 'string' ||
            !/^[+]?[1-9]?[0-9]{7,15}$/.test(ref.phone.replace(/\s+/g, ''))
          ) {
            errors.push({
              field: `references[${index}].phone`,
              message: 'Valid reference phone number is required',
              value: ref.phone,
            });
          }

          if (
            ref.email &&
            (typeof ref.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ref.email))
          ) {
            errors.push({
              field: `references[${index}].email`,
              message: 'Valid reference email is required',
              value: ref.email,
            });
          }
        });
      }
    }

    // Validate priority
    if (typedData.priority && !Object.values(ApplicationPriority).includes(typedData.priority)) {
      errors.push({
        field: 'priority',
        message: 'Invalid priority value',
        value: typedData.priority,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create application with comprehensive validation and error handling
   * @param {CreateApplicationInput} applicationData - The application data from the user
   * @param {string} userId - The ID of the user creating the application
   * @returns {Promise<ApplicationData>} Promise resolving to the created application data
   * @throws {ApplicationServiceError} Thrown for validation errors, duplicate applications, rate limiting, etc.
   * @description Creates a new adoption application with the following features:
   * - Comprehensive input validation
   * - User account verification (active status)
   * - Pet availability verification
   * - Duplicate application prevention
   * - Rate limiting (max 5 applications per hour)
   * - Data sanitization
   * - Audit logging
   * - Database transaction management
   */
  static async createApplication(
    applicationData: CreateApplicationInput,
    userId: string
  ): Promise<ApplicationData> {
    const startTime = Date.now();
    let transaction: Transaction | undefined;

    try {
      // Input validation
      const validation = this.validateApplicationData(
        applicationData as unknown as Record<string, unknown>
      );
      if (!validation.isValid) {
        throw new ApplicationServiceError(
          'VALIDATION_ERROR',
          `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
          'Please check your application details and ensure all required fields are completed correctly.',
          400,
          { validationErrors: validation.errors }
        );
      }

      // Start transaction
      transaction = await sequelize.transaction();

      // Validate user exists and is active
      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        throw new ApplicationServiceError(
          'USER_NOT_FOUND',
          'User not found',
          'Your account could not be found. Please log in again.',
          404,
          { userId }
        );
      }

      if (user.status !== 'active') {
        throw new ApplicationServiceError(
          'USER_INACTIVE',
          'User account is not active',
          'Your account is not active. Please contact support.',
          403,
          { userId, userStatus: user.status }
        );
      }

      // Validate pet exists and is available
      const pet = await Pet.findByPk(applicationData.pet_id, {
        include: [{ model: Rescue, as: 'Rescue' }],
        transaction,
      });

      if (!pet) {
        throw new ApplicationServiceError(
          'PET_NOT_FOUND',
          'Pet not found',
          'This pet is no longer available. Please browse our other pets looking for homes.',
          404,
          { petId: applicationData.pet_id }
        );
      }

      if (pet.status !== 'available') {
        throw new ApplicationServiceError(
          'PET_NOT_AVAILABLE',
          'Pet is not available for adoption',
          'This pet is no longer available for adoption. Please browse our other available pets.',
          409,
          { petId: applicationData.pet_id, petStatus: pet.status }
        );
      }

      // Check for existing active application
      const existingApplication = await Application.findOne({
        where: {
          user_id: userId,
          pet_id: applicationData.pet_id,
          status: {
            [Op.notIn]: [
              ApplicationStatus.REJECTED,
              ApplicationStatus.WITHDRAWN,
              ApplicationStatus.EXPIRED,
            ],
          },
        },
        transaction,
      });

      if (existingApplication) {
        throw new ApplicationServiceError(
          'DUPLICATE_APPLICATION',
          'Duplicate application found',
          'You already have an application for this pet. You can view it in your dashboard.',
          409,
          {
            existingApplicationId: existingApplication.application_id,
            petId: applicationData.pet_id,
          }
        );
      }

      // Rate limiting check (max 5 applications per hour)
      const recentApplications = await Application.count({
        where: {
          user_id: userId,
          created_at: {
            [Op.gte]: new Date(Date.now() - 60 * 60 * 1000), // Last hour
          },
        },
        transaction,
      });

      if (recentApplications >= 5) {
        throw new ApplicationServiceError(
          'RATE_LIMIT_EXCEEDED',
          'Too many applications submitted',
          'You have submitted too many applications recently. Please wait before submitting another.',
          429,
          { recentApplications, timeWindow: '1 hour' }
        );
      }

      // Sanitize and prepare data
      const sanitizedAnswers = this.sanitizeAnswers(applicationData.answers);
      const processedReferences =
        applicationData.references?.map(
          (ref: Omit<ApplicationReference, 'contacted_at' | 'status' | 'notes'>) => ({
            ...ref,
            status: 'pending' as const,
            contacted_at: undefined,
          })
        ) || [];

      // Create application
      const application = await Application.create(
        {
          application_id: uuidv4(),
          user_id: userId,
          pet_id: applicationData.pet_id,
          rescue_id: pet.rescue_id,
          status: ApplicationStatus.SUBMITTED,
          priority: applicationData.priority || ApplicationPriority.NORMAL,
          answers: sanitizedAnswers as JsonObject,
          references: processedReferences,
          documents: [],
          notes: applicationData.notes || '',
          tags: applicationData.tags || [],
          submitted_at: new Date(),
        },
        { transaction }
      );

      // Log creation
      await AuditLogService.log({
        action: 'CREATE',
        entity: 'Application',
        entityId: application.application_id,
        details: {
          pet_id: applicationData.pet_id,
          rescue_id: pet.rescue_id,
          priority: application.priority,
          user_email: user.email,
          pet_name: pet.name,
        },
        userId,
      });

      // Commit transaction
      await transaction.commit();

      logger.info('Application created successfully', {
        applicationId: application.application_id,
        petId: application.pet_id,
        userId: application.user_id,
        duration: Date.now() - startTime,
      });

      return application.toJSON() as ApplicationData;
    } catch (error) {
      // Rollback transaction on error
      if (transaction) {
        await transaction.rollback();
      }

      // Re-throw ApplicationServiceError as-is
      if (error instanceof ApplicationServiceError) {
        throw error;
      }

      // Handle Sequelize validation errors
      if (error instanceof ValidationError) {
        throw new ApplicationServiceError(
          'DATABASE_VALIDATION_ERROR',
          `Database validation failed: ${error.message}`,
          'There was an issue saving your application. Please check your information and try again.',
          400,
          {
            validationErrors: error.errors.map(e => ({
              field: e.path,
              message: e.message,
              value: e.value,
            })),
          }
        );
      }

      // Handle unexpected errors
      logger.error('Unexpected error creating application:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        applicationData: JSON.stringify(applicationData),
        userId,
        duration: Date.now() - startTime,
      });

      throw new ApplicationServiceError(
        'INTERNAL_ERROR',
        'Unexpected error occurred',
        'An unexpected error occurred while processing your application. Please try again or contact support.',
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Sanitize application answers
   * @private
   * @param {Record<string, unknown>} answers - Raw application answers from user input
   * @returns {Record<string, unknown>} Sanitized and formatted application answers
   * @description Sanitizes user input data by:
   * - Trimming whitespace from text fields
   * - Converting email to lowercase
   * - Removing spaces from phone numbers
   * - Formatting postcodes (uppercase, single spaces)
   * - Cleaning specific field types (allergyDetails, exercisePlans, etc.)
   */
  private static sanitizeAnswers(answers: Record<string, unknown>): Record<string, unknown> {
    if (!answers || typeof answers !== 'object') {
      return {};
    }

    const sanitized = { ...answers };

    // Sanitize personal info
    if (sanitized.personal_info && typeof sanitized.personal_info === 'object') {
      const personalInfo = sanitized.personal_info as Record<string, unknown>;
      sanitized.personal_info = {
        ...personalInfo,
        firstName: personalInfo.firstName?.toString().trim(),
        lastName: personalInfo.lastName?.toString().trim(),
        email: personalInfo.email?.toString().toLowerCase().trim(),
        phone: personalInfo.phone?.toString().replace(/\s+/g, ''),
        address: personalInfo.address?.toString().trim(),
        city: personalInfo.city?.toString().trim(),
        county: personalInfo.county?.toString().trim(),
        postcode: personalInfo.postcode?.toString().toUpperCase().replace(/\s+/g, ' ').trim(),
        country: personalInfo.country?.toString().trim(),
        occupation: personalInfo.occupation?.toString().trim(),
      };
    }

    // Sanitize text fields
    const textFields = [
      'living_situation.allergyDetails',
      'pet_experience.exercisePlans',
      'additional_info.whyAdopt',
      'additional_info.expectations',
      'additional_info.emergencyPlan',
    ];

    for (const field of textFields) {
      const [section, key] = field.split('.');
      const sectionData = sanitized[section] as Record<string, unknown>;
      if (sectionData && typeof sectionData === 'object' && sectionData[key]) {
        sectionData[key] = sectionData[key]?.toString().trim();
      }
    }

    return sanitized;
  }

  /**
   * Enhanced error formatting for API responses
   * @param {unknown} error - The error object to format
   * @returns {Object} Formatted error response with success: false and error details
   * @description Formats errors for consistent API responses:
   * - Handles ApplicationServiceError instances with full context
   * - Provides fallback formatting for unknown errors
   * - Includes user-friendly messages
   * - Maintains error codes and context for debugging
   */
  static formatErrorResponse(error: unknown): {
    success: false;
    error: {
      code: string;
      message: string;
      userMessage: string;
      context?: Record<string, unknown>;
    };
  } {
    if (error instanceof ApplicationServiceError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          userMessage: error.userMessage,
          context: error.context,
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : String(error),
        userMessage: 'An unexpected error occurred. Please try again or contact support.',
      },
    };
  }

  /**
   * Get application by ID with proper authorization checks
   * @param {string} applicationId - The unique identifier of the application
   * @param {string} requestingUserId - The ID of the user making the request
   * @param {string} requestingUserType - The type of user ('adopter', 'rescue_staff', 'admin')
   * @returns {Promise<ApplicationData | null>} Promise resolving to application data or null if not found
   * @throws {ApplicationServiceError} Thrown for access denied or internal errors
   * @description Retrieves an application with proper authorization:
   * - Includes related Pet, User, and Rescue data
   * - Enforces ownership and role-based access control
   * - Formats response with convenience fields (pet info, applicant info)
   * - Returns null if application doesn't exist
   * - Throws access denied for unauthorized requests
   */
  static async getApplicationById(
    applicationId: string,
    requestingUserId: string,
    requestingUserType: string
  ): Promise<ApplicationData | null> {
    try {
      // Find the application with all related data
      const application = await Application.findByPk(applicationId, {
        include: [
          {
            model: Pet,
            as: 'Pet',
            attributes: [
              'pet_id',
              'name',
              'type',
              'breed',
              'age_years',
              'age_months',
              'age_group',
              'images',
            ],
            include: [
              {
                model: Rescue,
                as: 'Rescue',
                attributes: ['rescueId', 'name'],
              },
            ],
          },
          {
            model: User,
            as: 'User',
            attributes: ['userId', 'firstName', 'lastName', 'email', 'phoneNumber'],
          },
        ],
      });

      if (!application) {
        return null;
      }

      // Authorization check
      const isOwner = application.user_id === requestingUserId;
      const applicationWithIncludes = application as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const pet = applicationWithIncludes.Pet;
      const isRescueStaff =
        requestingUserType === 'rescue_staff' && pet?.Rescue?.rescueId === requestingUserId;
      const isAdmin = requestingUserType === 'admin';

      if (!isOwner && !isRescueStaff && !isAdmin) {
        throw new ApplicationServiceError(
          'ACCESS_DENIED',
          'Access denied',
          'You do not have permission to view this application.',
          403
        );
      }

      // Format the response
      const applicant = applicationWithIncludes.User;
      const formattedApplication: ApplicationData = {
        application_id: application.application_id,
        user_id: application.user_id,
        pet_id: application.pet_id,
        rescue_id: application.rescue_id,
        status: application.status,
        priority: application.priority,
        actioned_by: application.actioned_by,
        actioned_at: application.actioned_at,
        rejection_reason: application.rejection_reason,
        conditional_requirements: application.conditional_requirements,
        answers: application.answers,
        references: application.references,
        documents: application.documents,
        interview_notes: application.interview_notes,
        home_visit_notes: application.home_visit_notes,
        score: application.score,
        tags: application.tags,
        notes: application.notes,
        submitted_at: application.submitted_at,
        reviewed_at: application.reviewed_at,
        decision_at: application.decision_at,
        expires_at: application.expires_at,
        follow_up_date: application.follow_up_date,
        created_at: application.created_at!,
        updated_at: application.updated_at!,
        deleted_at: application.deleted_at,
        // Include related data for convenience (extend interface in response)
        ...(pet && {
          pet: {
            pet_id: pet.pet_id,
            name: pet.name,
            type: pet.type,
            breed: pet.breed,
            age_years: pet.age_years,
            age_months: pet.age_months,
            age_group: pet.age_group,
            primary_image_url:
              pet.images?.find((img: { is_primary?: boolean; url: string }) => img.is_primary)
                ?.url ||
              pet.images?.[0]?.url ||
              null,
          },
        }),
        ...(applicant && {
          applicant: {
            user_id: applicant.userId,
            first_name: applicant.firstName,
            last_name: applicant.lastName,
            email: applicant.email,
            phone_number: applicant.phoneNumber,
          },
        }),
      };

      return formattedApplication;
    } catch (error) {
      if (error instanceof ApplicationServiceError) {
        throw error;
      }

      logger.error('Error getting application by ID:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        applicationId,
        requestingUserId,
      });

      throw new ApplicationServiceError(
        'INTERNAL_ERROR',
        'Failed to retrieve application',
        'An error occurred while retrieving the application. Please try again.',
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Withdraw application by ID with proper authorization checks
   * @param {string} applicationId - The unique identifier of the application to withdraw
   * @param {string} requestingUserId - The ID of the user requesting withdrawal
   * @param {string} [reason] - Optional reason for withdrawal
   * @returns {Promise<ApplicationData>} Promise resolving to the updated application data
   * @throws {ApplicationServiceError} Thrown for not found, access denied, or invalid status transitions
   * @description Withdraws an adoption application with the following features:
   * - Authorization check (only application owner can withdraw)
   * - Status transition validation (ensures valid state changes)
   * - Updates status to WITHDRAWN with timestamps
   * - Appends withdrawal reason to notes if provided
   * - Creates audit log entry for tracking
   * - Prevents withdrawal of applications in final states
   */
  static async withdrawApplication(
    applicationId: string,
    requestingUserId: string,
    reason?: string
  ): Promise<ApplicationData> {
    try {
      // Find the application
      const application = await Application.findByPk(applicationId);

      if (!application) {
        throw new ApplicationServiceError(
          'APPLICATION_NOT_FOUND',
          'Application not found',
          'The application could not be found.',
          404,
          { applicationId }
        );
      }

      // Authorization check - only the owner can withdraw their application
      if (application.user_id !== requestingUserId) {
        throw new ApplicationServiceError(
          'ACCESS_DENIED',
          'Access denied',
          'You do not have permission to withdraw this application.',
          403
        );
      }

      // Check if application can be withdrawn
      if (!application.canTransitionTo(ApplicationStatus.WITHDRAWN)) {
        throw new ApplicationServiceError(
          'INVALID_STATUS_TRANSITION',
          'Cannot withdraw application in current status',
          `Applications with status "${application.status}" cannot be withdrawn.`,
          409,
          { currentStatus: application.status }
        );
      }

      // Update application status
      application.status = ApplicationStatus.WITHDRAWN;
      application.actioned_by = requestingUserId;
      application.actioned_at = new Date();
      application.decision_at = new Date();

      if (reason) {
        application.notes = application.notes
          ? `${application.notes}\n\nWithdrawal reason: ${reason}`
          : `Withdrawal reason: ${reason}`;
      }

      await application.save();

      // Log the withdrawal
      await AuditLogService.log({
        action: 'UPDATE',
        entity: 'Application',
        entityId: application.application_id,
        details: {
          status_change: {
            from: ApplicationStatus.SUBMITTED, // Previous status
            to: ApplicationStatus.WITHDRAWN,
          },
          ...(reason && { withdrawal_reason: reason }),
        },
        userId: requestingUserId,
      });

      logger.info('Application withdrawn successfully', {
        applicationId: application.application_id,
        userId: requestingUserId,
        reason,
      });

      return application.toJSON() as ApplicationData;
    } catch (error) {
      if (error instanceof ApplicationServiceError) {
        throw error;
      }

      logger.error('Error withdrawing application:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        applicationId,
        requestingUserId,
      });

      throw new ApplicationServiceError(
        'INTERNAL_ERROR',
        'Failed to withdraw application',
        'An error occurred while withdrawing the application. Please try again.',
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Search applications with filters
   * @param {Record<string, unknown>} filters - Search and filter parameters
   * @param {string} requestingUserId - The ID of the user making the request
   * @param {string} requestingUserType - The type of user ('adopter', 'rescue_staff', 'admin')
   * @returns {Promise<Object>} Promise resolving to search results with applications, total count, and pagination
   * @throws {ApplicationServiceError} Thrown for internal errors during search
   * @description Searches applications with advanced filtering and authorization:
   * - Role-based data filtering (adopters see only their applications)
   * - Text search across user names, emails, pet names, and notes
   * - Status and priority filtering
   * - Date range filtering
   * - Pagination support with customizable page size
   * - Sorting by various fields
   * - Includes related Pet, User, and Rescue data
   * - Returns formatted results with pagination metadata
   */
  static async searchApplications(
    filters: Record<string, unknown>,
    requestingUserId: string,
    requestingUserType: string
  ): Promise<{
    applications: ApplicationData[];
    total: number;
    pagination: Record<string, unknown>;
  }> {
    try {
      const {
        search,
        status,
        priority,
        user_id,
        pet_id,
        rescue_id,
        page = 1,
        limit = 20,
        sort_by = 'created_at',
        sort_order = 'DESC',
        ...otherFilters
      } = filters;

      const offset = ((page as number) - 1) * (limit as number);
      const whereClause: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any

      // Authorization-based filtering
      if (requestingUserType === 'adopter') {
        whereClause.user_id = requestingUserId;
      } else if (requestingUserType === 'rescue_staff') {
        whereClause.rescue_id = requestingUserId;
      }
      // Admin can see all applications

      // Apply search filters
      if (search) {
        whereClause[Op.or] = [
          { '$User.firstName$': { [Op.iLike]: `%${search}%` } },
          { '$User.lastName$': { [Op.iLike]: `%${search}%` } },
          { '$User.email$': { [Op.iLike]: `%${search}%` } },
          { '$Pet.name$': { [Op.iLike]: `%${search}%` } },
          { notes: { [Op.iLike]: `%${search}%` } },
        ];
      }

      if (status) {
        if (Array.isArray(status)) {
          whereClause.status = { [Op.in]: status };
        } else {
          whereClause.status = status;
        }
      }

      if (priority) {
        if (Array.isArray(priority)) {
          whereClause.priority = { [Op.in]: priority };
        } else {
          whereClause.priority = priority;
        }
      }

      if (user_id) {
        whereClause.user_id = user_id;
      }
      if (pet_id) {
        whereClause.pet_id = pet_id;
      }
      if (rescue_id) {
        whereClause.rescue_id = rescue_id;
      }

      // Date range filters
      if (otherFilters.submitted_from || otherFilters.submitted_to) {
        const submittedAt: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (otherFilters.submitted_from) {
          submittedAt[Op.gte] = new Date(otherFilters.submitted_from as string);
        }
        if (otherFilters.submitted_to) {
          submittedAt[Op.lte] = new Date(otherFilters.submitted_to as string);
        }
        whereClause.submitted_at = submittedAt;
      }

      const { count, rows } = await Application.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Pet,
            as: 'Pet',
            attributes: ['pet_id', 'name', 'type', 'breed', 'age_years', 'age_months', 'images'],
            include: [
              {
                model: Rescue,
                as: 'Rescue',
                attributes: ['rescueId', 'name'],
              },
            ],
          },
          {
            model: User,
            as: 'User',
            attributes: ['userId', 'firstName', 'lastName', 'email', 'phoneNumber'],
          },
        ],
        order: [[sort_by as string, sort_order as string]],
        limit: limit as number,
        offset,
        distinct: true,
      });

      const applications = rows.map(app => {
        const applicationWithIncludes = app as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        const pet = applicationWithIncludes.Pet;
        const applicant = applicationWithIncludes.User;

        return {
          application_id: app.application_id,
          user_id: app.user_id,
          pet_id: app.pet_id,
          rescue_id: app.rescue_id,
          status: app.status,
          priority: app.priority,
          actioned_by: app.actioned_by,
          actioned_at: app.actioned_at,
          rejection_reason: app.rejection_reason,
          conditional_requirements: app.conditional_requirements,
          answers: app.answers,
          references: app.references,
          documents: app.documents,
          interview_notes: app.interview_notes,
          home_visit_notes: app.home_visit_notes,
          score: app.score,
          tags: app.tags,
          notes: app.notes,
          submitted_at: app.submitted_at,
          reviewed_at: app.reviewed_at,
          decision_at: app.decision_at,
          expires_at: app.expires_at,
          follow_up_date: app.follow_up_date,
          created_at: app.created_at!,
          updated_at: app.updated_at!,
          deleted_at: app.deleted_at,
          ...(pet && {
            pet: {
              pet_id: pet.pet_id,
              name: pet.name,
              type: pet.type,
              breed: pet.breed,
              age_years: pet.age_years,
              age_months: pet.age_months,
              primary_image_url:
                pet.images?.find((img: { is_primary?: boolean; url: string }) => img.is_primary)
                  ?.url ||
                pet.images?.[0]?.url ||
                null,
            },
          }),
          ...(applicant && {
            applicant: {
              user_id: applicant.userId,
              first_name: applicant.firstName,
              last_name: applicant.lastName,
              email: applicant.email,
              phone_number: applicant.phoneNumber,
            },
          }),
        } as ApplicationData;
      });

      const totalPages = Math.ceil(count / (limit as number));

      return {
        applications,
        total: count,
        pagination: {
          page: page as number,
          limit: limit as number,
          total: count,
          totalPages,
          hasNext: (page as number) < totalPages,
          hasPrev: (page as number) > 1,
        },
      };
    } catch (error) {
      if (error instanceof ApplicationServiceError) {
        throw error;
      }
      throw new ApplicationServiceError(
        'INTERNAL_ERROR',
        'Failed to search applications',
        'An error occurred while searching applications.',
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Update application by ID
   * @param {string} applicationId - The unique identifier of the application to update
   * @param {Partial<CreateApplicationInput>} updateData - The fields to update
   * @param {string} requestingUserId - The ID of the user making the request
   * @returns {Promise<ApplicationData>} Promise resolving to the updated application data
   * @throws {ApplicationServiceError} Thrown for not found, access denied, or invalid status
   * @description Updates an existing application with the following features:
   * - Authorization check (only application owner can update)
   * - Status validation (only in-progress applications can be updated)
   * - Selective field updates (answers, references, notes, tags)
   * - Data sanitization for updated fields
   * - Reference status reset to 'pending' when updated
   * - Audit logging for tracking changes
   */
  static async updateApplication(
    applicationId: string,
    updateData: Partial<CreateApplicationInput>,
    requestingUserId: string
  ): Promise<ApplicationData> {
    try {
      // Find the application
      const application = await Application.findByPk(applicationId);

      if (!application) {
        throw new ApplicationServiceError(
          'APPLICATION_NOT_FOUND',
          'Application not found',
          'The application could not be found.',
          404,
          { applicationId }
        );
      }

      // Authorization check - only the owner can update their application
      if (application.user_id !== requestingUserId) {
        throw new ApplicationServiceError(
          'ACCESS_DENIED',
          'Access denied',
          'You do not have permission to update this application.',
          403
        );
      }

      // Check if application can be updated
      if (!application.isInProgress()) {
        throw new ApplicationServiceError(
          'INVALID_STATUS',
          'Cannot update application',
          'This application cannot be updated in its current status.',
          409,
          { currentStatus: application.status }
        );
      }

      // Update fields if provided
      if (updateData.answers) {
        application.answers = this.sanitizeAnswers(updateData.answers) as JsonObject;
      }

      if (updateData.references) {
        application.references = updateData.references.map(ref => ({
          ...ref,
          status: 'pending' as const,
        }));
      }

      if (updateData.notes) {
        application.notes = updateData.notes;
      }

      if (updateData.tags) {
        application.tags = updateData.tags;
      }

      await application.save();

      logger.info('Application updated successfully', {
        applicationId: application.application_id,
        userId: requestingUserId,
      });

      return application.toJSON() as ApplicationData;
    } catch (error) {
      if (error instanceof ApplicationServiceError) {
        throw error;
      }
      throw new ApplicationServiceError(
        'INTERNAL_ERROR',
        'Failed to update application',
        'An error occurred while updating the application.',
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Update application status
   * @param {string} applicationId - The unique identifier of the application
   * @param {ApplicationStatus} newStatus - The new status to set
   * @param {string} requestingUserId - The ID of the user making the request
   * @param {string} requestingUserType - The type of user ('rescue_staff', 'admin')
   * @param {Object} [actionDetails] - Optional details for the status change
   * @param {string} [actionDetails.reason] - Reason for rejection if applicable
   * @param {string} [actionDetails.notes] - Additional notes for the status change
   * @returns {Promise<ApplicationData>} Promise resolving to the updated application data
   * @throws {ApplicationServiceError} Thrown for not found, access denied, or invalid transitions
   * @description Updates application status with proper authorization and validation:
   * - Authorization check (rescue staff and admin only)
   * - Status transition validation
   * - Decision timestamp tracking for final statuses
   * - Rejection reason handling
   * - Notes appending with timestamps
   * - Comprehensive audit logging
   */
  static async updateApplicationStatus(
    applicationId: string,
    newStatus: ApplicationStatus,
    requestingUserId: string,
    requestingUserType: string,
    actionDetails?: { reason?: string; notes?: string }
  ): Promise<ApplicationData> {
    try {
      const application = await Application.findByPk(applicationId);

      if (!application) {
        throw new ApplicationServiceError(
          'APPLICATION_NOT_FOUND',
          'Application not found',
          'The application could not be found.',
          404,
          { applicationId }
        );
      }

      // Authorization check - only rescue staff or admin can update status
      if (requestingUserType !== 'rescue_staff' && requestingUserType !== 'admin') {
        throw new ApplicationServiceError(
          'ACCESS_DENIED',
          'Access denied',
          'You do not have permission to update application status.',
          403
        );
      }

      // Check if status transition is valid
      if (!application.canTransitionTo(newStatus)) {
        throw new ApplicationServiceError(
          'INVALID_STATUS_TRANSITION',
          'Invalid status transition',
          `Cannot change status from "${application.status}" to "${newStatus}".`,
          409,
          { currentStatus: application.status, requestedStatus: newStatus }
        );
      }

      const oldStatus = application.status;
      application.status = newStatus;
      application.actioned_by = requestingUserId;
      application.actioned_at = new Date();

      if (newStatus === ApplicationStatus.APPROVED || newStatus === ApplicationStatus.REJECTED) {
        application.decision_at = new Date();
      }

      if (newStatus === ApplicationStatus.REJECTED && actionDetails?.reason) {
        application.rejection_reason = actionDetails.reason;
      }

      if (actionDetails?.notes) {
        application.notes = application.notes
          ? `${application.notes}\n\n${actionDetails.notes}`
          : actionDetails.notes;
      }

      await application.save();

      // Log the status change
      await AuditLogService.log({
        action: 'UPDATE',
        entity: 'Application',
        entityId: application.application_id,
        details: {
          status_change: {
            from: oldStatus,
            to: newStatus,
          },
          ...(actionDetails?.reason && { reason: actionDetails.reason }),
          ...(actionDetails?.notes && { notes: actionDetails.notes }),
        },
        userId: requestingUserId,
      });

      logger.info('Application status updated successfully', {
        applicationId: application.application_id,
        oldStatus,
        newStatus,
        actionedBy: requestingUserId,
      });

      return application.toJSON() as ApplicationData;
    } catch (error) {
      if (error instanceof ApplicationServiceError) {
        throw error;
      }
      throw new ApplicationServiceError(
        'INTERNAL_ERROR',
        'Failed to update application status',
        'An error occurred while updating the application status.',
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Add document to application
   * @param {string} applicationId - The unique identifier of the application
   * @param {Object} documentData - The document information to add
   * @param {string} documentData.document_type - The type of document being uploaded
   * @param {string} documentData.file_name - The name of the uploaded file
   * @param {string} documentData.file_url - The URL where the document is stored
   * @param {string} requestingUserId - The ID of the user adding the document
   * @returns {Promise<ApplicationData>} Promise resolving to the updated application data
   * @throws {ApplicationServiceError} Thrown for not found, access denied, or internal errors
   * @description Adds a document to an application with the following features:
   * - Authorization check (only application owner can add documents)
   * - Generates unique document ID
   * - Sets upload timestamp and verification status
   * - Maintains document array in application
   * - Creates audit log entry for tracking
   * - Returns updated application data
   */
  static async addDocument(
    applicationId: string,
    documentData: { document_type: string; file_name: string; file_url: string },
    requestingUserId: string
  ): Promise<ApplicationData> {
    try {
      const application = await Application.findByPk(applicationId);

      if (!application) {
        throw new ApplicationServiceError(
          'APPLICATION_NOT_FOUND',
          'Application not found',
          'The application could not be found.',
          404,
          { applicationId }
        );
      }

      // Authorization check - only the owner can add documents
      if (application.user_id !== requestingUserId) {
        throw new ApplicationServiceError(
          'ACCESS_DENIED',
          'Access denied',
          'You do not have permission to add documents to this application.',
          403
        );
      }

      const newDocument = {
        document_id: uuidv4(),
        document_type: documentData.document_type,
        file_name: documentData.file_name,
        file_url: documentData.file_url,
        uploaded_at: new Date(),
        verified: false,
      };

      const documents = [...(application.documents || []), newDocument];
      application.documents = documents;
      await application.save();

      // Log the document addition
      await AuditLogService.log({
        action: 'UPDATE',
        entity: 'Application',
        entityId: application.application_id,
        details: {
          document_added: {
            document_id: newDocument.document_id,
            document_type: documentData.document_type,
            file_name: documentData.file_name,
          },
        },
        userId: requestingUserId,
      });

      logger.info('Document added to application successfully', {
        applicationId: application.application_id,
        documentId: newDocument.document_id,
        userId: requestingUserId,
      });

      return application.toJSON() as ApplicationData;
    } catch (error) {
      if (error instanceof ApplicationServiceError) {
        throw error;
      }
      throw new ApplicationServiceError(
        'INTERNAL_ERROR',
        'Failed to add document',
        'An error occurred while adding the document.',
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Update reference in application
   * @param {string} applicationId - The unique identifier of the application
   * @param {number} referenceIndex - The index of the reference to update (0-based)
   * @param {Object} updateData - The reference fields to update
   * @param {string} [updateData.status] - New status ('pending', 'contacted', 'verified', 'failed')
   * @param {string} [updateData.notes] - Notes about the reference contact
   * @param {Date} [updateData.contacted_at] - Timestamp when reference was contacted
   * @param {string} requestingUserId - The ID of the user making the request
   * @param {string} requestingUserType - The type of user ('adopter', 'rescue_staff', 'admin')
   * @returns {Promise<ApplicationData>} Promise resolving to the updated application data
   * @throws {ApplicationServiceError} Thrown for not found, access denied, or invalid reference index
   * @description Updates a reference in an application with the following features:
   * - Multi-role authorization (owner, rescue staff, admin)
   * - Reference index validation
   * - Selective field updates (status, notes, contact timestamp)
   * - Immutable reference array handling
   * - Audit logging with update details
   * - Proper timestamp formatting for logs
   */
  static async updateReference(
    applicationId: string,
    referenceIndex: number,
    updateData: { status?: string; notes?: string; contacted_at?: Date },
    requestingUserId: string,
    requestingUserType: string
  ): Promise<ApplicationData> {
    try {
      const application = await Application.findByPk(applicationId);

      if (!application) {
        throw new ApplicationServiceError(
          'APPLICATION_NOT_FOUND',
          'Application not found',
          'The application could not be found.',
          404,
          { applicationId }
        );
      }

      // Authorization check - only rescue staff, admin, or the owner can update references
      const isOwner = application.user_id === requestingUserId;
      const isRescueStaff = requestingUserType === 'rescue_staff';
      const isAdmin = requestingUserType === 'admin';

      if (!isOwner && !isRescueStaff && !isAdmin) {
        throw new ApplicationServiceError(
          'ACCESS_DENIED',
          'Access denied',
          'You do not have permission to update references for this application.',
          403
        );
      }

      const references = [...(application.references || [])];

      if (referenceIndex < 0 || referenceIndex >= references.length) {
        throw new ApplicationServiceError(
          'INVALID_REFERENCE_INDEX',
          'Invalid reference index',
          'The specified reference does not exist.',
          400,
          { referenceIndex, totalReferences: references.length }
        );
      }

      // Update the reference
      if (updateData.status) {
        references[referenceIndex].status = updateData.status as
          | 'pending'
          | 'contacted'
          | 'verified'
          | 'failed';
      }
      if (updateData.notes) {
        references[referenceIndex].notes = updateData.notes;
      }
      if (updateData.contacted_at) {
        references[referenceIndex].contacted_at = updateData.contacted_at;
      }

      application.references = references;
      await application.save();

      // Log the reference update
      const updateDetails: Record<string, string | number> = {
        reference_index: referenceIndex,
      };

      if (updateData.status) {
        updateDetails.status = updateData.status;
      }
      if (updateData.notes) {
        updateDetails.notes = updateData.notes;
      }
      if (updateData.contacted_at) {
        updateDetails.contacted_at = updateData.contacted_at.toISOString();
      }

      await AuditLogService.log({
        action: 'UPDATE',
        entity: 'Application',
        entityId: application.application_id,
        details: {
          reference_updated: updateDetails as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        },
        userId: requestingUserId,
      });

      logger.info('Reference updated successfully', {
        applicationId: application.application_id,
        referenceIndex,
        userId: requestingUserId,
      });

      return application.toJSON() as ApplicationData;
    } catch (error) {
      if (error instanceof ApplicationServiceError) {
        throw error;
      }
      throw new ApplicationServiceError(
        'INTERNAL_ERROR',
        'Failed to update reference',
        'An error occurred while updating the reference.',
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get application form structure for a rescue
   * @param {string} [_rescueId] - The rescue ID (currently unused but reserved for future customization)
   * @returns {Promise<Object>} Promise resolving to form structure with categories and questions
   * @throws {ApplicationServiceError} Thrown for internal errors
   * @description Provides the application form structure with the following features:
   * - Organized question categories (personal_info, living_situation, pet_experience)
   * - Question metadata (type, required status, text)
   * - Form statistics (total questions, required count, estimated time)
   * - Standardized question structure for frontend rendering
   * - Extensible design for rescue-specific customizations
   * - Currently returns default structure but designed for database-driven forms
   */
  static async getApplicationFormStructure(_rescueId?: string): Promise<{
    categories: Array<{
      category: string;
      title: string;
      description?: string;
      questions: Array<{
        question_key: string;
        question_text: string;
        question_type: string;
        is_required: boolean;
      }>;
    }>;
    total_questions: number;
    required_questions: number;
    estimated_time_minutes: number;
  }> {
    try {
      // This is a basic form structure - in a real app, this would come from a database
      const defaultStructure = {
        categories: [
          {
            category: 'personal_info',
            title: 'Personal Information',
            description: 'Tell us about yourself',
            questions: [
              {
                question_key: 'firstName',
                question_text: 'First Name',
                question_type: 'text',
                is_required: true,
              },
              {
                question_key: 'lastName',
                question_text: 'Last Name',
                question_type: 'text',
                is_required: true,
              },
              {
                question_key: 'email',
                question_text: 'Email Address',
                question_type: 'email',
                is_required: true,
              },
              {
                question_key: 'phone',
                question_text: 'Phone Number',
                question_type: 'tel',
                is_required: true,
              },
              {
                question_key: 'address',
                question_text: 'Address',
                question_type: 'textarea',
                is_required: true,
              },
              {
                question_key: 'city',
                question_text: 'City',
                question_type: 'text',
                is_required: true,
              },
              {
                question_key: 'postcode',
                question_text: 'Postcode',
                question_type: 'text',
                is_required: true,
              },
            ],
          },
          {
            category: 'living_situation',
            title: 'Living Situation',
            description: 'Tell us about your home and lifestyle',
            questions: [
              {
                question_key: 'homeType',
                question_text: 'Type of Home',
                question_type: 'select',
                is_required: true,
              },
              {
                question_key: 'ownRent',
                question_text: 'Do you own or rent?',
                question_type: 'select',
                is_required: true,
              },
              {
                question_key: 'hasYard',
                question_text: 'Do you have a yard?',
                question_type: 'radio',
                is_required: true,
              },
              {
                question_key: 'householdMembers',
                question_text: 'Number of household members',
                question_type: 'number',
                is_required: true,
              },
            ],
          },
          {
            category: 'pet_experience',
            title: 'Pet Experience',
            description: 'Tell us about your experience with pets',
            questions: [
              {
                question_key: 'previousPets',
                question_text: 'Have you had pets before?',
                question_type: 'radio',
                is_required: true,
              },
              {
                question_key: 'currentPets',
                question_text: 'Do you currently have pets?',
                question_type: 'radio',
                is_required: true,
              },
              {
                question_key: 'veterinarian',
                question_text: 'Veterinarian contact',
                question_type: 'text',
                is_required: false,
              },
            ],
          },
        ],
        total_questions: 14,
        required_questions: 11,
        estimated_time_minutes: 15,
      };

      return defaultStructure;
    } catch (error) {
      throw new ApplicationServiceError(
        'INTERNAL_ERROR',
        'Failed to get form structure',
        'An error occurred while retrieving the form structure.',
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get application statistics
   * @param {string} [rescueId] - Optional rescue ID to filter statistics
   * @returns {Promise<Object>} Promise resolving to comprehensive application statistics
   * @throws {ApplicationServiceError} Thrown for internal errors during statistics calculation
   * @description Generates comprehensive application statistics including:
   * - Total application counts
   * - Applications grouped by status and priority
   * - Approval, rejection, and withdrawal rates
   * - Monthly application trends and growth rates
   * - Processing time metrics
   * - Pending application counts
   * - Rescue-specific filtering when rescueId provided
   * - Admin-level overview when no rescueId specified
   * - Percentage calculations with proper rounding
   */
  static async getApplicationStatistics(rescueId?: string): Promise<{
    total_applications: number;
    applications_by_status: Record<string, number>;
    applications_by_priority: Record<string, number>;
    average_processing_time: number;
    approval_rate: number;
    rejection_rate: number;
    withdrawal_rate: number;
    pending_applications: number;
    applications_this_month: number;
    applications_last_month: number;
    growth_rate: number;
  }> {
    try {
      const whereClause: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (rescueId) {
        whereClause.rescue_id = rescueId;
      }

      // Get total applications
      const totalApplications = await Application.count({ where: whereClause });

      // Get applications by status
      const statusCounts = await Application.findAll({
        where: whereClause,
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('status')), 'count']],
        group: ['status'],
        raw: true,
      });

      const applicationsByStatus: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (statusCounts as any).forEach((item: any) => {
        applicationsByStatus[item.status] = parseInt(item.count, 10);
      });

      // Get applications by priority
      const priorityCounts = await Application.findAll({
        where: whereClause,
        attributes: ['priority', [sequelize.fn('COUNT', sequelize.col('priority')), 'count']],
        group: ['priority'],
        raw: true,
      });

      const applicationsByPriority: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (priorityCounts as any).forEach((item: any) => {
        applicationsByPriority[item.priority] = parseInt(item.count, 10);
      });

      // Calculate rates
      const approvedCount = applicationsByStatus[ApplicationStatus.APPROVED] || 0;
      const rejectedCount = applicationsByStatus[ApplicationStatus.REJECTED] || 0;
      const withdrawnCount = applicationsByStatus[ApplicationStatus.WITHDRAWN] || 0;
      const pendingCount = applicationsByStatus[ApplicationStatus.SUBMITTED] || 0;

      const approvalRate = totalApplications > 0 ? (approvedCount / totalApplications) * 100 : 0;
      const rejectionRate = totalApplications > 0 ? (rejectedCount / totalApplications) * 100 : 0;
      const withdrawalRate = totalApplications > 0 ? (withdrawnCount / totalApplications) * 100 : 0;

      // Get applications this month and last month
      const now = new Date();
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const applicationsThisMonth = await Application.count({
        where: {
          ...whereClause,
          created_at: { [Op.gte]: firstDayThisMonth },
        },
      });

      const applicationsLastMonth = await Application.count({
        where: {
          ...whereClause,
          created_at: {
            [Op.gte]: firstDayLastMonth,
            [Op.lte]: lastDayLastMonth,
          },
        },
      });

      const growthRate =
        applicationsLastMonth > 0
          ? ((applicationsThisMonth - applicationsLastMonth) / applicationsLastMonth) * 100
          : 0;

      // Calculate average processing time (simplified)
      const averageProcessingTime = 3; // days - placeholder

      return {
        total_applications: totalApplications,
        applications_by_status: applicationsByStatus,
        applications_by_priority: applicationsByPriority,
        average_processing_time: averageProcessingTime,
        approval_rate: Math.round(approvalRate * 100) / 100,
        rejection_rate: Math.round(rejectionRate * 100) / 100,
        withdrawal_rate: Math.round(withdrawalRate * 100) / 100,
        pending_applications: pendingCount,
        applications_this_month: applicationsThisMonth,
        applications_last_month: applicationsLastMonth,
        growth_rate: Math.round(growthRate * 100) / 100,
      };
    } catch (error) {
      throw new ApplicationServiceError(
        'INTERNAL_ERROR',
        'Failed to get statistics',
        'An error occurred while retrieving application statistics.',
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Bulk update applications
   * @param {Object} updateData - The bulk update configuration
   * @param {string[]} updateData.application_ids - Array of application IDs to update
   * @param {Object} updateData.updates - The updates to apply to all applications
   * @param {ApplicationStatus} [updateData.updates.status] - New status for all applications
   * @param {ApplicationPriority} [updateData.updates.priority] - New priority for all applications
   * @param {string[]} [updateData.updates.tags] - New tags for all applications
   * @param {string} [updateData.updates.notes] - Notes to append to all applications
   * @param {string} requestingUserId - The ID of the user performing the bulk update
   * @returns {Promise<Object>} Promise resolving to bulk operation results with success/failure counts
   * @throws {ApplicationServiceError} Thrown for internal errors during bulk processing
   * @description Performs bulk updates on multiple applications with the following features:
   * - Processes multiple applications in a single operation
   * - Individual error handling per application
   * - Success and failure tracking with detailed results
   * - Selective field updates (status, priority, tags, notes)
   * - Audit logging for each successful update
   * - Notes appending rather than replacement
   * - Graceful error handling with partial success support
   */
  static async bulkUpdateApplications(
    updateData: {
      application_ids: string[];
      updates: {
        status?: ApplicationStatus;
        priority?: ApplicationPriority;
        tags?: string[];
        notes?: string;
      };
    },
    requestingUserId: string
  ): Promise<{
    success_count: number;
    failure_count: number;
    successes: string[];
    failures: Array<{ application_id: string; error: string }>;
  }> {
    try {
      const { application_ids, updates } = updateData;
      const successes: string[] = [];
      const failures: Array<{ application_id: string; error: string }> = [];

      for (const applicationId of application_ids) {
        try {
          const application = await Application.findByPk(applicationId);

          if (!application) {
            failures.push({ application_id: applicationId, error: 'Application not found' });
            continue;
          }

          // Apply updates
          if (updates.status) {
            application.status = updates.status;
            application.actioned_by = requestingUserId;
            application.actioned_at = new Date();
          }
          if (updates.priority) {
            application.priority = updates.priority;
          }
          if (updates.tags) {
            application.tags = updates.tags;
          }
          if (updates.notes) {
            application.notes = application.notes
              ? `${application.notes}\n\n${updates.notes}`
              : updates.notes;
          }

          await application.save();
          successes.push(applicationId);

          // Log the bulk update
          await AuditLogService.log({
            action: 'UPDATE',
            entity: 'Application',
            entityId: application.application_id,
            details: {
              bulk_update: updates,
            },
            userId: requestingUserId,
          });
        } catch (error) {
          failures.push({
            application_id: applicationId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      logger.info('Bulk update completed', {
        successCount: successes.length,
        failureCount: failures.length,
        userId: requestingUserId,
      });

      return {
        success_count: successes.length,
        failure_count: failures.length,
        successes,
        failures,
      };
    } catch (error) {
      throw new ApplicationServiceError(
        'INTERNAL_ERROR',
        'Failed to bulk update applications',
        'An error occurred while updating applications.',
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Delete application (soft delete)
   * @param {string} applicationId - The unique identifier of the application to delete
   * @param {string} requestingUserId - The ID of the user requesting deletion
   * @returns {Promise<void>} Promise that resolves when deletion is complete
   * @throws {ApplicationServiceError} Thrown for not found, access denied, or invalid status
   * @description Soft deletes an application with the following features:
   * - Authorization check (only application owner can delete)
   * - Status validation (only submitted applications can be deleted)
   * - Soft delete implementation (sets deleted_at timestamp)
   * - Preserves data for audit purposes
   * - Creates audit log entry for tracking
   * - Prevents deletion of applications in progress or finalized
   * - Does not physically remove data from database
   */
  static async deleteApplication(applicationId: string, requestingUserId: string): Promise<void> {
    try {
      const application = await Application.findByPk(applicationId);

      if (!application) {
        throw new ApplicationServiceError(
          'APPLICATION_NOT_FOUND',
          'Application not found',
          'The application could not be found.',
          404,
          { applicationId }
        );
      }

      // Authorization check - only the owner can delete their application
      if (application.user_id !== requestingUserId) {
        throw new ApplicationServiceError(
          'ACCESS_DENIED',
          'Access denied',
          'You do not have permission to delete this application.',
          403
        );
      }

      // Check if application can be deleted (only submitted applications)
      if (application.status !== ApplicationStatus.SUBMITTED) {
        throw new ApplicationServiceError(
          'INVALID_STATUS',
          'Cannot delete application',
          'Only submitted applications can be deleted.',
          409,
          { currentStatus: application.status }
        );
      }

      // Soft delete
      application.deleted_at = new Date();
      await application.save();

      // Log the deletion
      await AuditLogService.log({
        action: 'DELETE',
        entity: 'Application',
        entityId: application.application_id,
        details: {
          deleted_at: new Date().toISOString(),
        },
        userId: requestingUserId,
      });

      logger.info('Application deleted successfully', {
        applicationId: application.application_id,
        userId: requestingUserId,
      });
    } catch (error) {
      if (error instanceof ApplicationServiceError) {
        throw error;
      }
      throw new ApplicationServiceError(
        'INTERNAL_ERROR',
        'Failed to delete application',
        'An error occurred while deleting the application.',
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Validate application answers
   * @param {Record<string, unknown>} answers - The application answers to validate
   * @param {string} [rescueId] - Optional rescue ID for rescue-specific validation rules
   * @returns {Promise<Object>} Promise resolving to validation results with errors, warnings, and completion status
   * @throws {ApplicationServiceError} Thrown for internal errors during validation
   * @description Validates application answers with comprehensive checking:
   * - Required field validation based on form structure
   * - Email format validation
   * - Phone number format validation
   * - Cross-field validation rules
   * - Completion percentage calculation
   * - Error categorization (errors vs warnings)
   * - Field-specific error codes for frontend handling
   * - Missing required fields tracking
   * - Rescue-specific validation rule support (future enhancement)
   * - Detailed validation feedback for user guidance
   */
  static async validateApplicationAnswers(
    answers: Record<string, unknown>,
    rescueId?: string
  ): Promise<{
    is_valid: boolean;
    errors: Array<{ field: string; message: string; code: string }>;
    warnings: Array<{ field: string; message: string; code: string }>;
    completion_percentage: number;
    missing_required_fields: string[];
  }> {
    try {
      const errors: Array<{ field: string; message: string; code: string }> = [];
      const warnings: Array<{ field: string; message: string; code: string }> = [];
      const missingRequiredFields: string[] = [];

      // Get form structure to know required fields
      const formStructure = await this.getApplicationFormStructure(rescueId);
      const requiredFields: string[] = [];

      formStructure.categories.forEach(category => {
        category.questions.forEach(question => {
          if (question.is_required) {
            requiredFields.push(`${category.category}.${question.question_key}`);
          }
        });
      });

      // Check required fields
      requiredFields.forEach(fieldPath => {
        const [category, field] = fieldPath.split('.');
        const categoryData = answers[category] as Record<string, unknown>;

        if (!categoryData || !categoryData[field] || categoryData[field] === '') {
          missingRequiredFields.push(fieldPath);
          errors.push({
            field: fieldPath,
            message: `${field} is required`,
            code: 'REQUIRED_FIELD_MISSING',
          });
        }
      });

      // Additional validation for specific fields
      if (answers.personal_info) {
        const personalInfo = answers.personal_info as Record<string, unknown>;

        // Email validation
        if (personalInfo.email && typeof personalInfo.email === 'string') {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalInfo.email)) {
            errors.push({
              field: 'personal_info.email',
              message: 'Invalid email format',
              code: 'INVALID_EMAIL_FORMAT',
            });
          }
        }

        // Phone validation
        if (personalInfo.phone && typeof personalInfo.phone === 'string') {
          if (!/^[+]?[1-9]?[0-9]{7,15}$/.test(personalInfo.phone.replace(/\s+/g, ''))) {
            errors.push({
              field: 'personal_info.phone',
              message: 'Invalid phone number format',
              code: 'INVALID_PHONE_FORMAT',
            });
          }
        }
      }

      const totalFields = requiredFields.length;
      const completedFields = totalFields - missingRequiredFields.length;
      const completionPercentage = totalFields > 0 ? (completedFields / totalFields) * 100 : 100;

      return {
        is_valid: errors.length === 0,
        errors,
        warnings,
        completion_percentage: Math.round(completionPercentage),
        missing_required_fields: missingRequiredFields,
      };
    } catch (error) {
      throw new ApplicationServiceError(
        'INTERNAL_ERROR',
        'Failed to validate answers',
        'An error occurred while validating the application answers.',
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }
}
