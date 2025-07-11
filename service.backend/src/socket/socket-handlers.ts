import jwt from 'jsonwebtoken';
import { Socket, Server as SocketIOServer } from 'socket.io';
import { config } from '../config';
import { ChatService } from '../services/chat.service';
import { HealthCheckService } from '../services/health-check.service';
import { getMessageBroker } from '../services/messageBroker.service';
import { JsonObject } from '../types/common';
import { logger } from '../utils/logger';

// Track active connections for health monitoring
let activeConnections = 0;

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userType?: string;
  role?: string;
  rescueId?: string;
}

interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
  socketIds: string[];
}

interface TypingUser {
  userId: string;
  firstName: string;
  lastName: string;
  timestamp: Date;
}

// Store user presence and typing status
const userPresence = new Map<string, UserPresence>();
const typingUsers = new Map<string, Map<string, TypingUser>>(); // chatId -> userId -> TypingUser

export class SocketHandlers {
  private io: SocketIOServer;
  private messageBroker = getMessageBroker();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupMiddleware();
    this.setupConnectionHandler();
    this.setupMessageBrokerSubscriptions();
  }

  /**
   * Setup Socket.IO middleware for authentication
   */
  private setupMiddleware() {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token =
          socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, config.jwt.secret) as {
          userId: string;
          email: string;
          userType: string;
          role?: string;
          rescueId?: string;
        };
        socket.userId = decoded.userId;
        socket.role = decoded.role || 'user';
        socket.rescueId = decoded.rescueId;

        next();
      } catch (error) {
        logger.error('Socket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup connection handler and event listeners
   */
  private setupConnectionHandler() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      // Track connection for health monitoring
      activeConnections++;
      HealthCheckService.updateActiveConnections(activeConnections);

      logger.info(
        `User ${socket.userId} connected with socket ${socket.id} (Total: ${activeConnections})`
      );

      // Update user presence
      this.updateUserPresence(socket.userId!, 'online', socket.id);

      // Join user to their personal room for notifications
      socket.join(`user:${socket.userId}`);

      // Setup event handlers
      this.setupChatHandlers(socket);
      this.setupTypingHandlers(socket);
      this.setupPresenceHandlers(socket);
      this.setupDisconnectHandler(socket);
    });
  }

  /**
   * Verify user has access to a specific chat
   */
  private async requireChatAccess(socket: AuthenticatedSocket, chatId: string): Promise<void> {
    try {
      await ChatService.getChatById(chatId, socket.userId!);
    } catch (error) {
      logger.warn(`Access denied to chat ${chatId} for user ${socket.userId}`);
      throw new Error('Access denied to chat');
    }
  }

  /**
   * Setup chat-related event handlers
   */
  private setupChatHandlers(socket: AuthenticatedSocket) {
    // Join chat room
    socket.on('join_chat', async (data: { chatId: string }) => {
      try {
        const { chatId } = data;

        // Verify user has access to chat before joining
        await this.requireChatAccess(socket, chatId);

        socket.join(`chat:${chatId}`);
        logger.info(`User ${socket.userId} joined chat ${chatId}`);

        // Notify other participants that user has joined
        socket.to(`chat:${chatId}`).emit('user_joined_chat', {
          userId: socket.userId,
          chatId,
          timestamp: new Date(),
        });
      } catch (error) {
        logger.error('Error joining chat:', error);
        socket.emit('error', {
          event: 'join_chat',
          message: 'Failed to join chat',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Leave chat room
    socket.on('leave_chat', async (data: { chatId: string }) => {
      try {
        const { chatId } = data;

        // Verify user has access to chat before leaving
        await this.requireChatAccess(socket, chatId);

        socket.leave(`chat:${chatId}`);

        // Notify other participants that user has left
        socket.to(`chat:${chatId}`).emit('user_left_chat', {
          userId: socket.userId,
          chatId,
          timestamp: new Date(),
        });

        logger.info(`User ${socket.userId} left chat ${chatId}`);
      } catch (error) {
        logger.error('Error leaving chat:', error);
        socket.emit('error', {
          event: 'leave_chat',
          message: 'Failed to leave chat',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Handle message sent notifications (from API-first approach)
    socket.on(
      'message_sent_notification',
      async (data: { messageId: string; conversationId: string; tempId: string }) => {
        try {
          const { messageId, conversationId, tempId } = data;

          // Verify user has access to chat before sending notification
          await this.requireChatAccess(socket, conversationId);

          // Broadcast to other participants (not sender) that a new message exists
          socket.to(`chat:${conversationId}`).emit('message_notification', {
            messageId,
            conversationId,
            tempId,
            senderId: socket.userId,
            timestamp: new Date(),
          });

          if (process.env.NODE_ENV === 'development') {
            logger.info(`Message notification sent for ${messageId} in chat ${conversationId}`);
          }
        } catch (error) {
          logger.error('Error handling message notification:', error);
          socket.emit('error', {
            event: 'message_sent_notification',
            message: 'Failed to send notification',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    );

    // Send message (DEPRECATED - API should be used instead)
    socket.on(
      'send_message',
      async (data: {
        chatId: string;
        content: string;
        messageType?: 'text' | 'file' | 'image';
        attachments?: Array<{ type: string; url: string; name: string; size?: number }>;
        replyToId?: string;
      }) => {
        try {
          // Log deprecation warning
          logger.warn(
            `DEPRECATED: send_message socket event used by user ${socket.userId}. Use API endpoint instead.`
          );

          const { chatId, content, messageType = 'text', attachments, replyToId } = data;

          // Verify user has access to chat before processing
          await this.requireChatAccess(socket, chatId);

          // Send message through service
          const message = await ChatService.sendMessage({
            chatId,
            senderId: socket.userId!,
            content,
            messageType: messageType as 'text' | 'file' | 'image',
            attachments: attachments
              ? attachments.map(att => ({
                  attachment_id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  filename: att.name,
                  originalName: att.name,
                  mimeType: att.type,
                  size: att.size || 0, // Use actual size from attachment data
                  url: att.url,
                }))
              : undefined,
            replyToId,
          });

          // Broadcast message to all participants in the chat
          this.io.to(`chat:${chatId}`).emit('new_message', {
            message,
            chatId,
            timestamp: new Date(),
          });

          // Clear typing indicator for sender
          this.clearTypingIndicator(chatId, socket.userId!);

          logger.info(`Message sent in chat ${chatId} by user ${socket.userId}`);
        } catch (error) {
          logger.error('Error sending message:', error);
          socket.emit('error', {
            event: 'send_message',
            message: 'Failed to send message',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    );

    // Mark messages as read
    socket.on('mark_as_read', async (data: { chatId: string }) => {
      try {
        const { chatId } = data;

        // Verify user has access to chat before marking as read
        await this.requireChatAccess(socket, chatId);

        await ChatService.markMessagesAsRead(chatId, socket.userId!);

        // Notify other participants about read status
        socket.to(`chat:${chatId}`).emit('messages_read', {
          userId: socket.userId,
          chatId,
          timestamp: new Date(),
        });
      } catch (error) {
        logger.error('Error marking messages as read:', error);
        socket.emit('error', {
          event: 'mark_as_read',
          message: 'Failed to mark messages as read',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Add reaction to message
    socket.on(
      'add_reaction',
      async (data: { messageId: string; emoji: string; chatId: string }) => {
        try {
          const { messageId, emoji, chatId } = data;

          const message = await ChatService.addMessageReaction(messageId, socket.userId!, emoji);

          // Broadcast reaction to all participants
          this.io.to(`chat:${chatId}`).emit('reaction_added', {
            messageId,
            emoji,
            userId: socket.userId,
            reactions: message.reactions,
            timestamp: new Date(),
          });
        } catch (error) {
          logger.error('Error adding reaction:', error);
          socket.emit('error', {
            event: 'add_reaction',
            message: 'Failed to add reaction',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    );

    // Remove reaction from message
    socket.on(
      'remove_reaction',
      async (data: { messageId: string; emoji: string; chatId: string }) => {
        try {
          const { messageId, emoji, chatId } = data;

          const message = await ChatService.removeMessageReaction(messageId, socket.userId!, emoji);

          // Broadcast reaction removal to all participants
          this.io.to(`chat:${chatId}`).emit('reaction_removed', {
            messageId,
            emoji,
            userId: socket.userId,
            reactions: message.reactions,
            timestamp: new Date(),
          });
        } catch (error) {
          logger.error('Error removing reaction:', error);
          socket.emit('error', {
            event: 'remove_reaction',
            message: 'Failed to remove reaction',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    );
  }

  /**
   * Setup typing indicator handlers
   */
  private setupTypingHandlers(socket: AuthenticatedSocket) {
    // User started typing
    socket.on(
      'typing_start',
      async (data: { chatId: string; firstName: string; lastName: string }) => {
        try {
          const { chatId, firstName, lastName } = data;

          // Verify user has access to chat before setting typing indicator
          await this.requireChatAccess(socket, chatId);

          this.setTypingIndicator(chatId, {
            userId: socket.userId!,
            firstName,
            lastName,
            timestamp: new Date(),
          });

          // Notify other participants
          socket.to(`chat:${chatId}`).emit('user_typing', {
            userId: socket.userId,
            firstName,
            lastName,
            chatId,
            timestamp: new Date(),
          });
        } catch (error) {
          logger.error('Error handling typing start:', error);
        }
      }
    );

    // User stopped typing
    socket.on('typing_stop', async (data: { chatId: string }) => {
      try {
        const { chatId } = data;

        // Verify user has access to chat before clearing typing indicator
        await this.requireChatAccess(socket, chatId);

        this.clearTypingIndicator(chatId, socket.userId!);

        // Notify other participants
        socket.to(`chat:${chatId}`).emit('user_stopped_typing', {
          userId: socket.userId,
          chatId,
          timestamp: new Date(),
        });
      } catch (error) {
        logger.error('Error handling typing stop:', error);
      }
    });
  }

  /**
   * Setup presence-related handlers
   */
  private setupPresenceHandlers(socket: AuthenticatedSocket) {
    // User requests presence status of other users
    socket.on('get_presence', (data: { userIds: string[] }) => {
      const { userIds } = data;
      const presenceData: { [userId: string]: { status: string; lastSeen: Date } } = {};

      userIds.forEach(userId => {
        const presence = userPresence.get(userId);
        if (presence) {
          presenceData[userId] = {
            status: presence.status,
            lastSeen: presence.lastSeen,
          };
        } else {
          presenceData[userId] = {
            status: 'offline',
            lastSeen: new Date(),
          };
        }
      });

      socket.emit('presence_update', presenceData);
    });

    // User updates their presence status
    socket.on('update_presence', (data: { status: 'online' | 'away' }) => {
      const { status } = data;
      this.updateUserPresence(socket.userId!, status, socket.id);

      // Broadcast presence update to relevant users
      this.broadcastPresenceUpdate(socket.userId!, status);
    });
  }

  /**
   * Setup disconnect handler
   */
  private setupDisconnectHandler(socket: AuthenticatedSocket) {
    socket.on('disconnect', () => {
      // Track disconnection for health monitoring
      activeConnections = Math.max(0, activeConnections - 1);
      HealthCheckService.updateActiveConnections(activeConnections);

      logger.info(
        `User ${socket.userId} disconnected (socket ${socket.id}) (Total: ${activeConnections})`
      );

      // Update user presence
      this.handleUserDisconnect(socket.userId!, socket.id);

      // Clear all typing indicators for this user
      this.clearAllTypingIndicators(socket.userId!);
    });
  }

  /**
   * Update user presence status
   */
  private updateUserPresence(
    userId: string,
    status: 'online' | 'away' | 'offline',
    socketId: string
  ) {
    const existing = userPresence.get(userId);

    if (existing) {
      existing.status = status;
      existing.lastSeen = new Date();

      if (status === 'offline') {
        existing.socketIds = existing.socketIds.filter(id => id !== socketId);
      } else {
        if (!existing.socketIds.includes(socketId)) {
          existing.socketIds.push(socketId);
        }
      }
    } else {
      userPresence.set(userId, {
        userId,
        status,
        lastSeen: new Date(),
        socketIds: status === 'offline' ? [] : [socketId],
      });
    }
  }

  /**
   * Handle user disconnect
   */
  private handleUserDisconnect(userId: string, socketId: string) {
    const presence = userPresence.get(userId);

    if (presence) {
      presence.socketIds = presence.socketIds.filter(id => id !== socketId);

      // If no more active sockets, mark as offline
      if (presence.socketIds.length === 0) {
        presence.status = 'offline';
        presence.lastSeen = new Date();
      }
    }
  }

  /**
   * Broadcast presence update to relevant users
   */
  private broadcastPresenceUpdate(userId: string, status: string) {
    const presence = userPresence.get(userId);
    if (!presence) {
      return;
    }

    // Broadcast to user's own sockets (for multi-device sync)
    this.io.to(`user:${userId}`).emit('own_presence_update', {
      status,
      lastSeen: presence.lastSeen,
    });

    // You could implement logic here to notify friends/contacts about presence changes
    // For now, we'll keep it simple and not broadcast to other users automatically
  }

  /**
   * Set typing indicator for a user in a chat
   */
  private setTypingIndicator(chatId: string, typingUser: TypingUser) {
    if (!typingUsers.has(chatId)) {
      typingUsers.set(chatId, new Map());
    }

    const chatTyping = typingUsers.get(chatId)!;
    chatTyping.set(typingUser.userId, typingUser);

    // Auto-clear typing indicator after 5 seconds
    setTimeout(() => {
      this.clearTypingIndicator(chatId, typingUser.userId);
    }, 5000);
  }

  /**
   * Clear typing indicator for a user in a chat
   */
  private clearTypingIndicator(chatId: string, userId: string) {
    const chatTyping = typingUsers.get(chatId);
    if (chatTyping) {
      chatTyping.delete(userId);

      if (chatTyping.size === 0) {
        typingUsers.delete(chatId);
      }
    }
  }

  /**
   * Clear all typing indicators for a user (on disconnect)
   */
  private clearAllTypingIndicators(userId: string) {
    for (const [chatId, chatTyping] of typingUsers.entries()) {
      if (chatTyping.has(userId)) {
        chatTyping.delete(userId);

        // Notify chat participants that user stopped typing
        this.io.to(`chat:${chatId}`).emit('user_stopped_typing', {
          userId,
          chatId,
          timestamp: new Date(),
        });

        if (chatTyping.size === 0) {
          typingUsers.delete(chatId);
        }
      }
    }
  }

  /**
   * Send notification to a user
   */
  public sendNotificationToUser(
    userId: string,
    notification: {
      id: string;
      type: string;
      title: string;
      message: string;
      data?: JsonObject;
      timestamp: Date;
    }
  ) {
    this.io.to(`user:${userId}`).emit('notification', notification);
  }

  /**
   * Send message to a chat room
   */
  public sendMessageToChat(
    chatId: string,
    message: {
      messageId: string;
      chatId: string;
      senderId: string;
      content: string;
      type: 'text' | 'image' | 'file';
      timestamp: Date;
      attachments?: JsonObject[];
    }
  ) {
    this.io.to(`chat:${chatId}`).emit('new_message', message);
  }

  /**
   * Get current user presence
   */
  public getUserPresence(userId: string) {
    return userPresence.get(userId);
  }

  /**
   * Get typing users in a chat
   */
  public getTypingUsers(chatId: string) {
    const chatTyping = typingUsers.get(chatId);
    return chatTyping ? Array.from(chatTyping.values()) : [];
  }

  /**
   * Setup message broker subscriptions
   */
  /**
   * Setup message broker subscriptions for horizontal scaling
   */
  private setupMessageBrokerSubscriptions() {
    if (!this.messageBroker) {
      logger.info('No message broker available, running in single-server mode');
      return;
    }

    logger.info('Setting up message broker subscriptions for horizontal scaling');

    // Note: In a full implementation, we would subscribe to broker events here
    // For now, we'll just log that the system is ready for scaling
    logger.info('Message broker subscriptions configured', {
      brokerId: this.messageBroker.getStatus().serverId,
      stats: this.messageBroker.getStatus(),
    });
  }

  /**
   * Publish message to broker for other server instances
   */
  private async publishToBroker(event: string, data: Record<string, unknown>) {
    if (this.messageBroker) {
      try {
        if (event === 'message_sent' && data.chatId && data.senderId) {
          await this.messageBroker.publishChatMessage(
            data.chatId as string,
            data,
            data.senderId as string
          );
        } else if (event === 'typing' && data.chatId && data.userId) {
          await this.messageBroker.publishTyping(
            data.chatId as string,
            data.userId as string,
            Boolean(data.isTyping)
          );
        }
      } catch (error) {
        logger.error('Failed to publish to message broker:', error);
      }
    }
  }
}
