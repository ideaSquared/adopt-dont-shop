// Promise-wrapped client for service.chat.
//
// Mirrors notifications-client / pets-client: the gRPC stub's
// callback-shaped methods get wrapped in Promises, and the interface
// is exported so route tests can substitute a mock.

import { credentials, Metadata, type CallOptions } from '@grpc/grpc-js';

import {
  ChatV1,
  type ListChatsRequest,
  type ListChatsResponse,
  type ListMessagesRequest,
  type ListMessagesResponse,
  type MarkReadRequest,
  type MarkReadResponse,
  type OpenChatRequest,
  type OpenChatResponse,
  type ReactRequest,
  type ReactResponse,
  type SearchChatsRequest,
  type SearchChatsResponse,
  type SendMessageRequest,
  type SendMessageResponse,
  type GetChatUnreadCountRequest,
  type GetChatUnreadCountResponse,
  type DeleteMessageRequest,
  type DeleteMessageResponse,
  type GetChatRequest,
  type GetChatResponse,
  type DeleteChatRequest,
  type DeleteChatResponse,
} from '@adopt-dont-shop/proto';

import { startGrpcTimer } from '@adopt-dont-shop/observability';

import { callWithResilience, getOrCreateCircuitBreaker } from './resilience.js';

export type ChatClient = {
  openChat(req: OpenChatRequest, metadata: Metadata): Promise<OpenChatResponse>;
  sendMessage(req: SendMessageRequest, metadata: Metadata): Promise<SendMessageResponse>;
  listMessages(req: ListMessagesRequest, metadata: Metadata): Promise<ListMessagesResponse>;
  listChats(req: ListChatsRequest, metadata: Metadata): Promise<ListChatsResponse>;
  markRead(req: MarkReadRequest, metadata: Metadata): Promise<MarkReadResponse>;
  react(req: ReactRequest, metadata: Metadata): Promise<ReactResponse>;
  searchChats(req: SearchChatsRequest, metadata: Metadata): Promise<SearchChatsResponse>;
  getChatUnreadCount(
    req: GetChatUnreadCountRequest,
    metadata: Metadata
  ): Promise<GetChatUnreadCountResponse>;
  deleteMessage(req: DeleteMessageRequest, metadata: Metadata): Promise<DeleteMessageResponse>;
  getChat(req: GetChatRequest, metadata: Metadata): Promise<GetChatResponse>;
  deleteChat(req: DeleteChatRequest, metadata: Metadata): Promise<DeleteChatResponse>;
  close(): void;
};

export type CreateChatClientOptions = {
  address: string;
};

// Default per-call deadline. Without one, a hung downstream service
// would hang the gateway request forever; 5s caps the blast radius
// and lets the caller fail fast with DEADLINE_EXCEEDED.
const DEFAULT_DEADLINE_MS = 5_000;

const SERVICE_NAME = 'service.chat';

export const createChatClient = (opts: CreateChatClientOptions): ChatClient => {
  const stub = new ChatV1.ChatServiceClient(opts.address, credentials.createInsecure());
  const breaker = getOrCreateCircuitBreaker(SERVICE_NAME);

  const callUnary = <Req, Res>(
    fn: (
      req: Req,
      metadata: Metadata,
      options: Partial<CallOptions>,
      cb: (err: unknown, res: Res) => void
    ) => unknown,
    req: Req,
    metadata: Metadata,
    idempotent: boolean
  ): Promise<Res> =>
    callWithResilience<Res>(
      deadline =>
        new Promise<Res>((resolve, reject) => {
          const options: Partial<CallOptions> = { deadline };
          const method = fn.name || 'unknown';
          const stop = startGrpcTimer(SERVICE_NAME, method, 'out');
          fn.call(stub, req, metadata, options, (err: unknown, res: Res) => {
            const code =
              err &&
              typeof err === 'object' &&
              'code' in err &&
              typeof (err as { code?: unknown }).code === 'number'
                ? (err as { code: number }).code
                : err
                  ? 2 // UNKNOWN
                  : 0;
            stop(code);
            if (err) {
              reject(err);
              return;
            }
            resolve(res);
          });
        }),
      {
        service: SERVICE_NAME,
        deadlineMs: DEFAULT_DEADLINE_MS,
        idempotent,
        circuitBreaker: breaker,
      }
    );

  return {
    // ── Non-idempotent (writes / mutations) ──────────────────────────
    openChat: (req, metadata) => callUnary(stub.openChat, req, metadata, false),
    sendMessage: (req, metadata) => callUnary(stub.sendMessage, req, metadata, false),
    markRead: (req, metadata) => callUnary(stub.markRead, req, metadata, false),
    react: (req, metadata) => callUnary(stub.react, req, metadata, false),
    deleteMessage: (req, metadata) => callUnary(stub.deleteMessage, req, metadata, false),
    deleteChat: (req, metadata) => callUnary(stub.deleteChat, req, metadata, false),
    // ── Idempotent (reads) ───────────────────────────────────────────
    listMessages: (req, metadata) => callUnary(stub.listMessages, req, metadata, true),
    listChats: (req, metadata) => callUnary(stub.listChats, req, metadata, true),
    searchChats: (req, metadata) => callUnary(stub.searchChats, req, metadata, true),
    getChatUnreadCount: (req, metadata) => callUnary(stub.getChatUnreadCount, req, metadata, true),
    getChat: (req, metadata) => callUnary(stub.getChat, req, metadata, true),
    close: () => stub.close(),
  };
};
