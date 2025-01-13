import { Request, Response } from 'express'
import { AuditLogger } from '../services/auditLogService'

export const getAllAuditLogsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10

    const { logs, total } = await AuditLogger.getAllLogs(page, limit)
    const totalPages = Math.ceil(total / limit)

    res.status(200).json({ logs, totalPages })
  } catch (error) {
    console.error('Error retrieving audit logs:', error)
    res.status(500).json({ message: 'Error retrieving audit logs' })
  }
}
