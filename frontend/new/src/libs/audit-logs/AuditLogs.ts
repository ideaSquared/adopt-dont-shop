export interface AuditLog {
  log_id: string
  timestamp: string
  user_id?: string
  level: string
  service: string
  message: string
}
