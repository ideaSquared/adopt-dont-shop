import { apiService } from '@adopt-dont-shop/lib.api';
import {
  ReportsResponseSchema,
  ActionsResponseSchema,
  ReportSchema,
  ModeratorActionSchema,
  ModerationMetricsSchema,
  BulkUpdateResponseSchema,
  type Report,
  type ReportFilters,
  type CreateReportRequest,
  type UpdateReportStatusRequest,
  type AssignReportRequest,
  type EscalateReportRequest,
  type BulkUpdateReportsRequest,
  type BulkUpdateResponse,
  type ModeratorAction,
  type CreateModeratorActionRequest,
  type ActionFilters,
  type ReportsResponse,
  type ActionsResponse,
  type ModerationMetrics,
} from './schemas';
import { buildQueryString, getResolutionForAction } from './utils';

/**
 * Moderation Service - API client for moderation endpoints
 */
export class ModerationService {
  private readonly baseUrl = '/api/v1/admin/moderation';

  /**
   * Get list of reports with optional filtering
   */
  async getReports(filters?: ReportFilters): Promise<ReportsResponse> {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : '';
    const response = await apiService.get<{
      success: boolean;
      data: unknown[];
      pagination: unknown;
    }>(`${this.baseUrl}/reports${queryString}`);
    return ReportsResponseSchema.parse({ data: response.data, pagination: response.pagination });
  }

  /**
   * Get a single report by ID
   */
  async getReportById(reportId: string): Promise<Report> {
    const response = await apiService.get<{ data: unknown }>(`${this.baseUrl}/reports/${reportId}`);
    return ReportSchema.parse(response.data);
  }

  /**
   * Create a new report
   */
  async createReport(data: CreateReportRequest): Promise<Report> {
    const response = await apiService.post<{ data: unknown }>(`${this.baseUrl}/reports`, data);
    return ReportSchema.parse(response.data);
  }

  /**
   * Update report status
   */
  async updateReportStatus(reportId: string, data: UpdateReportStatusRequest): Promise<Report> {
    const response = await apiService.patch<{ data: unknown }>(
      `${this.baseUrl}/reports/${reportId}/status`,
      data
    );
    return ReportSchema.parse(response.data);
  }

  /**
   * Assign report to a moderator
   */
  async assignReport(reportId: string, data: AssignReportRequest): Promise<Report> {
    const response = await apiService.post<{ data: unknown }>(
      `${this.baseUrl}/reports/${reportId}/assign`,
      data
    );
    return ReportSchema.parse(response.data);
  }

  /**
   * Escalate a report
   */
  async escalateReport(reportId: string, data: EscalateReportRequest): Promise<Report> {
    const response = await apiService.post<{ data: unknown }>(
      `${this.baseUrl}/reports/${reportId}/escalate`,
      data
    );
    return ReportSchema.parse(response.data);
  }

  /**
   * Bulk update reports
   */
  async bulkUpdateReports(data: BulkUpdateReportsRequest): Promise<BulkUpdateResponse> {
    const response = await apiService.post(`${this.baseUrl}/reports/bulk-update`, data);
    return BulkUpdateResponseSchema.parse(response);
  }

  /**
   * Get moderation actions with optional filtering
   */
  async getActions(filters?: ActionFilters): Promise<ActionsResponse> {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : '';
    const response = await apiService.get<{
      success: boolean;
      data: unknown[];
      pagination: unknown;
    }>(`${this.baseUrl}/actions${queryString}`);
    return ActionsResponseSchema.parse({ data: response.data, pagination: response.pagination });
  }

  /**
   * Get active moderation actions, optionally scoped to a single target user
   */
  async getActiveActions(targetUserId?: string): Promise<ModeratorAction[]> {
    const query = targetUserId ? `?userId=${encodeURIComponent(targetUserId)}` : '';
    const response = await apiService.get<{ data: unknown[] }>(
      `${this.baseUrl}/actions/active${query}`
    );
    return response.data.map((action: unknown) => ModeratorActionSchema.parse(action));
  }

  /**
   * Create a new moderation action
   */
  async createAction(data: CreateModeratorActionRequest): Promise<ModeratorAction> {
    const response = await apiService.post<{ data: unknown }>(`${this.baseUrl}/actions`, data);
    return ModeratorActionSchema.parse(response.data);
  }

  /**
   * Get moderation metrics
   */
  async getMetrics(): Promise<ModerationMetrics> {
    const response = await apiService.get<{ success: boolean; data: unknown }>(
      `${this.baseUrl}/metrics`
    );
    return ModerationMetricsSchema.parse(response.data);
  }

  /**
   * Resolve a report with optional action
   */
  async resolveReport(
    reportId: string,
    notes?: string,
    actionData?: CreateModeratorActionRequest
  ): Promise<Report> {
    if (actionData) {
      return (await this.applyAction(reportId, actionData, notes)).report;
    }
    return this.updateReportStatus(reportId, {
      status: 'resolved',
      resolutionNotes: notes,
    });
  }

  /**
   * Create the moderation action first (the backend applies it, e.g. suspends
   * the user, atomically), then resolve the report with the matching
   * resolution. If the action fails the report is left untouched.
   */
  private async applyAction(
    reportId: string,
    actionData: CreateModeratorActionRequest,
    notes?: string
  ): Promise<{ report: Report; action: ModeratorAction }> {
    const action = await this.createAction({ ...actionData, reportId });
    const report = await this.updateReportStatus(reportId, {
      status: 'resolved',
      resolution: getResolutionForAction(actionData.actionType),
      resolutionNotes: notes,
    });
    return { report, action };
  }

  /**
   * Dismiss a report
   */
  async dismissReport(reportId: string, notes?: string): Promise<Report> {
    return this.updateReportStatus(reportId, {
      status: 'dismissed',
      resolutionNotes: notes,
    });
  }

  /**
   * Take action on a report (helper method): apply the action and resolve the
   * report with the matching resolution.
   */
  async takeAction(
    reportId: string,
    actionData: CreateModeratorActionRequest,
    resolutionNotes?: string
  ): Promise<{ report: Report; action: ModeratorAction }> {
    return this.applyAction(reportId, actionData, resolutionNotes);
  }
}

// Export singleton instance
export const moderationService = new ModerationService();
