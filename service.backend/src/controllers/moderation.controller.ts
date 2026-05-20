import { Response } from 'express';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/pagination';
import ModerationService, {
  ModerationActionRequest,
  ReportFilters,
  ReportSearchOptions,
  ReportSubmission,
} from '../services/moderation.service';
import { ReportStatus, ReportCategory, ReportSeverity } from '../models/Report';
import { AuthenticatedRequest } from '../types/auth';
import { parsePage, parsePaginationLimit } from '../utils/pagination';

export class ModerationController {
  // Report Management
  async submitReport(req: AuthenticatedRequest, res: Response): Promise<void> {
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
  }

  async getReports(req: AuthenticatedRequest, res: Response): Promise<void> {
    const filters: ReportFilters = {
      status: typeof req.query.status === 'string' ? (req.query.status as ReportStatus) : undefined,
      category:
        typeof req.query.category === 'string' ? (req.query.category as ReportCategory) : undefined,
      severity:
        typeof req.query.severity === 'string' ? (req.query.severity as ReportSeverity) : undefined,
      reporterId: typeof req.query.reporterId === 'string' ? req.query.reporterId : undefined,
      reportedUserId:
        typeof req.query.reportedUserId === 'string' ? req.query.reportedUserId : undefined,
      assignedModerator:
        typeof req.query.assignedModerator === 'string' ? req.query.assignedModerator : undefined,
      reportedEntityType:
        typeof req.query.reportedEntityType === 'string' ? req.query.reportedEntityType : undefined,
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
      page: parsePage(req.query.page as string | undefined),
      limit: parsePaginationLimit(req.query.limit as string | undefined, {
        default: DEFAULT_PAGE_SIZE,
        max: MAX_PAGE_SIZE,
      }),
      sortBy: (req.query.sortBy as string) || 'createdAt',
      sortOrder: (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC',
    };

    const result = await ModerationService.getReportsWithContext(filters, options);

    res.json({
      success: true,
      data: result.reports,
      pagination: result.pagination,
    });
  }

  async getReportById(req: AuthenticatedRequest, res: Response): Promise<void> {
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
  }

  async updateReportStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
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
  }

  // Moderation Actions
  async takeModerationAction(req: AuthenticatedRequest, res: Response): Promise<void> {
    const actionData: ModerationActionRequest = req.body;
    const moderatorId = req.user!.userId;

    const action = await ModerationService.takeModerationAction(moderatorId, actionData);

    res.status(201).json({
      success: true,
      message: 'Moderation action taken successfully',
      data: action,
    });
  }

  async getActiveActions(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { userId } = req.params;

    const actions = await ModerationService.getActiveActionsForUser(userId);

    res.json({
      success: true,
      data: actions,
    });
  }

  // Analytics and Metrics
  async getModerationMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    let dateRange;
    if (req.query.startDate && req.query.endDate) {
      dateRange = {
        from: new Date(req.query.startDate as string),
        to: new Date(req.query.endDate as string),
      };
    }

    const metrics = await ModerationService.getModerationMetrics(dateRange);

    res.json({
      success: true,
      data: metrics,
    });
  }

  // Assign report to moderator
  async assignReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { reportId } = req.params;
    const { moderatorId } = req.body;
    const assignedBy = req.user!.userId;

    const report = await ModerationService.assignReport(reportId, moderatorId, assignedBy);

    res.json({
      success: true,
      message: 'Report assigned successfully',
      data: report,
    });
  }

  // Escalate report
  async escalateReport(req: AuthenticatedRequest, res: Response): Promise<void> {
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
  }

  // Bulk operations
  async bulkUpdateReports(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { reportIds, action, resolutionNotes, assignTo, escalateTo, escalationReason } = req.body;
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
  }

  async getFlaggedMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    const page = parsePage(req.query.page as string | undefined);
    const limit = parsePaginationLimit(req.query.limit as string | undefined, {
      default: DEFAULT_PAGE_SIZE,
      max: MAX_PAGE_SIZE,
    });
    const severity = req.query.severity ? String(req.query.severity) : undefined;
    const moderationStatus = req.query.moderationStatus
      ? String(req.query.moderationStatus)
      : undefined;

    const result = await ModerationService.getFlaggedMessages({
      page,
      limit,
      severity,
      moderationStatus,
    });

    res.json({ success: true, data: result });
  }
}

export default new ModerationController();
