// gRPC server boot — registers AuditQueryServiceService on a grpc.Server
// and delegates bind/shutdown to @adopt-dont-shop/service-bootstrap.

import { Server } from '@grpc/grpc-js';

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import {
  startGrpcServer as startGrpcServerShared,
  type RunningGrpcServer,
} from '@adopt-dont-shop/service-bootstrap';

import { AuditV1 } from '@adopt-dont-shop/proto';

import type { AuditConfig } from '../config.js';

import { adapt } from './adapter.js';
import { getByTarget, getGdprErasureRequest, query } from './handlers.js';
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

export type { RunningGrpcServer };

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
    getGdprErasureRequest: adapt(getGdprErasureRequest, { deps, logger }),
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
      'getGdprErasureRequest',
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
  return startGrpcServerShared(server, config, logger);
};
