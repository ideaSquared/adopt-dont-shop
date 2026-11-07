// gRPC server boot — registers ModerationServiceService on a grpc.Server
// and delegates bind/shutdown to @adopt-dont-shop/service-bootstrap.

import { Server } from '@grpc/grpc-js';

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import {
  startGrpcServer as startGrpcServerShared,
  type RunningGrpcServer,
} from '@adopt-dont-shop/service-bootstrap';

import { ModerationV1 } from '@adopt-dont-shop/proto';

import type { ModerationConfig } from '../config.js';

import { addEvidence, listModeratorActions, makeLogModeratorAction } from './action-handlers.js';
import { adapt } from './adapter.js';
import { createAuthClient, type AuthClient } from './auth-client.js';
import {
  assignReport,
  escalateReport,
  fileReport,
  getReport,
  listReports,
  resolveReport,
} from './handlers.js';
import { getModerationMetrics } from './metrics-handlers.js';
import {
  acknowledgeSanction,
  appealSanction,
  issueSanction,
  listUserSanctions,
} from './sanction-handlers.js';
import {
  assignSupportTicket,
  escalateSupportTicket,
  getSupportTicket,
  listSupportTickets,
  openSupportTicket,
  respondToTicket,
  updateSupportTicket,
} from './ticket-handlers.js';
import { getSupportTicketStats } from './ticket-stats-handlers.js';

export type CreateGrpcServerOptions = {
  config: ModerationConfig;
  pool: Pool;
  nats: NatsConnection;
  logger: Logger;
  authClient?: AuthClient;
};

export type { RunningGrpcServer };

export const createGrpcServer = (opts: CreateGrpcServerOptions): Server => {
  const { config, pool, nats, logger } = opts;
  const deps = { pool, nats };
  const authClient = opts.authClient ?? createAuthClient({ address: config.authGrpcUrl });
  const server = new Server();

  server.addService(ModerationV1.ModerationServiceService, {
    // Report lifecycle (handlers.ts)
    fileReport: adapt(fileReport, { deps, logger }),
    getReport: adapt(getReport, { deps, logger }),
    listReports: adapt(listReports, { deps, logger }),
    assignReport: adapt(assignReport, { deps, logger }),
    resolveReport: adapt(resolveReport, { deps, logger }),
    escalateReport: adapt(escalateReport, { deps, logger }),
    // Moderator actions + evidence (action-handlers.ts)
    logModeratorAction: adapt(makeLogModeratorAction(authClient), { deps, logger }),
    listModeratorActions: adapt(listModeratorActions, { deps, logger }),
    getModerationMetrics: adapt(getModerationMetrics, { deps, logger }),
    addEvidence: adapt(addEvidence, { deps, logger }),
    // Sanctions (sanction-handlers.ts)
    issueSanction: adapt(issueSanction, { deps, logger }),
    listUserSanctions: adapt(listUserSanctions, { deps, logger }),
    appealSanction: adapt(appealSanction, { deps, logger }),
    acknowledgeSanction: adapt(acknowledgeSanction, { deps, logger }),
    // Support tickets (ticket-handlers.ts)
    openSupportTicket: adapt(openSupportTicket, { deps, logger }),
    getSupportTicket: adapt(getSupportTicket, { deps, logger }),
    listSupportTickets: adapt(listSupportTickets, { deps, logger }),
    respondToTicket: adapt(respondToTicket, { deps, logger }),
    assignSupportTicket: adapt(assignSupportTicket, { deps, logger }),
    updateSupportTicket: adapt(updateSupportTicket, { deps, logger }),
    escalateSupportTicket: adapt(escalateSupportTicket, { deps, logger }),
    getSupportTicketStats: adapt(getSupportTicketStats, { deps, logger }),
  });

  logger.info('gRPC ModerationService registered', {
    methodCount: 22,
    grpcPort: config.grpcPort,
  });

  return server;
};

export const startGrpcServer = async (
  opts: CreateGrpcServerOptions
): Promise<RunningGrpcServer> => {
  const { config, logger } = opts;
  // Own the auth client here so it is closed on shutdown.
  const authClient = opts.authClient ?? createAuthClient({ address: config.authGrpcUrl });
  const server = createGrpcServer({ ...opts, authClient });
  const running = await startGrpcServerShared(server, config, logger);
  return {
    ...running,
    shutdown: async () => {
      await running.shutdown();
      try {
        authClient.close();
      } catch (closeErr) {
        logger.error('auth client close error', { err: closeErr });
      }
    },
  };
};
