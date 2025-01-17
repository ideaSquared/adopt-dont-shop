import { Request, Response } from 'express'
import { AuditLogger } from '../services/auditLogService'

export const getAllAuditLogsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10

    const filters = {
      startDate: req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined,
      endDate: req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined,
      level: req.query.level as 'INFO' | 'WARNING' | 'ERROR' | undefined,
      service: req.query.service as string | undefined,
      category: req.query.category as string | undefined,
      user: req.query.user as string | undefined,
      search: req.query.search as string | undefined,
    }

    const { logs, total } = await AuditLogger.getAllLogs(page, limit, filters)
    const totalPages = Math.ceil(total / limit)

    res.status(200).json({
      logs,
      totalPages,
      currentPage: page,
      totalRecords: total,
      filters,
    })
  } catch (error) {
    console.error('Error retrieving audit logs:', error)
    res.status(500).json({ message: 'Error retrieving audit logs' })
  }
}

export const getLogsByUserIdController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.params.userId
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10

    const { logs, total } = await AuditLogger.getLogsByUserId(
      userId,
      page,
      limit,
    )
    const totalPages = Math.ceil(total / limit)

    res.status(200).json({
      logs,
      totalPages,
      currentPage: page,
      totalRecords: total,
    })
  } catch (error) {
    console.error('Error retrieving user audit logs:', error)
    res.status(500).json({ message: 'Error retrieving user audit logs' })
  }
}

export const getLogsByDateRangeController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const startDate = new Date(req.query.startDate as string)
    const endDate = new Date(req.query.endDate as string)
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10

    const { logs, total } = await AuditLogger.getLogsByDateRange(
      startDate,
      endDate,
      page,
      limit,
    )
    const totalPages = Math.ceil(total / limit)

    res.status(200).json({
      logs,
      totalPages,
      currentPage: page,
      totalRecords: total,
      dateRange: { startDate, endDate },
    })
  } catch (error) {
    console.error('Error retrieving audit logs by date range:', error)
    res
      .status(500)
      .json({ message: 'Error retrieving audit logs by date range' })
  }
}

export const getLogsByCategoryController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const category = req.params.category
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10

    const { logs, total } = await AuditLogger.getLogsByCategory(
      category,
      page,
      limit,
    )
    const totalPages = Math.ceil(total / limit)

    res.status(200).json({
      logs,
      totalPages,
      currentPage: page,
      totalRecords: total,
      category,
    })
  } catch (error) {
    console.error('Error retrieving audit logs by category:', error)
    res.status(500).json({ message: 'Error retrieving audit logs by category' })
  }
}
