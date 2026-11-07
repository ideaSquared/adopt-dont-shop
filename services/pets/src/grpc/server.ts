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

import { adapt, adaptUnauth } from './adapter.js';
import { createRescueClient, type RescueClient } from './rescue-client.js';
import {
  createPet,
  deletePet,
  getAdoptionStats,
  getAdoptionsByType,
  getAdoptionTrend,
  getPet,
  getPetFacets,
  getPetStats,
  getSearchSuggestions,
  getSimilarPets,
  getTopBreedsByAdoptions,
  getTopRescuesByAdoptions,
  listBreeds,
  listFavoriters,
  listPets,
  updatePet,
  updatePetStatus,
} from './handlers.js';
import {
  addFavorite,
  getFavoriteStatus,
  listFavoritesForUser,
  listUserFavorites,
  removeFavorite,
} from './favorite-handlers.js';
import { getViewsToday, recordPetView } from './view-handlers.js';

export type CreateGrpcServerOptions = {
  config: PetsConfig;
  pool: Pool;
  nats: NatsConnection;
  logger: Logger;
  // Injected in tests; defaults to a real client for config.rescueGrpcUrl.
  rescueClient?: RescueClient;
};

export type { RunningGrpcServer };

export const createGrpcServer = (opts: CreateGrpcServerOptions): Server => {
  const { config, pool, nats, logger } = opts;
  const rescueClient = opts.rescueClient ?? createRescueClient({ address: config.rescueGrpcUrl });
  const deps = { pool, nats, rescueClient };
  const server = new Server();

  server.addService(PetsV1.PetServiceService, {
    create: adapt(createPet, { deps, logger }),
    // Public catalogue reads — anonymous (logged-out) visitors may browse.
    get: adaptUnauth(getPet, { deps, logger }),
    list: adaptUnauth(listPets, { deps, logger }),
    listBreeds: adaptUnauth(listBreeds, { deps, logger }),
    getSimilarPets: adaptUnauth(getSimilarPets, { deps, logger }),
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
    listFavoritesForUser: adapt(listFavoritesForUser, { deps, logger }),
    getSearchSuggestions: adapt(getSearchSuggestions, { deps, logger }),
    getPetFacets: adapt(getPetFacets, { deps, logger }),
    getAdoptionStats: adapt(getAdoptionStats, { deps, logger }),
    recordPetView: adapt(recordPetView, { deps, logger }),
    getViewsToday: adapt(getViewsToday, { deps, logger }),
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
      'listFavoritesForUser',
      'getSearchSuggestions',
      'getPetFacets',
      'getAdoptionStats',
      'recordPetView',
      'getViewsToday',
    ],
    grpcPort: config.grpcPort,
  });

  return server;
};

export const startGrpcServer = async (
  opts: CreateGrpcServerOptions
): Promise<RunningGrpcServer> => {
  const { config, logger } = opts;
  const rescueClient = opts.rescueClient ?? createRescueClient({ address: config.rescueGrpcUrl });
  const server = createGrpcServer({ ...opts, rescueClient });
  const running = await startGrpcServerShared(server, config, logger);
  return {
    ...running,
    shutdown: async () => {
      await running.shutdown();
      rescueClient.close();
    },
  };
};
