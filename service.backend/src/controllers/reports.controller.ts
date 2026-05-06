import { Response } from 'express';
import { BaseController } from './base.controller';
import { AuthenticatedRequest } from '../types/auth';
import { ReportsService, ForbiddenError, NotFoundError } from '../services/reports.service';
import { ScheduledReportFormat, ScheduledReportStatus } from '../models/ScheduledReport';
import { ReportSharePermission, ReportShareType } from '../models/ReportShare';
import { enqueueScheduleRepeat, removeScheduleRepeat } from '../workers/reports.worker';
import {
  createSavedReportSchema,
  updateSavedReportSchema,
  executeReportRequestSchema,
  upsertScheduleSchema,
  createShareSchema,
  reportConfigSchema,
} from '../schemas/reports.schema';

/**
 * ADS-105: Custom analytics report endpoints.
 *
 * Authorization model (per ADS-251 — controllers are the boundary,
 * never trust the service to enforce rescue scope):
 *   - Owners can view/edit their own reports
 *   - `reports.read.rescue` lets a user see reports scoped to their
 *     own rescueId (rescue affiliation is loaded by auth middleware)
 *   - `reports.read.platform` lets a user see platform-scope reports
 *     (rescue_id IS NULL)
 *   - `ReportShare` rows extend access to specific users (or via
 *     signed token URLs)
 */

const hasPerm = (req: AuthenticatedRequest, name: string): boolean => {
  const roles = req.user?.Roles ?? [];
  for (const role of roles) {
    const perms = (role.Permissions ?? []) as Array<{ permissionName?: string }>;
    if (perms.some(p => p.permissionName === name)) {
      return true;
    }
  }
  return false;
};

