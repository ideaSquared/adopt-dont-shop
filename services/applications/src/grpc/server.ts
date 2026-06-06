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
// StartDraft is now live: it resolves pet → rescue via a service.pets
// gRPC client (the pure domain requires the rescueId, which
// StartDraftRequest doesn't carry) before commanding the domain. The
// client is injected so tests can stub it; real boot builds one from
// config.petsGrpcUrl.
//
// Dev uses insecure credentials (TLS terminates at nginx in front);
// production keeps gRPC HTTP/2 cleartext on the cluster network until a
// future deploy wants mTLS.

import { promisify } from 'node:util';

import { Server, ServerCredentials } from '@grpc/grpc-js';

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import { ApplicationsV1 } from '@adopt-dont-shop/proto';

import type { ApplicationsConfig } from '../config.js';

import { adapt } from './adapter.js';
import { makeStartDraft, saveDraftAnswers, submitDraft } from './handlers.js';
import { createPetsClient, type PetsClient } from './pets-client.js';
import { addDocument, listDocuments, removeDocument } from './document-handlers.js';
import { getApplication, listApplications } from './read-handlers.js';
import { getStats } from './stats-handlers.js';
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
  // Injected for StartDraft's pet → rescue lookup. Optional: when
  // omitted (createGrpcServer called directly, e.g. in tests) a lazy
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

  server.addService(ApplicationsV1.ApplicationServiceService, {
    // Draft lifecycle (handlers.ts).
    startDraft: adapt(makeStartDraft(petsClient), { deps, logger }),
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
    // Stats (stats-handlers.ts)
    getStats: adapt(getStats, { deps, logger }),
    // Document metadata (document-handlers.ts)
    addDocument: adapt(addDocument, { deps, logger }),
    listDocuments: adapt(listDocuments, { deps, logger }),
    removeDocument: adapt(removeDocument, { deps, logger }),
  });

  logger.info('gRPC ApplicationService registered', {
    methods: [
      'startDraft',
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
      'getStats',
      'addDocument',
      'listDocuments',
      'removeDocument',
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
