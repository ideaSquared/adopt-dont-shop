import { Request, Response } from 'express'
import { AuditLogger } from '../services/auditLogService'

export const getAllAuditLogs = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const auditLogs = await AuditLogger.getAllLogs()
    res.status(200).json(auditLogs)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error retrieving audit logs' })
  }
}
