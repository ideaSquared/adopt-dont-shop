import { AuditLog } from '../Models'

export const AuditLogger = {
  async logAction(
    service: string,
    action: string,
    level: 'INFO' | 'WARNING' | 'ERROR',
    user: string | null = null,
  ): Promise<void> {
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
  },

  async getAllLogs(
    page: number,
    limit: number,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    try {
      const offset = (page - 1) * limit // Calculate offset for pagination
      const { rows: logs, count: total } = await AuditLog.findAndCountAll({
        order: [['timestamp', 'DESC']],
        offset,
        limit,
      })

      return { logs, total } // Return logs and total count
    } catch (error) {
      console.error('Failed to retrieve logs:', error)
      throw error
    }
  },

  async getLogsByUserId(userId: string): Promise<AuditLog[]> {
    try {
      const logs = await AuditLog.findAll({
        where: { user: userId },
        order: [['timestamp', 'DESC']],
      })
      return logs
    } catch (error) {
      console.error(`Failed to retrieve logs for user ID: ${userId}`, error)
      throw error
    }
  },
}
