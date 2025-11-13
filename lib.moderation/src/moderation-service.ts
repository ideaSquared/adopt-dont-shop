import { apiService } from '@adopt-dont-shop/lib.api';
import {
  ReportsResponseSchema,
  ActionsResponseSchema,
  ReportSchema,
  ModeratorActionSchema,
  ModerationMetricsSchema,
  type Report,
  type ReportFilters,
  type CreateReportRequest,
  type UpdateReportStatusRequest,
  type AssignReportRequest,
  type EscalateReportRequest,
  type BulkUpdateReportsRequest,
  type ModeratorAction,
  type CreateModeratorActionRequest,
  type ActionFilters,
  type ReportsResponse,
  type ActionsResponse,
  type ModerationMetrics,
} from './schemas';
import { buildQueryString } from './utils';

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
  async bulkUpdateReports(
    data: BulkUpdateReportsRequest
  ): Promise<{ success: boolean; updated: number }> {
    const response = await apiService.post(`${this.baseUrl}/reports/bulk-update`, data);
    return response as { success: boolean; updated: number };
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
   * Get active moderation actions
   */
  async getActiveActions(): Promise<ModeratorAction[]> {
    const response = await apiService.get<{ data: unknown[] }>(`${this.baseUrl}/actions/active`);
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
    // First update the report status
    const report = await this.updateReportStatus(reportId, {
      status: 'resolved',
      notes,
    });

    // If action data is provided, create the moderation action
    if (actionData) {
      await this.createAction({
        ...actionData,
        reportId,
      });
    }

    return report;
  }

  /**
   * Dismiss a report
   */
  async dismissReport(reportId: string, notes?: string): Promise<Report> {
    return this.updateReportStatus(reportId, {
      status: 'dismissed',
      notes,
    });
  }

  /**
   * Take action on a report (helper method)
   */
  async takeAction(
    reportId: string,
    actionData: CreateModeratorActionRequest,
    resolutionNotes?: string
  ): Promise<{ report: Report; action: ModeratorAction }> {
    // Create the moderation action
    const action = await this.createAction({
      ...actionData,
      reportId,
    });

    // Update the report status to under_review if it's pending
    const currentReport = await this.getReportById(reportId);
    let report = currentReport;

    if (currentReport.status === 'pending') {
      report = await this.updateReportStatus(reportId, {
        status: 'under_review',
        notes: resolutionNotes,
      });
    }

    return { report, action };
  }
}

// Export singleton instance
export const moderationService = new ModerationService();
