import { AuditLog } from './AuditLogs'

const logs: AuditLog[] = [
  {
    log_id: '1',
    timestamp: '2024-08-01T10:00:00Z',
    user_id: '1',
    level: 'INFO',
    service: 'UserService',
    message: 'User logged in successfully.',
  },
  {
    log_id: '2',
    timestamp: '2024-08-01T10:05:00Z',
    level: 'ERROR',
    service: 'AuthService',
    message: 'Failed to authenticate user.',
  },
]

const getAuditLogs = (): AuditLog[] => logs

const getAuditLogById = (id: string): AuditLog | undefined =>
  logs.find((auditLog) => auditLog.log_id === id)

export default {
  getAuditLogs,
  getAuditLogById,
}
