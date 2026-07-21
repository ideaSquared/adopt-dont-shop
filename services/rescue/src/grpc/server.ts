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
  countRescues,
  createRescue,
  getRescue,
  getRescueStatistics,
  inviteStaff,
  listRescues,
  sendRescueEmail,
  updateRescue,
  updateRescuePlan,
  verifyRescue,
} from './handlers.js';
import {
  acceptInvitation,
  cancelRescueInvitation,
  createStaffMember,
  endFosterPlacement,
  getFosterPlacement,
  getInvitationByToken,
  getMyStaffMembership,
  listFosterPlacements,
  listRescueInvitations,
  listStaffMembers,
  makeCreateFosterPlacement,
  removeStaffMember,
  updateStaffMember,
} from './staff-foster-handlers.js';
import {
  createApplicationQuestion,
  deleteApplicationQuestion,
  listApplicationQuestions,
} from './application-question-handlers.js';
import {
  addEventAttendee,
  checkInAttendee,
  createEvent,
  deleteEvent,
  getEvent,
  getEventAttendees,
  listEvents,
  makeGetEventAnalytics,
  updateEvent,
} from './event-handlers.js';
import { createApplicationsClient, type ApplicationsClient } from './applications-client.js';
import { createPetsClient, type PetsClient } from './pets-client.js';

export type CreateGrpcServerOptions = {
  config: RescueConfig;
  pool: Pool;
  nats: NatsConnection;
  logger: Logger;
  // Injectable for tests; defaults to a real client at config.petsGrpcUrl.
  petsClient?: PetsClient;
  // Injectable for tests; defaults to a real client at
  // config.applicationsGrpcUrl. getEventAnalytics uses this for the
  // registered-then-adopted attribution count (ADS-941).
  applicationsClient?: ApplicationsClient;
};

export type { RunningGrpcServer };

export const createGrpcServer = (opts: CreateGrpcServerOptions): Server => {
  const { config, pool, nats, logger } = opts;
  const deps = { pool, nats };
  const petsClient = opts.petsClient ?? createPetsClient({ address: config.petsGrpcUrl });
  const applicationsClient =
    opts.applicationsClient ?? createApplicationsClient({ address: config.applicationsGrpcUrl });
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
    createStaffMember: adapt(createStaffMember, { deps, logger }),
    updateStaffMember: adapt(updateStaffMember, { deps, logger }),
    removeStaffMember: adapt(removeStaffMember, { deps, logger }),
    createFosterPlacement: adapt(makeCreateFosterPlacement(petsClient), { deps, logger }),
    listFosterPlacements: adapt(listFosterPlacements, { deps, logger }),
    getFosterPlacement: adapt(getFosterPlacement, { deps, logger }),
    endFosterPlacement: adapt(endFosterPlacement, { deps, logger }),
    // Public — the invitation token is the credential.
    getInvitationByToken: adaptUnauth(getInvitationByToken, { deps, logger }),
    acceptInvitation: adaptUnauth(acceptInvitation, { deps, logger }),
    listApplicationQuestions: adapt(listApplicationQuestions, { deps, logger }),
    createApplicationQuestion: adapt(createApplicationQuestion, { deps, logger }),
    deleteApplicationQuestion: adapt(deleteApplicationQuestion, { deps, logger }),
    updateRescuePlan: adapt(updateRescuePlan, { deps, logger }),
    getRescueStatistics: adapt(getRescueStatistics, { deps, logger }),
    countRescues: adapt(countRescues, { deps, logger }),
    sendRescueEmail: adapt(sendRescueEmail, { deps, logger }),
    listRescueInvitations: adapt(listRescueInvitations, { deps, logger }),
    cancelRescueInvitation: adapt(cancelRescueInvitation, { deps, logger }),
    listEvents: adapt(listEvents, { deps, logger }),
    getEvent: adapt(getEvent, { deps, logger }),
    createEvent: adapt(createEvent, { deps, logger }),
    updateEvent: adapt(updateEvent, { deps, logger }),
    deleteEvent: adapt(deleteEvent, { deps, logger }),
    getEventAttendees: adapt(getEventAttendees, { deps, logger }),
    addEventAttendee: adapt(addEventAttendee, { deps, logger }),
    checkInAttendee: adapt(checkInAttendee, { deps, logger }),
    getEventAnalytics: adapt(makeGetEventAnalytics(applicationsClient), { deps, logger }),
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
      'createStaffMember',
      'updateStaffMember',
      'removeStaffMember',
      'createFosterPlacement',
      'listFosterPlacements',
      'getFosterPlacement',
      'endFosterPlacement',
      'getInvitationByToken',
      'acceptInvitation',
      'listApplicationQuestions',
      'createApplicationQuestion',
      'deleteApplicationQuestion',
      'updateRescuePlan',
      'getRescueStatistics',
      'countRescues',
      'sendRescueEmail',
      'listRescueInvitations',
      'cancelRescueInvitation',
      'listEvents',
      'getEvent',
      'createEvent',
      'updateEvent',
      'deleteEvent',
      'getEventAttendees',
      'addEventAttendee',
      'checkInAttendee',
      'getEventAnalytics',
    ],
    grpcPort: config.grpcPort,
  });

  return server;
};

export const startGrpcServer = async (
  opts: CreateGrpcServerOptions
): Promise<RunningGrpcServer> => {
  const { config, logger } = opts;
  // Build + own the pets/applications clients here so they're closed on
  // shutdown.
  const petsClient = opts.petsClient ?? createPetsClient({ address: config.petsGrpcUrl });
  const applicationsClient =
    opts.applicationsClient ?? createApplicationsClient({ address: config.applicationsGrpcUrl });
  const server = createGrpcServer({ ...opts, petsClient, applicationsClient });
  const running = await startGrpcServerShared(server, config, logger);

  return {
    ...running,
    shutdown: () =>
      new Promise<void>(resolve => {
        server.tryShutdown(err => {
          if (err) {
            logger.error('gRPC server shutdown error', { err });
          }
          try {
            petsClient.close();
          } catch (closeErr) {
            logger.error('pets client close error', { err: closeErr });
          }
          try {
            applicationsClient.close();
          } catch (closeErr) {
            logger.error('applications client close error', { err: closeErr });
          }
          resolve();
        });
      }),
  };
};
