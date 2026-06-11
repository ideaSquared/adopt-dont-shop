// gRPC server boot — binds ChatServiceService to the adapter-wrapped
// handlers and listens on GRPC_PORT. Delegates bind/shutdown to
// @adopt-dont-shop/service-bootstrap.

import { Server } from '@grpc/grpc-js';

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import {
  startGrpcServer as startGrpcServerShared,
  type RunningGrpcServer,
} from '@adopt-dont-shop/service-bootstrap';

import { ChatV1 } from '@adopt-dont-shop/proto';

import type { ChatConfig } from '../config.js';

import { adapt } from './adapter.js';
import {
  deleteChat,
  deleteMessage,
  getChat,
  getChatUnreadCount,
  listChats,
  listMessages,
  markRead,
  openChat,
  react,
  searchChats,
  sendMessage,
} from './handlers.js';

export type CreateGrpcServerOptions = {
  config: ChatConfig;
  pool: Pool;
  nats: NatsConnection;
  logger: Logger;
};

export type { RunningGrpcServer };

export const createGrpcServer = (opts: CreateGrpcServerOptions): Server => {
  const { config, pool, nats, logger } = opts;
  const server = new Server();
  const deps = { pool, nats };

  server.addService(ChatV1.ChatServiceService, {
    openChat: adapt(openChat, { deps, logger }),
    sendMessage: adapt(sendMessage, { deps, logger }),
    listMessages: adapt(listMessages, { deps, logger }),
    listChats: adapt(listChats, { deps, logger }),
    markRead: adapt(markRead, { deps, logger }),
    react: adapt(react, { deps, logger }),
    searchChats: adapt(searchChats, { deps, logger }),
    getChatUnreadCount: adapt(getChatUnreadCount, { deps, logger }),
    deleteMessage: adapt(deleteMessage, { deps, logger }),
    getChat: adapt(getChat, { deps, logger }),
    deleteChat: adapt(deleteChat, { deps, logger }),
  });

  logger.info('gRPC ChatService registered', {
    methods: [
      'openChat',
      'sendMessage',
      'listMessages',
      'listChats',
      'markRead',
      'react',
      'searchChats',
      'getChatUnreadCount',
      'deleteMessage',
      'getChat',
      'deleteChat',
    ],
    grpcPort: config.grpcPort,
  });

  return server;
};

export const startGrpcServer = async (
  opts: CreateGrpcServerOptions
): Promise<RunningGrpcServer> => {
  const { config, logger } = opts;
  const server = createGrpcServer(opts);
  return startGrpcServerShared(server, config, logger);
};
