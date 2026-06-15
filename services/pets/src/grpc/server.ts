// gRPC server boot — registers PetServiceService on a grpc.Server and
// delegates bind/shutdown to @adopt-dont-shop/service-bootstrap.

import { Server } from '@grpc/grpc-js';

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import {
  startGrpcServer as startGrpcServerShared,
  type RunningGrpcServer,
} from '@adopt-dont-shop/service-bootstrap';

import { PetsV1 } from '@adopt-dont-shop/proto';

import type { PetsConfig } from '../config.js';

import { adapt } from './adapter.js';
import {
  createPet,
  deletePet,
  getPet,
  getPetStats,
  listFavoriters,
  listPets,
  updatePet,
  updatePetStatus,
} from './handlers.js';

export type CreateGrpcServerOptions = {
  config: PetsConfig;
  pool: Pool;
  nats: NatsConnection;
  logger: Logger;
};

export type { RunningGrpcServer };

export const createGrpcServer = (opts: CreateGrpcServerOptions): Server => {
  const { config, pool, nats, logger } = opts;
  const deps = { pool, nats };
  const server = new Server();

  server.addService(PetsV1.PetServiceService, {
    create: adapt(createPet, { deps, logger }),
    get: adapt(getPet, { deps, logger }),
    list: adapt(listPets, { deps, logger }),
    update: adapt(updatePet, { deps, logger }),
    updateStatus: adapt(updatePetStatus, { deps, logger }),
    delete: adapt(deletePet, { deps, logger }),
    getStats: adapt(getPetStats, { deps, logger }),
    listFavoriters: adapt(listFavoriters, { deps, logger }),
  });

  logger.info('gRPC PetService registered', {
    methods: [
      'create',
      'get',
      'list',
      'update',
      'updateStatus',
      'delete',
      'getStats',
      'listFavoriters',
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
