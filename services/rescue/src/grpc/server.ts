// gRPC server boot — registers RescueServiceService on a grpc.Server
// and delegates bind/shutdown to @adopt-dont-shop/service-bootstrap.

import { Server } from '@grpc/grpc-js';

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import {
  startGrpcServer as startGrpcServerShared,
  type RunningGrpcServer,
} from '@adopt-dont-shop/service-bootstrap';

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

export type { RunningGrpcServer };

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
  return startGrpcServerShared(server, config, logger);
};
