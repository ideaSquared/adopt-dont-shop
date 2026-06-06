// gRPC server boot — binds ApplicationServiceService to the
// adapter-wrapped handlers and starts listening on
// APPLICATIONS_GRPC_PORT.
//
// Same shape as services/moderation, services/matching,
// services/audit. The handlers live across three files by concern:
//   - handlers.ts        — draft lifecycle (SaveDraftAnswers, SubmitDraft)
//   - review-handlers.ts — review/visit/decision (StartReview …
//                          MarkAdopted)
//   - read-handlers.ts   — query side (Get, List)
// all sharing the (deps, principal, request) → Promise<response> shape
// so the adapter wraps them uniformly.
//
// StartDraft is a deliberate UNIMPLEMENTED stub (same approach as
// matching's Recommend/SearchPets). The pure domain requires a
// non-empty rescueId at draft creation — a cross-schema pets lookup —
// and StartDraftRequest doesn't carry one. It waits on the service.pets
// gRPC client; the gateway maps UNIMPLEMENTED → 501 so callers degrade
// gracefully rather than getting a silent failure.
//
// Dev uses insecure credentials (TLS terminates at nginx in front);
// production keeps gRPC HTTP/2 cleartext on the cluster network until a
// future deploy wants mTLS.

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

import { ApplicationsV1 } from '@adopt-dont-shop/proto';

import type { ApplicationsConfig } from '../config.js';

import { adapt } from './adapter.js';
import { saveDraftAnswers, submitDraft } from './handlers.js';
import { getApplication, listApplications } from './read-handlers.js';
import {
  approve,
  completeHomeVisit,
  markAdopted,
  reject,
  scheduleHomeVisit,
  startReview,
  withdraw,
} from './review-handlers.js';

export type CreateGrpcServerOptions = {
  config: ApplicationsConfig;
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

  server.addService(ApplicationsV1.ApplicationServiceService, {
    // Draft lifecycle (handlers.ts). StartDraft deferred — see header.
    startDraft: notImplemented('StartDraft'),
    saveDraftAnswers: adapt(saveDraftAnswers, { deps, logger }),
    submitDraft: adapt(submitDraft, { deps, logger }),
    // Review / visit / decision (review-handlers.ts)
    startReview: adapt(startReview, { deps, logger }),
    scheduleHomeVisit: adapt(scheduleHomeVisit, { deps, logger }),
    completeHomeVisit: adapt(completeHomeVisit, { deps, logger }),
    approve: adapt(approve, { deps, logger }),
    reject: adapt(reject, { deps, logger }),
    withdraw: adapt(withdraw, { deps, logger }),
    markAdopted: adapt(markAdopted, { deps, logger }),
    // Query side (read-handlers.ts)
    get: adapt(getApplication, { deps, logger }),
    list: adapt(listApplications, { deps, logger }),
  });

  logger.info('gRPC ApplicationService registered', {
    methods: [
      'startDraft (stub)',
      'saveDraftAnswers',
      'submitDraft',
      'startReview',
      'scheduleHomeVisit',
      'completeHomeVisit',
      'approve',
      'reject',
      'withdraw',
      'markAdopted',
      'get',
      'list',
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
