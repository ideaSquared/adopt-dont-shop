import { z } from 'zod';
import { Socket, Server as SocketIOServer } from 'socket.io';
import { toFrontendMessage } from '../controllers/chat.controller';
import ChatParticipant from '../models/ChatParticipant';
import MessageReaction from '../models/MessageReaction';
import RevokedToken from '../models/RevokedToken';
import Role from '../models/Role';
import StaffMember from '../models/StaffMember';
import User, { UserStatus, UserType } from '../models/User';
import { ChatService } from '../services/chat.service';
import { HealthCheckService } from '../services/health-check.service';
import { getMessageBroker } from '../services/messageBroker.service';
import { setAnalyticsIo } from './analytics-emitter';
import {
  isUserAtConnectionCap,
  registerUserSocket,
  setLiveIo,
  getLiveIo,
  unregisterUserSocket,
} from './socket-registry';
import { checkRateLimit, releaseSocket } from '../middleware/socket-rate-limit';
import { JsonObject } from '../types/common';
import { verifyAccessToken } from '../utils/jwt';
import { logger } from '../utils/logger';

// Re-export so existing callers that imported disconnectAllSockets
// from this module keep working.
export { disconnectAllSockets } from './socket-registry';

/**
 * Extracts the access token from a Socket.IO handshake. Checks, in order:
 *   1. socket.handshake.auth.token  (legacy explicit pass)
 *   2. Authorization: Bearer <token> header
 *   3. accessToken httpOnly cookie (browsers send cookies with the WS upgrade)
 */
const extractSocketToken = (socket: Socket): string | null => {
  const authToken = socket.handshake.auth?.token as string | undefined;
  if (authToken) {
    return authToken;
  }

  const bearer = socket.handshake.headers.authorization?.split(' ')[1];
  if (bearer) {
    return bearer;
  }

  const cookieStr = socket.handshake.headers.cookie;
  if (cookieStr) {
    const match = cookieStr.split(';').find(p => p.trim().startsWith('accessToken='));
    if (match) {
      return match.trim().slice('accessToken='.length);
    }
  }

  return null;
};

// Track active connections for health monitoring
let activeConnections = 0;

// Zod schemas for socket event payloads
const JoinChatSchema = z.object({ chatId: z.string().uuid() });
const LeaveChatSchema = z.object({ chatId: z.string().uuid() });

// ADS-708: attachment URLs must point at this service's own upload routes.
// Accepting arbitrary strings let a client paste `https://attacker.example/x`
// (or `//attacker.example/x`, or even another local route) into a chat
// message, which the frontend would then render — a stored-link / SSRF
// vector. Restrict to the canonical upload paths produced by the
// file-upload service (`/uploads/<category>/<filename>`) or the signed-URL
// helper (`/uploads-signed/<expiresAt>/<signature>/...`). Anything else,
// including absolute URLs and protocol-relative URLs, is rejected at the
// schema level.
const ATTACHMENT_URL_PATTERN = /^\/uploads(?:-signed)?\/[^\s?#]+$/;
export const AttachmentUrlSchema = z.string().max(500).regex(ATTACHMENT_URL_PATTERN, {
  message: 'Attachment URL must be a /uploads/ or /uploads-signed/ path on this server',
});

export const SendMessageSchema = z.object({
  chatId: z.string().uuid(),
  content: z.string().min(1).max(10_000),
  messageType: z.enum(['text', 'file', 'image']).optional(),
  attachments: z
    .array(
      z.object({
        type: z.string().max(50),
        url: AttachmentUrlSchema,
        name: z.string().max(255),
        size: z.number().int().nonnegative().optional(),
      })
    )
    .max(10)
    .optional(),
  replyToId: z.string().uuid().optional(),
});
const MarkAsReadSchema = z.object({ chatId: z.string().uuid() });
const ReactionSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.string().min(1).max(8),
  chatId: z.string().uuid(),
});
const TypingStartSchema = z.object({
  chatId: z.string().uuid(),
  firstName: z.string().max(50),
  lastName: z.string().max(50),
});
const TypingStopSchema = z.object({ chatId: z.string().uuid() });
// ADS-739: get_presence must validate its payload + scope the response
// to userIds the requester is allowed to see. Without these checks a
// client at Rescue A could enumerate online staff at Rescue B.
const GetPresenceSchema = z.object({
  userIds: z.array(z.string().uuid()).max(50),
});

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userType?: string;
  role?: string;
  rescueId?: string | null;
  authJti?: string;
}

