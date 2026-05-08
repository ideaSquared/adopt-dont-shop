import { Op, Transaction, WhereOptions, literal } from 'sequelize';
import ModeratorAction, { ActionSeverity, ActionType } from '../models/ModeratorAction';
import ModerationEvidence, { EvidenceParentType, EvidenceType } from '../models/ModerationEvidence';
import Report, { ReportCategory, ReportSeverity, ReportStatus } from '../models/Report';
import ReportStatusTransition from '../models/ReportStatusTransition';
import User from '../models/User';
import Breed from '../models/Breed';
import Pet from '../models/Pet';
import Rescue from '../models/Rescue';
import sequelize from '../sequelize';
import logger from '../utils/logger';
import { AuditLogService } from './auditLog.service';
import { JsonObject } from '../types/common';
import { validateSortField } from '../utils/sort-validation';

const REPORT_SORT_FIELDS = ['createdAt', 'updatedAt', 'status', 'severity', 'category'] as const;

export interface ReportFilters {
  status?: ReportStatus;
  category?: ReportCategory;
  severity?: ReportSeverity;
  reporterId?: string;
  reportedUserId?: string;
  assignedModerator?: string;
  reportedEntityType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface ReportSearchOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ModerationActionRequest {
  reportId?: string;
  targetEntityType: 'user' | 'rescue' | 'pet' | 'application' | 'message' | 'conversation';
  targetEntityId: string;
  targetUserId?: string;
  actionType: ActionType;
  severity: ActionSeverity;
  reason: string;
  description?: string;
  duration?: number;
  evidence?: Array<{
    type: 'screenshot' | 'url' | 'text' | 'file';
    content: string;
    description?: string;
  }>;
  internalNotes?: string;
}

export interface ReportSubmission {
  reportedEntityType: 'user' | 'rescue' | 'pet' | 'application' | 'message' | 'conversation';
  reportedEntityId: string;
  reportedUserId?: string;
  category: ReportCategory;
  severity?: ReportSeverity;
  title: string;
  description: string;
  evidence?: Array<{
    type: 'screenshot' | 'url' | 'text' | 'file';
    content: string;
    description?: string;
    uploadedAt: Date;
  }>;
}

interface ReportCountRow {
  status: string;
  category: string;
  severity: string;
  count: string;
}

interface ActionCountRow {
  actionType: string;
  isActive: boolean;
  count: string;
}

// Export the enums from models for consistency
export { ActionSeverity, ActionType, ReportCategory, ReportSeverity, ReportStatus };

class ModerationService {
  // Report Management
  async submitReport(
    reporterId: string,
    reportData: ReportSubmission,
    requestContext?: { ip?: string; userAgent?: string }
  ): Promise<Report> {
    const transaction = await sequelize.transaction();

    try {
      // Check for duplicate reports from same user for same entity
      const existingReport = await Report.findOne({
        where: {
          reporterId,
          reportedEntityType: reportData.reportedEntityType,
          reportedEntityId: reportData.reportedEntityId,
          status: {
            [Op.in]: [ReportStatus.PENDING, ReportStatus.UNDER_REVIEW],
          },
        },
        transaction,
      });

      if (existingReport) {
        throw new Error('You have already submitted a report for this content');
      }

      // Evidence rows live in moderation_evidence (plan 2.1) — pull
      // them off the create payload and insert separately after the
      // report is persisted.
      const { evidence, ...reportFields } = reportData;
      const report = await Report.create(
        {
          reporterId,
          ...reportFields,
          status: ReportStatus.PENDING,
          severity: reportData.severity || ReportSeverity.MEDIUM,
          metadata: {
            submissionContext: requestContext || null,
            autoDetected: false,
          },
        },
        { transaction }
      );

      if (evidence && evidence.length > 0) {
        await ModerationEvidence.bulkCreate(
          evidence.map(e => ({
            parent_type: EvidenceParentType.REPORT,
            parent_id: report.reportId,
            type: e.type as EvidenceType,
            content: e.content,
            description: e.description ?? null,
            uploaded_at: new Date(),
          })),
          { transaction }
        );
      }

      // Seed the transition log with the initial status — same shape as
      // ApplicationStatusTransition's `null → SUBMITTED` row.
      await ReportStatusTransition.create(
        {
          reportId: report.reportId,
          fromStatus: null,
          toStatus: ReportStatus.PENDING,
          transitionedBy: reporterId,
          reason: 'Initial submission',
        },
        { transaction }
      );

      // Auto-assign based on category if high severity
      if (report.severity === ReportSeverity.HIGH || report.severity === ReportSeverity.CRITICAL) {
        await this.autoAssignReport(report.reportId, transaction);
      }

      await transaction.commit();

      // Log the submission
      await AuditLogService.log({
        userId: reporterId,
        action: 'REPORT_SUBMITTED',
        entity: 'Report',
        entityId: report.reportId,
        details: {
          category: reportData.category,
          severity: report.severity,
          targetEntity: reportData.reportedEntityId,
        },
        ipAddress: requestContext?.ip,
        userAgent: requestContext?.userAgent,
      });

      logger.info(`Report submitted: ${report.reportId} by user ${reporterId}`);
      return report;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error submitting report:', error);
      throw error;
    }
  }

