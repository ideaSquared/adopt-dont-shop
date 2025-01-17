import { Response } from 'express'
import { AuditLogger } from '../services/auditLogService'
import { AuthenticatedRequest } from '../types'

export const getAllAuditLogsController = async (
  req: AuthenticatedRequest,
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

    AuditLogger.logAction(
      'AuditLogController',
      `Attempting to fetch audit logs with filters: ${JSON.stringify(filters)}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'AUDIT_LOG_MANAGEMENT'),
    )

    const { logs, total } = await AuditLogger.getAllLogs(page, limit, filters)
    const totalPages = Math.ceil(total / limit)

    AuditLogger.logAction(
      'AuditLogController',
      `Successfully fetched ${logs.length} audit logs (page ${page}/${totalPages})`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'AUDIT_LOG_MANAGEMENT'),
    )

    res.status(200).json({
      logs,
      totalPages,
      currentPage: page,
      totalRecords: total,
      filters,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'AuditLogController',
      `Failed to fetch audit logs: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'AUDIT_LOG_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error retrieving audit logs' })
  }
}

export const getLogsByUserIdController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const userId = req.params.userId
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 10

  try {
    AuditLogger.logAction(
      'AuditLogController',
      `Attempting to fetch audit logs for user: ${userId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'AUDIT_LOG_MANAGEMENT'),
    )

    const { logs, total } = await AuditLogger.getLogsByUserId(
      userId,
      page,
      limit,
    )
    const totalPages = Math.ceil(total / limit)

    AuditLogger.logAction(
      'AuditLogController',
      `Successfully fetched ${logs.length} audit logs for user ${userId} (page ${page}/${totalPages})`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'AUDIT_LOG_MANAGEMENT'),
    )

    res.status(200).json({
      logs,
      totalPages,
      currentPage: page,
      totalRecords: total,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'AuditLogController',
      `Failed to fetch audit logs for user ${userId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'AUDIT_LOG_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error retrieving user audit logs' })
  }
}

export const getLogsByDateRangeController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const startDate = new Date(req.query.startDate as string)
    const endDate = new Date(req.query.endDate as string)
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10

    AuditLogger.logAction(
      'AuditLogController',
      `Attempting to fetch audit logs between ${startDate} and ${endDate}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'AUDIT_LOG_MANAGEMENT'),
    )

    const { logs, total } = await AuditLogger.getLogsByDateRange(
      startDate,
      endDate,
      page,
      limit,
    )
    const totalPages = Math.ceil(total / limit)

    AuditLogger.logAction(
      'AuditLogController',
      `Successfully fetched ${logs.length} audit logs for date range (page ${page}/${totalPages})`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'AUDIT_LOG_MANAGEMENT'),
    )

    res.status(200).json({
      logs,
      totalPages,
      currentPage: page,
      totalRecords: total,
      dateRange: { startDate, endDate },
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'AuditLogController',
      `Failed to fetch audit logs by date range: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'AUDIT_LOG_MANAGEMENT'),
    )
    res
      .status(500)
      .json({ message: 'Error retrieving audit logs by date range' })
  }
}

export const getLogsByCategoryController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const category = req.params.category
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 10

  try {
    AuditLogger.logAction(
      'AuditLogController',
      `Attempting to fetch audit logs for category: ${category}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'AUDIT_LOG_MANAGEMENT'),
    )

    const { logs, total } = await AuditLogger.getLogsByCategory(
      category,
      page,
      limit,
    )
    const totalPages = Math.ceil(total / limit)

    AuditLogger.logAction(
      'AuditLogController',
      `Successfully fetched ${logs.length} audit logs for category ${category} (page ${page}/${totalPages})`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'AUDIT_LOG_MANAGEMENT'),
    )

    res.status(200).json({
      logs,
      totalPages,
      currentPage: page,
      totalRecords: total,
      category,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'AuditLogController',
      `Failed to fetch audit logs for category ${category}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'AUDIT_LOG_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error retrieving audit logs by category' })
  }
}
