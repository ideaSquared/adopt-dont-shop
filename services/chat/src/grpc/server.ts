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
import { createApplicationsClient, type ApplicationsClient } from './applications-client.js';
import { createRescueClient, type RescueClient } from './rescue-client.js';
import { createPetsClient, type PetsClient } from './pets-client.js';
import { makeOpenPetEnquiry } from './pet-enquiry-handlers.js';
import {
  deleteChat,
  deleteMessage,
  getChat,
  getChatUnreadCount,
  listChats,
  listMessages,
  getChatStats,
  makeOpenChat,
  markRead,
  react,
  searchChats,
  searchMessages,
  sendMessage,
  updateChatStatus,
} from './handlers.js';

export type CreateGrpcServerOptions = {
  config: ChatConfig;
  pool: Pool;
  nats: NatsConnection;
  logger: Logger;
  // Injected for OpenChat's application/staff relationship checks
  // (ADS-918). Optional: when omitted (createGrpcServer called directly,
  // e.g. in tests) lazy clients are built from config. startGrpcServer
  // always builds + owns them so it can close them on shutdown.
  applicationsClient?: ApplicationsClient;
  rescueClient?: RescueClient;
  // OpenPetEnquiry resolves pet → rescue through service.pets.
  petsClient?: PetsClient;
};

export type { RunningGrpcServer };

export const createGrpcServer = (opts: CreateGrpcServerOptions): Server => {
  const { config, pool, nats, logger } = opts;
  const server = new Server();
  const applicationsClient =
    opts.applicationsClient ?? createApplicationsClient({ address: config.applicationsGrpcUrl });
  const rescueClient = opts.rescueClient ?? createRescueClient({ address: config.rescueGrpcUrl });
  const petsClient = opts.petsClient ?? createPetsClient({ address: config.petsGrpcUrl });
  const deps = {
    pool,
    nats,
    // Pet enquiries are a shared rescue inbox: their message events reach
    // every staff member of the rescue.
    rescueStaffIds: async (rescueId: string): Promise<string[]> => {
      const res = await rescueClient.listStaffMembers({ rescueId });
      return res.staffMembers.map(member => member.userId);
    },
  };

  server.addService(ChatV1.ChatServiceService, {
    openChat: adapt(makeOpenChat(applicationsClient, rescueClient), { deps, logger }),
    openPetEnquiry: adapt(makeOpenPetEnquiry(petsClient), { deps, logger }),
    sendMessage: adapt(sendMessage, { deps, logger }),
    listMessages: adapt(listMessages, { deps, logger }),
    listChats: adapt(listChats, { deps, logger }),
    markRead: adapt(markRead, { deps, logger }),
    react: adapt(react, { deps, logger }),
    searchChats: adapt(searchChats, { deps, logger }),
    searchMessages: adapt(searchMessages, { deps, logger }),
    getChatUnreadCount: adapt(getChatUnreadCount, { deps, logger }),
    deleteMessage: adapt(deleteMessage, { deps, logger }),
    getChat: adapt(getChat, { deps, logger }),
    deleteChat: adapt(deleteChat, { deps, logger }),
    updateChatStatus: adapt(updateChatStatus, { deps, logger }),
    getChatStats: adapt(getChatStats, { deps, logger }),
  });

  logger.info('gRPC ChatService registered', {
    methods: [
      'openChat',
      'openPetEnquiry',
      'sendMessage',
      'listMessages',
      'listChats',
      'markRead',
      'react',
      'searchChats',
      'searchMessages',
      'getChatUnreadCount',
      'deleteMessage',
      'getChat',
      'deleteChat',
      'updateChatStatus',
      'getChatStats',
    ],
    grpcPort: config.grpcPort,
  });

  return server;
};

export const startGrpcServer = async (
  opts: CreateGrpcServerOptions
): Promise<RunningGrpcServer> => {
  const { config, logger } = opts;
  // Build + own the cross-service clients here so they're closed on
  // shutdown (mirrors services/applications/src/grpc/server.ts).
  const applicationsClient =
    opts.applicationsClient ?? createApplicationsClient({ address: config.applicationsGrpcUrl });
  const rescueClient = opts.rescueClient ?? createRescueClient({ address: config.rescueGrpcUrl });
  const petsClient = opts.petsClient ?? createPetsClient({ address: config.petsGrpcUrl });
  const server = createGrpcServer({ ...opts, applicationsClient, rescueClient, petsClient });
  const running = await startGrpcServerShared(server, config, logger);

  return {
    ...running,
    shutdown: () =>
      new Promise<void>(resolve => {
        server.tryShutdown(err => {
          if (err) {
            logger.error('gRPC server shutdown error', { err });
          }
          try {
            applicationsClient.close();
            rescueClient.close();
            petsClient.close();
          } catch (closeErr) {
            logger.error('cross-service client close error', { err: closeErr });
          }
          resolve();
        });
      }),
  };
};
