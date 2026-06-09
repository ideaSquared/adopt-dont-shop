// gRPC server boot — binds AuditQueryServiceService to the two
// adapter-wrapped handlers and starts listening on AUDIT_GRPC_PORT.
//
// Same shape as services/rescue/src/grpc/server.ts. Dev uses
// insecure credentials (TLS terminates at nginx in front);
// production keeps gRPC HTTP/2 cleartext on the cluster network
// until a future deploy wants mTLS.

import { promisify } from 'node:util';

import { Server, ServerCredentials } from '@grpc/grpc-js';

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import { AuditV1 } from '@adopt-dont-shop/proto';

import type { AuditConfig } from '../config.js';

import { adapt } from './adapter.js';
import { getByTarget, query } from './handlers.js';
import {
  createSavedReport,
  deleteSavedReport,
  getSavedReport,
  listReportTemplates,
  listSavedReports,
  updateSavedReport,
} from './reports-handlers.js';

export type CreateGrpcServerOptions = {
  config: AuditConfig;
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

  server.addService(AuditV1.AuditQueryServiceService, {
    query: adapt(query, { deps, logger }),
    getByTarget: adapt(getByTarget, { deps, logger }),
    listSavedReports: adapt(listSavedReports, { deps, logger }),
    getSavedReport: adapt(getSavedReport, { deps, logger }),
    createSavedReport: adapt(createSavedReport, { deps, logger }),
    updateSavedReport: adapt(updateSavedReport, { deps, logger }),
    deleteSavedReport: adapt(deleteSavedReport, { deps, logger }),
    listReportTemplates: adapt(listReportTemplates, { deps, logger }),
  });

  logger.info('gRPC AuditQueryService registered', {
    methods: [
      'query',
      'getByTarget',
      'listSavedReports',
      'getSavedReport',
      'createSavedReport',
      'updateSavedReport',
      'deleteSavedReport',
      'listReportTemplates',
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
