import { Op, Transaction } from 'sequelize';
import ModeratorAction, { ActionSeverity, ActionType } from '../models/ModeratorAction';
import Report, { ReportCategory, ReportSeverity, ReportStatus } from '../models/Report';
import User from '../models/User';
import Pet from '../models/Pet';
import Rescue from '../models/Rescue';
import sequelize from '../sequelize';
import logger from '../utils/logger';
import { AuditLogService } from './auditLog.service';

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

      // Create the report
      const report = await Report.create(
        {
          reporterId,
          ...reportData,
          status: ReportStatus.PENDING,
          severity: reportData.severity || ReportSeverity.MEDIUM,
          metadata: {
            submissionContext: requestContext || null,
            autoDetected: false,
          },
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

    const whereClause: any = {};

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
      whereClause.createdAt = {};
      if (filters.dateFrom) {
        whereClause.createdAt[Op.gte] = filters.dateFrom;
      }
      if (filters.dateTo) {
        whereClause.createdAt[Op.lte] = filters.dateTo;
      }
    }

    if (filters.search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${filters.search}%` } },
        { description: { [Op.iLike]: `%${filters.search}%` } },
        { reportId: { [Op.iLike]: `%${filters.search}%` } },
      ];
    }

    const orderClause = [[options.sortBy || 'createdAt', options.sortOrder || 'DESC']];

    const { count, rows } = await Report.findAndCountAll({
      where: whereClause,
      order: orderClause as any,
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
    const includeOptions: any[] = [
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

      await report.update(
        {
          assignedModerator: moderatorId,
          assignedAt: new Date(),
          status: ReportStatus.UNDER_REVIEW,
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

      const action = await ModeratorAction.create(
        {
          moderatorId,
          ...actionData,
          expiresAt,
          isActive: true,
          notificationSent: false,
        },
        { transaction }
      );

      // Update related report if provided
      if (actionData.reportId) {
        const report = await Report.findByPk(actionData.reportId, { transaction });
        if (report) {
          await report.update(
            {
              status:
                actionData.actionType === ActionType.NO_ACTION ||
                actionData.actionType === ActionType.REPORT_DISMISSED
                  ? ReportStatus.DISMISSED
                  : ReportStatus.RESOLVED,
              resolvedBy: moderatorId,
              resolvedAt: new Date(),
              resolution: actionData.actionType,
              resolutionNotes: actionData.description,
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
    const whereClause: any = {};
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

    // Calculate response times
    const responseTimeData = await Report.findAll({
      where: {
        ...whereClause,
        assignedAt: { [Op.not]: null },
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
        resolvedAt: { [Op.not]: null },
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
    reportCounts.forEach((row: any) => {
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
    actionCounts.forEach((row: any) => {
      const count = parseInt(row.count);
      actions.total += count;
      actions.byType[row.actionType] = (actions.byType[row.actionType] || 0) + count;
      if (row.isActive) {
        actions.active += count;
      } else {
        actions.reversed += count;
      }
    });

    return {
      reports,
      actions,
      response: {
        averageResponseTime:
          responseTimeData.length > 0
            ? parseFloat(String((responseTimeData[0] as any).avgResponseTime || '0'))
            : 0,
        averageResolutionTime:
          resolutionTimeData.length > 0
            ? parseFloat(String((resolutionTimeData[0] as any).avgResolutionTime || '0'))
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

      await report.update(
        {
          status: ReportStatus.ESCALATED,
          escalatedTo,
          escalatedAt: new Date(),
          escalationReason: reason,
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
    const { reportIds, action, moderatorId, resolutionNotes, assignTo, escalateTo, escalationReason } = options;

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

        switch (action) {
          case 'resolve':
            if ([ReportStatus.UNDER_REVIEW, ReportStatus.ESCALATED].includes(report.status)) {
              await report.update(
                {
                  status: ReportStatus.RESOLVED,
                  resolvedBy: moderatorId,
                  resolvedAt: new Date(),
                  resolutionNotes,
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
                  status: ReportStatus.DISMISSED,
                  resolvedBy: moderatorId,
                  resolvedAt: new Date(),
                  resolutionNotes,
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
                  status: ReportStatus.UNDER_REVIEW,
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
                  status: ReportStatus.ESCALATED,
                  escalatedTo: escalateTo,
                  escalatedAt: new Date(),
                  escalationReason: escalationReason || 'Bulk escalation',
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

      logger.info(`Bulk ${action} completed: ${updated} of ${reportIds.length} reports updated by ${moderatorId}`);

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
      await Report.update(
        {
          assignedModerator: moderators[0].userId,
          assignedAt: new Date(),
          status: ReportStatus.UNDER_REVIEW,
        },
        {
          where: { reportId },
          transaction,
        }
      );
    }
  }

  async getActiveActionsForUser(userId: string): Promise<ModeratorAction[]> {
    // Split the query to avoid complex Op.or with null handling
    const [neverExpiringActions, futureExpiringActions] = await Promise.all([
      ModeratorAction.findAll({
        where: {
          targetUserId: userId,
          isActive: true,
          expiresAt: { [Op.is]: null } as any,
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

  async enrichReportsWithEntityContext(reports: any[]): Promise<any[]> {
    if (!reports || reports.length === 0) {
      return reports;
    }

    const entityCache = new Map<string, any>();

    const enrichedReports = await Promise.all(
      reports.map(async (report) => {
        const cacheKey = `${report.reportedEntityType}:${report.reportedEntityId}`;
        let entityContext = null;

        if (entityCache.has(cacheKey)) {
          entityContext = entityCache.get(cacheKey);
        } else {
          try {
            switch (report.reportedEntityType) {
              case 'user':
                const user = await User.findByPk(report.reportedEntityId);
                entityContext = user
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
                break;

              case 'pet':
                const pet = await Pet.findByPk(report.reportedEntityId);
                entityContext = pet
                  ? {
                      type: 'pet',
                      id: pet.pet_id,
                      displayName: pet.name,
                      petType: pet.type,
                      breed: pet.breed,
                      rescueId: pet.rescue_id,
                    }
                  : {
                      type: 'pet',
                      id: report.reportedEntityId,
                      displayName: '[Deleted Pet]',
                      deleted: true,
                    };
                break;

              case 'rescue':
                const rescue = await Rescue.findByPk(report.reportedEntityId);
                entityContext = rescue
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
                break;

              default:
                entityContext = {
                  type: report.reportedEntityType,
                  id: report.reportedEntityId,
                  displayName: `${report.reportedEntityType} ${report.reportedEntityId.substring(0, 8)}...`,
                };
            }

            if (entityContext) {
              entityCache.set(cacheKey, entityContext);
            }
          } catch (error) {
            logger.error('Error fetching entity context:', error);
            entityContext = {
              type: report.reportedEntityType,
              id: report.reportedEntityId,
              displayName: '[Error Loading Entity]',
              error: true,
            };
          }
        }

        return {
          ...report.toJSON ? report.toJSON() : report,
          entityContext,
        };
      })
    );

    return enrichedReports;
  }

  async getReportsWithContext(
    filters: ReportFilters,
    options: ReportSearchOptions
  ): Promise<{
    reports: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const result = await this.searchReports(filters, options);
    const enrichedReports = await this.enrichReportsWithEntityContext(result.reports);
    return {
      reports: enrichedReports,
      pagination: result.pagination,
    };
  }
}

export default new ModerationService();
