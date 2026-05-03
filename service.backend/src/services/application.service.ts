import { col, fn, Includeable, Op, Order, WhereOptions } from 'sequelize';
import { generateCryptoUuid as uuidv4 } from '../utils/uuid-helpers';
import Application, { ApplicationPriority, ApplicationStatus } from '../models/Application';
import ApplicationAnswer from '../models/ApplicationAnswer';
import ApplicationReferenceModel, {
  ApplicationReferenceStatus,
} from '../models/ApplicationReference';
import { validateSortField } from '../utils/sort-validation';

const APPLICATION_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'status',
  'actioned_at',
  'submittedAt',
] as const;
import ApplicationQuestion, { QuestionCategory } from '../models/ApplicationQuestion';
import ApplicationStatusTransition from '../models/ApplicationStatusTransition';
import Breed from '../models/Breed';
import Pet from '../models/Pet';
import User, { UserType } from '../models/User';
import sequelize from '../sequelize';
import { logger, loggerHelpers } from '../utils/logger';
import { AuditLogService } from './auditLog.service';
import ApplicationTimelineService from './applicationTimeline.service';
import { TimelineEventType } from '../models/ApplicationTimeline';
import { JsonObject, JsonValue } from '../types/common';

import {
  ApplicationData,
  ApplicationDocumentUpload,
  ApplicationFormStructure,
  ApplicationReference,
  ApplicationSearchFilters,
  ApplicationSearchOptions,
  ApplicationStatistics,
  ApplicationStatusUpdateRequest,
  ApplicationValidationResult,
  BulkApplicationResult,
  BulkApplicationUpdate,
  CreateApplicationRequest,
  PaginatedApplicationResponse,
  QuestionConfigData,
  ReferenceUpdateRequest,
  UpdateApplicationRequest,
} from '../types/application';

// Project a list of ApplicationAnswer rows back into the legacy
// JsonObject shape (key -> value). Stable wire shape — callers that
// used to read `application.answers` keep the same contract; the
// answers now come from the typed table via the `Answers` association
// (plan 2.1).
const answersToJson = (rows: ApplicationAnswer[] | undefined | null): JsonObject => {
  if (!rows || rows.length === 0) {
    return {};
  }
  return Object.fromEntries(rows.map(row => [row.question_key, row.answer_value])) as JsonObject;
};

// Load all answer rows for an application and project to JsonObject.
// Used by hot read paths that need the legacy `answers` shape.
const loadAnswersJson = async (applicationId: string): Promise<JsonObject> => {
  const rows = await ApplicationAnswer.findAll({
    where: { application_id: applicationId },
  });
  return answersToJson(rows);
};

