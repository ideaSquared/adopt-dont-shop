import { Op } from 'sequelize';
import { createHash, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import SavedReport from '../models/SavedReport';
import ReportTemplate from '../models/ReportTemplate';
import ScheduledReport, {
  ScheduledReportFormat,
  ScheduledReportStatus,
  type ScheduledReportRecipient,
} from '../models/ScheduledReport';
import ReportShare, { ReportSharePermission, ReportShareType } from '../models/ReportShare';
import { AnalyticsService } from './analytics.service';
import { ReportCache } from './report-cache.service';
import {
  reportConfigSchema,
  type ReportConfig,
  type ReportFilters,
  type ReportWidget,
} from '../schemas/reports.schema';
import { logger } from '../utils/logger';
import { JsonObject } from '../types/common';

/**
 * ADS-105: Reports orchestration.
 *
 * `executeReport` is the engine: it dispatches each widget's metric
 * request to the existing `AnalyticsService` aggregations and stitches
 * the responses back together as `{ widgets: [{id, data, meta}] }`.
 *
 * Authorization is the controller's job (per ADS-251). The service
 * trusts that callers have already verified rescue scope. The service
 * returns the rescueId scope it ran with so cache keys / shares stay
 * consistent.
 */

export class ForbiddenError extends Error {
  public readonly status = 403;
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  public readonly status = 404;
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export type ExecuteContext = {
  /** scope: 'platform' for platform-wide reports, otherwise the rescueId. */
  scope: string | 'platform';
  /** caller's userId, for audit/cache instrumentation */
  userId?: string;
};

export type WidgetResult = {
  id: string;
  data: unknown;
  meta: { metric: string; chartType: string; computedAt: string };
};

export type ExecutedReport = {
  widgets: WidgetResult[];
  filters: ReportFilters;
  computedAt: string;
  cacheHit: boolean;
};

const widgetTtl = (widget: ReportWidget): 'realtime' | 'daily' | 'historical' => {
  // Real-time chart-types update frequently; aggregated daily metrics
  // can stand for several minutes. Historical (closed period) is hour.
  if (widget.metric === 'platform' || widget.chartType === 'metric-card') {
    return 'realtime';
  }
  return 'daily';
};

const dispatchWidget = async (
  widget: ReportWidget,
  filters: ReportFilters,
  scope: string | 'platform'
): Promise<unknown> => {
  const opts = {
    startDate: filters.startDate,
    endDate: filters.endDate,
    groupBy: filters.groupBy,
    rescueId: scope === 'platform' ? undefined : scope,
  };
  switch (widget.metric) {
    case 'adoption':
      return AnalyticsService.getAdoptionMetrics(opts);
    case 'application':
      return AnalyticsService.getApplicationMetrics(opts);
    case 'user':
      return AnalyticsService.getUserBehaviorMetrics(opts);
    case 'communication':
      return AnalyticsService.getCommunicationMetrics(opts);
    case 'platform':
      return AnalyticsService.getPlatformMetrics(opts);
    case 'custom':
      // Custom widgets resolve nothing on the backend — the frontend
      // is expected to compute from already-fetched data. Return empty
      // payload rather than failing.
      return null;
    default:
      return null;
  }
};

export const ReportsService = {
  /**
   * Run a report config and return widget data. Caches the entire
   * response keyed by (scope, config-hash, dateRange).
   */
  async executeReport(config: ReportConfig, ctx: ExecuteContext): Promise<ExecutedReport> {
    const validated = reportConfigSchema.parse(config);
    const { filters, widgets } = validated;
    const cached = await ReportCache.get<ExecutedReport>(
      ctx.scope,
      validated,
      filters.startDate,
      filters.endDate
    );
    if (cached) {
      return { ...cached, cacheHit: true };
    }
    const results = await Promise.all(
      widgets.map(async widget => {
        const data = await dispatchWidget(widget, filters, ctx.scope);
        return {
          id: widget.id,
          data,
          meta: {
            metric: widget.metric,
            chartType: widget.chartType,
            computedAt: new Date().toISOString(),
          },
        } satisfies WidgetResult;
      })
    );
    const payload: ExecutedReport = {
      widgets: results,
      filters,
      computedAt: new Date().toISOString(),
      cacheHit: false,
    };
    // Pick a TTL using the highest-frequency widget's class.
    const ttl = widgets.some(w => widgetTtl(w) === 'realtime') ? 'realtime' : 'daily';
    await ReportCache.set(ctx.scope, validated, payload, ttl, filters.startDate, filters.endDate);
    return payload;
  },

  /** List reports owned by user OR shared with them OR (if rescue-scoped) in their rescue. */
  async listReports(args: {
    userId: string;
    rescueId?: string | null;
    canReadPlatform: boolean;
    canReadRescue: boolean;
    includeArchived?: boolean;
  }): Promise<SavedReport[]> {
    const where: JsonObject = {};
    const orClauses: JsonObject[] = [{ user_id: args.userId }];
    if (args.canReadRescue && args.rescueId) {
      orClauses.push({ rescue_id: args.rescueId });
    }
    if (args.canReadPlatform) {
      orClauses.push({ rescue_id: null });
    }
    where[Op.or as unknown as string] = orClauses;
    if (!args.includeArchived) {
      where.is_archived = false;
    }
    return SavedReport.findAll({
      where: where as never,
      order: [['updated_at', 'DESC']],
      limit: 200,
    });
  },

  async getReport(reportId: string): Promise<SavedReport> {
    const report = await SavedReport.findByPk(reportId);
    if (!report) {
      throw new NotFoundError('Report not found');
    }
    return report;
  },

  /**
   * Authorization helper. Returns true when the caller may view the
   * report. Edit access is checked separately via `canEdit`.
   */
  async canView(
    report: SavedReport,
    args: {
      userId: string;
      rescueId?: string | null;
      canReadPlatform: boolean;
      canReadRescue: boolean;
    }
  ): Promise<boolean> {
    if (report.user_id === args.userId) {
      return true;
    }
    if (report.rescue_id === null && args.canReadPlatform) {
      return true;
    }
    if (report.rescue_id !== null && args.canReadRescue && report.rescue_id === args.rescueId) {
      return true;
    }
    const share = await ReportShare.findOne({
      where: {
        saved_report_id: report.saved_report_id,
        share_type: ReportShareType.USER,
        shared_with_user_id: args.userId,
      },
    });
    return !!share && share.isActive();
  },

  async canEdit(report: SavedReport, args: { userId: string }): Promise<boolean> {
    if (report.user_id === args.userId) {
      return true;
    }
    const share = await ReportShare.findOne({
      where: {
        saved_report_id: report.saved_report_id,
        share_type: ReportShareType.USER,
        shared_with_user_id: args.userId,
        permission: ReportSharePermission.EDIT,
      },
    });
    return !!share && share.isActive();
  },

  async createReport(args: {
    userId: string;
    rescueId: string | null;
    name: string;
    description?: string;
    templateId?: string;
    config: ReportConfig;
  }): Promise<SavedReport> {
    const validated = reportConfigSchema.parse(args.config);
    return SavedReport.create({
      user_id: args.userId,
      rescue_id: args.rescueId,
      template_id: args.templateId ?? null,
      name: args.name,
      description: args.description ?? null,
      config: validated as unknown as JsonObject,
      is_archived: false,
    });
  },

  async updateReport(
    reportId: string,
    patch: {
      name?: string;
      description?: string | null;
      config?: ReportConfig;
      isArchived?: boolean;
    }
  ): Promise<SavedReport> {
    const report = await this.getReport(reportId);
    if (patch.name !== undefined) {
      report.name = patch.name;
    }
    if (patch.description !== undefined) {
      report.description = patch.description;
    }
    if (patch.config !== undefined) {
      report.config = reportConfigSchema.parse(patch.config) as unknown as JsonObject;
    }
    if (patch.isArchived !== undefined) {
      report.is_archived = patch.isArchived;
    }
    await report.save();
    return report;
  },

  async deleteReport(reportId: string): Promise<void> {
    const report = await this.getReport(reportId);
    await report.destroy(); // paranoid soft-delete
  },

  // — Templates —

  async listTemplates(rescueId?: string | null): Promise<ReportTemplate[]> {
    return ReportTemplate.findAll({
      where: {
        [Op.or]: [{ is_system: true }, { rescue_id: rescueId ?? null }],
      } as never,
      order: [
        ['is_system', 'DESC'],
        ['category', 'ASC'],
        ['name', 'ASC'],
      ],
    });
  },

  // — Schedules —

  async upsertSchedule(args: {
    savedReportId: string;
    cron: string;
    timezone: string;
    recipients: ScheduledReportRecipient[];
    format: ScheduledReportFormat;
    isEnabled: boolean;
  }): Promise<ScheduledReport> {
    const existing = await ScheduledReport.findOne({
      where: { saved_report_id: args.savedReportId },
    });
    if (existing) {
      existing.cron = args.cron;
      existing.timezone = args.timezone;
      existing.recipients = args.recipients;
      existing.format = args.format;
      existing.is_enabled = args.isEnabled;
      existing.last_status = ScheduledReportStatus.PENDING;
      await existing.save();
      return existing;
    }
    return ScheduledReport.create({
      saved_report_id: args.savedReportId,
      cron: args.cron,
      timezone: args.timezone,
      recipients: args.recipients,
      format: args.format,
      is_enabled: args.isEnabled,
      last_status: ScheduledReportStatus.PENDING,
      last_run_at: null,
      next_run_at: null,
      last_error: null,
      repeat_job_key: null,
    });
  },

  async deleteSchedule(scheduleId: string): Promise<ScheduledReport> {
    const schedule = await ScheduledReport.findByPk(scheduleId);
    if (!schedule) {
      throw new NotFoundError('Schedule not found');
    }
    await schedule.destroy();
    return schedule;
  },

  // — Shares —

  /**
   * Create a user-targeted share (lookup by userId) or a token-based
   * share (signed JWT). For token shares, returns the unsigned URL
   * fragment (token) so the caller can compose the share link.
   */
  async createShare(args: {
    savedReportId: string;
    type: ReportShareType;
    sharedWithUserId?: string;
    permission: ReportSharePermission;
    expiresAt?: Date;
    createdBy: string;
  }): Promise<{ share: ReportShare; token?: string }> {
    if (args.type === ReportShareType.USER) {
      if (!args.sharedWithUserId) {
        throw new Error('sharedWithUserId is required for user shares');
      }
      const [share] = await ReportShare.findOrCreate({
        where: {
          saved_report_id: args.savedReportId,
          share_type: ReportShareType.USER,
          shared_with_user_id: args.sharedWithUserId,
        },
        defaults: {
          saved_report_id: args.savedReportId,
          share_type: ReportShareType.USER,
          shared_with_user_id: args.sharedWithUserId,
          permission: args.permission,
          expires_at: args.expiresAt ?? null,
          revoked_at: null,
          token_hash: null,
          created_by: args.createdBy,
        },
      });
      // If it already existed but was revoked, reactivate.
      if (share.revoked_at !== null) {
        share.revoked_at = null;
        share.expires_at = args.expiresAt ?? null;
        share.permission = args.permission;
        await share.save();
      }
      return { share };
    }
    // Token share — sign a JWT and store sha256(jti) for revocation.
    if (!env.JWT_REPORT_SHARE_SECRET) {
      throw new Error('JWT_REPORT_SHARE_SECRET is not configured — token sharing disabled');
    }
    if (!args.expiresAt) {
      throw new Error('expiresAt is required for token shares');
    }
    const jti = randomUUID();
    const tokenHash = createHash('sha256').update(jti).digest('hex');
    const share = await ReportShare.create({
      saved_report_id: args.savedReportId,
      share_type: ReportShareType.TOKEN,
      shared_with_user_id: null,
      token_hash: tokenHash,
      permission: ReportSharePermission.VIEW,
      expires_at: args.expiresAt,
      revoked_at: null,
      created_by: args.createdBy,
    });
    const token = jwt.sign(
      { reportId: args.savedReportId, shareId: share.share_id, jti },
      env.JWT_REPORT_SHARE_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: Math.max(1, Math.floor((args.expiresAt.getTime() - Date.now()) / 1000)),
      }
    );
    return { share, token };
  },

  async revokeShare(shareId: string): Promise<ReportShare> {
    const share = await ReportShare.findByPk(shareId);
    if (!share) {
      throw new NotFoundError('Share not found');
    }
    if (share.revoked_at === null) {
      share.revoked_at = new Date();
      await share.save();
    }
    return share;
  },

  /**
   * Verify a token-share JWT and return the underlying report. Throws
   * ForbiddenError when the token is invalid, expired, or revoked.
   */
  async resolveTokenShare(token: string): Promise<{ report: SavedReport; share: ReportShare }> {
    if (!env.JWT_REPORT_SHARE_SECRET) {
      throw new ForbiddenError('Token sharing is disabled');
    }
    let decoded: { reportId: string; shareId: string; jti: string };
    try {
      decoded = jwt.verify(token, env.JWT_REPORT_SHARE_SECRET, {
        algorithms: ['HS256'],
      }) as { reportId: string; shareId: string; jti: string };
    } catch (err) {
      logger.debug('Invalid report-share token', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw new ForbiddenError('Invalid or expired share token');
    }
    const tokenHash = createHash('sha256').update(decoded.jti).digest('hex');
    const share = await ReportShare.findOne({
      where: {
        share_id: decoded.shareId,
        share_type: ReportShareType.TOKEN,
        token_hash: tokenHash,
      },
    });
    if (!share || !share.isActive()) {
      throw new ForbiddenError('Share is revoked or expired');
    }
    const report = await SavedReport.findByPk(decoded.reportId);
    if (!report || report.saved_report_id !== share.saved_report_id) {
      throw new ForbiddenError('Share does not match report');
    }
    return { report, share };
  },
};
