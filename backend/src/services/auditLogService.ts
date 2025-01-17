import { Op } from 'sequelize'
import { AuditLog } from '../Models'

type LogLevel = 'INFO' | 'WARNING' | 'ERROR'

interface LogActionOptions {
  metadata?: Record<string, any>
  category?: string
  ip_address?: string
  user_agent?: string
}

export const AuditLogger = {
  async logAction(
    service: string,
    action: string,
    level: LogLevel,
    user: string | null = null,
    options: LogActionOptions = {},
  ): Promise<void> {
    try {
      await AuditLog.create({
        service,
        user,
        action,
        level,
        timestamp: new Date(),
        metadata: options.metadata || null,
        category: options.category || 'GENERAL',
        ip_address: options.ip_address || null,
        user_agent: options.user_agent || null,
      })
      console.log(`[${level}] ${service}: ${action} - User: ${user || 'N/A'}`)
    } catch (error) {
      console.error('Failed to log action to audit log:', error)
    }
  },

  async getAllLogs(
    page: number,
    limit: number,
    filters?: {
      startDate?: Date
      endDate?: Date
      level?: LogLevel
      service?: string
      category?: string
      user?: string
      search?: string
    },
  ): Promise<{ logs: AuditLog[]; total: number }> {
    try {
      const where: any = {}

      if (filters) {
        if (filters.startDate && filters.endDate) {
          where.timestamp = {
            [Op.between]: [filters.startDate, filters.endDate],
          }
        }
        if (filters.level) where.level = filters.level
        if (filters.service) where.service = filters.service
        if (filters.category) where.category = filters.category
        if (filters.user) where.user = filters.user
        if (filters.search) {
          where[Op.or] = [
            { action: { [Op.iLike]: `%${filters.search}%` } },
            { service: { [Op.iLike]: `%${filters.search}%` } },
          ]
        }
      }

      const offset = (page - 1) * limit
      const { rows: logs, count: total } = await AuditLog.findAndCountAll({
        where,
        order: [['timestamp', 'DESC']],
        offset,
        limit,
      })

      return { logs, total }
    } catch (error) {
      console.error('Failed to retrieve logs:', error)
      throw error
    }
  },

  async getLogsByUserId(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    try {
      const offset = (page - 1) * limit
      const { rows: logs, count: total } = await AuditLog.findAndCountAll({
        where: { user: userId },
        order: [['timestamp', 'DESC']],
        offset,
        limit,
      })
      return { logs, total }
    } catch (error) {
      console.error(`Failed to retrieve logs for user ID: ${userId}`, error)
      throw error
    }
  },

  async getLogsByDateRange(
    startDate: Date,
    endDate: Date,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    try {
      const offset = (page - 1) * limit
      const { rows: logs, count: total } = await AuditLog.findAndCountAll({
        where: {
          timestamp: {
            [Op.between]: [startDate, endDate],
          },
        },
        order: [['timestamp', 'DESC']],
        offset,
        limit,
      })
      return { logs, total }
    } catch (error) {
      console.error('Failed to retrieve logs by date range:', error)
      throw error
    }
  },

  async getLogsByCategory(
    category: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    try {
      const offset = (page - 1) * limit
      const { rows: logs, count: total } = await AuditLog.findAndCountAll({
        where: { category },
        order: [['timestamp', 'DESC']],
        offset,
        limit,
      })
      return { logs, total }
    } catch (error) {
      console.error(`Failed to retrieve logs for category: ${category}`, error)
      throw error
    }
  },
}
