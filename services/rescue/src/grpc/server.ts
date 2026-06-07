// gRPC server boot — binds RescueServiceService to the six adapter-
// wrapped handlers and starts listening on RESCUE_GRPC_PORT.
//
// Same shape as services/pets/src/grpc/server.ts / services/auth/src/
// grpc/server.ts. Dev uses insecure credentials (TLS terminates at
// nginx in front); production keeps gRPC HTTP/2 cleartext on the
// cluster network until a future deploy wants mTLS.

import { promisify } from 'node:util';

import { Server, ServerCredentials } from '@grpc/grpc-js';

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import { RescueV1 } from '@adopt-dont-shop/proto';

import type { RescueConfig } from '../config.js';

import { adapt, adaptUnauth } from './adapter.js';
import {
  createRescue,
  getRescue,
  inviteStaff,
  listRescues,
  updateRescue,
  verifyRescue,
} from './handlers.js';
import {
  createFosterPlacement,
  endFosterPlacement,
  getFosterPlacement,
  getInvitationByToken,
  getMyStaffMembership,
  listFosterPlacements,
  listStaffMembers,
} from './staff-foster-handlers.js';

export type CreateGrpcServerOptions = {
  config: RescueConfig;
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

  server.addService(RescueV1.RescueServiceService, {
    create: adapt(createRescue, { deps, logger }),
    get: adapt(getRescue, { deps, logger }),
    list: adapt(listRescues, { deps, logger }),
    update: adapt(updateRescue, { deps, logger }),
    verify: adapt(verifyRescue, { deps, logger }),
    inviteStaff: adapt(inviteStaff, { deps, logger }),
    getMyStaffMembership: adapt(getMyStaffMembership, { deps, logger }),
    listStaffMembers: adapt(listStaffMembers, { deps, logger }),
    createFosterPlacement: adapt(createFosterPlacement, { deps, logger }),
    listFosterPlacements: adapt(listFosterPlacements, { deps, logger }),
    getFosterPlacement: adapt(getFosterPlacement, { deps, logger }),
    endFosterPlacement: adapt(endFosterPlacement, { deps, logger }),
    // Public — the invitation token is the credential.
    getInvitationByToken: adaptUnauth(getInvitationByToken, { deps, logger }),
  });

  logger.info('gRPC RescueService registered', {
    methods: [
      'create',
      'get',
      'list',
      'update',
      'verify',
      'inviteStaff',
      'getMyStaffMembership',
      'listStaffMembers',
      'createFosterPlacement',
      'listFosterPlacements',
      'getFosterPlacement',
      'endFosterPlacement',
      'getInvitationByToken',
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
