// REST → gRPC translation for /api/v1/chats/* and the message-level
// react endpoint.
//
// Mirrors services/gateway/src/routes/notifications.ts in shape. The
// chat service's gRPC handlers do all the validation + permission
// gating; this plugin's job is mapping the SPA-facing JSON shape onto
// the proto request fields and the gRPC status onto an HTTP status.
//
// Same dev-mode auth contract: `x-user-id` / `x-user-roles` /
// `x-user-permissions` / `x-rescue-id` headers from the client become
// the gRPC metadata the chat handlers' principal extractor reads.

import type { FastifyInstance } from 'fastify';

import {
  ChatV1,
  type ListChatsRequest,
  type ListMessagesRequest,
  type MarkReadRequest,
  type OpenChatRequest,
  type ReactRequest,
  type SearchChatsRequest,
  type SendMessageRequest,
} from '@adopt-dont-shop/proto';

import type { ChatClient } from '../grpc-clients/chat-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { parsePagination } from '../middleware/pagination.js';

export type ChatRoutesOptions = {
  client: ChatClient;
};

// The monolith mounts the same chat routes at /api/v1/chats AND
// /api/v1/conversations. The SPA's lib.chat client uses both paths
// across different views; we mirror that here so a SPA build doesn't
// notice the cutover. Every helper below registers under both
// prefixes via this list.
const CHAT_PREFIXES = ['/api/v1/chats', '/api/v1/conversations'] as const;

