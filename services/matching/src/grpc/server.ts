// gRPC server boot — binds MatchingServiceService to the
// adapter-wrapped handlers and starts listening on
// MATCHING_GRPC_PORT.
//
// Same shape as services/audit/src/grpc/server.ts /
// services/rescue/src/grpc/server.ts.
//
// Phase 9.3c — registers all six handlers: StartSession, EndSession,
// RecordSwipe, ListSwipeHistory (#920/#921) plus Recommend + SearchPets,
// which read candidate pets from service.pets via a gRPC client (both
// are stateless reads over the pets vertical). The pets client is
// injected so tests can stub it; real boot builds one from
// config.petsGrpcUrl and closes it on shutdown.

import { promisify } from 'node:util';

import { Server, ServerCredentials } from '@grpc/grpc-js';

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import { MatchingV1 } from '@adopt-dont-shop/proto';

import type { MatchingConfig } from '../config.js';

import { adapt } from './adapter.js';
import { endSession, listSwipeHistory, recordSwipe, startSession } from './handlers.js';
import { createPetsClient, type PetsClient } from './pets-client.js';
import { makeRecommend, makeSearchPets } from './recommend-handlers.js';

export type CreateGrpcServerOptions = {
  config: MatchingConfig;
  pool: Pool;
  nats: NatsConnection;
  logger: Logger;
  // Injected for Recommend + SearchPets's candidate-pet reads. Optional:
  // when omitted (createGrpcServer called directly, e.g. in tests) a
  // client is built from config.petsGrpcUrl. startGrpcServer always
  // builds + owns one so it can close it on shutdown.
  petsClient?: PetsClient;
};

export type RunningGrpcServer = {
  server: Server;
  port: number;
  shutdown: () => Promise<void>;
};

export const createGrpcServer = (opts: CreateGrpcServerOptions): Server => {
  const { config, pool, nats, logger } = opts;
  const deps = { pool, nats };
  const petsClient = opts.petsClient ?? createPetsClient({ address: config.petsGrpcUrl });
  const server = new Server();

  server.addService(MatchingV1.MatchingServiceService, {
    startSession: adapt(startSession, { deps, logger }),
    endSession: adapt(endSession, { deps, logger }),
    recordSwipe: adapt(recordSwipe, { deps, logger }),
    listSwipeHistory: adapt(listSwipeHistory, { deps, logger }),
    recommend: adapt(makeRecommend(petsClient), { deps, logger }),
    searchPets: adapt(makeSearchPets(petsClient), { deps, logger }),
  });

  logger.info('gRPC MatchingService registered', {
    methods: [
      'startSession',
      'endSession',
      'recordSwipe',
      'listSwipeHistory',
      'recommend',
      'searchPets',
    ],
    grpcPort: config.grpcPort,
  });

  return server;
};

export const startGrpcServer = async (
  opts: CreateGrpcServerOptions
): Promise<RunningGrpcServer> => {
  const { config, logger } = opts;
  // Build + own the pets client here so it's closed on shutdown.
  const petsClient = opts.petsClient ?? createPetsClient({ address: config.petsGrpcUrl });
  const server = createGrpcServer({ ...opts, petsClient });

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
          try {
            petsClient.close();
          } catch (closeErr) {
            logger.error('pets client close error', { err: closeErr });
          }
          resolve();
        });
      }),
  };
};
