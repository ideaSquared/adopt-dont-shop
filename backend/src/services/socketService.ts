import { Server } from 'http'
import jwt from 'jsonwebtoken'
import { Server as SocketIOServer } from 'socket.io'
import { socketRateLimiter, typingRateLimiter } from '../middleware/rateLimiter'
import { Chat, Message, User } from '../Models'
import { AuditLogger } from './auditLogService'

interface JwtPayload {
  userId: string // Changed from user_id to userId to match your auth pattern
  roles?: string[]
}

export class SocketService {
  private io: SocketIOServer
  private static instance: SocketService
  private userSockets: Map<string, string[]> = new Map() // userId -> socketIds[]

  private constructor(server: Server) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3001',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    })

    // Add authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token
        if (!token) {
          AuditLogger.logAction(
            'Socket',
            'Authentication failed: No token provided',
            'WARNING',
            null,
          )
          return next(new Error('Authentication token missing'))
        }

        const secretKey = process.env.SECRET_KEY
        if (!secretKey) {
          AuditLogger.logAction(
            'Socket',
            'Authentication failed: Missing secret key',
            'ERROR',
            null,
          )
          return next(new Error('Internal server error'))
        }

        const decoded = jwt.verify(token, secretKey) as JwtPayload
        if (!decoded || !decoded.userId) {
          AuditLogger.logAction(
            'Socket',
            'Authentication failed: Invalid token payload',
            'WARNING',
            null,
          )
          return next(new Error('Invalid token'))
        }

        // Find user in database
        const user = await User.findByPk(decoded.userId)
        if (!user) {
          AuditLogger.logAction(
            'Socket',
            `Authentication failed: User with ID ${decoded.userId} not found`,
            'WARNING',
            null,
          )
          return next(new Error('User not found'))
        }

        // Store the user data in the socket
        socket.data.userId = user.user_id
        socket.data.user = user

        // Add user to their room
        socket.join(`user_${user.user_id}`)

        // Store socket mapping
        const userSockets = this.userSockets.get(user.user_id) || []
        userSockets.push(socket.id)
        this.userSockets.set(user.user_id, userSockets)

        AuditLogger.logAction(
          'Socket',
          `User ${user.user_id} authenticated on socket ${socket.id}`,
          'INFO',
          user.user_id,
        )

