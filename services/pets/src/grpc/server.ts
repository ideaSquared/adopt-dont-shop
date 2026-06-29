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
  getAdoptionsByType,
  getAdoptionTrend,
  getPet,
  getPetStats,
  getTopBreedsByAdoptions,
  getTopRescuesByAdoptions,
  listFavoriters,
  listPets,
  updatePet,
  updatePetStatus,
} from './handlers.js';
import {
  addFavorite,
  getFavoriteStatus,
  listUserFavorites,
  removeFavorite,
} from './favorite-handlers.js';

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
    getAdoptionTrend: adapt(getAdoptionTrend, { deps, logger }),
    getAdoptionsByType: adapt(getAdoptionsByType, { deps, logger }),
    getTopRescuesByAdoptions: adapt(getTopRescuesByAdoptions, { deps, logger }),
    getTopBreedsByAdoptions: adapt(getTopBreedsByAdoptions, { deps, logger }),
    listFavoriters: adapt(listFavoriters, { deps, logger }),
    addFavorite: adapt(addFavorite, { deps, logger }),
    removeFavorite: adapt(removeFavorite, { deps, logger }),
    getFavoriteStatus: adapt(getFavoriteStatus, { deps, logger }),
    listUserFavorites: adapt(listUserFavorites, { deps, logger }),
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
      'getAdoptionTrend',
      'getAdoptionsByType',
      'getTopRescuesByAdoptions',
      'getTopBreedsByAdoptions',
      'listFavoriters',
      'addFavorite',
      'removeFavorite',
      'getFavoriteStatus',
      'listUserFavorites',
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
