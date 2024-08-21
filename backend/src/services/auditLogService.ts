import { AuditLog } from '../Models/AuditLog'

export class AuditLogger {
  static async logAction(
    service: string,
    action: string,
    level: 'INFO' | 'WARNING' | 'ERROR',
    user: string | null = null,
  ) {
    try {
      await AuditLog.create({
        service,
        user,
        action,
        level,
        timestamp: new Date(),
      })
      console.log(`[${level}] ${service}: ${action} - User: ${user || 'N/A'}`)
    } catch (error) {
      console.error('Failed to log action to audit log:', error)
    }
  }
}
