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

import { addEvidence, listModeratorActions, logModeratorAction } from './action-handlers.js';
import { adapt } from './adapter.js';
import { assignReport, fileReport, getReport, listReports, resolveReport } from './handlers.js';
import { appealSanction, issueSanction, listUserSanctions } from './sanction-handlers.js';
import {
  assignSupportTicket,
  getSupportTicket,
  listSupportTickets,
  openSupportTicket,
  respondToTicket,
} from './ticket-handlers.js';

export type CreateGrpcServerOptions = {
  config: ModerationConfig;
  pool: Pool;
  nats: NatsConnection;
  logger: Logger;
};

export type { RunningGrpcServer };

export const createGrpcServer = (opts: CreateGrpcServerOptions): Server => {
  const { config, pool, nats, logger } = opts;
  const deps = { pool, nats };
  const server = new Server();

  server.addService(ModerationV1.ModerationServiceService, {
    // Report lifecycle (handlers.ts)
    fileReport: adapt(fileReport, { deps, logger }),
    getReport: adapt(getReport, { deps, logger }),
    listReports: adapt(listReports, { deps, logger }),
    assignReport: adapt(assignReport, { deps, logger }),
    resolveReport: adapt(resolveReport, { deps, logger }),
    // Moderator actions + evidence (action-handlers.ts)
    logModeratorAction: adapt(logModeratorAction, { deps, logger }),
    listModeratorActions: adapt(listModeratorActions, { deps, logger }),
    addEvidence: adapt(addEvidence, { deps, logger }),
    // Sanctions (sanction-handlers.ts)
    issueSanction: adapt(issueSanction, { deps, logger }),
    listUserSanctions: adapt(listUserSanctions, { deps, logger }),
    appealSanction: adapt(appealSanction, { deps, logger }),
    // Support tickets (ticket-handlers.ts)
    openSupportTicket: adapt(openSupportTicket, { deps, logger }),
    getSupportTicket: adapt(getSupportTicket, { deps, logger }),
    listSupportTickets: adapt(listSupportTickets, { deps, logger }),
    respondToTicket: adapt(respondToTicket, { deps, logger }),
    assignSupportTicket: adapt(assignSupportTicket, { deps, logger }),
  });

  logger.info('gRPC ModerationService registered', {
    methodCount: 16,
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
