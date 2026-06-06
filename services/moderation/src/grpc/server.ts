// gRPC server boot — binds ModerationServiceService to all 15
// adapter-wrapped handlers and starts listening on
// MODERATION_GRPC_PORT.
//
// Same shape as services/audit/src/grpc/server.ts /
// services/matching/src/grpc/server.ts. Handlers live across 4 files
// (report lifecycle in handlers.ts, moderator actions + evidence in
// action-handlers.ts, sanctions in sanction-handlers.ts, support
// tickets in ticket-handlers.ts); they all share the
// (deps, principal, request) → Promise<response> shape so the adapter
// wraps them uniformly.
//
// Dev uses insecure credentials (TLS terminates at nginx in front);
// production keeps gRPC HTTP/2 cleartext on the cluster network until
// a future deploy wants mTLS.

import { promisify } from 'node:util';

import { Server, ServerCredentials } from '@grpc/grpc-js';

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import { ModerationV1 } from '@adopt-dont-shop/proto';

import type { ModerationConfig } from '../config.js';

import { addEvidence, listModeratorActions, logModeratorAction } from './action-handlers.js';
import { adapt } from './adapter.js';
import { assignReport, fileReport, getReport, listReports, resolveReport } from './handlers.js';
import { appealSanction, issueSanction, listUserSanctions } from './sanction-handlers.js';
import {
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

export type RunningGrpcServer = {
  server: Server;
  port: number;
  shutdown: () => Promise<void>;
};

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
  });

  logger.info('gRPC ModerationService registered', {
    methodCount: 15,
    grpcPort: config.grpcPort,
  });
  // Note: 15 methods registered above — FileReport, GetReport,
  // ListReports, AssignReport, ResolveReport, LogModeratorAction,
  // ListModeratorActions, AddEvidence, IssueSanction,
  // ListUserSanctions, AppealSanction, OpenSupportTicket,
  // GetSupportTicket, ListSupportTickets, RespondToTicket.

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