  async searchReports(
    filters: ReportFilters = {},
    options: ReportSearchOptions = {}
  ): Promise<{
    reports: Report[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const whereClause: WhereOptions = {};

    // Apply filters
    if (filters.status) {
      whereClause.status = filters.status;
    }
    if (filters.category) {
      whereClause.category = filters.category;
    }
    if (filters.severity) {
      whereClause.severity = filters.severity;
    }
    if (filters.reporterId) {
      whereClause.reporterId = filters.reporterId;
    }
    if (filters.reportedUserId) {
      whereClause.reportedUserId = filters.reportedUserId;
    }
    if (filters.assignedModerator) {
      whereClause.assignedModerator = filters.assignedModerator;
    }
    if (filters.reportedEntityType) {
      whereClause.reportedEntityType = filters.reportedEntityType;
    }

    if (filters.dateFrom || filters.dateTo) {
      const dateFilter: Record<symbol, Date> = {};
      if (filters.dateFrom) {
        dateFilter[Op.gte] = filters.dateFrom;
      }
      if (filters.dateTo) {
        dateFilter[Op.lte] = filters.dateTo;
      }
      whereClause.createdAt = dateFilter;
    }

    if (filters.search) {
      // Type assertion needed: Sequelize's types don't support Op.or as index signature
      // This is a valid runtime pattern - Op.or is a symbol used for OR queries
      const orConditions = [
        { title: { [Op.iLike]: `%${filters.search}%` } },
        { description: { [Op.iLike]: `%${filters.search}%` } },
        { reportId: { [Op.iLike]: `%${filters.search}%` } },
      ];
      Object.assign(whereClause, { [Op.or]: orConditions });
    }

    const safeSortBy = validateSortField(
      options.sortBy || 'createdAt',
      REPORT_SORT_FIELDS,
      'createdAt'
    );
    const orderClause = [[safeSortBy, options.sortOrder || 'DESC']];

    const { count, rows } = await Report.findAndCountAll({
      where: whereClause,
      order: orderClause as [[string, string]],
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'Reporter',
          attributes: ['userId', 'firstName', 'lastName', 'email'],
        },
        {
          model: User,
          as: 'AssignedModerator',
          attributes: ['userId', 'firstName', 'lastName'],
        },
        {
          model: ModeratorAction,
          as: 'Actions',
          limit: 5,
          order: [['createdAt', 'DESC']],
        },
      ],
    });

