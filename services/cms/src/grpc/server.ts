// gRPC server boot — registers CmsServiceService on a grpc.Server and
// delegates bind/shutdown to @adopt-dont-shop/service-bootstrap.

import { Server } from '@grpc/grpc-js';

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import {
  startGrpcServer as startGrpcServerShared,
  type RunningGrpcServer,
} from '@adopt-dont-shop/service-bootstrap';

import { CmsV1 } from '@adopt-dont-shop/proto';

import type { CmsConfig } from '../config.js';

import { adapt, adaptUnauth } from './adapter.js';
import {
  archiveContent,
  createContent,
  createMenu,
  deleteContent,
  deleteMenu,
  getContent,
  getContentBySlug,
  getMenu,
  getPublicContentBySlug,
  getVersionHistory,
  listContent,
  listMenus,
  listPublicContent,
  publishContent,
  restoreVersion,
  unpublishContent,
  updateContent,
  updateMenu,
} from './handlers.js';

export type CreateGrpcServerOptions = {
  config: CmsConfig;
  pool: Pool;
  nats: NatsConnection;
  logger: Logger;
};

export type { RunningGrpcServer };

export const createGrpcServer = (opts: CreateGrpcServerOptions): Server => {
  const { config, pool, nats, logger } = opts;
  const deps = { pool, nats };
  const server = new Server();

  server.addService(CmsV1.CmsServiceService, {
    // Public reads — no principal required.
    listPublicContent: adaptUnauth(listPublicContent, { deps, logger }),
    getPublicContentBySlug: adaptUnauth(getPublicContentBySlug, { deps, logger }),
    // Admin reads/writes.
    listContent: adapt(listContent, { deps, logger }),
    getContent: adapt(getContent, { deps, logger }),
    getContentBySlug: adapt(getContentBySlug, { deps, logger }),
    createContent: adapt(createContent, { deps, logger }),
    updateContent: adapt(updateContent, { deps, logger }),
    deleteContent: adapt(deleteContent, { deps, logger }),
    publishContent: adapt(publishContent, { deps, logger }),
    unpublishContent: adapt(unpublishContent, { deps, logger }),
    archiveContent: adapt(archiveContent, { deps, logger }),
    getVersionHistory: adapt(getVersionHistory, { deps, logger }),
    restoreVersion: adapt(restoreVersion, { deps, logger }),
    listMenus: adapt(listMenus, { deps, logger }),
    getMenu: adapt(getMenu, { deps, logger }),
    createMenu: adapt(createMenu, { deps, logger }),
    updateMenu: adapt(updateMenu, { deps, logger }),
    deleteMenu: adapt(deleteMenu, { deps, logger }),
  });

  logger.info('gRPC CmsService registered', { grpcPort: config.grpcPort });
  return server;
};

export const startGrpcServer = async (
  opts: CreateGrpcServerOptions
): Promise<RunningGrpcServer> => {
  const { config, logger } = opts;
  const server = createGrpcServer(opts);
  return startGrpcServerShared(server, config, logger);
};
