import { Server } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { socketRateLimiter, typingRateLimiter } from '../middleware/rateLimiter'
import { AuditLogger } from './auditLogService'

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
      let authenticatedUserId: string | null = null

      AuditLogger.logAction(
        'Socket',
        `New socket connection: ${socket.id}`,
        'INFO',
      )

      // Handle user authentication
      socket.on('authenticate', async (userId: string) => {
        try {
          // Store socket mapping
          const userSockets = this.userSockets.get(userId) || []
          userSockets.push(socket.id)
          this.userSockets.set(userId, userSockets)
          authenticatedUserId = userId

          // Join user's room
          socket.join(`user_${userId}`)

          AuditLogger.logAction(
            'Socket',
            `User ${userId} authenticated on socket ${socket.id}`,
            'INFO',
          )
        } catch (error) {
          AuditLogger.logAction(
            'Socket',
            `Authentication error: ${(error as Error).message}`,
            'ERROR',
          )
        }
      })

      // Handle joining chat rooms
      socket.on('join_chat', async (chatId: string) => {
        if (!authenticatedUserId) return

        const allowed = await socketRateLimiter(
          authenticatedUserId,
          'join_chat',
        )
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
        if (!authenticatedUserId) return

        const allowed = await socketRateLimiter(
          authenticatedUserId,
          'leave_chat',
        )
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
          if (!authenticatedUserId || authenticatedUserId !== data.userId)
            return

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
          if (!authenticatedUserId || authenticatedUserId !== data.userId)
            return

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
        if (authenticatedUserId) {
          const userSockets = this.userSockets.get(authenticatedUserId) || []
          const updatedSockets = userSockets.filter((id) => id !== socket.id)

          if (updatedSockets.length === 0) {
            this.userSockets.delete(authenticatedUserId)
          } else {
            this.userSockets.set(authenticatedUserId, updatedSockets)
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
