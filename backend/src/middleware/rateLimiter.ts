import { NextFunction, Request, Response } from 'express'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { AuditLogger } from '../services/auditLogService'
import { AuthenticatedRequest } from '../types'

// Memory store rate limiter for API endpoints
const apiLimiter = new RateLimiterMemory({
  points: 100, // Number of points
  duration: 60, // Per 60 seconds
})

export const apiRateLimiter = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    await apiLimiter.consume(ip)
    next()
  } catch (error) {
    AuditLogger.logAction(
      'RateLimiter',
      `Rate limit exceeded for IP ${req.ip || 'unknown'}`,
      'WARNING',
      null,
      {
        metadata: { ip: req.ip || 'unknown' },
        category: 'RATE_LIMIT',
      },
    )
    res.status(429).json({ error: 'Too many requests' })
  }
}

// Rate limiter for chat messages
const chatLimiter = new RateLimiterMemory({
  points: 20, // Number of messages
  duration: 60, // Per 60 seconds
})

export const chatRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    await chatLimiter.consume(ip)
    next()
  } catch (error) {
    AuditLogger.logAction(
      'RateLimiter',
      `Chat rate limit exceeded for IP ${req.ip || 'unknown'}`,
      'WARNING',
      null,
      {
        metadata: { ip: req.ip || 'unknown' },
        category: 'RATE_LIMIT',
      },
    )
    res.status(429).json({ error: 'Message rate limit exceeded' })
  }
}

// Rate limiter for file uploads
const uploadLimiter = new RateLimiterMemory({
  points: 10, // Number of uploads
  duration: 300, // Per 5 minutes
})

export const uploadRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    await uploadLimiter.consume(ip)
    next()
  } catch (error) {
    AuditLogger.logAction(
      'RateLimiter',
      `Upload rate limit exceeded for IP ${req.ip || 'unknown'}`,
      'WARNING',
      null,
      {
        metadata: { ip: req.ip || 'unknown' },
        category: 'RATE_LIMIT',
      },
    )
    res.status(429).json({ error: 'Upload rate limit exceeded' })
  }
}

// Rate limiter for Socket.IO events
const socketLimiter = new RateLimiterMemory({
  points: 30, // Number of points
  duration: 60, // Per 60 seconds
})

// Middleware for Socket.IO events
export const socketRateLimiter = async (
  userId: string,
  eventName: string,
): Promise<boolean> => {
  try {
    await socketLimiter.consume(`${userId}:${eventName}`)
    return true
  } catch (error) {
    AuditLogger.logAction(
      'RateLimit',
      `Socket rate limit exceeded for user ${userId} on event ${eventName}`,
      'WARNING',
    )
    return false
  }
}

// Rate limiter for typing indicators
const typingLimiter = new RateLimiterMemory({
  points: 5, // Number of points
  duration: 5, // Per 5 seconds
})

export const typingRateLimiter = async (
  userId: string,
  chatId: string,
): Promise<boolean> => {
  try {
    await typingLimiter.consume(`${userId}:${chatId}:typing`)
    return true
  } catch (error) {
    return false
  }
}
