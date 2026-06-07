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

import { Metadata, status } from '@grpc/grpc-js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  ChatV1,
  type ListChatsRequest,
  type ListMessagesRequest,
  type MarkReadRequest,
  type OpenChatRequest,
  type ReactRequest,
  type SendMessageRequest,
} from '@adopt-dont-shop/proto';

import type { ChatClient } from '../grpc-clients/chat-client.js';

export type ChatRoutesOptions = {
  client: ChatClient;
};

const GRPC_TO_HTTP: Record<number, number> = {
  [status.OK]: 200,
  [status.INVALID_ARGUMENT]: 400,
  [status.UNAUTHENTICATED]: 401,
  [status.PERMISSION_DENIED]: 403,
  [status.NOT_FOUND]: 404,
  [status.ALREADY_EXISTS]: 409,
  [status.FAILED_PRECONDITION]: 409,
  [status.INTERNAL]: 500,
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
    const grpcReq: ListChatsRequest = {
      cursor: query.cursor,
      limit: query.limit ? Number.parseInt(query.limit, 10) : 0,
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

  // ---- GET <prefix>/:chatId/messages -------------------------------
  app.get<{ Params: { chatId: string } }>(`${prefix}/:chatId/messages`, async (req, reply) => {
    const metadata = buildMetadata(req);
    const query = req.query as Record<string, string | undefined>;
    const grpcReq: ListMessagesRequest = {
      chatId: req.params.chatId,
      cursor: query.cursor,
      limit: query.limit ? Number.parseInt(query.limit, 10) : 0,
    };

    try {
      const res = await client.listMessages(grpcReq, metadata);
      return reply.send(ChatV1.ListMessagesResponse.toJSON(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

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

function buildMetadata(req: FastifyRequest): Metadata {
  const m = new Metadata();
  const headers = req.headers as Record<string, string | string[] | undefined>;
  for (const key of ['x-user-id', 'x-user-roles', 'x-user-permissions', 'x-rescue-id']) {
    const raw = headers[key];
    if (typeof raw === 'string' && raw.length > 0) {
      m.set(key, raw);
    }
  }
  return m;
}

type GrpcError = { code?: number; details?: string; message?: string };

function handleGrpcError(err: unknown, reply: FastifyReply): FastifyReply {
  const grpcErr = err as GrpcError;
  const httpStatus = (grpcErr?.code !== undefined && GRPC_TO_HTTP[grpcErr.code]) || 500;
  return reply.code(httpStatus).send({
    error: grpcErr?.details ?? grpcErr?.message ?? 'internal_error',
  });
}
