// src/services/AuditLogService.ts

import { apiService } from '../api-service'
import { AuditLog } from './AuditLogs'

const API_BASE_URL = '/admin/audit-logs'

/**
 * Fetch audit logs from the API.
 * @returns Promise resolving to an array of AuditLog objects.
 */
export const getAuditLogs = async (
  page: number,
  limit: number,
): Promise<{ logs: AuditLog[]; totalPages: number }> => {
  return apiService.get(`${API_BASE_URL}?page=${page}&limit=${limit}`)
}

export default {
  getAuditLogs,
}