/**
 * ADS-708: revocation must be authoritative on every event. The previous
 * 30s "still valid" cache meant a logged-out user could keep sending
 * socket events for up to 30s after their token was revoked. We now
 * query RevokedToken on every inbound event — the table
 * is keyed by jti (indexed PK) so the read is a single point lookup, and
 * Socket.IO middleware already serialises per-socket so a chatty client
 * cannot stack concurrent reads here.
 */

/**
 * ADS-597: periodic re-fetch of authoritative auth state. Every
 * AUTH_REFRESH_MS we re-read the user row and disconnect the socket if
 * the account is no longer active. Per-socket so we can clear it on
 * disconnect.
 */
const AUTH_REFRESH_MS = 60_000;
const socketAuthRefreshTimers = new Map<string, NodeJS.Timeout>();

/**
 * ADS-599: resolve the most-privileged role name the user currently
 * holds (DB-backed; not the JWT claim). Drives the `analytics:platform`
 * room join.
 */
function resolveHighestRole(roles: ReadonlyArray<{ name: string }> | undefined): string {
  const names = roles?.map(r => r.name) ?? [];
  if (names.includes('super_admin')) {
    return 'super_admin';
  }
  if (names.includes('admin')) {
    return 'admin';
  }
  if (names.includes('moderator')) {
    return 'moderator';
  }
  return 'user';
}

/**
 * ADS-599: fetch the user's current auth state from the DB rather than
 * trusting JWT claims. Returns null if the account is no longer
 * eligible for an authenticated socket (deleted, suspended, email
 * un-verified). Used both at handshake and by the periodic refresh
 * timer.
 */
