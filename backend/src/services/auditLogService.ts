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

  async getAllLogs(): Promise<any[]> {
    // Adjust the return type based on your needs
    try {
      const logs = await AuditLog.findAll({
        order: [['timestamp', 'DESC']],
      })
      return logs
    } catch (error) {
      console.error('Failed to retrieve logs:', error)
      throw error
    }
  },

  async getLogsByUserId(userId: string): Promise<any[]> {
    // Adjust the return type based on your needs
    try {
      const logs = await AuditLog.findAll({
        where: { user: userId },
      })
      return logs
    } catch (error) {
      console.error(
        `Failed to retrieve logs for user with ID: ${userId}`,
        error,
      )
      throw error
    }
  },
}