export const registerChatRoutes = async (
  app: FastifyInstance,
  opts: ChatRoutesOptions
): Promise<void> => {
  const { client } = opts;

  for (const prefix of CHAT_PREFIXES) {
    registerChatRoutesForPrefix(app, client, prefix);
  }

  // The /api/v1/messages/:messageId/reactions endpoint is unique —
  // it's a message-level operation, not chat-scoped — so it only
  // registers once. Same handler shape as the other six.
  app.post<{ Params: { messageId: string } }>(
    '/api/v1/messages/:messageId/reactions',
    async (req, reply) => {
      const metadata = buildMetadata(req);
      const body = (req.body ?? {}) as { emoji?: string; remove?: boolean };
      const grpcReq: ReactRequest = {
        messageId: req.params.messageId,
        emoji: body.emoji ?? '',
        remove: Boolean(body.remove),
      };

      try {
        const res = await client.react(grpcReq, metadata);
        return reply.send(ChatV1.ReactResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};

const registerChatRoutesForPrefix = (
  app: FastifyInstance,
  client: ChatClient,
  prefix: string
): void => {
  // ---- GET <prefix> -------------------------------------------------
  app.get(prefix, async (req, reply) => {
    const metadata = buildMetadata(req);
    const query = req.query as Record<string, string | undefined>;
    const pagination = parsePagination(query, { limit: 0 });
    if (!pagination.ok) {
      return reply.code(400).send({ error: pagination.error });
    }
    const grpcReq: ListChatsRequest = {
      cursor: query.cursor,
      limit: pagination.limit,
      unreadOnly: query.unreadOnly === 'true' || query.unread_only === 'true',
    };

    try {
      const res = await client.listChats(grpcReq, metadata);
      return reply.send(ChatV1.ListChatsResponse.toJSON(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // ---- POST <prefix> -----------------------------------------------
  app.post(prefix, async (req, reply) => {
    const metadata = buildMetadata(req);
    const body = (req.body ?? {}) as Partial<OpenChatRequest> & {
      application_id?: string;
      other_user_id?: string;
    };
    const grpcReq: OpenChatRequest = {
      applicationId: body.applicationId ?? body.application_id ?? '',
      otherUserId: body.otherUserId ?? body.other_user_id ?? '',
    };

    try {
      const res = await client.openChat(grpcReq, metadata);
      return reply.code(res.created ? 201 : 200).send(ChatV1.OpenChatResponse.toJSON(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // ---- GET <prefix>/search ----------------------------------------
  // Must register BEFORE the :chatId routes so the static segment
  // wins Fastify's first-registered-wins matcher.
  app.get(`${prefix}/search`, async (req, reply) => {
    const metadata = buildMetadata(req);
    const query = req.query as Record<string, string | undefined>;
    const pagination = parsePagination(query, { limit: 0 });
    if (!pagination.ok) {
      return reply.code(400).send({ error: pagination.error });
    }
    const grpcReq: SearchChatsRequest = {
      query: query.query ?? query.q ?? '',
      page: pagination.page,
      limit: pagination.limit,
      rescueId: query.rescueId ?? query.rescue_id,
    };

    try {
      const res = await client.searchChats(grpcReq, metadata);
      // Match the monolith ConversationsController.searchConversations
      // body shape: { chats, pagination } so the SPA's existing search
      // handler keeps working unchanged.
      const total = res.total;
      const limit = res.limit;
      const page = res.page;
      return reply.send({
        success: true,
        data: {
          chats: res.hits.map(h => ({
            ...(ChatV1.Chat.toJSON(h.chat!) as Record<string, unknown>),
            matched_message: h.match ? ChatV1.Message.toJSON(h.match) : null,
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
          },
        },
      });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // ---- GET <prefix>/:chatId/unread-count ---------------------------
  // Single-chat unread count for the calling principal. Returns the
  // monolith envelope { success, data: { unreadCount } } so the SPA's
  // lib.chat consumer keeps working.
  app.get<{ Params: { chatId: string } }>(`${prefix}/:chatId/unread-count`, async (req, reply) => {
    const metadata = buildMetadata(req);
    try {
      const res = await client.getChatUnreadCount({ chatId: req.params.chatId }, metadata);
      return reply.send({
        success: true,
        data: { unreadCount: res.unreadCount },
      });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // ---- GET <prefix>/:chatId ----------------------------------------
  // Fetch single chat details. Registered AFTER the more-specific
  // /:chatId/{unread-count,messages,read} routes above so they win
  // Fastify's first-registered-wins matcher. Returns the monolith
  // envelope { success, data: Chat } where Chat is the proto JSON.
  app.get<{ Params: { chatId: string } }>(`${prefix}/:chatId`, async (req, reply) => {
    const metadata = buildMetadata(req);
    try {
      const res = await client.getChat({ chatId: req.params.chatId }, metadata);
      if (!res.chat) {
        return reply.code(404).send({ success: false, error: 'Chat not found' });
      }
      return reply.send({
        success: true,
        data: ChatV1.Chat.toJSON(res.chat),
      });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // ---- DELETE <prefix>/:chatId -------------------------------------
  // Soft-delete (archive) a chat. Participant-or-admin only.
  app.delete<{ Params: { chatId: string }; Body?: { reason?: string } }>(
    `${prefix}/:chatId`,
    async (req, reply) => {
      const metadata = buildMetadata(req);
      const body = (req.body ?? {}) as { reason?: string };
      try {
        const res = await client.deleteChat(
          { chatId: req.params.chatId, reason: body.reason },
          metadata
        );
        return reply.send({
          success: true,
          message: 'Chat deleted',
          data: res.chat ? ChatV1.Chat.toJSON(res.chat) : null,
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---- GET <prefix>/:chatId/messages -------------------------------
  app.get<{ Params: { chatId: string } }>(`${prefix}/:chatId/messages`, async (req, reply) => {
    const metadata = buildMetadata(req);
    const query = req.query as Record<string, string | undefined>;
    const pagination = parsePagination(query, { limit: 0 });
    if (!pagination.ok) {
      return reply.code(400).send({ error: pagination.error });
    }
    const grpcReq: ListMessagesRequest = {
      chatId: req.params.chatId,
      cursor: query.cursor,
      limit: pagination.limit,
    };

    try {
      const res = await client.listMessages(grpcReq, metadata);
      return reply.send(ChatV1.ListMessagesResponse.toJSON(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // ---- DELETE <prefix>/:chatId/messages/:messageId -----------------
  // Soft-deletes the message. Senders can delete their own; moderators
  // / admins need chat.message.delete:any (enforced at the handler).
  // chat_id from the path is informational — the handler resolves the
  // message by its own id and verifies the chat link itself.
  app.delete<{ Params: { chatId: string; messageId: string }; Body?: { reason?: string } }>(
    `${prefix}/:chatId/messages/:messageId`,
    async (req, reply) => {
      const metadata = buildMetadata(req);
      const body = (req.body ?? {}) as { reason?: string };
      try {
        const res = await client.deleteMessage(
          { messageId: req.params.messageId, reason: body.reason },
          metadata
        );
        return reply.send({
          success: true,
          message: 'Message deleted',
          data: res.message ? ChatV1.Message.toJSON(res.message) : null,
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---- POST <prefix>/:chatId/messages ------------------------------
  app.post<{ Params: { chatId: string } }>(`${prefix}/:chatId/messages`, async (req, reply) => {
    const metadata = buildMetadata(req);
    const body = (req.body ?? {}) as { body?: string; content?: string };
    const grpcReq: SendMessageRequest = {
      chatId: req.params.chatId,
      body: body.body ?? body.content ?? '',
    };

    try {
      const res = await client.sendMessage(grpcReq, metadata);
      return reply.code(201).send(ChatV1.SendMessageResponse.toJSON(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // ---- POST <prefix>/:chatId/read ----------------------------------
  app.post<{ Params: { chatId: string } }>(`${prefix}/:chatId/read`, async (req, reply) => {
    const metadata = buildMetadata(req);
    const body = (req.body ?? {}) as { upToMessageId?: string; up_to_message_id?: string };
    const grpcReq: MarkReadRequest = {
      chatId: req.params.chatId,
      upToMessageId: body.upToMessageId ?? body.up_to_message_id ?? '',
    };

    try {
      const res = await client.markRead(grpcReq, metadata);
      return reply.send(ChatV1.MarkReadResponse.toJSON(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });
};

// --- Helpers ---------------------------------------------------------