async function loadSocketAuthState(userId: string): Promise<{
  userType: UserType;
  role: string;
  rescueId: string | null;
} | null> {
  const user = await User.findByPk(userId, {
    include: [{ model: Role, as: 'Roles' }],
  });
  if (!user) {
    return null;
  }
  if (user.status !== UserStatus.ACTIVE || !user.emailVerified) {
    return null;
  }
  let rescueId: string | null = null;
  if (user.userType === UserType.RESCUE_STAFF) {
    const staff = await StaffMember.findOne({
      where: { userId, isVerified: true },
      attributes: ['rescueId'],
    });
    rescueId = staff?.rescueId ?? null;
  }
  return {
    userType: user.userType,
    role: resolveHighestRole(user.Roles),
    rescueId,
  };
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

/**
 * Returns true when the given user has at least one active socket connection.
 * Safe to call from anywhere in the process; reads from the same in-memory
 * map that SocketHandlers maintains.
 *
 * NOTE: single-instance presence only. Multi-instance deploys need a Redis-
 * backed registry to be accurate across replicas.
 */
export function isUserOnline(userId: string): boolean {
  const presence = userPresence.get(userId);
  return !!presence && presence.status !== 'offline' && presence.socketIds.length > 0;
}

/**
 * Broadcast a "new_message" event to every given recipient's personal
 * user:{id} room. Each authenticated socket auto-joins that room on
 * connect, so we don't need the frontend to manage chat-room membership
 * — one emit per participant reaches any device they've got open.
 *
 * The sender is typically included; the frontend ChatProvider dedupes
 * by message id (optimistically appended on the REST response, then
 * merged with the socket copy). Callers pass only the recipients they
 * want to notify.
 */
export function broadcastNewMessage(
  chatId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message: any,
  recipientUserIds: string[]
): void {
  const liveIo = getLiveIo();
  if (!liveIo) {
    return;
  }
  const payload = { message, chatId, timestamp: new Date() };
  for (const userId of recipientUserIds) {
    liveIo.to(`user:${userId}`).emit('new_message', payload);
  }
}

export class SocketHandlers {
  private io: SocketIOServer;
  private messageBroker = getMessageBroker();

  constructor(io: SocketIOServer) {
    this.io = io;
    // Expose the IO instance to module-level broadcast helpers
    // (broadcastNewMessage) and the shared registry used by
    // disconnectAllSockets so controllers can fan out events without
    // having to plumb a reference through.
    setLiveIo(io);
    // ADS-105: same registration for the analytics emitter so service-
    // layer mutations can fan invalidations out without plumbing a ref.
    setAnalyticsIo(io);
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
        const token = extractSocketToken(socket);

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // ADS-590: HS256 allowlist pinned via the shared helper so a
        // future asymmetric-key path can't be exploited via alg
        // confusion. Used by the HTTP middleware too.
        const decoded = verifyAccessToken(token);

        // ADS-473: HTTP authenticateToken middleware checks the
        // RevokedToken table on every authenticated request, but
        // Socket.IO previously trusted any signature-valid JWT — so
        // a logged-out user could keep / reconnect a WebSocket and
        // receive messages. Mirror the HTTP path here.
        if (decoded.jti && (await RevokedToken.findByPk(decoded.jti))) {
          return next(new Error('Token has been revoked'));
        }

        // ADS-599: do not trust role/rescueId/userType from the JWT.
        // The token may have been issued before a role change or staff
        // transfer. Read the authoritative state from the DB.
        const authState = await loadSocketAuthState(decoded.userId);
        if (!authState) {
          return next(new Error('Account is not eligible'));
        }

        // Cap concurrent connections per user to prevent file-
        // descriptor exhaustion (DoS) from a single account. Five
        // covers laptop + phone + spare device with reconnect
        // headroom; legitimate clients should never exceed this.
        // Registered on the way IN (not in the `connection` handler)
        // so a flood of handshakes can't slip past the gate before
        // the per-socket connect logic runs.
        if (isUserAtConnectionCap(decoded.userId)) {
          logger.warn(
            `Socket connection cap reached for user ${decoded.userId}; rejecting handshake`
          );
          return next(new Error('Too many concurrent connections'));
        }

        socket.userId = decoded.userId;
        socket.authJti = decoded.jti;
        socket.userType = authState.userType;
        socket.role = authState.role;
        socket.rescueId = authState.rescueId;

        next();
      } catch (error) {
        logger.error('Socket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * ADS-597 / ADS-708: per-event re-validation. JWT verify runs on every
   * event, and the RevokedToken DB read also runs on every event so a
   * revoked / logged-out token cannot keep emitting for any window of
   * time. On failure we tear the socket down so no further events are
   * processed.
   */
  private installPerEventRevalidation(socket: AuthenticatedSocket) {
    socket.use((_event, next) => {
      const token = extractSocketToken(socket);

      if (!token) {
        socket.disconnect(true);
        return;
      }

      let decoded;
      try {
        decoded = verifyAccessToken(token);
      } catch {
        socket.disconnect(true);
        return;
      }

      if (!decoded.jti) {
        // No jti means we cannot consult the revocation list — accept the
        // event since the signature already verified. Tokens minted by
        // this service always carry a jti (see utils/jwt); a missing jti
        // is only possible on legacy tokens during a deploy.
        next();
        return;
      }

      RevokedToken.findByPk(decoded.jti)
        .then(row => {
          if (row) {
            socket.disconnect(true);
            return;
          }
          next();
        })
        .catch(err => {
          logger.error('Socket revalidation DB error:', err);
          // Fail closed: better to tear down than serve a possibly-
          // revoked session.
          socket.disconnect(true);
        });
    });
  }

  /**
   * ADS-597: re-fetch the user row every AUTH_REFRESH_MS and disconnect
   * if the account is no longer active (suspended, deleted, email
   * un-verified). Also refreshes the cached role/rescueId so a demoted
   * admin loses their `analytics:platform` membership on the next
   * connect — combined with disconnectAllSockets it tightens the
   * window after a role change.
   */
  private installAuthRefreshTimer(socket: AuthenticatedSocket) {
    const timer = setInterval(async () => {
      if (!socket.userId) {
        return;
      }
      try {
        const authState = await loadSocketAuthState(socket.userId);
        if (!authState) {
          socket.disconnect(true);
          return;
        }
        socket.userType = authState.userType;
        socket.role = authState.role;
        socket.rescueId = authState.rescueId;
      } catch (err) {
        logger.error('Socket auth refresh error:', err);
      }
    }, AUTH_REFRESH_MS);
    socketAuthRefreshTimers.set(socket.id, timer);
  }

  /**
   * Setup connection handler and event listeners
   */
  private setupConnectionHandler() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      // Track connection for health monitoring
      activeConnections++;
      HealthCheckService.updateActiveConnections(activeConnections);

      // Per-user connection cap bookkeeping (paired with the gate in
      // setupMiddleware). Unregister happens in the disconnect handler.
      if (socket.userId) {
        registerUserSocket(socket.userId, socket.id);
      }

      logger.info(
        `User ${socket.userId} connected with socket ${socket.id} (Total: ${activeConnections})`
      );

      // Update user presence
      this.updateUserPresence(socket.userId!, 'online', socket.id);

      // Join user to their personal room for notifications. Also used
      // by disconnectAllSockets() to terminate every device a user has
      // open in one io.to(...).disconnectSockets() call.
      socket.join(`user:${socket.userId}`);

      // ADS-105 / ADS-599: analytics rooms. Rescue staff get rescue-
      // scoped invalidations; admins/super-admins/moderators also get
      // platform-wide. The role / rescueId values come from the
      // handshake DB lookup (loadSocketAuthState) — *not* the JWT — so
      // a stale token can't keep platform-room access after a demote.
      if (socket.rescueId) {
        socket.join(`analytics:rescue:${socket.rescueId}`);
        // ADS C4-3 / C4-6: general-purpose rescue room used for non-
        // analytics events (rescue verification, application list
        // updates). Kept separate from the analytics room so the
        // analytics-emitter debounce can't drop fan-out for live data.
        socket.join(`rescue:${socket.rescueId}`);
      }
      if (socket.role === 'super_admin' || socket.role === 'admin' || socket.role === 'moderator') {
        socket.join('analytics:platform');
      }

      // ADS-597: per-event JWT/revocation re-check + periodic auth
      // refresh. Without these the socket would remain authenticated
      // for its full lifetime regardless of logout / suspend / token
      // expiry.
      this.installPerEventRevalidation(socket);
      this.installAuthRefreshTimer(socket);

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
      await ChatService.getChatById(chatId, socket.userId!, false);
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
    socket.on('join_chat', async (data: unknown) => {
      try {
        if (checkRateLimit(socket, 'join_chat')) {
          return;
        }
        const parsed = JoinChatSchema.safeParse(data);
        if (!parsed.success) {
          socket.emit('error', { event: 'join_chat', message: 'Invalid payload' });
          return;
        }
        const { chatId } = parsed.data;

        // ADS-708: socket.join() MUST NOT run until requireChatAccess
        // resolves successfully. If the promise rejects, the throw
        // skips the join and the catch below emits an error to the
        // client. Do not reorder — a join before the check would put
        // a non-participant in the room and leak broadcasts.
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
    socket.on('leave_chat', async (data: unknown) => {
      try {
        if (checkRateLimit(socket, 'leave_chat')) {
          return;
        }
        const parsed = LeaveChatSchema.safeParse(data);
        if (!parsed.success) {
          socket.emit('error', { event: 'leave_chat', message: 'Invalid payload' });
          return;
        }
        const { chatId } = parsed.data;

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
          if (checkRateLimit(socket, 'message_sent_notification')) {
            return;
          }
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
    socket.on('send_message', async (data: unknown) => {
      try {
        if (checkRateLimit(socket, 'send_message')) {
          return;
        }
        const parsed = SendMessageSchema.safeParse(data);
        if (!parsed.success) {
          socket.emit('error', { event: 'send_message', message: 'Invalid payload' });
          return;
        }

        // Log deprecation warning
        logger.warn(
          `DEPRECATED: send_message socket event used by user ${socket.userId}. Use API endpoint instead.`
        );

        const { chatId, content, messageType = 'text', attachments, replyToId } = parsed.data;

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

        // Broadcast the canonical frontend message shape — same helper
        // used by the REST send/get paths — so clients see camelCase keys
        // and a populated senderName instead of a raw Sequelize instance
        // with a nested Sender association.
        this.io.to(`chat:${chatId}`).emit('new_message', {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          message: toFrontendMessage(message as any),
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
    });

    // Mark messages as read
    socket.on('mark_as_read', async (data: unknown) => {
      try {
        if (checkRateLimit(socket, 'mark_as_read')) {
          return;
        }
        const parsed = MarkAsReadSchema.safeParse(data);
        if (!parsed.success) {
          socket.emit('error', { event: 'mark_as_read', message: 'Invalid payload' });
          return;
        }
        const { chatId } = parsed.data;

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
    socket.on('add_reaction', async (data: unknown) => {
      try {
        if (checkRateLimit(socket, 'add_reaction')) {
          return;
        }
        const parsed = ReactionSchema.safeParse(data);
        if (!parsed.success) {
          socket.emit('error', { event: 'add_reaction', message: 'Invalid payload' });
          return;
        }
        const { messageId, emoji, chatId } = parsed.data;

        await ChatService.addMessageReaction(messageId, socket.userId!, emoji);
        // Reactions live in message_reactions (plan 2.1) — refetch the
        // current list so the broadcast carries an authoritative snapshot.
        const reactions = await MessageReaction.findAll({
          where: { message_id: messageId },
          attributes: ['user_id', 'emoji', 'created_at'],
        });

        this.io.to(`chat:${chatId}`).emit('reaction_added', {
          messageId,
          emoji,
          userId: socket.userId,
          reactions: reactions.map(r => ({
            user_id: r.user_id,
            emoji: r.emoji,
            created_at: r.created_at,
          })),
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
    });

    // Remove reaction from message
    socket.on('remove_reaction', async (data: unknown) => {
      try {
        if (checkRateLimit(socket, 'remove_reaction')) {
          return;
        }
        const parsed = ReactionSchema.safeParse(data);
        if (!parsed.success) {
          socket.emit('error', { event: 'remove_reaction', message: 'Invalid payload' });
          return;
        }
        const { messageId, emoji, chatId } = parsed.data;

        await ChatService.removeMessageReaction(messageId, socket.userId!, emoji);
        const reactions = await MessageReaction.findAll({
          where: { message_id: messageId },
          attributes: ['user_id', 'emoji', 'created_at'],
        });

        this.io.to(`chat:${chatId}`).emit('reaction_removed', {
          messageId,
          emoji,
          userId: socket.userId,
          reactions: reactions.map(r => ({
            user_id: r.user_id,
            emoji: r.emoji,
            created_at: r.created_at,
          })),
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
    });
  }

  /**
   * Setup typing indicator handlers
   */
  private setupTypingHandlers(socket: AuthenticatedSocket) {
    // User started typing
    socket.on('typing_start', async (data: unknown) => {
      try {
        if (checkRateLimit(socket, 'typing_start')) {
          return;
        }
        const parsed = TypingStartSchema.safeParse(data);
        if (!parsed.success) {
          return;
        }
        const { chatId, firstName, lastName } = parsed.data;

        await this.requireChatAccess(socket, chatId);

        this.setTypingIndicator(chatId, {
          userId: socket.userId!,
          firstName,
          lastName,
          timestamp: new Date(),
        });

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
    });

    // User stopped typing
    socket.on('typing_stop', async (data: unknown) => {
      try {
        if (checkRateLimit(socket, 'typing_stop')) {
          return;
        }
        const parsed = TypingStopSchema.safeParse(data);
        if (!parsed.success) {
          return;
        }
        const { chatId } = parsed.data;

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
    //
    // ADS-739: presence is sensitive — adopters at Rescue A must not be
    // able to enumerate online staff at Rescue B by guessing user IDs.
    // We validate the payload with Zod, then filter the requested set
    // down to userIds the requester actually shares context with:
    //   - admin/moderator/super_admin → see everyone
    //   - everyone else → users they share a chat with, OR users in
    //     the same rescue tenant
    // Users they cannot see are silently dropped from the response so
    // we don't leak existence by returning "denied" vs "offline".
    socket.on('get_presence', async (data: unknown) => {
      try {
        if (checkRateLimit(socket, 'get_presence')) {
          return;
        }
        const parsed = GetPresenceSchema.safeParse(data);
        if (!parsed.success) {
          socket.emit('error', { event: 'get_presence', message: 'Invalid payload' });
          return;
        }
        const { userIds } = parsed.data;
        const requesterId = socket.userId;
        if (!requesterId) {
          return;
        }

        const visibleIds = await this.filterVisibleUserIds(socket, userIds);
        const presenceData: { [userId: string]: { status: string; lastSeen: Date } } = {};

        visibleIds.forEach(userId => {
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
      } catch (error) {
        logger.error('Error handling get_presence:', error);
        socket.emit('error', {
          event: 'get_presence',
          message: 'Failed to fetch presence',
        });
      }
    });

    // User updates their presence status
    socket.on('update_presence', (data: { status: 'online' | 'away' }) => {
      if (checkRateLimit(socket, 'update_presence')) {
        return;
      }
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

      // Release the per-user connection-cap slot.
      if (socket.userId) {
        unregisterUserSocket(socket.userId, socket.id);
      }

      // Update user presence
      this.handleUserDisconnect(socket.userId!, socket.id);

      // Clear all typing indicators for this user
      this.clearAllTypingIndicators(socket.userId!);

      // Release per-socket rate-limit state. For authenticated
      // sockets the limiter keeps the bucket alive across reconnects
      // (and GCs it on idle); for anonymous sockets it's dropped now.
      releaseSocket(socket);

      // ADS-597: stop the auth-refresh timer so it doesn't leak past the
      // socket lifetime.
      const timer = socketAuthRefreshTimers.get(socket.id);
      if (timer) {
        clearInterval(timer);
        socketAuthRefreshTimers.delete(socket.id);
      }
    });
  }

  /**
   * ADS-739: scope `get_presence` to userIds the requester is allowed
   * to see. Returns the subset of `requestedIds` (excluding self, which
   * is implicitly visible) the requester shares context with:
   *   - admin / moderator / super_admin → all ids
   *   - any user → ids they share a chat with (ChatParticipant join)
   *   - rescue staff → also ids belonging to the same rescue
   * The requester's own id is always included if requested.
   */
  private async filterVisibleUserIds(
    socket: AuthenticatedSocket,
    requestedIds: ReadonlyArray<string>
  ): Promise<string[]> {
    const requesterId = socket.userId!;
    const dedupedRequested = Array.from(new Set(requestedIds));
    if (dedupedRequested.length === 0) {
      return [];
    }

    // Admins/moderators can see everyone — short-circuit.
    if (socket.role === 'super_admin' || socket.role === 'admin' || socket.role === 'moderator') {
      return dedupedRequested;
    }

    // Users always see themselves.
    const visible = new Set<string>();
    if (dedupedRequested.includes(requesterId)) {
      visible.add(requesterId);
    }

    const others = dedupedRequested.filter(id => id !== requesterId);
    if (others.length === 0) {
      return Array.from(visible);
    }

    // (1) Users who share a chat with the requester. Find the chats the
    // requester participates in, then the other participants of those
    // chats — intersect with `others`.
    const myChats = await ChatParticipant.findAll({
      where: { participant_id: requesterId },
      attributes: ['chat_id'],
    });
    const chatIds = myChats.map(c => c.chat_id);
    if (chatIds.length > 0) {
      const coParticipants = await ChatParticipant.findAll({
        where: { chat_id: chatIds, participant_id: others },
        attributes: ['participant_id'],
      });
      coParticipants.forEach(p => visible.add(p.participant_id));
    }

    // (2) Rescue staff: anyone in the same rescue (staff or chat-attached).
    if (socket.rescueId) {
      const sameRescueStaff = await StaffMember.findAll({
        where: { rescueId: socket.rescueId, userId: others, isVerified: true },
        attributes: ['userId'],
      });
      sameRescueStaff.forEach(s => visible.add(s.userId));
    }

    return Array.from(visible);
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
