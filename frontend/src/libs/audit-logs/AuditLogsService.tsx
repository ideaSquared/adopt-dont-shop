// src/services/AuditLogService.ts

import { apiService } from '../api-service'
import { AuditLog } from './AuditLogs'

const API_BASE_URL = '/admin/audit-logs'

/**
 * Fetch audit logs from the API.
 * @returns Promise resolving to an array of AuditLog objects.
 */
export const getAuditLogs = async (): Promise<AuditLog[]> => {
  return apiService.get<AuditLog[]>(API_BASE_URL)
}

export default {
  getAuditLogs,
}