class ReportsControllerImpl extends BaseController {
  list = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    if (!req.user) {
      return this.sendUnauthorized(res);
    }
    const reports = await ReportsService.listReports({
      userId: req.user.userId,
      rescueId: req.user.rescueId ?? null,
      canReadPlatform: hasPerm(req, 'reports.read.platform'),
      canReadRescue: hasPerm(req, 'reports.read.rescue'),
      includeArchived: req.query.includeArchived === 'true',
    });
    return this.sendSuccess(res, reports);
  };

  get = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    if (!req.user) {
      return this.sendUnauthorized(res);
    }
    try {
      const report = await ReportsService.getReport(req.params.id);
      const allowed = await ReportsService.canView(report, {
        userId: req.user.userId,
        rescueId: req.user.rescueId ?? null,
        canReadPlatform: hasPerm(req, 'reports.read.platform'),
        canReadRescue: hasPerm(req, 'reports.read.rescue'),
      });
      if (!allowed) {
        return this.sendForbidden(res);
      }
      return this.sendSuccess(res, report);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return this.sendNotFound(res, 'Report');
      }
      throw err;
    }
  };

  create = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    if (!req.user) {
      return this.sendUnauthorized(res);
    }
    const parsed = createSavedReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return this.sendValidationError(
        res,
        parsed.error.issues.map(i => ({
          field: i.path.join('.') || 'unknown',
          message: i.message,
        }))
      );
    }
    // rescueId scope: if user is rescue staff, force their rescueId.
    // Platform-wide reports require explicit reports.read.platform.
    const userRescueId = req.user.rescueId ?? null;
    let rescueId: string | null;
    if (parsed.data.rescueId === null || parsed.data.rescueId === undefined) {
      rescueId = userRescueId; // default to user's rescue (or null = platform)
    } else {
      rescueId = parsed.data.rescueId;
    }
    if (rescueId === null && !hasPerm(req, 'reports.read.platform')) {
      return this.sendForbidden(res, 'Platform-scope reports require reports.read.platform');
    }
    if (rescueId !== null && rescueId !== userRescueId && !hasPerm(req, 'reports.read.platform')) {
      return this.sendForbidden(res, 'Cannot create reports for other rescues');
    }
    const report = await ReportsService.createReport({
      userId: req.user.userId,
      rescueId,
      name: parsed.data.name,
      description: parsed.data.description,
      templateId: parsed.data.templateId,
      config: parsed.data.config,
    });
    return this.sendSuccess(res, report, 'Report created', 201);
  };

  update = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    if (!req.user) {
      return this.sendUnauthorized(res);
    }
    const parsed = updateSavedReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return this.sendValidationError(
        res,
        parsed.error.issues.map(i => ({
          field: i.path.join('.') || 'unknown',
          message: i.message,
        }))
      );
    }
    try {
      const existing = await ReportsService.getReport(req.params.id);
      const canEdit = await ReportsService.canEdit(existing, { userId: req.user.userId });
      if (!canEdit) {
        return this.sendForbidden(res);
      }
      const report = await ReportsService.updateReport(req.params.id, {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        config: parsed.data.config,
        isArchived: parsed.data.isArchived,
      });
      return this.sendSuccess(res, report, 'Report updated');
    } catch (err) {
      if (err instanceof NotFoundError) {
        return this.sendNotFound(res, 'Report');
      }
      throw err;
    }
  };

  remove = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    if (!req.user) {
      return this.sendUnauthorized(res);
    }
    try {
      const existing = await ReportsService.getReport(req.params.id);
      if (existing.user_id !== req.user.userId && !hasPerm(req, 'reports.read.platform')) {
        return this.sendForbidden(res, 'Only the owner can delete a report');
      }
      await ReportsService.deleteReport(req.params.id);
      return this.sendSuccess(res, { deleted: true }, 'Report deleted');
    } catch (err) {
      if (err instanceof NotFoundError) {
        return this.sendNotFound(res, 'Report');
      }
      throw err;
    }
  };

  /** POST /reports/:id/execute — run a saved report (cached) */
  executeSaved = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    if (!req.user) {
      return this.sendUnauthorized(res);
    }
    try {
      const report = await ReportsService.getReport(req.params.id);
      const allowed = await ReportsService.canView(report, {
        userId: req.user.userId,
        rescueId: req.user.rescueId ?? null,
        canReadPlatform: hasPerm(req, 'reports.read.platform'),
        canReadRescue: hasPerm(req, 'reports.read.rescue'),
      });
      if (!allowed) {
        return this.sendForbidden(res);
      }
      const config = reportConfigSchema.parse(report.config);
      const executed = await ReportsService.executeReport(config, {
        scope: report.rescue_id ?? 'platform',
        userId: req.user.userId,
      });
      return this.sendSuccess(res, executed);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return this.sendNotFound(res, 'Report');
      }
      throw err;
    }
  };

  /** POST /reports/execute — run an unsaved config (preview, not cached at the saved layer) */
  executePreview = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    if (!req.user) {
      return this.sendUnauthorized(res);
    }
    const parsed = executeReportRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return this.sendValidationError(
        res,
        parsed.error.issues.map(i => ({ field: i.path.join('.') || 'unknown', message: i.message }))
      );
    }
    const userRescueId = req.user.rescueId ?? null;
    const requestedRescueId = parsed.data.config.filters.rescueId ?? null;
    // Cross-rescue preview blocked unless platform read.
    if (
      requestedRescueId !== null &&
      requestedRescueId !== userRescueId &&
      !hasPerm(req, 'reports.read.platform')
    ) {
      return this.sendForbidden(res, 'Cannot preview reports for other rescues');
    }
    if (requestedRescueId === null && !hasPerm(req, 'reports.read.platform')) {
      return this.sendForbidden(res, 'Platform-scope previews require reports.read.platform');
    }
    const executed = await ReportsService.executeReport(parsed.data.config, {
      scope: requestedRescueId ?? 'platform',
      userId: req.user.userId,
    });
    return this.sendSuccess(res, executed);
  };

  // — Templates —

  listTemplates = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    if (!req.user) {
      return this.sendUnauthorized(res);
    }
    const templates = await ReportsService.listTemplates(req.user.rescueId ?? null);
    return this.sendSuccess(res, templates);
  };

  // — Schedules —

  upsertSchedule = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    if (!req.user) {
      return this.sendUnauthorized(res);
    }
    const parsed = upsertScheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      return this.sendValidationError(
        res,
        parsed.error.issues.map(i => ({ field: i.path.join('.') || 'unknown', message: i.message }))
      );
    }
    try {
      const report = await ReportsService.getReport(req.params.id);
      const canEdit = await ReportsService.canEdit(report, { userId: req.user.userId });
      if (!canEdit) {
        return this.sendForbidden(res);
      }
      const schedule = await ReportsService.upsertSchedule({
        savedReportId: report.saved_report_id,
        cron: parsed.data.cron,
        timezone: parsed.data.timezone,
        recipients: parsed.data.recipients,
        format: parsed.data.format as ScheduledReportFormat,
        isEnabled: parsed.data.isEnabled,
      });
      // Register the BullMQ repeatable for this schedule. Failure to
      // enqueue (Redis down) doesn't block the API call — admins will
      // see status='pending' and we'll log the warning.
      const repeatKey = await enqueueScheduleRepeat(schedule).catch(() => null);
      if (repeatKey && schedule.repeat_job_key !== repeatKey) {
        schedule.repeat_job_key = repeatKey;
        await schedule.save();
      }
      return this.sendSuccess(res, schedule, 'Schedule upserted');
    } catch (err) {
      if (err instanceof NotFoundError) {
        return this.sendNotFound(res, 'Report');
      }
      throw err;
    }
  };

  deleteSchedule = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    if (!req.user) {
      return this.sendUnauthorized(res);
    }
    try {
      const schedule = await ReportsService.deleteSchedule(req.params.scheduleId);
      await removeScheduleRepeat(schedule);
      return this.sendSuccess(res, { deleted: true }, 'Schedule deleted');
    } catch (err) {
      if (err instanceof NotFoundError) {
        return this.sendNotFound(res, 'Schedule');
      }
      throw err;
    }
  };

  // — Shares —

  createShare = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    if (!req.user) {
      return this.sendUnauthorized(res);
    }
    const parsed = createShareSchema.safeParse(req.body);
    if (!parsed.success) {
      return this.sendValidationError(
        res,
        parsed.error.issues.map(i => ({ field: i.path.join('.') || 'unknown', message: i.message }))
      );
    }
    try {
      const report = await ReportsService.getReport(req.params.id);
      const canEdit = await ReportsService.canEdit(report, { userId: req.user.userId });
      if (!canEdit) {
        return this.sendForbidden(res);
      }
      const result = await ReportsService.createShare({
        savedReportId: report.saved_report_id,
        type: parsed.data.shareType as ReportShareType,
        sharedWithUserId:
          parsed.data.shareType === 'user' ? parsed.data.sharedWithUserId : undefined,
        permission: parsed.data.permission as ReportSharePermission,
        expiresAt: parsed.data.shareType === 'token' ? parsed.data.expiresAt : undefined,
        createdBy: req.user.userId,
      });
      return this.sendSuccess(res, result, 'Share created', 201);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return this.sendNotFound(res, 'Report');
      }
      throw err;
    }
  };

  revokeShare = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    if (!req.user) {
      return this.sendUnauthorized(res);
    }
    try {
      const share = await ReportsService.revokeShare(req.params.shareId);
      return this.sendSuccess(res, share, 'Share revoked');
    } catch (err) {
      if (err instanceof NotFoundError) {
        return this.sendNotFound(res, 'Share');
      }
      throw err;
    }
  };

  /** GET /reports/shared/:token — token-based view, no session required. */
  viewSharedByToken = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      const { report, share } = await ReportsService.resolveTokenShare(req.params.token);
      const config = reportConfigSchema.parse(report.config);
      const executed = await ReportsService.executeReport(config, {
        scope: report.rescue_id ?? 'platform',
      });
      return this.sendSuccess(res, {
        report: {
          name: report.name,
          description: report.description,
          config: report.config,
        },
        share: {
          permission: share.permission,
          expiresAt: share.expires_at,
        },
        data: executed,
      });
    } catch (err) {
      if (err instanceof ForbiddenError) {
        return this.sendForbidden(res, err.message);
      }
      throw err;
    }
  };
}

export const ReportsController = new ReportsControllerImpl();
