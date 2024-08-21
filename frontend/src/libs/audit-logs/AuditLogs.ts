export interface AuditLog {
  id: string
  timestamp: string
  user?: string
  level: string
  service: string
  action: string
}
