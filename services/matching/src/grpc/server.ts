// gRPC server boot — binds MatchingServiceService to the
// adapter-wrapped handlers and starts listening on
// MATCHING_GRPC_PORT.
//
// Same shape as services/audit/src/grpc/server.ts /
// services/rescue/src/grpc/server.ts.
//
// Phase 9.3c — registers the four handlers shipped in #920/#921
// (StartSession, EndSession, RecordSwipe, ListSwipeHistory) plus
// NOT_IMPLEMENTED stubs for Recommend + SearchPets. Those two will
// gain real implementations once the service gains a service.pets
// gRPC client (both need to read pet candidates from the pets
// vertical). The stubs return grpc.status.UNIMPLEMENTED so callers
// get an informative error and can degrade gracefully.

import { promisify } from 'node:util';

import {
  Server,
  ServerCredentials,
  status,
  type ServerUnaryCall,
  type ServiceError,
  type sendUnaryData,
} from '@grpc/grpc-js';

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import { MatchingV1 } from '@adopt-dont-shop/proto';

import type { MatchingConfig } from '../config.js';

import { adapt } from './adapter.js';
import { endSession, listSwipeHistory, recordSwipe, startSession } from './handlers.js';

export type CreateGrpcServerOptions = {
  config: MatchingConfig;
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
  const deps = { pool, nats };
  const server = new Server();

  const notImplemented =
    (rpc: string) =>
    (_call: ServerUnaryCall<unknown, unknown>, callback: sendUnaryData<unknown>): void => {
      const err = new Error(`${rpc} not yet implemented`) as ServiceError;
      err.code = status.UNIMPLEMENTED;
      err.details = err.message;
      callback(err, null);
    };

  server.addService(MatchingV1.MatchingServiceService, {
    startSession: adapt(startSession, { deps, logger }),
    endSession: adapt(endSession, { deps, logger }),
    recordSwipe: adapt(recordSwipe, { deps, logger }),
    listSwipeHistory: adapt(listSwipeHistory, { deps, logger }),
    recommend: notImplemented('Recommend'),
    searchPets: notImplemented('SearchPets'),
  });

  logger.info('gRPC MatchingService registered', {
    methods: [
      'startSession',
      'endSession',
      'recordSwipe',
      'listSwipeHistory',
      'recommend (stub)',
      'searchPets (stub)',
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
