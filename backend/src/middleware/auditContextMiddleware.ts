import { NextFunction, Request, Response } from 'express'

export interface AuditContext {
  ip_address: string | null
  user_agent: string | null
  user_id: string | null
}

// Extend Express Request type to include auditContext
declare global {
  namespace Express {
    interface Request {
      auditContext: AuditContext
    }
  }
}

export const auditContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Normalize IP address
  const normalizeIp = (ip: string | undefined): string | null => {
    if (!ip) return null
    return ip.startsWith('::ffff:') ? ip.split(':').pop() || ip : ip
  }

  req.auditContext = {
    ip_address: normalizeIp(req.ip),
    user_agent: req.get('User-Agent') || null,
    user_id: (req as any).user?.user_id || null,
  }

  next()
}