export class ApplicationService {
  /**
   * Create a new application
   */
  static async createApplication(
    applicationData: CreateApplicationRequest,
    userId: string
  ): Promise<ApplicationData> {
    const startTime = Date.now();

    try {
      // Validate user exists (outside transaction — read-only, no race risk)
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return await sequelize.transaction(async t => {
        // Lock the pet row to prevent concurrent applications racing on status
        const pet = await Pet.findByPk(applicationData.petId, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (!pet) {
          throw new Error('Pet not found');
        }

        if (pet.status !== 'available') {
          throw new Error('Pet is not available for adoption');
        }

        // Check for existing active application for this pet by this user
        const existingApplication = await Application.findOne({
          where: {
            userId: userId,
            petId: applicationData.petId,
            status: {
              [Op.notIn]: [ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN],
            },
          },
          transaction: t,
        });

        if (existingApplication) {
          throw new Error('You already have an active application for this pet');
        }

        // Validate answers against required questions
        const validationResult = await this.validateApplicationAnswers(
          applicationData.answers,
          pet.rescueId
        );

        if (!validationResult.is_valid) {
          throw new Error(
            `Application validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`
          );
        }

        // Create application — answers and references are persisted to
        // their typed tables after creation (plan 2.1).
        const application = await Application.create(
          {
            userId: userId,
            petId: applicationData.petId,
            rescueId: pet.rescueId,
            status: ApplicationStatus.SUBMITTED,
            priority: applicationData.priority || ApplicationPriority.NORMAL,
            documents: [],
            notes: applicationData.notes,
            tags: applicationData.tags || [],
          },
          { transaction: t }
        );

        // Persist answers to the application_answers typed table — one
        // row per (application, question_key). The legacy JSONB shape
        // becomes a row-per-key projection.
        const incomingAnswers = applicationData.answers ?? {};
        const answerEntries = Object.entries(incomingAnswers);
        if (answerEntries.length > 0) {
          await ApplicationAnswer.bulkCreate(
            answerEntries.map(([question_key, answer_value]) => ({
              application_id: application.applicationId,
              question_key,
              answer_value: answer_value as JsonValue,
            })),
            { transaction: t }
          );
        }

        const incomingReferences = applicationData.references ?? [];
        if (incomingReferences.length > 0) {
          await ApplicationReferenceModel.bulkCreate(
            incomingReferences.map((ref, index) => ({
              application_id: application.applicationId,
              // Preserve the caller-supplied id (legacy "ref-N" or any
              // other shape) for backwards compatibility with the
              // ID-based update path below.
              legacy_id: ref.id || `ref-${index}`,
              name: ref.name,
              relationship: ref.relationship,
              phone: ref.phone,
              email: ref.email ?? null,
              status: ApplicationReferenceStatus.PENDING,
              contacted_at: null,
              contacted_by: null,
              notes: null,
              order_index: index,
            })),
            { transaction: t }
          );
        }

        // Record the initial transition (from_status = null encodes
        // "initial state assigned at creation"). The trigger / hook will
        // re-set applications.status to SUBMITTED — already SUBMITTED, so
        // a no-op in effect, but the row keeps the canonical history.
        await ApplicationStatusTransition.create(
          {
            applicationId: application.applicationId,
            fromStatus: null,
            toStatus: ApplicationStatus.SUBMITTED,
            transitionedBy: userId,
            reason: 'Initial submission',
          },
          { transaction: t }
        );

        // Create initial timeline event
        await ApplicationTimelineService.createEvent({
          application_id: application.applicationId,
          event_type: TimelineEventType.STATUS_UPDATE,
          title: 'Application Submitted',
          description: 'Application was submitted for review',
          created_by: userId,
          created_by_system: false,
          new_status: ApplicationStatus.SUBMITTED,
          metadata: {
            pet_id: applicationData.petId,
            rescue_id: pet.rescueId,
            priority: application.priority,
            submission_date: new Date(),
          },
        });

        // Log creation
        await AuditLogService.log({
          action: 'CREATE',
          entity: 'Application',
          entityId: application.applicationId,
          details: {
            pet_id: applicationData.petId,
            rescue_id: pet.rescueId,
            priority: application.priority,
          },
          userId,
        });

        loggerHelpers.logBusiness(
          'Application Created',
          {
            applicationId: application.applicationId,
            petId: application.petId,
            userId: application.userId,
            createdBy: userId,
            duration: Date.now() - startTime,
          },
          userId
        );

        // Project the typed answer rows back onto the wire shape so
        // callers continue to see `answers` as a JsonObject (plan 2.1).
        return {
          ...(application.toJSON() as ApplicationData),
          answers: incomingAnswers,
        };
      });
    } catch (error) {
      logger.error('Failed to create application:', {
        error: error instanceof Error ? error.message : String(error),
        applicationData: JSON.parse(JSON.stringify(applicationData)),
        createdBy: userId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Get application by ID
   */
  static async getApplicationById(
    applicationId: string,
    userId?: string,
    userType?: UserType
  ): Promise<ApplicationData | null> {
    const startTime = Date.now();

    try {
      const includeOptions: Includeable[] = [
        {
          model: User,
          as: 'User',
          attributes: [
            'userId',
            'firstName',
            'lastName',
            'email',
            'phoneNumber',
            'dateOfBirth',
            'addressLine1',
            'addressLine2',
            'city',
            'country',
            'postalCode',
          ],
        },
        {
          model: Pet,
          as: 'Pet',
          attributes: [
            'petId',
            'name',
            'type',
            'breedId',
            'ageYears',
            'ageMonths',
            'ageGroup',
            'status',
          ],
        },
        // Eager-load the typed answer rows so the projected
        // `answers` JsonObject is available without a second query
        // (plan 2.1).
        { model: ApplicationAnswer, as: 'Answers' },
      ];

      const application = await Application.findOne({
        where: { applicationId: applicationId },
        include: includeOptions,
      });

      loggerHelpers.logDatabase('READ', {
        applicationId,
        duration: Date.now() - startTime,
        found: !!application,
      });

      if (!application) {
        return null;
      }

      // Check permissions
      if (userId && userType !== UserType.ADMIN && userType !== UserType.MODERATOR) {
        if (userType === UserType.ADOPTER && application.userId !== userId) {
          throw new Error('Access denied');
        }
        if (userType === UserType.RESCUE_STAFF) {
          const StaffMember = (await import('../models/StaffMember')).default;
          const membership = await StaffMember.findOne({ where: { userId } });
          if (!membership || membership.rescueId !== application.rescueId) {
            throw new Error('Access denied');
          }
        }
      }

      const answerRows = (application as Application & { Answers?: ApplicationAnswer[] }).Answers;
      return {
        ...(application.toJSON() as ApplicationData),
        answers: answersToJson(answerRows),
      };
    } catch (error) {
      logger.error('Failed to get application by ID:', {
        error: error instanceof Error ? error.message : String(error),
        applicationId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Search applications with advanced filtering
   */
  static async searchApplications(
    filters: ApplicationSearchFilters = {},
    options: ApplicationSearchOptions = {},
    userId?: string,
    userType?: UserType
  ): Promise<PaginatedApplicationResponse> {
    const startTime = Date.now();

    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        include_user = true,
        include_pet = true,
        include_deleted = false,
      } = options;

      // Build where conditions
      const whereConditions: WhereOptions = {};

      // Permission-based filtering
      if (userId && userType === UserType.ADOPTER) {
        whereConditions.userId = userId;
      }

      // Auto-filter by rescue for rescue staff (unless rescueId explicitly provided)
      if (userId && userType === UserType.RESCUE_STAFF && !filters.rescueId) {
        const StaffMember = (await import('../models/StaffMember')).default;
        const staffMember = await StaffMember.findOne({
          where: {
            userId: userId,
            isVerified: true,
          },
        });

        if (!staffMember?.rescueId) {
          throw Object.assign(new Error('Unable to determine rescue for staff user'), {
            statusCode: 403,
          });
        }

        whereConditions.rescueId = staffMember.rescueId;
        logger.info('Auto-filtering applications by user rescue:', {
          userId: userId,
          rescueId: staffMember.rescueId,
        });
      }

      // Status filtering
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          whereConditions.status = { [Op.in]: filters.status };
        } else {
          whereConditions.status = filters.status;
        }
      }

      // Priority filtering
      if (filters.priority) {
        if (Array.isArray(filters.priority)) {
          whereConditions.priority = { [Op.in]: filters.priority };
        } else {
          whereConditions.priority = filters.priority;
        }
      }

      // User/Pet/Rescue filtering
      if (filters.userId) {
        whereConditions.userId = filters.userId;
      }
      if (filters.petId) {
        whereConditions.petId = filters.petId;
      }
      if (filters.rescueId) {
        whereConditions.rescueId = filters.rescueId;
      }
      if (filters.actionedBy) {
        whereConditions.actionedBy = filters.actionedBy;
      }

      // Score filtering
      if (filters.score_min !== undefined || filters.score_max !== undefined) {
        const scoreFilter: Record<symbol, number> = {};
        if (filters.score_min !== undefined) {
          scoreFilter[Op.gte] = filters.score_min;
        }
        if (filters.score_max !== undefined) {
          scoreFilter[Op.lte] = filters.score_max;
        }
        whereConditions.score = scoreFilter;
      }

      // Tags filtering
      if (filters.tags && filters.tags.length > 0) {
        whereConditions.tags = { [Op.overlap]: filters.tags };
      }

      // Date range filtering
      if (filters.submittedFrom || filters.submittedTo) {
        const submittedDateFilter: Record<symbol, Date> = {};
        if (filters.submittedFrom) {
          submittedDateFilter[Op.gte] = filters.submittedFrom;
        }
        if (filters.submittedTo) {
          submittedDateFilter[Op.lte] = filters.submittedTo;
        }
        whereConditions.submittedAt = submittedDateFilter;
      }

      if (filters.createdFrom || filters.createdTo) {
        const createdDateFilter: Record<symbol, Date> = {};
        if (filters.createdFrom) {
          createdDateFilter[Op.gte] = filters.createdFrom;
        }
        if (filters.createdTo) {
          createdDateFilter[Op.lte] = filters.createdTo;
        }
        whereConditions.createdAt = createdDateFilter;
      }

      // Boolean field filtering
      if (filters.hasInterviewNotes !== undefined) {
        whereConditions.interviewNotes = filters.hasInterviewNotes
          ? { [Op.not]: null }
          : { [Op.is]: null };
      }

      if (filters.hasHomeVisitNotes !== undefined) {
        whereConditions.homeVisitNotes = filters.hasHomeVisitNotes
          ? { [Op.not]: null }
          : { [Op.is]: null };
      }

      // Text search
      if (filters.search) {
        const searchConditions = [
          { notes: { [Op.iLike]: `%${filters.search}%` } },
          { rejectionReason: { [Op.iLike]: `%${filters.search}%` } },
          { interviewNotes: { [Op.iLike]: `%${filters.search}%` } },
          { homeVisitNotes: { [Op.iLike]: `%${filters.search}%` } },
          // Search in user fields
          { '$User.first_name$': { [Op.iLike]: `%${filters.search}%` } },
          { '$User.last_name$': { [Op.iLike]: `%${filters.search}%` } },
          { '$User.email$': { [Op.iLike]: `%${filters.search}%` } },
          // Search in pet fields. Plan 2.4 — breed lives in the
          // breeds lookup table; the `$Pet->Breed.name$` path follows
          // the eager-loaded Breed association added to the include
          // chain below.
          { '$Pet.name$': { [Op.iLike]: `%${filters.search}%` } },
          { '$Pet->Breed.name$': { [Op.iLike]: `%${filters.search}%` } },
        ];
        (whereConditions as Record<string | symbol, unknown>)[Op.or] = searchConditions;
      }

      // Soft delete handling
      if (!include_deleted) {
        whereConditions.deletedAt = null;
      }

      // Build include options
      const includeOptions: Includeable[] = [];
      if (include_user) {
        includeOptions.push({
          model: User,
          as: 'User',
          attributes: ['userId', 'firstName', 'lastName', 'email', 'phoneNumber'],
        });
      }
      if (include_pet) {
        // Plan 2.4 — breed extracted to the breeds lookup table.
        // Eager-load Breed so callers see the canonical name without
        // a second round-trip; the application-controller transform
        // reads `Pet.Breed?.name`.
        includeOptions.push({
          model: Pet,
          as: 'Pet',
          attributes: [
            'petId',
            'name',
            'type',
            'breedId',
            'ageYears',
            'ageMonths',
            'ageGroup',
            'status',
          ],
          include: [{ model: Breed, as: 'Breed', attributes: ['breed_id', 'name'] }],
        });
      }
      // Always eager-load answer rows so the projected `answers`
      // JsonObject is populated on every result (plan 2.1).
      includeOptions.push({ model: ApplicationAnswer, as: 'Answers' });

      // Build order
      const safeSortBy = validateSortField(sortBy, APPLICATION_SORT_FIELDS, 'createdAt');
      const order: Order = [[safeSortBy, sortOrder]];

      // Calculate offset
      const offset = (page - 1) * limit;

      // Execute query
      const { rows: applications, count: total } = await Application.findAndCountAll({
        where: whereConditions,
        include: includeOptions,
        order,
        limit,
        offset,
        paranoid: !include_deleted,
      });

      const totalPages = Math.ceil(total / limit);

      loggerHelpers.logPerformance('Application Search', {
        duration: Date.now() - startTime,
        filters: Object.keys(filters),
        resultCount: applications.length,
        total,
        page,
      });

      return {
        applications: applications.map(app => {
          const answerRows = (app as Application & { Answers?: ApplicationAnswer[] }).Answers;
          return {
            ...(app.toJSON() as ApplicationData),
            answers: answersToJson(answerRows),
          };
        }),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        filters_applied: filters,
        total_filtered: total,
      };
    } catch (error) {
      logger.error('Failed to search applications:', {
        error: error instanceof Error ? error.message : String(error),
        filters: Object.keys(filters),
        duration: Date.now() - startTime,
      });
      throw new Error('Failed to search applications');
    }
  }

  /**
   * Update application
   */
  static async updateApplication(
    applicationId: string,
    updateData: UpdateApplicationRequest,
    userId: string
  ): Promise<ApplicationData> {
    const startTime = Date.now();

    try {
      const application = await Application.findByPk(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      // Check permissions - only owner can update their own applications
      if (application.userId !== userId) {
        throw new Error('Access denied');
      }

      // Validate that application can be updated (only submitted applications can be updated)
      if (application.status !== ApplicationStatus.SUBMITTED) {
        throw new Error('Application cannot be updated once processed');
      }

      // Answers and references live in their typed tables (plan 2.1)
      // — strip them off the parent update payload and apply them
      // separately below.
      const {
        answers: incomingAnswers,
        references: incomingReferences,
        ...applicationUpdate
      } = updateData;

      // Store original data for audit
      const existingReferences = await ApplicationReferenceModel.findAll({
        where: { application_id: applicationId },
        order: [['order_index', 'ASC']],
      });
      const existingAnswerRows = await ApplicationAnswer.findAll({
        where: { application_id: applicationId },
      });
      const originalData = {
        answers: answersToJson(existingAnswerRows),
        references: existingReferences.map(r => r.toJSON()),
        priority: application.priority,
        notes: application.notes,
        tags: application.tags,
      };

      // Update application — replace-all semantics for answers and
      // references mirror the JSONB era's overwrite behaviour.
      await application.update(applicationUpdate);

      if (incomingAnswers !== undefined) {
        await ApplicationAnswer.destroy({
          where: { application_id: applicationId },
        });
        const answerEntries = Object.entries(incomingAnswers);
        if (answerEntries.length > 0) {
          await ApplicationAnswer.bulkCreate(
            answerEntries.map(([question_key, answer_value]) => ({
              application_id: applicationId,
              question_key,
              answer_value: answer_value as JsonValue,
            }))
          );
        }
      }

      if (incomingReferences !== undefined) {
        await ApplicationReferenceModel.destroy({
          where: { application_id: applicationId },
        });
        if (incomingReferences.length > 0) {
          await ApplicationReferenceModel.bulkCreate(
            incomingReferences.map((ref, index) => ({
              application_id: applicationId,
              legacy_id: ref.id || `ref-${index}`,
              name: ref.name,
              relationship: ref.relationship,
              phone: ref.phone,
              email: ref.email ?? null,
              status:
                (ref.status as ApplicationReferenceStatus) ?? ApplicationReferenceStatus.PENDING,
              contacted_at: ref.contacted_at ?? null,
              contacted_by: ref.contacted_by ?? null,
              notes: ref.notes ?? null,
              order_index: index,
            }))
          );
        }
      }

      // Create timeline event for application update
      await ApplicationTimelineService.createEvent({
        application_id: applicationId,
        event_type: TimelineEventType.NOTE_ADDED,
        title: 'Application Updated',
        description: `Application was updated by the applicant`,
        created_by: userId,
        created_by_system: false,
        metadata: {
          updated_fields: Object.keys(updateData),
          update_date: new Date(),
        },
      });

      // Log the update
      await AuditLogService.log({
        userId: userId,
        action: 'APPLICATION_UPDATED',
        entity: 'Application',
        entityId: applicationId,
        details: {
          originalData: JSON.parse(JSON.stringify(originalData)),
          updateData: JSON.parse(JSON.stringify(updateData)),
        },
      });

      loggerHelpers.logBusiness(
        'Application Updated',
        {
          applicationId,
          updatedFields: Object.keys(updateData),
          updatedBy: userId,
          duration: Date.now() - startTime,
        },
        userId
      );

      await application.reload();
      return {
        ...(application.toJSON() as ApplicationData),
        answers: await loadAnswersJson(applicationId),
      };
    } catch (error) {
      logger.error('Failed to update application:', {
        error: error instanceof Error ? error.message : String(error),
        applicationId,
        updatedBy: userId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Submit application for review
   */
  static async submitApplication(applicationId: string, userId: string): Promise<ApplicationData> {
    try {
      const application = await Application.findByPk(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      // Check permissions
      if (application.userId !== userId) {
        throw new Error('Access denied');
      }

      // In simplified workflow, applications are submitted upon creation
      // This method is kept for API compatibility but does nothing
      if (application.status !== ApplicationStatus.SUBMITTED) {
        throw new Error('Application is not in a valid state');
      }

      // Validate application completeness — answers live in the typed
      // table now (plan 2.1); load them and project to the JsonObject
      // shape the validator expects.
      const currentAnswers = await loadAnswersJson(application.applicationId);
      const validationResult = await this.validateApplicationAnswers(
        currentAnswers,
        application.rescueId
      );

      if (!validationResult.is_valid) {
        throw new Error(
          `Application is incomplete: ${validationResult.errors.map(e => e.message).join(', ')}`
        );
      }

      // Submit application
      await application.update({
        status: ApplicationStatus.SUBMITTED,
        submittedAt: new Date(),
      });

      // Log submission
      await AuditLogService.log({
        userId: userId,
        action: 'APPLICATION_SUBMITTED',
        entity: 'Application',
        entityId: application.applicationId,
        details: { submitted_at: new Date().toISOString() },
      });

      logger.info('Application submitted successfully', { applicationId, userId });

      await application.reload();
      return {
        ...(application.toJSON() as ApplicationData),
        answers: currentAnswers,
      };
    } catch (error) {
      logger.error('Submit application failed:', error);
      throw error;
    }
  }

  /**
   * Update application status (rescue staff/admin only)
   */
  static async updateApplicationStatus(
    applicationId: string,
    statusUpdate: ApplicationStatusUpdateRequest,
    actionedBy: string
  ): Promise<ApplicationData> {
    try {
      const application = await Application.findByPk(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      // Validate status transition
      if (!application.canTransitionTo(statusUpdate.status)) {
        throw new Error(`Cannot transition from ${application.status} to ${statusUpdate.status}`);
      }

      const previousStatus = application.status;

      // Auxiliary fields stay on the application row directly. The status
      // column itself is moved through the transitions table below — the
      // append-only log is the source of truth, and a trigger
      // (Postgres) / model hook (SQLite) propagates `to_status` back onto
      // applications.status.
      const updateFields: Record<string, unknown> = {
        actionedBy: actionedBy,
        actionedAt: new Date(),
      };

      if (statusUpdate.rejectionReason) {
        updateFields.rejectionReason = statusUpdate.rejectionReason;
      }

      if (statusUpdate.notes) {
        updateFields.notes = statusUpdate.notes;
      }

      if (statusUpdate.followUpDate) {
        updateFields.followUpDate = statusUpdate.followUpDate;
      }

      // Set specific timestamps based on status
      switch (statusUpdate.status) {
        case ApplicationStatus.APPROVED:
        case ApplicationStatus.REJECTED:
          updateFields.decisionAt = new Date();
          break;
      }

      await application.update(updateFields);

      // Append a row to the transition log; the trigger / hook updates
      // applications.status to statusUpdate.status. The reload at the
      // bottom of this method picks up the new value.
      await ApplicationStatusTransition.create({
        applicationId,
        fromStatus: previousStatus,
        toStatus: statusUpdate.status,
        transitionedBy: actionedBy,
        reason: statusUpdate.rejectionReason || statusUpdate.notes || null,
        metadata: statusUpdate.followUpDate
          ? { follow_up_date: statusUpdate.followUpDate.toISOString() }
          : null,
      });

      // Create timeline event for status change
      await ApplicationTimelineService.createEvent({
        application_id: applicationId,
        event_type: ApplicationService.getTimelineEventTypeForStatus(statusUpdate.status),
        title: `Application ${ApplicationService.formatStatusName(statusUpdate.status)}`,
        description:
          statusUpdate.rejectionReason ||
          statusUpdate.notes ||
          `Application status changed from ${ApplicationService.formatStatusName(previousStatus)} to ${ApplicationService.formatStatusName(statusUpdate.status)}`,
        created_by: actionedBy,
        created_by_system: false,
        previous_status: previousStatus,
        new_status: statusUpdate.status,
        metadata: {
          rejection_reason: statusUpdate.rejectionReason,
          follow_up_date: statusUpdate.followUpDate,
          notes: statusUpdate.notes,
        },
      });

      // Log status change
      await AuditLogService.log({
        userId: actionedBy,
        action: 'APPLICATION_STATUS_UPDATED',
        entity: 'Application',
        entityId: applicationId,
        details: {
          reason: statusUpdate.rejectionReason || 'No reason provided',
          previousStatus: application.status,
          newStatus: statusUpdate.status,
        },
      });

      logger.info('Application status updated', {
        applicationId,
        previousStatus,
        newStatus: statusUpdate.status,
        actionedBy,
      });

      await application.reload();
      return {
        ...(application.toJSON() as ApplicationData),
        answers: await loadAnswersJson(applicationId),
      };
    } catch (error) {
      logger.error('Update application status failed:', error);
      throw error;
    }
  }

  /**
   * Withdraw application
   */
  static async withdrawApplication(
    applicationId: string,
    userId: string
  ): Promise<ApplicationData> {
    try {
      const application = await Application.findByPk(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      // Check permissions
      if (application.userId !== userId) {
        throw new Error('Access denied');
      }

      // Validate application can be withdrawn
      if (!application.isInProgress()) {
        throw new Error('Application cannot be withdrawn in current status');
      }

      const previousStatus = application.status;
      await application.update({
        actionedBy: userId,
        actionedAt: new Date(),
      });
      // Status moves through the transitions table — the trigger / hook
      // copies to_status back onto applications.status.
      await ApplicationStatusTransition.create({
        applicationId,
        fromStatus: previousStatus,
        toStatus: ApplicationStatus.WITHDRAWN,
        transitionedBy: userId,
        reason: 'Withdrawn by applicant',
      });

      // Create timeline event for withdrawal
      await ApplicationTimelineService.createEvent({
        application_id: applicationId,
        event_type: TimelineEventType.APPLICATION_WITHDRAWN,
        title: 'Application Withdrawn',
        description: 'Application was withdrawn by the applicant',
        created_by: userId,
        created_by_system: false,
        previous_status: previousStatus,
        new_status: ApplicationStatus.WITHDRAWN,
        metadata: {
          withdrawn_by: userId,
          withdrawn_at: new Date(),
        },
      });

      // Log withdrawal
      await AuditLogService.log({
        action: 'WITHDRAW',
        entity: 'Application',
        entityId: applicationId,
        details: { withdrawn_by: userId },
        userId,
      });

      logger.info('Application withdrawn', { applicationId, userId });

      await application.reload();
      return {
        ...(application.toJSON() as ApplicationData),
        answers: await loadAnswersJson(applicationId),
      };
    } catch (error) {
      logger.error('Withdraw application failed:', error);
      throw error;
    }
  }

  /**
   * Add document to application
   */
  static async addDocument(
    applicationId: string,
    documentData: ApplicationDocumentUpload,
    userId: string
  ): Promise<ApplicationData> {
    try {
      const application = await Application.findByPk(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      // Check permissions
      if (application.userId !== userId) {
        throw new Error('Access denied');
      }

      const newDocument = {
        documentId: uuidv4(),
        documentType: documentData.documentType,
        fileName: documentData.fileName,
        fileUrl: documentData.fileUrl,
        uploadedAt: new Date(),
        verified: false,
      };

      const updatedDocuments = [...application.documents, newDocument];

      await application.update({ documents: updatedDocuments });

      // Create timeline event for document upload
      await ApplicationTimelineService.createEvent({
        application_id: applicationId,
        event_type: TimelineEventType.DOCUMENT_UPLOADED,
        title: 'Document Uploaded',
        description: `${documentData.documentType} document "${documentData.fileName}" was uploaded`,
        created_by: userId,
        created_by_system: false,
        metadata: {
          document_id: newDocument.documentId,
          document_type: documentData.documentType,
          file_name: documentData.fileName,
          upload_date: new Date(),
        },
      });

      // Log document upload
      await AuditLogService.log({
        action: 'DOCUMENT_UPLOAD',
        entity: 'Application',
        entityId: applicationId,
        details: { document_type: documentData.documentType, file_name: documentData.fileName },
        userId,
      });

      logger.info('Document added to application', {
        applicationId,
        documentType: documentData.documentType,
        userId,
      });

      await application.reload();
      return {
        ...(application.toJSON() as ApplicationData),
        answers: await loadAnswersJson(applicationId),
      };
    } catch (error) {
      logger.error('Add document failed:', error);
      throw error;
    }
  }

  /**
   * Remove document from application
   */
  static async removeDocument(
    applicationId: string,
    documentId: string,
    userId: string
  ): Promise<void> {
    try {
      const application = await Application.findByPk(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      if (application.userId !== userId) {
        throw new Error('Access denied');
      }

      const documentIndex = application.documents.findIndex(
        (doc: { documentId: string }) => doc.documentId === documentId
      );

      if (documentIndex === -1) {
        throw new Error('Document not found');
      }

      const removedDoc = application.documents[documentIndex];
      const updatedDocuments = application.documents.filter(
        (_: unknown, idx: number) => idx !== documentIndex
      );

      await application.update({ documents: updatedDocuments });

      await AuditLogService.log({
        action: 'DOCUMENT_REMOVE',
        entity: 'Application',
        entityId: applicationId,
        details: { document_id: documentId, document_type: removedDoc.documentType },
        userId,
      });

      logger.info('Document removed from application', { applicationId, documentId, userId });
    } catch (error) {
      logger.error('Remove document failed:', error);
      throw error;
    }
  }

  /**
   * Update reference status
   */
  static async updateReference(
    applicationId: string,
    referenceUpdate: ReferenceUpdateRequest,
    userId: string
  ): Promise<ApplicationData> {
    try {
      const application = await Application.findByPk(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      // Determine the reference index to update
      let referenceIndex: number;

      if (referenceUpdate.referenceId) {
        // ID-based approach
        if (!referenceUpdate.referenceId.startsWith('ref-')) {
          throw new Error(
            `Invalid reference ID format: ${referenceUpdate.referenceId}. Expected format: ref-X`
          );
        }

        const indexFromId = parseInt(referenceUpdate.referenceId.split('-')[1], 10);
        if (isNaN(indexFromId)) {
          throw new Error(
            `Could not extract reference index from ID: ${referenceUpdate.referenceId}`
          );
        }
        referenceIndex = indexFromId;
      } else if (referenceUpdate.reference_index !== undefined) {
        // Fallback index-based approach
        referenceIndex = referenceUpdate.reference_index;
      } else {
        throw new Error('Either referenceId or reference_index must be provided');
      }

      // References live in the application_references typed table now
      // (plan 2.1). Treat order_index as the addressable position to
      // preserve the legacy "update by index" contract.
      let referenceRows = await ApplicationReferenceModel.findAll({
        where: { application_id: applicationId },
        order: [['order_index', 'ASC']],
      });

      logger.info(
        `Updating reference for application ${applicationId}, index ${referenceIndex}, current references count: ${referenceRows.length}`
      );

      // If references are empty but we have reference data in the
      // application answers, seed the typed table from the client data.
      // Answers live in the application_answers table now (plan 2.1) —
      // load them via the typed table rather than reading a column.
      const answers =
        referenceRows.length === 0 ? await loadAnswersJson(applicationId) : ({} as JsonObject);
      if (referenceRows.length === 0 && Object.keys(answers).length > 0) {
        logger.info('Initializing references array from client data');
        const seeds: Array<{
          name: string;
          relationship: string;
          phone: string;
          email?: string;
        }> = [];

        if (answers.references) {
          const clientRefs = answers.references as {
            veterinarian?: { name: string; phone?: string; email?: string; clinicName?: string };
            personal?: Array<{
              name: string;
              relationship: string;
              phone?: string;
              email?: string;
            }>;
          };

          if (clientRefs.veterinarian && clientRefs.veterinarian.name) {
            seeds.push({
              name: clientRefs.veterinarian.name,
              relationship: 'Veterinarian',
              phone: clientRefs.veterinarian.phone || 'TBD',
              email: clientRefs.veterinarian.email || '',
            });
          }

          if (Array.isArray(clientRefs.personal)) {
            clientRefs.personal.forEach(ref => {
              seeds.push({
                name: ref.name,
                relationship: ref.relationship,
                phone: ref.phone || 'TBD',
                email: ref.email || '',
              });
            });
          }
        }

        if (answers.emergency_contact && typeof answers.emergency_contact === 'object') {
          const emergency = answers.emergency_contact as {
            name?: string;
            phone?: string;
            email?: string;
            relationship?: string;
          };
          if (emergency.name) {
            seeds.push({
              name: emergency.name,
              relationship: emergency.relationship || 'Emergency Contact',
              phone: emergency.phone || 'TBD',
              email: emergency.email || '',
            });
          }
        }

        if (seeds.length > 0) {
          await ApplicationReferenceModel.bulkCreate(
            seeds.map((seed, index) => ({
              application_id: applicationId,
              legacy_id: `ref-${index}`,
              name: seed.name,
              relationship: seed.relationship,
              phone: seed.phone,
              email: seed.email ?? null,
              status: ApplicationReferenceStatus.PENDING,
              contacted_at: null,
              contacted_by: null,
              notes: null,
              order_index: index,
            }))
          );
          referenceRows = await ApplicationReferenceModel.findAll({
            where: { application_id: applicationId },
            order: [['order_index', 'ASC']],
          });
          logger.info(`Initialized ${referenceRows.length} references from client data`);
        }
      }

      // If still out of bounds after initialization, extend the list
      // with placeholder rows so the caller's index resolves to a row.
      if (referenceIndex >= referenceRows.length) {
        const placeholderRows = [];
        for (let i = referenceRows.length; i <= referenceIndex; i++) {
          placeholderRows.push({
            application_id: applicationId,
            legacy_id: `ref-${i}`,
            name: `Reference ${i + 1}`,
            relationship: 'Unknown',
            phone: 'TBD',
            email: '',
            status: ApplicationReferenceStatus.PENDING,
            contacted_at: null,
            contacted_by: null,
            notes: null,
            order_index: i,
          });
        }
        if (placeholderRows.length > 0) {
          await ApplicationReferenceModel.bulkCreate(placeholderRows);
          referenceRows = await ApplicationReferenceModel.findAll({
            where: { application_id: applicationId },
            order: [['order_index', 'ASC']],
          });
          logger.info(`Extended references list to ${referenceRows.length} items`);
        }
      }

      const target = referenceRows[referenceIndex];
      await target.update({
        status: referenceUpdate.status as ApplicationReferenceStatus,
        notes: referenceUpdate.notes ?? null,
        contacted_at: referenceUpdate.contactedAt ?? null,
        contacted_by: userId,
      });

      // Create timeline event for reference update
      const eventType =
        referenceUpdate.status === 'contacted'
          ? TimelineEventType.REFERENCE_CONTACTED
          : referenceUpdate.status === 'verified'
            ? TimelineEventType.REFERENCE_VERIFIED
            : TimelineEventType.NOTE_ADDED;

      await ApplicationTimelineService.createEvent({
        application_id: applicationId,
        event_type: eventType,
        title: `Reference ${ApplicationService.formatStatusName(referenceUpdate.status)}`,
        description:
          referenceUpdate.notes ||
          `Reference at index ${referenceIndex} status updated to ${referenceUpdate.status}`,
        created_by: userId,
        created_by_system: false,
        metadata: {
          reference_index: referenceIndex,
          reference_id: referenceUpdate.referenceId,
          reference_status: referenceUpdate.status,
          contacted_at: referenceUpdate.contactedAt,
          notes: referenceUpdate.notes,
        },
      });

      // Log reference update
      await AuditLogService.log({
        action: 'REFERENCE_UPDATE',
        entity: 'Application',
        entityId: applicationId,
        details: {
          reference_index: referenceIndex,
          referenceId: referenceUpdate.referenceId || null,
          status: referenceUpdate.status,
        },
        userId,
      });

      logger.info('Reference updated', {
        applicationId,
        referenceIndex,
        referenceId: referenceUpdate.referenceId || null,
        userId,
      });

      await application.reload();
      return {
        ...(application.toJSON() as ApplicationData),
        answers: await loadAnswersJson(applicationId),
      };
    } catch (error) {
      logger.error('Update reference failed:', error);
      throw error;
    }
  }

  /**
   * Get application statistics
   */
  static async getApplicationStatistics(rescueId?: string): Promise<ApplicationStatistics> {
    const startTime = Date.now();

    try {
      const whereConditions: WhereOptions = {};
      if (rescueId) {
        whereConditions.rescueId = rescueId;
      }

      // Get total applications
      const totalApplications = await Application.count({ where: whereConditions });

      // Get applications by status
      const applicationsByStatus: Record<ApplicationStatus, number> = {
        [ApplicationStatus.SUBMITTED]: 0,
        [ApplicationStatus.APPROVED]: 0,
        [ApplicationStatus.REJECTED]: 0,
        [ApplicationStatus.WITHDRAWN]: 0,
      };
      for (const status of Object.values(ApplicationStatus)) {
        applicationsByStatus[status] = await Application.count({
          where: { ...whereConditions, status },
        });
      }

      // Get applications by priority
      const applicationsByPriority: Record<ApplicationPriority, number> = {
        [ApplicationPriority.LOW]: 0,
        [ApplicationPriority.NORMAL]: 0,
        [ApplicationPriority.HIGH]: 0,
        [ApplicationPriority.URGENT]: 0,
      };
      for (const priority of Object.values(ApplicationPriority)) {
        applicationsByPriority[priority] = await Application.count({
          where: { ...whereConditions, priority },
        });
      }

      // Calculate rates
      const approvedCount = applicationsByStatus[ApplicationStatus.APPROVED] || 0;
      const rejectedCount = applicationsByStatus[ApplicationStatus.REJECTED] || 0;
      const withdrawnCount = applicationsByStatus[ApplicationStatus.WITHDRAWN] || 0;
      const completedCount = approvedCount + rejectedCount + withdrawnCount;

      const approvalRate = completedCount > 0 ? (approvedCount / completedCount) * 100 : 0;
      const rejectionRate = completedCount > 0 ? (rejectedCount / completedCount) * 100 : 0;
      const withdrawalRate = completedCount > 0 ? (withdrawnCount / completedCount) * 100 : 0;

      // Get this month's applications
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const applicationsThisMonth = await Application.count({
        where: {
          ...whereConditions,
          createdAt: { [Op.gte]: startOfMonth },
        },
      });

      // Get last month's applications
      const startOfLastMonth = new Date(startOfMonth);
      startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
      const endOfLastMonth = new Date(startOfMonth);
      endOfLastMonth.setTime(endOfLastMonth.getTime() - 1);

      const applicationsLastMonth = await Application.count({
        where: {
          ...whereConditions,
          createdAt: {
            [Op.between]: [startOfLastMonth, endOfLastMonth],
          },
        },
      });

      const growthRate =
        applicationsLastMonth > 0
          ? ((applicationsThisMonth - applicationsLastMonth) / applicationsLastMonth) * 100
          : 0;

      // Get average score using a single aggregate query
      const stats = (await Application.findOne({
        where: { ...whereConditions, score: { [Op.not]: null } },
        attributes: [
          [fn('AVG', col('score')), 'avg'],
          [fn('MIN', col('score')), 'min'],
          [fn('MAX', col('score')), 'max'],
          [fn('COUNT', col('score')), 'count'],
        ],
        raw: true,
      })) as { avg: string | null; min: string | null; max: string | null; count: string } | null;
      const averageScore = stats?.avg != null ? parseFloat(stats.avg) : 0;

      // Get pending applications
      const pendingApplications = await Application.count({
        where: {
          ...whereConditions,
          status: {
            [Op.in]: [ApplicationStatus.SUBMITTED],
          },
        },
      });

      // Mock some additional statistics (these would require more complex queries)
      const averageProcessingTime = 7; // days
      const overdueApplications = 0;
      const topRejectionReasons: Array<{ reason: string; count: number }> = [];
      const applicationsByRescue: Array<{ rescueId: string; rescueName: string; count: number }> =
        [];
      const applicationsByMonth: Array<{ month: string; count: number }> = [];

      loggerHelpers.logPerformance('Application Statistics', {
        duration: Date.now() - startTime,
        rescueId,
        totalApplications,
        approvedApplications: approvedCount,
        rejectedApplications: rejectedCount,
      });

      return {
        totalApplications: totalApplications,
        applicationsByStatus: applicationsByStatus,
        applicationsByPriority: applicationsByPriority,
        averageProcessingTime: averageProcessingTime,
        approvalRate: approvalRate,
        rejectionRate: rejectionRate,
        withdrawalRate: withdrawalRate,
        pendingApplications: pendingApplications,
        overdueApplications: overdueApplications,
        applicationsThisMonth: applicationsThisMonth,
        applicationsLastMonth: applicationsLastMonth,
        growthRate: growthRate,
        averageScore: averageScore,
        topRejectionReasons: topRejectionReasons,
        applicationsByRescue: applicationsByRescue,
        applicationsByMonth: applicationsByMonth,
      };
    } catch (error) {
      logger.error('Failed to get application statistics:', {
        error: error instanceof Error ? error.message : String(error),
        rescueId,
        duration: Date.now() - startTime,
      });
      throw new Error('Failed to generate application statistics');
    }
  }

  /**
   * Bulk update applications
   */
  static async bulkUpdateApplications(
    bulkUpdate: BulkApplicationUpdate,
    userId: string
  ): Promise<BulkApplicationResult> {
    try {
      const results: BulkApplicationResult = {
        successCount: 0,
        failureCount: 0,
        successes: [],
        failures: [],
      };

      for (const applicationId of bulkUpdate.applicationIds) {
        try {
          const application = await Application.findByPk(applicationId);
          if (!application) {
            results.failures.push({
              applicationId: applicationId,
              error: 'Application not found',
            });
            results.failureCount++;
            continue;
          }

          await application.update(bulkUpdate.updates);
          results.successes.push(applicationId);
          results.successCount++;

          // Log bulk update
          await AuditLogService.log({
            action: 'BULK_UPDATE',
            entity: 'Application',
            entityId: applicationId,
            details: { updates: bulkUpdate.updates, bulk_operation: true },
            userId,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.failures.push({ applicationId: applicationId, error: errorMessage });
          results.failureCount++;
        }
      }

      logger.info('Bulk application update completed', {
        totalRequested: bulkUpdate.applicationIds.length,
        successCount: results.successCount,
        failureCount: results.failureCount,
        userId,
      });

      return results;
    } catch (error) {
      logger.error('Bulk update applications failed:', error);
      throw new Error('Failed to perform bulk update');
    }
  }

  /**
   * Get application form structure for a rescue
   */
  static async getApplicationFormStructure(rescueId: string): Promise<ApplicationFormStructure> {
    try {
      const questions = await ApplicationQuestion.getAllQuestionsForRescue(rescueId);

      // Group questions by category
      const questionsByCategory = questions.reduce(
        (acc, question) => {
          if (!acc[question.category]) {
            acc[question.category] = [];
          }
          const raw = question.toJSON();
          const mapped: QuestionConfigData = {
            questionId: raw.question_id,
            rescueId: raw.rescue_id,
            questionKey: raw.question_key,
            scope: raw.scope as 'core' | 'rescue_specific',
            category: raw.category,
            questionType: raw.question_type,
            questionText: raw.question_text,
            helpText: raw.help_text,
            placeholder: raw.placeholder,
            options: raw.options,
            validationRules: raw.validation_rules,
            displayOrder: raw.display_order,
            isEnabled: raw.is_enabled,
            isRequired: raw.is_required,
            conditionalLogic: raw.conditional_logic,
          };
          acc[question.category].push(mapped);
          return acc;
        },
        {} as Record<QuestionCategory, QuestionConfigData[]>
      );

      // Build form structure
      const categories = Object.entries(questionsByCategory).map(
        ([category, categoryQuestions]) => ({
          category: category as QuestionCategory,
          title: this.getCategoryTitle(category as QuestionCategory),
          description: this.getCategoryDescription(category as QuestionCategory),
          questions: categoryQuestions,
        })
      );

      const totalQuestions = questions.length;
      const requiredQuestions = questions.filter(q => q.is_required).length;
      const estimatedTimeMinutes = Math.ceil(totalQuestions * 1.5); // 1.5 minutes per question

      return {
        categories,
        total_questions: totalQuestions,
        required_questions: requiredQuestions,
        estimated_time_minutes: estimatedTimeMinutes,
      };
    } catch (error) {
      logger.error('Get application form structure failed:', error);
      throw new Error('Failed to get application form structure');
    }
  }

  /**
   * Validate application answers against questions
   */
  static async validateApplicationAnswers(
    answers: Record<string, unknown>,
    rescueId: string
  ): Promise<ApplicationValidationResult> {
    try {
      const questions = await ApplicationQuestion.getAllQuestionsForRescue(rescueId);
      const errors: Array<{ field: string; message: string; code: string }> = [];
      const warnings: Array<{ field: string; message: string; code: string }> = [];
      const missingRequiredFields: string[] = [];

      let answeredQuestions = 0;

      for (const question of questions) {
        const answer = answers[question.question_key];
        const hasAnswer = answer !== null && answer !== undefined && answer !== '';

        if (hasAnswer) {
          answeredQuestions++;

          // Validate answer format
          const validation = question.validateAnswer(answer as JsonValue);
          if (!validation.isValid) {
            errors.push({
              field: question.question_key,
              message: validation.error || 'Invalid answer',
              code: 'INVALID_ANSWER',
            });
          }
        } else if (question.is_required) {
          missingRequiredFields.push(question.question_key);
          errors.push({
            field: question.question_key,
            message: 'This field is required',
            code: 'REQUIRED_FIELD_MISSING',
          });
        }
      }

      const completionPercentage =
        questions.length > 0 ? (answeredQuestions / questions.length) * 100 : 100;

      return {
        is_valid: errors.length === 0,
        errors,
        warnings,
        completion_percentage: completionPercentage,
        missing_required_fields: missingRequiredFields,
      };
    } catch (error) {
      logger.error('Validate application answers failed:', error);
      throw new Error('Failed to validate application answers');
    }
  }

  /**
   * Delete application (soft delete)
   */
  static async deleteApplication(applicationId: string, userId: string): Promise<void> {
    try {
      const application = await Application.findByPk(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      // Check permissions
      if (application.userId !== userId) {
        throw new Error('Access denied');
      }

      await application.destroy();

      // Create timeline event for application deletion
      await ApplicationTimelineService.createEvent({
        application_id: applicationId,
        event_type: TimelineEventType.NOTE_ADDED,
        title: 'Application Deleted',
        description: 'Application was deleted by the applicant',
        created_by: userId,
        created_by_system: false,
        metadata: {
          deleted_by: userId,
          deletion_date: new Date(),
        },
      });

      // Log deletion
      await AuditLogService.log({
        action: 'DELETE',
        entity: 'Application',
        entityId: applicationId,
        details: { deleted_by: userId },
        userId,
      });

      logger.info('Application deleted', { applicationId, userId });
    } catch (error) {
      logger.error('Delete application failed:', error);
      throw error;
    }
  }

  // Helper methods
  private static getCategoryTitle(category: QuestionCategory): string {
    const titles: Record<QuestionCategory, string> = {
      [QuestionCategory.PERSONAL_INFORMATION]: 'Personal Information',
      [QuestionCategory.HOUSEHOLD_INFORMATION]: 'Household Information',
      [QuestionCategory.PET_OWNERSHIP_EXPERIENCE]: 'Pet Ownership Experience',
      [QuestionCategory.LIFESTYLE_COMPATIBILITY]: 'Lifestyle Compatibility',
      [QuestionCategory.PET_CARE_COMMITMENT]: 'Pet Care Commitment',
      [QuestionCategory.REFERENCES_VERIFICATION]: 'References & Verification',
      [QuestionCategory.FINAL_ACKNOWLEDGMENTS]: 'Final Acknowledgments',
    };
    return titles[category] || category;
  }

  private static getCategoryDescription(category: QuestionCategory): string | undefined {
    const descriptions: Record<QuestionCategory, string> = {
      [QuestionCategory.PERSONAL_INFORMATION]:
        'Tell us about yourself and your contact information',
      [QuestionCategory.HOUSEHOLD_INFORMATION]:
        'Information about your living situation and household members',
      [QuestionCategory.PET_OWNERSHIP_EXPERIENCE]: 'Your experience with pets and animals',
      [QuestionCategory.LIFESTYLE_COMPATIBILITY]: 'How a pet would fit into your lifestyle',
      [QuestionCategory.PET_CARE_COMMITMENT]: 'Your commitment to caring for this pet',
      [QuestionCategory.REFERENCES_VERIFICATION]:
        'References who can vouch for your pet care abilities',
      [QuestionCategory.FINAL_ACKNOWLEDGMENTS]: 'Final agreements and acknowledgments',
    };
    return descriptions[category];
  }

  /**
   * Get the appropriate timeline event type for a status change
   */
  private static getTimelineEventTypeForStatus(status: ApplicationStatus): TimelineEventType {
    switch (status) {
      case ApplicationStatus.APPROVED:
        return TimelineEventType.APPLICATION_APPROVED;
      case ApplicationStatus.REJECTED:
        return TimelineEventType.APPLICATION_REJECTED;
      case ApplicationStatus.WITHDRAWN:
        return TimelineEventType.APPLICATION_WITHDRAWN;
      case ApplicationStatus.SUBMITTED:
      default:
        return TimelineEventType.STATUS_UPDATE;
    }
  }

  /**
   * Format a status string for display
   */
  private static formatStatusName(status: string): string {
    const statusMap: Record<string, string> = {
      submitted: 'Submitted',
      approved: 'Approved',
      rejected: 'Rejected',
      withdrawn: 'Withdrawn',
    };

    return (
      statusMap[status] ||
      status
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    );
  }
}

export default ApplicationService;
