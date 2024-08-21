export interface AuditLog {
  log_id: string
  timestamp: string
  user?: string
  level: string
  service: string
  action: string
}
