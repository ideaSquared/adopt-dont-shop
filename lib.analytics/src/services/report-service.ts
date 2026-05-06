import { ApiService } from '@adopt-dont-shop/lib.api';
import {
  executedReportSchema,
  reportTemplateSchema,
  savedReportSchema,
  scheduledReportSchema,
  type ExecutedReport,
  type ReportConfig,
  type ReportTemplate,
  type SavedReport,
  type ScheduledReport,
} from '../schemas/reports';

/**
 * ADS-105: Frontend client for the /api/v1/reports endpoints.
 *
 * Thin wrapper over `ApiService` that validates every response shape
 * with the lib.analytics Zod schemas. Surfaces typed methods that
 * React Query hooks consume.
 */

type ApiEnvelope<T> = { data: T; success?: boolean };

const unwrap = <T>(envelope: ApiEnvelope<T> | T): T => {
  if (envelope && typeof envelope === 'object' && 'data' in (envelope as Record<string, unknown>)) {
    return (envelope as ApiEnvelope<T>).data;
  }
  return envelope as T;
};

export class ReportService {
  private readonly api: ApiService;
  private readonly base = '/api/v1/reports';

  constructor(api?: ApiService) {
    this.api = api ?? new ApiService();
  }

  async list(includeArchived = false): Promise<SavedReport[]> {
    const res = await this.api.get<ApiEnvelope<unknown[]>>(
      `${this.base}${includeArchived ? '?includeArchived=true' : ''}`
    );
    return savedReportSchema.array().parse(unwrap(res));
  }

  async get(id: string): Promise<SavedReport> {
    const res = await this.api.get<ApiEnvelope<unknown>>(`${this.base}/${id}`);
    return savedReportSchema.parse(unwrap(res));
  }

  async create(args: {
    name: string;
    description?: string;
    templateId?: string;
    rescueId?: string | null;
    config: ReportConfig;
  }): Promise<SavedReport> {
    const res = await this.api.post<ApiEnvelope<unknown>>(this.base, args);
    return savedReportSchema.parse(unwrap(res));
  }

  async update(
    id: string,
    patch: {
      name?: string;
      description?: string | null;
      config?: ReportConfig;
      isArchived?: boolean;
    }
  ): Promise<SavedReport> {
    const res = await this.api.put<ApiEnvelope<unknown>>(`${this.base}/${id}`, patch);
    return savedReportSchema.parse(unwrap(res));
  }

  async remove(id: string): Promise<void> {
    await this.api.delete<unknown>(`${this.base}/${id}`);
  }

  async executeSaved(id: string): Promise<ExecutedReport> {
    const res = await this.api.post<ApiEnvelope<unknown>>(`${this.base}/${id}/execute`);
    return executedReportSchema.parse(unwrap(res));
  }

  async executePreview(config: ReportConfig): Promise<ExecutedReport> {
    const res = await this.api.post<ApiEnvelope<unknown>>(`${this.base}/execute`, { config });
    return executedReportSchema.parse(unwrap(res));
  }

  async listTemplates(): Promise<ReportTemplate[]> {
    const res = await this.api.get<ApiEnvelope<unknown[]>>(`${this.base}/templates`);
    return reportTemplateSchema.array().parse(unwrap(res));
  }

  async upsertSchedule(
    reportId: string,
    body: {
      cron: string;
      timezone?: string;
      recipients: Array<{ email: string; userId?: string }>;
      format?: 'pdf' | 'csv' | 'inline-html';
      isEnabled?: boolean;
    }
  ): Promise<ScheduledReport> {
    const res = await this.api.post<ApiEnvelope<unknown>>(
      `${this.base}/${reportId}/schedule`,
      body
    );
    return scheduledReportSchema.parse(unwrap(res));
  }

  async deleteSchedule(scheduleId: string): Promise<void> {
    await this.api.delete<unknown>(`${this.base}/schedules/${scheduleId}`);
  }

  async createUserShare(
    reportId: string,
    args: { sharedWithUserId: string; permission?: 'view' | 'edit' }
  ): Promise<{ share: { share_id: string } }> {
    const res = await this.api.post<ApiEnvelope<{ share: { share_id: string } }>>(
      `${this.base}/${reportId}/share`,
      { shareType: 'user', ...args }
    );
    return unwrap(res);
  }

  async createTokenShare(
    reportId: string,
    args: { expiresAt: Date }
  ): Promise<{ share: { share_id: string }; token: string }> {
    const res = await this.api.post<ApiEnvelope<{ share: { share_id: string }; token: string }>>(
      `${this.base}/${reportId}/share`,
      {
        shareType: 'token',
        permission: 'view',
        expiresAt: args.expiresAt.toISOString(),
      }
    );
    return unwrap(res);
  }

  async revokeShare(shareId: string): Promise<void> {
    await this.api.delete<unknown>(`${this.base}/shares/${shareId}`);
  }

  async viewSharedByToken(token: string): Promise<{
    report: { name: string; description: string | null; config: ReportConfig };
    data: ExecutedReport;
  }> {
    const res = await this.api.get<
      ApiEnvelope<{
        report: { name: string; description: string | null; config: ReportConfig };
        data: ExecutedReport;
      }>
    >(`${this.base}/shared/${token}`);
    return unwrap(res);
  }
}

export const reportService = new ReportService();
