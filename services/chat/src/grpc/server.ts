// gRPC server boot — binds ChatServiceService to the adapter-wrapped
// handlers and listens on GRPC_PORT.

import { promisify } from 'node:util';

import { Server, ServerCredentials } from '@grpc/grpc-js';

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import { ChatV1 } from '@adopt-dont-shop/proto';

import type { ChatConfig } from '../config.js';

import { adapt } from './adapter.js';
import {
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

export type RunningGrpcServer = {
  server: Server;
  port: number;
  shutdown: () => Promise<void>;
};

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

  const bindAsync = promisify<string, ServerCredentials, number>(server.bindAsync.bind(server));
  const port = await bindAsync(
    `${opts.config.host}:${config.grpcPort}`,
    ServerCredentials.createInsecure()
  );

  logger.info('gRPC server listening', { port, host: opts.config.host });

  return {
    server,
    port,
    shutdown: () =>
      new Promise<void>(resolve => {
        server.tryShutdown(err => {
          if (err) {
            logger.error('gRPC server shutdown error', { err });
          }
          resolve();
        });
      }),
  };
};
