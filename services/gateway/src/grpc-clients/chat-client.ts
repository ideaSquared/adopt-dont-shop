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

export const createChatClient = (opts: CreateChatClientOptions): ChatClient => {
  const stub = new ChatV1.ChatServiceClient(opts.address, credentials.createInsecure());

  const callUnary = <Req, Res>(
    fn: (
      req: Req,
      metadata: Metadata,
      options: Partial<CallOptions>,
      cb: (err: unknown, res: Res) => void
    ) => unknown,
    req: Req,
    metadata: Metadata
  ): Promise<Res> =>
    new Promise<Res>((resolve, reject) => {
      const options: Partial<CallOptions> = {
        deadline: new Date(Date.now() + DEFAULT_DEADLINE_MS),
      };
      fn.call(stub, req, metadata, options, (err: unknown, res: Res) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });

  return {
    openChat: (req, metadata) => callUnary(stub.openChat, req, metadata),
    sendMessage: (req, metadata) => callUnary(stub.sendMessage, req, metadata),
    listMessages: (req, metadata) => callUnary(stub.listMessages, req, metadata),
    listChats: (req, metadata) => callUnary(stub.listChats, req, metadata),
    markRead: (req, metadata) => callUnary(stub.markRead, req, metadata),
    react: (req, metadata) => callUnary(stub.react, req, metadata),
    searchChats: (req, metadata) => callUnary(stub.searchChats, req, metadata),
    getChatUnreadCount: (req, metadata) => callUnary(stub.getChatUnreadCount, req, metadata),
    deleteMessage: (req, metadata) => callUnary(stub.deleteMessage, req, metadata),
    getChat: (req, metadata) => callUnary(stub.getChat, req, metadata),
    deleteChat: (req, metadata) => callUnary(stub.deleteChat, req, metadata),
    close: () => stub.close(),
  };
};
