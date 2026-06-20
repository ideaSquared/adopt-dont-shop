// gRPC server boot — registers MatchingServiceService on a grpc.Server
// and delegates bind/shutdown to @adopt-dont-shop/service-bootstrap.

import { Server } from '@grpc/grpc-js';

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import {
  startGrpcServer as startGrpcServerShared,
  type RunningGrpcServer,
} from '@adopt-dont-shop/service-bootstrap';

import { MatchingV1 } from '@adopt-dont-shop/proto';

import type { MatchingConfig } from '../config.js';

import { adapt } from './adapter.js';
import { endSession, listSwipeHistory, recordSwipe, startSession } from './handlers.js';
import { createPetsClient, type PetsClient } from './pets-client.js';
import {
  getMatchProfile,
  getSessionStats,
  getUserSwipeStats,
  upsertMatchProfile,
} from './profile-stats-handlers.js';
import { makeRecommend, makeSearchPets } from './recommend-handlers.js';
import { createRescueClient, type RescueNameClient } from './rescue-client.js';
import { makeGetTopPicks } from './top-picks-handlers.js';

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
  // Injected for GetTopPicks's rescue-name resolution. Same lifecycle as
  // petsClient: optional for direct/test construction, built + owned by
  // startGrpcServer from config.rescueGrpcUrl in production.
  rescueClient?: RescueNameClient;
};

export type { RunningGrpcServer };

export const createGrpcServer = (opts: CreateGrpcServerOptions): Server => {
  const { config, pool, nats, logger } = opts;
  const deps = { pool, nats };
  const petsClient = opts.petsClient ?? createPetsClient({ address: config.petsGrpcUrl });
  const rescueClient = opts.rescueClient ?? createRescueClient({ address: config.rescueGrpcUrl });
  const server = new Server();

  server.addService(MatchingV1.MatchingServiceService, {
    startSession: adapt(startSession, { deps, logger }),
    endSession: adapt(endSession, { deps, logger }),
    recordSwipe: adapt(recordSwipe, { deps, logger }),
    listSwipeHistory: adapt(listSwipeHistory, { deps, logger }),
    recommend: adapt(makeRecommend(petsClient), { deps, logger }),
    searchPets: adapt(makeSearchPets(petsClient), { deps, logger }),
    getMatchProfile: adapt(getMatchProfile, { deps, logger }),
    upsertMatchProfile: adapt(upsertMatchProfile, { deps, logger }),
    getUserSwipeStats: adapt(getUserSwipeStats, { deps, logger }),
    getSessionStats: adapt(getSessionStats, { deps, logger }),
    getTopPicks: adapt(makeGetTopPicks(petsClient, rescueClient), { deps, logger }),
  });

  logger.info('gRPC MatchingService registered', {
    methods: [
      'startSession',
      'endSession',
      'recordSwipe',
      'listSwipeHistory',
      'recommend',
      'searchPets',
      'getMatchProfile',
      'upsertMatchProfile',
      'getUserSwipeStats',
      'getSessionStats',
      'getTopPicks',
    ],
    grpcPort: config.grpcPort,
  });

  return server;
};

export const startGrpcServer = async (
  opts: CreateGrpcServerOptions
): Promise<RunningGrpcServer> => {
  const { config, logger } = opts;
  // Build + own the downstream clients here so they're closed on shutdown.
  const petsClient = opts.petsClient ?? createPetsClient({ address: config.petsGrpcUrl });
  const rescueClient = opts.rescueClient ?? createRescueClient({ address: config.rescueGrpcUrl });
  const server = createGrpcServer({ ...opts, petsClient, rescueClient });
  const running = await startGrpcServerShared(server, config, logger);

  return {
    ...running,
    shutdown: () =>
      new Promise<void>(resolve => {
        server.tryShutdown(err => {
          if (err) {
            logger.error('gRPC server shutdown error', { err });
          }
          for (const [name, client] of [
            ['pets', petsClient],
            ['rescue', rescueClient],
          ] as const) {
            try {
              client.close();
            } catch (closeErr) {
              logger.error(`${name} client close error`, { err: closeErr });
            }
          }
          resolve();
        });
      }),
  };
};