        next()
      } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
          AuditLogger.logAction(
            'Socket',
            `JWT authentication failed: ${error.message}`,
            'ERROR',
            null,
          )
          return next(new Error('JWT token expired or invalid'))
        }

        AuditLogger.logAction(
          'Socket',
          `Authentication error: ${(error as Error).message}`,
          'ERROR',
          null,
        )
        next(new Error('Authentication failed'))
      }
    })

    this.setupSocketHandlers()
  }

  public static initialize(server: Server): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService(server)
    }
    return SocketService.instance
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      throw new Error('Socket service not initialized')
    }
    return SocketService.instance
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      AuditLogger.logAction(
        'Socket',
        `New socket connection: ${socket.id}`,
        'INFO',
      )

      // Handle getting messages for a chat
      socket.on('get_messages', async ({ chatId }) => {
        try {
          const userId = socket.data.userId
          if (!userId) {
            socket.emit('error', { message: 'Not authenticated' })
            return
          }

          const allowed = await socketRateLimiter(userId, 'get_messages')
          if (!allowed) {
            socket.emit('error', {
              message: 'Rate limit exceeded for getting messages',
            })
            return
          }

          // Get messages from the database
          const messages = await Message.findAll({
            where: { chat_id: chatId },
            include: [
              {
                model: User,
                as: 'User',
                attributes: ['user_id', 'first_name', 'last_name'],
              },
            ],
            order: [['created_at', 'ASC']], // Order by creation time ascending
          })

          // Send messages back to the client
          socket.emit('messages', messages)

          AuditLogger.logAction(
            'Socket',
            `Sent ${messages.length} messages for chat ${chatId} to user ${userId}`,
            'INFO',
          )
        } catch (error) {
          AuditLogger.logAction(
            'Socket',
            `Error getting messages: ${(error as Error).message}`,
            'ERROR',
          )
          socket.emit('error', { message: 'Failed to get messages' })
        }
      })

      // Handle getting chat status
      socket.on('get_chat_status', async ({ chatId }) => {
        try {
          const userId = socket.data.userId
          if (!userId) {
            socket.emit('error', { message: 'Not authenticated' })
            return
          }

          const allowed = await socketRateLimiter(userId, 'get_chat_status')
          if (!allowed) {
            socket.emit('error', {
              message: 'Rate limit exceeded for getting chat status',
            })
            return
          }

          // Get chat from database
          const chat = await Chat.findByPk(chatId)
          if (!chat) {
            socket.emit('error', { message: 'Chat not found' })
            return
          }

          // Send chat status back to the client
          socket.emit('chat_status', { status: chat.status })

          AuditLogger.logAction(
            'Socket',
            `Sent chat status for chat ${chatId} to user ${userId}`,
            'INFO',
          )
        } catch (error) {
          AuditLogger.logAction(
            'Socket',
            `Error getting chat status: ${(error as Error).message}`,
            'ERROR',
          )
          socket.emit('error', { message: 'Failed to get chat status' })
        }
      })

      // Handle joining chat rooms
      socket.on('join_chat', async (chatId: string) => {
        const userId = socket.data.userId
        if (!userId) return

        const allowed = await socketRateLimiter(userId, 'join_chat')
        if (!allowed) {
          socket.emit('error', {
            message: 'Rate limit exceeded for joining chats',
          })
          return
        }

        socket.join(`chat_${chatId}`)
        AuditLogger.logAction(
          'Socket',
          `Socket ${socket.id} joined chat ${chatId}`,
          'INFO',
        )
      })

      // Handle leaving chat rooms
      socket.on('leave_chat', async (chatId: string) => {
        const userId = socket.data.userId
        if (!userId) return

        const allowed = await socketRateLimiter(userId, 'leave_chat')
        if (!allowed) {
          socket.emit('error', {
            message: 'Rate limit exceeded for leaving chats',
          })
          return
        }

        socket.leave(`chat_${chatId}`)
        AuditLogger.logAction(
          'Socket',
          `Socket ${socket.id} left chat ${chatId}`,
          'INFO',
        )
      })

      // Handle typing indicators
      socket.on(
        'typing_start',
        async (data: { chatId: string; userId: string }) => {
          const userId = socket.data.userId
          if (!userId || userId !== data.userId) return

          const allowed = await typingRateLimiter(data.userId, data.chatId)
          if (!allowed) return // Silently fail for typing indicators

          socket.to(`chat_${data.chatId}`).emit('user_typing', {
            userId: data.userId,
            chatId: data.chatId,
          })
        },
      )

      socket.on(
        'typing_end',
        async (data: { chatId: string; userId: string }) => {
          const userId = socket.data.userId
          if (!userId || userId !== data.userId) return

          const allowed = await typingRateLimiter(data.userId, data.chatId)
          if (!allowed) return // Silently fail for typing indicators

          socket.to(`chat_${data.chatId}`).emit('user_stopped_typing', {
            userId: data.userId,
            chatId: data.chatId,
          })
        },
      )

      // Handle disconnection
      socket.on('disconnect', () => {
        const userId = socket.data.userId
        if (userId) {
          const userSockets = this.userSockets.get(userId) || []
          const updatedSockets = userSockets.filter((id) => id !== socket.id)

          if (updatedSockets.length === 0) {
            this.userSockets.delete(userId)
          } else {
            this.userSockets.set(userId, updatedSockets)
          }
        }

        AuditLogger.logAction(
          'Socket',
          `Socket disconnected: ${socket.id}`,
          'INFO',
        )
      })
    })
  }

  // Emit new message to all participants in a chat
  public async emitNewMessage(chatId: string, message: any): Promise<void> {
    if (message.sender_id) {
      const allowed = await socketRateLimiter(message.sender_id, 'new_message')
      if (!allowed) return
    }
    this.io.to(`chat_${chatId}`).emit('new_message', message)
  }

  // Emit chat status updates (e.g., when archived)
  public async emitChatUpdate(chatId: string, update: any): Promise<void> {
    if (update.updatedBy) {
      const allowed = await socketRateLimiter(update.updatedBy, 'chat_update')
      if (!allowed) return
    }
    this.io.to(`chat_${chatId}`).emit('chat_updated', update)
  }

  // Emit participant updates (e.g., when someone joins/leaves)
  public async emitParticipantUpdate(
    chatId: string,
    update: any,
  ): Promise<void> {
    if (update.participant?.participant_id) {
      const allowed = await socketRateLimiter(
        update.participant.participant_id,
        'participant_update',
      )
      if (!allowed) return
    }
    this.io.to(`chat_${chatId}`).emit('participant_updated', update)
  }

  // Emit read status updates
  public async emitReadStatusUpdate(
    chatId: string,
    update: any,
  ): Promise<void> {
    if (update.participant_id) {
      const allowed = await socketRateLimiter(
        update.participant_id,
        'read_status_update',
      )
      if (!allowed) return
    }
    this.io.to(`chat_${chatId}`).emit('read_status_updated', update)
  }

  // Send notification to specific user
  public async sendToUser(
    userId: string,
    event: string,
    data: any,
  ): Promise<void> {
    const allowed = await socketRateLimiter(userId, event)
    if (!allowed) return
    this.io.to(`user_${userId}`).emit(event, data)
  }

  public static emitToChat(chatId: string, event: string, data: any): void {
    const instance = SocketService.getInstance()
    instance.io.to(`chat_${chatId}`).emit(event, data)
  }
}

export default SocketService
