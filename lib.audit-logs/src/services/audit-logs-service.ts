import { api } from '@adopt-dont-shop/lib-api';
import type { AuditLogFilters, PaginatedAuditLogsResponse } from '../types';

export class AuditLogsService {
  private static getDefaultDateRange(): { startDate: string; endDate: string } {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }

  private static buildQueryString(filters: AuditLogFilters): string {
    const params = new URLSearchParams();

    const { startDate, endDate } =
      filters.startDate && filters.endDate
        ? { startDate: filters.startDate, endDate: filters.endDate }
        : this.getDefaultDateRange();

    params.append('startDate', startDate);
    params.append('endDate', endDate);

    if (filters.action) {
      params.append('action', filters.action);
    }

    if (filters.userId) {
      params.append('userId', filters.userId);
    }

    if (filters.entity) {
      params.append('entity', filters.entity);
    }

    if (filters.level) {
      params.append('level', filters.level);
    }

    if (filters.status) {
      params.append('status', filters.status);
    }

    if (filters.page) {
      params.append('page', filters.page.toString());
    }

    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }

    return params.toString();
  }

  static async getAuditLogs(filters: AuditLogFilters = {}): Promise<PaginatedAuditLogsResponse> {
    const queryString = this.buildQueryString(filters);
    const url = `/api/v1/admin/audit-logs?${queryString}`;

    const response = await api.get<PaginatedAuditLogsResponse>(url);
    return response;
  }
}
