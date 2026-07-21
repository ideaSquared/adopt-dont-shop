// gRPC server boot — registers ApplicationServiceService on a grpc.Server
// and delegates bind/shutdown to @adopt-dont-shop/service-bootstrap.

import { Server } from '@grpc/grpc-js';

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import {
  startGrpcServer as startGrpcServerShared,
  type RunningGrpcServer,
} from '@adopt-dont-shop/service-bootstrap';

import { ApplicationsV1 } from '@adopt-dont-shop/proto';

import type { ApplicationsConfig } from '../config.js';

import { adapt } from './adapter.js';
import {
  getApplicationDefaults,
  updateApplicationDefaults,
} from './application-defaults-handlers.js';
import {
  deleteApplicationDraft,
  getApplicationDraft,
  saveApplicationDraft,
} from './application-draft-handlers.js';
import { countAdoptedAdopters } from './attribution-handlers.js';
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

export type { RunningGrpcServer };

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
    // Cross-service attribution (attribution-handlers.ts)
    countAdoptedAdopters: adapt(countAdoptedAdopters, { deps, logger }),
    // Document metadata (document-handlers.ts)
    addDocument: adapt(addDocument, { deps, logger }),
    listDocuments: adapt(listDocuments, { deps, logger }),
    removeDocument: adapt(removeDocument, { deps, logger }),
    // Application defaults (application-defaults-handlers.ts)
    getApplicationDefaults: adapt(getApplicationDefaults, { deps, logger }),
    updateApplicationDefaults: adapt(updateApplicationDefaults, { deps, logger }),
    // Application drafts — autosave scratchpad (application-draft-handlers.ts)
    getApplicationDraft: adapt(getApplicationDraft, { deps, logger }),
    saveApplicationDraft: adapt(saveApplicationDraft, { deps, logger }),
    deleteApplicationDraft: adapt(deleteApplicationDraft, { deps, logger }),
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
      'countAdoptedAdopters',
      'addDocument',
      'listDocuments',
      'removeDocument',
      'getApplicationDefaults',
      'updateApplicationDefaults',
      'getApplicationDraft',
      'saveApplicationDraft',
      'deleteApplicationDraft',
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
            petsClient.close();
          } catch (closeErr) {
            logger.error('pets client close error', { err: closeErr });
          }
          resolve();
        });
      }),
  };
};
