// Placeholder Application Service
// TODO: Implement full application service functionality

import { Includeable, Op, Order, WhereOptions } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import Application, { ApplicationPriority, ApplicationStatus } from '../models/Application';
import ApplicationQuestion, { QuestionCategory } from '../models/ApplicationQuestion';
import Pet from '../models/Pet';
import User, { UserType } from '../models/User';
import { logger, loggerHelpers } from '../utils/logger';
import { AuditLogService } from './auditLog.service';

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
      // Validate user exists
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate pet exists and is available
      const pet = await Pet.findByPk(applicationData.pet_id);
      if (!pet) {
        throw new Error('Pet not found');
      }

      if (pet.status !== 'available') {
        throw new Error('Pet is not available for adoption');
      }

      // Check for existing active application for this pet by this user
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
      });

      if (existingApplication) {
        throw new Error('You already have an active application for this pet');
      }

      // Validate answers against required questions
      const validationResult = await this.validateApplicationAnswers(
        applicationData.answers,
        pet.rescue_id
      );

      if (!validationResult.is_valid) {
        throw new Error(
          `Application validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`
        );
      }

      // Prepare references with default status
      const processedReferences: ApplicationReference[] = applicationData.references.map(ref => ({
        ...ref,
        status: 'pending' as const,
        contacted_at: undefined,
      }));

      // Create application
      const application = await Application.create({
        application_id: uuidv4(),
        user_id: userId,
        pet_id: applicationData.pet_id,
        rescue_id: pet.rescue_id,
        status: ApplicationStatus.DRAFT,
        priority: applicationData.priority || ApplicationPriority.NORMAL,
        answers: applicationData.answers,
        references: processedReferences,
        documents: [],
        notes: applicationData.notes,
        tags: applicationData.tags || [],
      });

      // Log creation
      await AuditLogService.log({
        action: 'CREATE',
        entity: 'Application',
        entityId: application.application_id,
        details: {
          pet_id: applicationData.pet_id,
          rescue_id: pet.rescue_id,
          priority: application.priority,
        },
        userId,
      });

      loggerHelpers.logBusiness(
        'Application Created',
        {
          applicationId: application.application_id,
          petId: application.pet_id,
          userId: application.user_id,
          createdBy: userId,
          duration: Date.now() - startTime,
        },
        userId
      );

      return application.toJSON() as ApplicationData;
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
          attributes: ['user_id', 'first_name', 'last_name', 'email', 'phone_number'],
        },
        {
          model: Pet,
          as: 'Pet',
          attributes: ['pet_id', 'name', 'type', 'breed', 'age'],
        },
      ];

      const application = await Application.findOne({
        where: { application_id: applicationId },
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
      if (userId && userType !== UserType.ADMIN) {
        // Users can only see their own applications
        // Rescue staff can see applications for their rescue
        if (userType === UserType.ADOPTER && application.user_id !== userId) {
          throw new Error('Access denied');
        }
        // Additional rescue staff permission check would go here
      }

      return application.toJSON() as ApplicationData;
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
        sortBy = 'created_at',
        sortOrder = 'DESC',
        include_user = true,
        include_pet = true,
        include_deleted = false,
      } = options;

      // Build where conditions
      const whereConditions: WhereOptions = {};

      // Permission-based filtering
      if (userId && userType === UserType.ADOPTER) {
        whereConditions.user_id = userId;
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
      if (filters.user_id) {
        whereConditions.user_id = filters.user_id;
      }
      if (filters.pet_id) {
        whereConditions.pet_id = filters.pet_id;
      }
      if (filters.rescue_id) {
        whereConditions.rescue_id = filters.rescue_id;
      }
      if (filters.actioned_by) {
        whereConditions.actioned_by = filters.actioned_by;
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
      if (filters.submitted_from || filters.submitted_to) {
        const submittedDateFilter: Record<symbol, Date> = {};
        if (filters.submitted_from) {
          submittedDateFilter[Op.gte] = filters.submitted_from;
        }
        if (filters.submitted_to) {
          submittedDateFilter[Op.lte] = filters.submitted_to;
        }
        whereConditions.submitted_at = submittedDateFilter;
      }

      if (filters.created_from || filters.created_to) {
        const createdDateFilter: Record<symbol, Date> = {};
        if (filters.created_from) {
          createdDateFilter[Op.gte] = filters.created_from;
        }
        if (filters.created_to) {
          createdDateFilter[Op.lte] = filters.created_to;
        }
        whereConditions.created_at = createdDateFilter;
      }

      // Boolean field filtering
      if (filters.has_interview_notes !== undefined) {
        whereConditions.interview_notes = filters.has_interview_notes
          ? { [Op.not]: null }
          : { [Op.is]: null };
      }

      if (filters.has_home_visit_notes !== undefined) {
        whereConditions.home_visit_notes = filters.has_home_visit_notes
          ? { [Op.not]: null }
          : { [Op.is]: null };
      }

      // Text search
      if (filters.search) {
        const searchConditions = [
          { notes: { [Op.iLike]: `%${filters.search}%` } },
          { rejection_reason: { [Op.iLike]: `%${filters.search}%` } },
          { interview_notes: { [Op.iLike]: `%${filters.search}%` } },
          { home_visit_notes: { [Op.iLike]: `%${filters.search}%` } },
        ];
        (whereConditions as Record<string | symbol, unknown>)[Op.or] = searchConditions;
      }

      // Soft delete handling
      if (!include_deleted) {
        whereConditions.deleted_at = null;
      }

      // Build include options
      const includeOptions: Includeable[] = [];
      if (include_user) {
        includeOptions.push({
          model: User,
          as: 'User',
          attributes: ['user_id', 'first_name', 'last_name', 'email', 'phone_number'],
        });
      }
      if (include_pet) {
        includeOptions.push({
          model: Pet,
          as: 'Pet',
          attributes: ['pet_id', 'name', 'type', 'breed', 'age', 'status'],
        });
      }

      // Build order
      const order: Order = [[sortBy, sortOrder]];

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
        applications: applications.map(app => app.toJSON()),
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

      // Check permissions - only owner can update draft applications
      if (application.user_id !== userId && application.status === ApplicationStatus.DRAFT) {
        throw new Error('Access denied');
      }

      // Validate that application can be updated
      if (![ApplicationStatus.DRAFT, ApplicationStatus.SUBMITTED].includes(application.status)) {
        throw new Error('Application cannot be updated in current status');
      }

      // Store original data for audit
      const originalData = {
        answers: application.answers,
        references: application.references,
        priority: application.priority,
        notes: application.notes,
        tags: application.tags,
      };

      // Update application
      await application.update(updateData);

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

      return (await application.reload()) as ApplicationData;
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
      if (application.user_id !== userId) {
        throw new Error('Access denied');
      }

      // Validate application can be submitted
      if (application.status !== ApplicationStatus.DRAFT) {
        throw new Error('Only draft applications can be submitted');
      }

      // Validate application completeness
      const validationResult = await this.validateApplicationAnswers(
        application.answers,
        application.rescue_id
      );

      if (!validationResult.is_valid) {
        throw new Error(
          `Application is incomplete: ${validationResult.errors.map(e => e.message).join(', ')}`
        );
      }

      // Submit application
      await application.update({
        status: ApplicationStatus.SUBMITTED,
        submitted_at: new Date(),
      });

      // Log submission
      await AuditLogService.log({
        userId: userId,
        action: 'APPLICATION_SUBMITTED',
        entity: 'Application',
        entityId: application.application_id,
        details: { submitted_at: new Date().toISOString() },
      });

      logger.info('Application submitted successfully', { applicationId, userId });

      return (await application.reload()) as ApplicationData;
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

      // Update application status
      const updateFields: Record<string, unknown> = {
        status: statusUpdate.status,
        actioned_by: actionedBy,
        actioned_at: new Date(),
      };

      if (statusUpdate.rejection_reason) {
        updateFields.rejection_reason = statusUpdate.rejection_reason;
      }

      if (statusUpdate.conditional_requirements) {
        updateFields.conditional_requirements = statusUpdate.conditional_requirements;
      }

      if (statusUpdate.notes) {
        updateFields.notes = statusUpdate.notes;
      }

      if (statusUpdate.follow_up_date) {
        updateFields.follow_up_date = statusUpdate.follow_up_date;
      }

      // Set specific timestamps based on status
      switch (statusUpdate.status) {
        case ApplicationStatus.UNDER_REVIEW:
          updateFields.reviewed_at = new Date();
          break;
        case ApplicationStatus.APPROVED:
        case ApplicationStatus.REJECTED:
        case ApplicationStatus.CONDITIONALLY_APPROVED:
          updateFields.decision_at = new Date();
          break;
      }

      await application.update(updateFields);

      // Log status change
      await AuditLogService.log({
        userId: actionedBy,
        action: 'APPLICATION_STATUS_UPDATED',
        entity: 'Application',
        entityId: applicationId,
        details: {
          reason: statusUpdate.rejection_reason || 'No reason provided',
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

      return (await application.reload()) as ApplicationData;
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
      if (application.user_id !== userId) {
        throw new Error('Access denied');
      }

      // Validate application can be withdrawn
      if (!application.isInProgress()) {
        throw new Error('Application cannot be withdrawn in current status');
      }

      await application.update({
        status: ApplicationStatus.WITHDRAWN,
        actioned_by: userId,
        actioned_at: new Date(),
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

      return (await application.reload()) as ApplicationData;
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
      if (application.user_id !== userId) {
        throw new Error('Access denied');
      }

      const newDocument = {
        document_id: uuidv4(),
        ...documentData,
        uploaded_at: new Date(),
        verified: false,
      };

      const updatedDocuments = [...application.documents, newDocument];

      await application.update({ documents: updatedDocuments });

      // Log document upload
      await AuditLogService.log({
        action: 'DOCUMENT_UPLOAD',
        entity: 'Application',
        entityId: applicationId,
        details: { document_type: documentData.document_type, file_name: documentData.file_name },
        userId,
      });

      logger.info('Document added to application', {
        applicationId,
        documentType: documentData.document_type,
        userId,
      });

      return (await application.reload()) as ApplicationData;
    } catch (error) {
      logger.error('Add document failed:', error);
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

      if (referenceUpdate.reference_index >= application.references.length) {
        throw new Error('Reference index out of bounds');
      }

      const updatedReferences = [...application.references];
      updatedReferences[referenceUpdate.reference_index] = {
        ...updatedReferences[referenceUpdate.reference_index],
        status: referenceUpdate.status,
        notes: referenceUpdate.notes,
        contacted_at: referenceUpdate.contacted_at,
      };

      await application.update({ references: updatedReferences });

      // Log reference update
      await AuditLogService.log({
        action: 'REFERENCE_UPDATE',
        entity: 'Application',
        entityId: applicationId,
        details: {
          reference_index: referenceUpdate.reference_index,
          status: referenceUpdate.status,
        },
        userId,
      });

      logger.info('Reference updated', {
        applicationId,
        referenceIndex: referenceUpdate.reference_index,
        userId,
      });

      return (await application.reload()) as ApplicationData;
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
        whereConditions.rescue_id = rescueId;
      }

      // Get total applications
      const totalApplications = await Application.count({ where: whereConditions });

      // Get applications by status
      const applicationsByStatus: Record<ApplicationStatus, number> = {} as any;
      for (const status of Object.values(ApplicationStatus)) {
        applicationsByStatus[status] = await Application.count({
          where: { ...whereConditions, status },
        });
      }

      // Get applications by priority
      const applicationsByPriority: Record<ApplicationPriority, number> = {} as any;
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
          created_at: { [Op.gte]: startOfMonth },
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
          created_at: {
            [Op.between]: [startOfLastMonth, endOfLastMonth],
          },
        },
      });

      const growthRate =
        applicationsLastMonth > 0
          ? ((applicationsThisMonth - applicationsLastMonth) / applicationsLastMonth) * 100
          : 0;

      // Get average score
      const applications = await Application.findAll({
        where: { ...whereConditions, score: { [Op.not]: null } },
        attributes: ['score'],
      });
      const averageScore =
        applications.length > 0
          ? applications.reduce((sum, app) => sum + (app.score || 0), 0) / applications.length
          : 0;

      // Get pending applications
      const pendingApplications = await Application.count({
        where: {
          ...whereConditions,
          status: {
            [Op.in]: [
              ApplicationStatus.SUBMITTED,
              ApplicationStatus.UNDER_REVIEW,
              ApplicationStatus.PENDING_REFERENCES,
              ApplicationStatus.REFERENCE_CHECK,
              ApplicationStatus.INTERVIEW_SCHEDULED,
              ApplicationStatus.INTERVIEW_COMPLETED,
              ApplicationStatus.HOME_VISIT_SCHEDULED,
              ApplicationStatus.HOME_VISIT_COMPLETED,
            ],
          },
        },
      });

      // Mock some additional statistics (these would require more complex queries)
      const averageProcessingTime = 7; // days
      const overdueApplications = 0;
      const topRejectionReasons: Array<{ reason: string; count: number }> = [];
      const applicationsByRescue: Array<{ rescue_id: string; rescue_name: string; count: number }> =
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
        total_applications: totalApplications,
        applications_by_status: applicationsByStatus,
        applications_by_priority: applicationsByPriority,
        average_processing_time: averageProcessingTime,
        approval_rate: approvalRate,
        rejection_rate: rejectionRate,
        withdrawal_rate: withdrawalRate,
        pending_applications: pendingApplications,
        overdue_applications: overdueApplications,
        applications_this_month: applicationsThisMonth,
        applications_last_month: applicationsLastMonth,
        growth_rate: growthRate,
        average_score: averageScore,
        top_rejection_reasons: topRejectionReasons,
        applications_by_rescue: applicationsByRescue,
        applications_by_month: applicationsByMonth,
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
        success_count: 0,
        failure_count: 0,
        successes: [],
        failures: [],
      };

      for (const applicationId of bulkUpdate.application_ids) {
        try {
          const application = await Application.findByPk(applicationId);
          if (!application) {
            results.failures.push({
              application_id: applicationId,
              error: 'Application not found',
            });
            results.failure_count++;
            continue;
          }

          await application.update(bulkUpdate.updates);
          results.successes.push(applicationId);
          results.success_count++;

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
          results.failures.push({ application_id: applicationId, error: errorMessage });
          results.failure_count++;
        }
      }

      logger.info('Bulk application update completed', {
        totalRequested: bulkUpdate.application_ids.length,
        successCount: results.success_count,
        failureCount: results.failure_count,
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
          acc[question.category].push(question.toJSON());
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
          const validation = question.validateAnswer(answer);
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
      if (application.user_id !== userId) {
        throw new Error('Access denied');
      }

      await application.destroy();

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
}

// Legacy compatibility - keeping the old interface but delegating to the new service
export interface ApplicationFilters {
  status?: string;
  petId?: string;
  userId?: string;
  rescueId?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

class LegacyApplicationService {
  static async getApplications(filters: ApplicationFilters, userId?: string, userType?: string) {
    // Convert legacy filters to new format
    const newFilters: ApplicationSearchFilters = {};
    const newOptions: ApplicationSearchOptions = {};

    if (filters.status) {
      newFilters.status = filters.status as ApplicationStatus;
    }
    if (filters.petId) {
      newFilters.pet_id = filters.petId;
    }
    if (filters.userId) {
      newFilters.user_id = filters.userId;
    }
    if (filters.rescueId) {
      newFilters.rescue_id = filters.rescueId;
    }
    if (filters.startDate) {
      newFilters.created_from = filters.startDate;
    }
    if (filters.endDate) {
      newFilters.created_to = filters.endDate;
    }

    if (filters.page) {
      newOptions.page = filters.page;
    }
    if (filters.limit) {
      newOptions.limit = filters.limit;
    }
    if (filters.sortBy) {
      newOptions.sortBy = filters.sortBy;
    }
    if (filters.sortOrder) {
      newOptions.sortOrder = filters.sortOrder;
    }

    const result = await ApplicationService.searchApplications(
      newFilters,
      newOptions,
      userId,
      userType as UserType
    );

    return {
      applications: result.applications,
      pagination: result.pagination,
    };
  }

  static async getApplicationById(applicationId: string) {
    return ApplicationService.getApplicationById(applicationId);
  }

  static async createApplication(applicationData: CreateApplicationRequest, userId?: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    return ApplicationService.createApplication(applicationData, userId);
  }

  static async updateApplicationStatus(applicationId: string, status: string, userId?: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    const statusUpdate: ApplicationStatusUpdateRequest = {
      status: status as ApplicationStatus,
      actioned_by: userId,
    };
    return ApplicationService.updateApplicationStatus(applicationId, statusUpdate, userId);
  }

  static async withdrawApplication(applicationId: string, userId?: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    await ApplicationService.withdrawApplication(applicationId, userId);
    return { message: 'Application withdrawn successfully' };
  }

  static async getApplicationHistory(applicationId: string) {
    // This would need to be implemented with a proper audit/history system
    return [];
  }

  static async getApplicationStatistics(rescueId?: string) {
    return ApplicationService.getApplicationStatistics(rescueId);
  }

  static async scheduleVisit(
    applicationId: string,
    visitData: Record<string, unknown>,
    userId?: string
  ) {
    throw new Error('Visit scheduling not implemented in this version');
  }
}

export default LegacyApplicationService;
