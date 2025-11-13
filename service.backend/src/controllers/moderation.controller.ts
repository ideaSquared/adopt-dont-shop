import { Response } from 'express';
import ModerationService, {
  ModerationActionRequest,
  ReportFilters,
  ReportSearchOptions,
  ReportSubmission,
} from '../services/moderation.service';
import { ReportStatus, ReportCategory, ReportSeverity } from '../models/Report';
import { AuthenticatedRequest } from '../types/auth';
import { logger } from '../utils/logger';

export class ModerationController {
  // Report Management
  async submitReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const reportData: ReportSubmission = req.body;
      const reporterId = req.user!.userId;
      const requestContext = {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      };

      const report = await ModerationService.submitReport(reporterId, reportData, requestContext);

      res.status(201).json({
        success: true,
        message: 'Report submitted successfully',
        data: report,
      });
    } catch (error) {
      logger.error('Error submitting report:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to submit report',
      });
    }
  }

  async getReports(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const filters: ReportFilters = {
        status:
          typeof req.query.status === 'string' ? (req.query.status as ReportStatus) : undefined,
        category:
          typeof req.query.category === 'string'
            ? (req.query.category as ReportCategory)
            : undefined,
        severity:
          typeof req.query.severity === 'string'
            ? (req.query.severity as ReportSeverity)
            : undefined,
        reporterId: typeof req.query.reporterId === 'string' ? req.query.reporterId : undefined,
        reportedUserId:
          typeof req.query.reportedUserId === 'string' ? req.query.reportedUserId : undefined,
        assignedModerator:
          typeof req.query.assignedModerator === 'string' ? req.query.assignedModerator : undefined,
        reportedEntityType:
          typeof req.query.reportedEntityType === 'string'
            ? req.query.reportedEntityType
            : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
      };

      // Date filters
      if (req.query.dateFrom) {
        filters.dateFrom = new Date(req.query.dateFrom as string);
      }
      if (req.query.dateTo) {
        filters.dateTo = new Date(req.query.dateTo as string);
      }

      const options: ReportSearchOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: (req.query.sortBy as string) || 'createdAt',
        sortOrder: (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC',
      };

      const result = await ModerationService.getReportsWithContext(filters, options);

      res.json({
        success: true,
        data: result.reports,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Error fetching reports:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch reports',
      });
    }
  }

  async getReportById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const includeActions = req.query.includeActions !== 'false';

      const report = await ModerationService.getReportById(reportId, includeActions);

      if (!report) {
        res.status(404).json({
          success: false,
          message: 'Report not found',
        });
        return;
      }

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      logger.error('Error fetching report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch report',
      });
    }
  }

  async updateReportStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const { status, assignedModerator, resolution, resolutionNotes } = req.body;
      const updatedBy = req.user!.userId;

      // Get the report first
      const report = await ModerationService.getReportById(reportId);
      if (!report) {
        res.status(404).json({
          success: false,
          message: 'Report not found',
        });
        return;
      }

      // Update the report with the new status
      await report.update({
        status,
        assignedModerator,
        resolution,
        resolutionNotes,
        resolvedBy: status === 'resolved' ? updatedBy : undefined,
        resolvedAt: status === 'resolved' ? new Date() : undefined,
      });

      res.json({
        success: true,
        message: 'Report status updated successfully',
        data: report,
      });
    } catch (error) {
      logger.error('Error updating report status:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update report status',
      });
    }
  }

  // Moderation Actions
  async takeModerationAction(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const actionData: ModerationActionRequest = req.body;
      const moderatorId = req.user!.userId;

      const action = await ModerationService.takeModerationAction(moderatorId, actionData);

      res.status(201).json({
        success: true,
        message: 'Moderation action taken successfully',
        data: action,
      });
    } catch (error) {
      logger.error('Error taking moderation action:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to take moderation action',
      });
    }
  }

  async getActiveActions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const actions = await ModerationService.getActiveActionsForUser(userId);

      res.json({
        success: true,
        data: actions,
      });
    } catch (error) {
      logger.error('Error fetching active actions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch active actions',
      });
    }
  }

  // Analytics and Metrics
  async getModerationMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      let dateRange;
      if (req.query.from && req.query.to) {
        dateRange = {
          from: new Date(req.query.from as string),
          to: new Date(req.query.to as string),
        };
      }

      const metrics = await ModerationService.getModerationMetrics(dateRange);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error('Error fetching moderation metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch moderation metrics',
      });
    }
  }

  // Assign report to moderator
  async assignReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const { moderatorId } = req.body;
      const assignedBy = req.user!.userId;

      const report = await ModerationService.assignReport(reportId, moderatorId, assignedBy);

      res.json({
        success: true,
        message: 'Report assigned successfully',
        data: report,
      });
    } catch (error) {
      logger.error('Error assigning report:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to assign report',
      });
    }
  }

  // Escalate report
  async escalateReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const { escalatedTo, reason } = req.body;
      const escalatedBy = req.user!.userId;

      const report = await ModerationService.escalateReport(
        reportId,
        escalatedTo,
        escalatedBy,
        reason
      );

      res.json({
        success: true,
        message: 'Report escalated successfully',
        data: report,
      });
    } catch (error) {
      logger.error('Error escalating report:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to escalate report',
      });
    }
  }

  // Bulk operations
  async bulkUpdateReports(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { reportIds, action, resolutionNotes, assignTo, escalateTo, escalationReason } =
        req.body;
      const moderatorId = req.user!.userId;

      // Validate input
      if (!Array.isArray(reportIds) || reportIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Report IDs are required and must be an array',
        });
        return;
      }

      const result = await ModerationService.bulkUpdateReports({
        reportIds,
        action,
        moderatorId,
        resolutionNotes,
        assignTo,
        escalateTo,
        escalationReason,
      });

      res.json(result);
    } catch (error) {
      logger.error('Error performing bulk update:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to perform bulk update',
      });
    }
  }
}

export default new ModerationController();
