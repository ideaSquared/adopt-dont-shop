import { NextFunction, Response } from 'express'
import { Chat, ChatParticipant } from '../Models'
import { AuditLogger } from '../services/auditLogService'
import { getRolesForUser } from '../services/permissionService'
import { getRescueIdByUserId } from '../services/rescueService'
import { AuthenticatedRequest } from '../types'

/**
 * Middleware to validate chat access based on user role and participation
 * - Admins can access any chat
 * - Rescues can access chats where they are a participant or where the chat belongs to their rescue
 * - Users can access chats where they are a direct participant
 */
export const validateChatAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const chatId = req.params.chat_id
    const userId = req.user?.user_id

    if (!userId) {
      AuditLogger.logAction(
        'Auth',
        'Chat access denied - User not authenticated',
        'WARNING',
        'N/A',
        AuditLogger.getAuditOptions(req, 'CHAT_ACCESS'),
      )
      return res.status(401).json({ error: 'Not authenticated' })
    }

    // Check if user is an admin
    const userRoles = await getRolesForUser(userId)
    if (userRoles.includes('admin')) {
      AuditLogger.logAction(
        'Auth',
        `Admin access granted to chat ${chatId}`,
        'INFO',
        userId,
        AuditLogger.getAuditOptions(req, 'CHAT_ACCESS'),
      )
      next()
      return
    }

    // Check if user is associated with a rescue
    const userRescueId = await getRescueIdByUserId(userId)

    if (userRescueId) {
      // Check if the chat belongs to the user's rescue
      const chat = await Chat.findByPk(chatId)
      if (chat?.rescue_id === userRescueId) {
        AuditLogger.logAction(
          'Auth',
          `Rescue staff access granted to chat ${chatId} (rescue owner)`,
          'INFO',
          userId,
          AuditLogger.getAuditOptions(req, 'CHAT_ACCESS'),
        )
        next()
        return
      }

      // Or check if the user is a direct participant with rescue role
      const rescueParticipant = await ChatParticipant.findOne({
        where: {
          chat_id: chatId,
          participant_id: userId,
          role: 'rescue',
        },
      })

      if (rescueParticipant) {
        AuditLogger.logAction(
          'Auth',
          `Rescue staff access granted to chat ${chatId} (participant)`,
          'INFO',
          userId,
          AuditLogger.getAuditOptions(req, 'CHAT_ACCESS'),
        )
        req.participant = rescueParticipant
        next()
        return
      }
    }

    // Check if user is a direct participant
    const userParticipant = await ChatParticipant.findOne({
      where: {
        chat_id: chatId,
        participant_id: userId,
        role: 'user',
      },
    })

    if (userParticipant) {
      AuditLogger.logAction(
        'Auth',
        `User access granted to chat ${chatId}`,
        'INFO',
        userId,
        AuditLogger.getAuditOptions(req, 'CHAT_ACCESS'),
      )
      req.participant = userParticipant
      next()
      return
    }

    // Access denied if none of the above conditions are met
    AuditLogger.logAction(
      'Auth',
      `Chat access denied - User ${userId} not authorized for chat ${chatId}`,
      'WARNING',
      userId,
      AuditLogger.getAuditOptions(req, 'CHAT_ACCESS'),
    )
    return res.status(403).json({ error: 'Not authorized to access this chat' })
  } catch (error) {
    AuditLogger.logAction(
      'Auth',
      `Chat access validation error: ${(error as Error).message}`,
      'ERROR',
      req.user?.user_id || 'N/A',
      AuditLogger.getAuditOptions(req, 'CHAT_ACCESS'),
    )
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Extend Express Request type to include participant
declare global {
  namespace Express {
    interface Request {
      participant?: ChatParticipant
    }
  }
}
