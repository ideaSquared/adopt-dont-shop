import { apiService } from '../api-service'
import { AuditLog, LogLevel } from './AuditLogs'

const API_BASE_URL = '/admin/audit-logs'

export interface AuditLogFilters {
  startDate?: string
  endDate?: string
  level?: LogLevel
  service?: string
  category?: string
  user?: string
  search?: string
}

interface AuditLogResponse {
  logs: AuditLog[]
  totalPages: number
  currentPage: number
  totalRecords: number
  filters?: Record<string, any>
}

interface PaginationParams {
  page: number
  limit: number
}

const buildQueryString = (params: Record<string, any>): string => {
  const query = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')
  return query ? `?${query}` : ''
}

export const AuditLogsService = {
  async getAuditLogs(
    page: number = 1,
    limit: number = 10,
  ): Promise<AuditLogResponse> {
    const queryString = buildQueryString({ page, limit })
    return apiService.get(`${API_BASE_URL}${queryString}`)
  },

  async getFilteredLogs(
    filters: AuditLogFilters,
    pagination: PaginationParams = { page: 1, limit: 10 },
  ): Promise<AuditLogResponse> {
    const queryString = buildQueryString({ ...pagination, ...filters })
    return apiService.get(`${API_BASE_URL}${queryString}`)
  },

  async getLogsByUserId(
    userId: string,
    pagination: PaginationParams = { page: 1, limit: 10 },
  ): Promise<AuditLogResponse> {
    const queryString = buildQueryString(pagination)
    return apiService.get(`${API_BASE_URL}/user/${userId}${queryString}`)
  },

  async getLogsByDateRange(
    startDate: string,
    endDate: string,
    pagination: PaginationParams = { page: 1, limit: 10 },
  ): Promise<AuditLogResponse> {
    const queryString = buildQueryString({ ...pagination, startDate, endDate })
    return apiService.get(`${API_BASE_URL}/date-range${queryString}`)
  },

  async getLogsByCategory(
    category: string,
    pagination: PaginationParams = { page: 1, limit: 10 },
  ): Promise<AuditLogResponse> {
    const queryString = buildQueryString(pagination)
    return apiService.get(`${API_BASE_URL}/category/${category}${queryString}`)
  },
}
