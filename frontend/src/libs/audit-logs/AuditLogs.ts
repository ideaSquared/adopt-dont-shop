export type LogLevel = 'INFO' | 'WARNING' | 'ERROR'

export interface AuditLog {
  id: string
  timestamp: string
  user?: string
  level: LogLevel
  service: string
  action: string
  category: string
  metadata?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
}