    return {
      reports: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async getReportById(reportId: string, includeActions = true): Promise<Report | null> {
    const includeOptions: Array<{
      model: typeof User | typeof ModeratorAction;
      as: string;
      attributes?: string[];
      include?: Array<{
        model: typeof User;
        as: string;
        attributes: string[];
      }>;
      order?: [[string, string]];
    }> = [
      {
        model: User,
        as: 'Reporter',
        attributes: ['userId', 'firstName', 'lastName', 'email'],
      },
      {
        model: User,
        as: 'AssignedModerator',
        attributes: ['userId', 'firstName', 'lastName'],
      },
    ];

    if (includeActions) {
      includeOptions.push({
        model: ModeratorAction,
        as: 'Actions',
        include: [
          {
            model: User,
            as: 'Moderator',
            attributes: ['userId', 'firstName', 'lastName'],
          },
        ],
        order: [['createdAt', 'ASC']],
      });
    }

    return Report.findByPk(reportId, {
      include: includeOptions,
    });
  }

  async assignReport(reportId: string, moderatorId: string, assignedBy: string): Promise<Report> {
    const transaction = await sequelize.transaction();

    try {
      const report = await Report.findByPk(reportId, { transaction });
      if (!report) {
        throw new Error('Report not found');
      }

      if (report.status !== ReportStatus.PENDING) {
        throw new Error('Report cannot be assigned in its current status');
      }

      const previousStatus = report.status;
      await report.update(
        {
          assignedModerator: moderatorId,
          assignedAt: new Date(),
        },
        { transaction }
      );
      await ReportStatusTransition.create(
        {
          reportId,
          fromStatus: previousStatus,
          toStatus: ReportStatus.UNDER_REVIEW,
          transitionedBy: assignedBy,
          reason: 'Assigned to moderator',
          metadata: { moderatorId },
        },
        { transaction }
      );

      await transaction.commit();

      await AuditLogService.log({
        userId: assignedBy,
        action: 'REPORT_ASSIGNED',
        entity: 'Report',
        entityId: reportId,
        details: { moderatorId, assignedBy },
      });

      return report;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Moderation Actions
  async takeModerationAction(
    moderatorId: string,
    actionData: ModerationActionRequest
  ): Promise<ModeratorAction> {
    const transaction = await sequelize.transaction();

    try {
      // Create the moderation action
      const expiresAt = actionData.duration
        ? new Date(Date.now() + actionData.duration * 60 * 60 * 1000)
        : undefined;

      // Evidence rows live in moderation_evidence (plan 2.1).
      const { evidence, ...actionFields } = actionData;
      const action = await ModeratorAction.create(
        {
          moderatorId,
          ...actionFields,
          expiresAt,
          isActive: true,
          notificationSent: false,
        },
        { transaction }
      );

      if (evidence && evidence.length > 0) {
        await ModerationEvidence.bulkCreate(
          evidence.map(e => ({
            parent_type: EvidenceParentType.MODERATOR_ACTION,
            parent_id: action.actionId,
            type: e.type as EvidenceType,
            content: e.content,
            description: e.description ?? null,
            uploaded_at: new Date(),
          })),
          { transaction }
        );
      }

      // Update related report if provided
      if (actionData.reportId) {
        const report = await Report.findByPk(actionData.reportId, { transaction });
        if (report) {
          const previousStatus = report.status;
          const newStatus =
            actionData.actionType === ActionType.NO_ACTION ||
            actionData.actionType === ActionType.REPORT_DISMISSED
              ? ReportStatus.DISMISSED
              : ReportStatus.RESOLVED;
          await report.update(
            {
              resolvedBy: moderatorId,
              resolvedAt: new Date(),
              resolution: actionData.actionType,
              resolutionNotes: actionData.description,
            },
            { transaction }
          );
          await ReportStatusTransition.create(
            {
              reportId: report.reportId,
              fromStatus: previousStatus,
              toStatus: newStatus,
              transitionedBy: moderatorId,
              reason: actionData.description || actionData.actionType,
              metadata: { actionType: actionData.actionType },
            },
            { transaction }
          );
        }
      }

      await transaction.commit();

      await AuditLogService.log({
        userId: moderatorId,
        action: 'MODERATION_ACTION_TAKEN',
        entity: 'Report',
        entityId: actionData.reportId || action.actionId,
        details: {
          actionType: actionData.actionType,
          severity: actionData.severity,
          reason: actionData.reason,
        },
      });

      logger.info(`Moderation action taken: ${action.actionId} by ${moderatorId}`);
      return action;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error taking moderation action:', error);
      throw error;
    }
  }

  async reverseAction(
    actionId: string,
    reversedBy: string,
    reason: string
  ): Promise<ModeratorAction> {
    const transaction = await sequelize.transaction();

    try {
      const action = await ModeratorAction.findByPk(actionId, { transaction });
      if (!action) {
        throw new Error('Moderation action not found');
      }

      if (!action.canBeReversed()) {
        throw new Error('This action cannot be reversed');
      }

      await action.update(
        {
          isActive: false,
          reversedBy,
          reversedAt: new Date(),
          reversalReason: reason,
        },
        { transaction }
      );

      await transaction.commit();

      await AuditLogService.log({
        userId: reversedBy,
        action: 'MODERATION_ACTION_REVERSED',
        entity: 'ModerationAction',
        entityId: actionId,
        details: { actionId, reason },
      });

      return action;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Analytics and Reporting
  async getModerationMetrics(dateRange?: { from: Date; to: Date }): Promise<{
    reports: {
      total: number;
      pending: number;
      underReview: number;
      resolved: number;
      dismissed: number;
      byCategory: Record<string, number>;
      bySeverity: Record<string, number>;
    };
    actions: {
      total: number;
      byType: Record<string, number>;
      active: number;
      reversed: number;
    };
    response: {
      averageResponseTime: number; // in hours
      averageResolutionTime: number; // in hours
    };
  }> {
    const whereClause: WhereOptions = {};
    if (dateRange) {
      whereClause.createdAt = {
        [Op.between]: [dateRange.from, dateRange.to],
      };
    }

    // Report metrics
    const reportCounts = await Report.findAll({
      where: whereClause,
      attributes: [
        'status',
        'category',
        'severity',
        [sequelize.fn('COUNT', sequelize.col('Report.report_id')), 'count'],
      ],
      group: ['status', 'category', 'severity'],
      raw: true,
    });

    // Action metrics
    const actionCounts = await ModeratorAction.findAll({
      where: whereClause,
      attributes: [
        'actionType',
        'isActive',
        [sequelize.fn('COUNT', sequelize.col('ModeratorAction.action_id')), 'count'],
      ],
      group: ['actionType', 'isActive'],
      raw: true,
    });

    // Calculate response times - use Op.ne instead of Op.not for null checks
    // Type assertion needed: Sequelize's type system doesn't support Op.ne with null correctly
    // This is a valid runtime pattern - we're checking for non-null values
    const responseTimeData = await Report.findAll({
      where: {
        ...whereClause,
        assignedAt: { [Op.ne]: null } as unknown as Date,
      },
      attributes: [
        [
          sequelize.fn(
            'AVG',
            sequelize.literal('EXTRACT(EPOCH FROM ("assigned_at" - "created_at")) / 3600')
          ),
          'avgResponseTime',
        ],
      ],
      raw: true,
    });

    const resolutionTimeData = await Report.findAll({
      where: {
        ...whereClause,
        resolvedAt: { [Op.ne]: null } as unknown as Date,
      },
      attributes: [
        [
          sequelize.fn(
            'AVG',
            sequelize.literal('EXTRACT(EPOCH FROM ("resolved_at" - "created_at")) / 3600')
          ),
          'avgResolutionTime',
        ],
      ],
      raw: true,
    });

    // Process the data
    const reports = {
      total: 0,
      pending: 0,
      underReview: 0,
      resolved: 0,
      dismissed: 0,
      byCategory: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
    };

    const actions = {
      total: 0,
      byType: {} as Record<string, number>,
      active: 0,
      reversed: 0,
    };

    // Process report counts
    (reportCounts as unknown as ReportCountRow[]).forEach(row => {
      const count = parseInt(row.count);
      reports.total += count;

      // Handle the status mapping safely
      if (row.status === 'pending') {
        reports.pending += count;
      } else if (row.status === 'under_review') {
        reports.underReview += count;
      } else if (row.status === 'resolved') {
        reports.resolved += count;
      } else if (row.status === 'dismissed') {
        reports.dismissed += count;
      }

      reports.byCategory[row.category] = (reports.byCategory[row.category] || 0) + count;
      reports.bySeverity[row.severity] = (reports.bySeverity[row.severity] || 0) + count;
    });

    // Process action counts
    (actionCounts as unknown as ActionCountRow[]).forEach(row => {
      const count = parseInt(row.count);
      actions.total += count;
      actions.byType[row.actionType] = (actions.byType[row.actionType] || 0) + count;
      if (row.isActive) {
        actions.active += count;
      } else {
        actions.reversed += count;
      }
    });

    interface AvgTimeResult {
      avgResponseTime?: string;
      avgResolutionTime?: string;
    }

    return {
      reports,
      actions,
      response: {
        averageResponseTime:
          responseTimeData.length > 0
            ? parseFloat(
                String((responseTimeData[0] as unknown as AvgTimeResult).avgResponseTime || '0')
              )
            : 0,
        averageResolutionTime:
          resolutionTimeData.length > 0
            ? parseFloat(
                String((resolutionTimeData[0] as unknown as AvgTimeResult).avgResolutionTime || '0')
              )
            : 0,
      },
    };
  }

  async escalateReport(
    reportId: string,
    escalatedTo: string,
    escalatedBy: string,
    reason: string
  ): Promise<Report> {
    const transaction = await sequelize.transaction();

    try {
      const report = await Report.findByPk(reportId, { transaction });
      if (!report) {
        throw new Error('Report not found');
      }

      if (![ReportStatus.PENDING, ReportStatus.UNDER_REVIEW].includes(report.status)) {
        throw new Error('Report cannot be escalated in its current status');
      }

      const previousStatus = report.status;
      await report.update(
        {
          escalatedTo,
          escalatedAt: new Date(),
          escalationReason: reason,
        },
        { transaction }
      );
      await ReportStatusTransition.create(
        {
          reportId,
          fromStatus: previousStatus,
          toStatus: ReportStatus.ESCALATED,
          transitionedBy: escalatedBy,
          reason,
          metadata: { escalatedTo },
        },
        { transaction }
      );

      await transaction.commit();

      await AuditLogService.log({
        userId: escalatedBy,
        action: 'REPORT_ESCALATED',
        entity: 'Report',
        entityId: reportId,
        details: { escalatedTo, reason },
      });

      logger.info(`Report ${reportId} escalated by ${escalatedBy} to ${escalatedTo}`);
      return report;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error escalating report:', error);
      throw error;
    }
  }

  async bulkUpdateReports(options: {
    reportIds: string[];
    action: 'resolve' | 'dismiss' | 'assign' | 'escalate';
    moderatorId: string;
    resolutionNotes?: string;
    assignTo?: string;
    escalateTo?: string;
    escalationReason?: string;
  }): Promise<{ success: boolean; updated: number }> {
    const {
      reportIds,
      action,
      moderatorId,
      resolutionNotes,
      assignTo,
      escalateTo,
      escalationReason,
    } = options;

    if (!reportIds || reportIds.length === 0) {
      throw new Error('Report IDs are required');
    }

    const transaction = await sequelize.transaction();

    try {
      let updated = 0;

      for (const reportId of reportIds) {
        const report = await Report.findByPk(reportId, { transaction });
        if (!report) {
          throw new Error(`Report ${reportId} not found`);
        }

        const previousStatus = report.status;
        switch (action) {
          case 'resolve':
            if ([ReportStatus.UNDER_REVIEW, ReportStatus.ESCALATED].includes(report.status)) {
              await report.update(
                {
                  resolvedBy: moderatorId,
                  resolvedAt: new Date(),
                  resolutionNotes,
                },
                { transaction }
              );
              await ReportStatusTransition.create(
                {
                  reportId: report.reportId,
                  fromStatus: previousStatus,
                  toStatus: ReportStatus.RESOLVED,
                  transitionedBy: moderatorId,
                  reason: resolutionNotes || 'Bulk resolve',
                },
                { transaction }
              );
              updated++;
            }
            break;

          case 'dismiss':
            if (report.status !== ReportStatus.RESOLVED) {
              await report.update(
                {
                  resolvedBy: moderatorId,
                  resolvedAt: new Date(),
                  resolutionNotes,
                },
                { transaction }
              );
              await ReportStatusTransition.create(
                {
                  reportId: report.reportId,
                  fromStatus: previousStatus,
                  toStatus: ReportStatus.DISMISSED,
                  transitionedBy: moderatorId,
                  reason: resolutionNotes || 'Bulk dismiss',
                },
                { transaction }
              );
              updated++;
            }
            break;

          case 'assign':
            if (!assignTo) {
              throw new Error('assignTo is required for assign action');
            }
            if (report.status === ReportStatus.PENDING) {
              await report.update(
                {
                  assignedModerator: assignTo,
                  assignedAt: new Date(),
                },
                { transaction }
              );
              await ReportStatusTransition.create(
                {
                  reportId: report.reportId,
                  fromStatus: previousStatus,
                  toStatus: ReportStatus.UNDER_REVIEW,
                  transitionedBy: moderatorId,
                  reason: 'Bulk assign',
                  metadata: { assignedTo: assignTo },
                },
                { transaction }
              );
              updated++;
            }
            break;

          case 'escalate':
            if (!escalateTo) {
              throw new Error('escalateTo is required for escalate action');
            }
            if ([ReportStatus.PENDING, ReportStatus.UNDER_REVIEW].includes(report.status)) {
              await report.update(
                {
                  escalatedTo: escalateTo,
                  escalatedAt: new Date(),
                  escalationReason: escalationReason || 'Bulk escalation',
                },
                { transaction }
              );
              await ReportStatusTransition.create(
                {
                  reportId: report.reportId,
                  fromStatus: previousStatus,
                  toStatus: ReportStatus.ESCALATED,
                  transitionedBy: moderatorId,
                  reason: escalationReason || 'Bulk escalation',
                  metadata: { escalatedTo: escalateTo },
                },
                { transaction }
              );
              updated++;
            }
            break;
        }
      }

      await transaction.commit();

      await AuditLogService.log({
        userId: moderatorId,
        action: 'BULK_REPORTS_UPDATE',
        entity: 'Report',
        entityId: 'bulk',
        details: {
          action,
          reportCount: reportIds.length,
          updatedCount: updated,
        },
      });

      logger.info(
        `Bulk ${action} completed: ${updated} of ${reportIds.length} reports updated by ${moderatorId}`
      );

      return { success: true, updated };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error in bulk update:', error);
      throw error;
    }
  }

  // Helper methods
  private async autoAssignReport(reportId: string, transaction?: Transaction): Promise<void> {
    // Simple auto-assignment logic - assign to moderator with least pending reports
    const moderators = await User.findAll({
      include: [
        {
          model: Report,
          as: 'AssignedReports',
          where: {
            status: {
              [Op.in]: [ReportStatus.PENDING, ReportStatus.UNDER_REVIEW],
            },
          },
          required: false,
        },
      ],
      order: [[sequelize.literal('"AssignedReports"."report_id"'), 'ASC']],
      limit: 1,
      transaction,
    });

    if (moderators.length > 0) {
      const assignedTo = moderators[0].userId;
      await Report.update(
        {
          assignedModerator: assignedTo,
          assignedAt: new Date(),
        },
        {
          where: { reportId },
          transaction,
        }
      );
      // System-driven transition: transitionedBy is null (no actor).
      await ReportStatusTransition.create(
        {
          reportId,
          fromStatus: ReportStatus.PENDING,
          toStatus: ReportStatus.UNDER_REVIEW,
          transitionedBy: null,
          reason: 'Auto-assigned',
          metadata: { assignedTo },
        },
        { transaction }
      );
    }
  }

  async getActiveActionsForUser(userId: string): Promise<ModeratorAction[]> {
    // Split the query to avoid complex Op.or with null handling.
    // `[Op.is]: null` emits `IS NULL`, which is the SQL semantics we want
    // for "never expires" and avoids casting null into a Date-shaped attribute.
    const [neverExpiringActions, futureExpiringActions] = await Promise.all([
      ModeratorAction.findAll({
        where: {
          targetUserId: userId,
          isActive: true,
          // Sequelize types `[Op.is]` as `Literal | undefined`; `literal('NULL')`
          // emits `IS NULL` without the implicit-null cast escape.
          expiresAt: { [Op.is]: literal('NULL') },
        },
        order: [['createdAt', 'DESC']],
      }),
      ModeratorAction.findAll({
        where: {
          targetUserId: userId,
          isActive: true,
          expiresAt: { [Op.gt]: new Date() },
        },
        order: [['createdAt', 'DESC']],
      }),
    ]);

    return [...neverExpiringActions, ...futureExpiringActions].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async expireActions(): Promise<number> {
    const [affectedCount] = await ModeratorAction.update(
      { isActive: false },
      {
        where: {
          isActive: true,
          expiresAt: { [Op.lte]: new Date() },
        },
      }
    );

    if (affectedCount > 0) {
      logger.info(`Expired ${affectedCount} moderation actions`);
    }

    return affectedCount;
  }

  /**
   * ADS-478: Previously this method called `User.findByPk` /
   * `Pet.findByPk` / `Rescue.findByPk` inside a `Promise.map`. The
   * in-process `entityCache` only deduplicated exact repeats within
   * one call, so a page of 20 unique reports fired 20 parallel DB
   * queries — classic N+1.
   *
   * Now we collect IDs by type, run one batched `findAll` per type,
   * build a lookup map, and hydrate the reports from the maps. The
   * returned array preserves the input order.
   */
  async enrichReportsWithEntityContext(
    reports: Report[]
  ): Promise<Array<Report & { entityContext?: JsonObject }>> {
    if (!reports || reports.length === 0) {
      return reports;
    }

    // Bucket the entity ids by type so we can fan out one query per
    // type instead of one per report.
    const userIds = new Set<string>();
    const petIds = new Set<string>();
    const rescueIds = new Set<string>();

    for (const report of reports) {
      switch (report.reportedEntityType) {
        case 'user':
          userIds.add(report.reportedEntityId);
          break;
        case 'pet':
          petIds.add(report.reportedEntityId);
          break;
        case 'rescue':
          rescueIds.add(report.reportedEntityId);
          break;
        default:
          // Other entity types render a synthetic context, no fetch.
          break;
      }
    }

    // Run the three fetches in parallel; each is a single bounded
    // IN-query.
    const [users, pets, rescues] = await Promise.all([
      userIds.size > 0
        ? User.findAll({ where: { userId: { [Op.in]: Array.from(userIds) } } })
        : Promise.resolve([] as User[]),
      petIds.size > 0
        ? Pet.findAll({
            where: { petId: { [Op.in]: Array.from(petIds) } },
            include: [{ model: Breed, as: 'Breed', attributes: ['name'] }],
          })
        : Promise.resolve([] as Pet[]),
      rescueIds.size > 0
        ? Rescue.findAll({ where: { rescueId: { [Op.in]: Array.from(rescueIds) } } })
        : Promise.resolve([] as Rescue[]),
    ]);

    const userMap = new Map<string, User>(users.map(u => [u.userId, u]));
    const petMap = new Map<string, Pet>(pets.map(p => [p.petId, p]));
    const rescueMap = new Map<string, Rescue>(rescues.map(r => [r.rescueId, r]));

    const buildContext = (report: Report): JsonObject => {
      switch (report.reportedEntityType) {
        case 'user': {
          const user = userMap.get(report.reportedEntityId);
          return user
            ? {
                type: 'user',
                id: user.userId,
                displayName: `${user.firstName} ${user.lastName}`,
                email: user.email,
                userType: user.userType,
              }
            : {
                type: 'user',
                id: report.reportedEntityId,
                displayName: '[Deleted User]',
                deleted: true,
              };
        }
        case 'pet': {
          const pet = petMap.get(report.reportedEntityId);
          const petWithBreed = pet as (Pet & { Breed?: { name: string } | null }) | undefined;
          return pet
            ? {
                type: 'pet',
                id: pet.petId,
                displayName: pet.name,
                petType: pet.type,
                breed: petWithBreed?.Breed?.name ?? null,
                rescueId: pet.rescueId,
              }
            : {
                type: 'pet',
                id: report.reportedEntityId,
                displayName: '[Deleted Pet]',
                deleted: true,
              };
        }
        case 'rescue': {
          const rescue = rescueMap.get(report.reportedEntityId);
          return rescue
            ? {
                type: 'rescue',
                id: rescue.rescueId,
                displayName: rescue.name,
                city: rescue.city,
                country: rescue.country,
              }
            : {
                type: 'rescue',
                id: report.reportedEntityId,
                displayName: '[Deleted Rescue]',
                deleted: true,
              };
        }
        default:
          return {
            type: report.reportedEntityType,
            id: report.reportedEntityId,
            displayName: `${report.reportedEntityType} ${report.reportedEntityId.substring(0, 8)}...`,
          };
      }
    };

    return reports.map(report => {
      let entityContext: JsonObject;
      try {
        entityContext = buildContext(report);
      } catch (error) {
        logger.error('Error building entity context:', error);
        entityContext = {
          type: report.reportedEntityType,
          id: report.reportedEntityId,
          displayName: '[Error Loading Entity]',
          error: true,
        };
      }
      return {
        ...(report.toJSON ? report.toJSON() : report),
        entityContext,
      } as Report & { entityContext?: JsonObject };
    });
  }

  async getReportsWithContext(
    filters: ReportFilters,
    options: ReportSearchOptions
  ): Promise<{
    reports: Array<Report & { entityContext?: JsonObject }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const result = await this.searchReports(filters, options);
    const enrichedReports = await this.enrichReportsWithEntityContext(result.reports);
    return {
      reports: enrichedReports,
      pagination: result.pagination,
    };
  }

  async getFlaggedMessages(options: {
    severity?: string;
    moderationStatus?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    messages: import('../models/Message').Message[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { Op } = await import('sequelize');
    const { default: Message } = await import('../models/Message');
    const { page = 1, limit = 20, severity, moderationStatus } = options;

    const where: Record<string, unknown> = { is_flagged: true };

    if (severity) {
      where['flag_severity'] = severity;
    }
    if (moderationStatus) {
      where['moderation_status'] = moderationStatus;
    } else {
      where['moderation_status'] = { [Op.ne]: 'rejected' };
    }

    const { rows: messages, count: total } = await Message.findAndCountAll({
      where,
      order: [['flagged_at', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      messages,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

export default new ModerationService();
