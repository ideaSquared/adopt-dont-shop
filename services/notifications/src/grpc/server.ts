// gRPC server boot — registers NotificationServiceService on a grpc.Server
// and delegates bind/shutdown to @adopt-dont-shop/service-bootstrap.

import { Server } from '@grpc/grpc-js';

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import {
  startGrpcServer as startGrpcServerShared,
  type RunningGrpcServer,
} from '@adopt-dont-shop/service-bootstrap';

import { NotificationsV1 } from '@adopt-dont-shop/proto';

import type { NotificationsConfig } from '../config.js';

import { adapt } from './adapter.js';
import { broadcast } from './broadcast-handlers.js';
import {
  listDeviceTokensHandler,
  registerDeviceTokenHandler,
  unregisterDeviceTokenHandler,
} from './device-token-handlers.js';
import {
  createEmailTemplate,
  deleteEmailTemplate,
  getEmailTemplate,
  listEmailTemplates,
  previewEmailTemplate,
  updateEmailTemplate,
} from './email-template-handlers.js';
import { getEmailPreferences, sendEmail, updateEmailPreferences } from './email-handlers.js';
import { createNotification, dismissNotification, listNotifications } from './handlers.js';
import {
  cleanupExpiredNotifications,
  deleteNotification,
  getNotification,
  getNotificationPreferences,
  getUnreadCount,
  markAllRead,
  resetNotificationPreferences,
  updateNotificationPreferences,
} from './notification-prefs-handlers.js';

export type CreateGrpcServerOptions = {
  config: NotificationsConfig;
  pool: Pool;
  nats: NatsConnection;
  logger: Logger;
  // Optional cross-service client for cohort lookups. Only the Broadcast
  // RPC reads it; wiring it in production happens from index.ts. Smoke
  // tests + unit tests can omit it — Broadcast will return INTERNAL when
  // the wiring is missing, which is the correct signal.
  authClient?: import('./handlers.js').AuthCohortClient;
};

export type { RunningGrpcServer };

export const createGrpcServer = (opts: CreateGrpcServerOptions): Server => {
  const { config, pool, nats, logger, authClient } = opts;
  const deps = { pool, nats, authClient, logger };
  const server = new Server();

  // ts-proto emits `NotificationServiceService` as the Definition
  // table grpc-js consumes; pair with the implementation object
  // shape `NotificationServiceServer` from index.ts re-exports.
  server.addService(NotificationsV1.NotificationServiceService, {
    create: adapt(createNotification, { deps: { pool, nats }, logger }),
    list: adapt(listNotifications, { deps: { pool, nats }, logger }),
    dismiss: adapt(dismissNotification, { deps: { pool, nats }, logger }),
    getNotification: adapt(getNotification, { deps: { pool, nats }, logger }),
    getUnreadCount: adapt(getUnreadCount, { deps: { pool, nats }, logger }),
    markAllRead: adapt(markAllRead, { deps: { pool, nats }, logger }),
    deleteNotification: adapt(deleteNotification, { deps: { pool, nats }, logger }),
    getNotificationPreferences: adapt(getNotificationPreferences, { deps: { pool, nats }, logger }),
    updateNotificationPreferences: adapt(updateNotificationPreferences, {
      deps: { pool, nats },
      logger,
    }),
    cleanupExpiredNotifications: adapt(cleanupExpiredNotifications, {
      deps: { pool, nats },
      logger,
    }),
    resetNotificationPreferences: adapt(resetNotificationPreferences, {
      deps: { pool, nats },
      logger,
    }),
    sendEmail: adapt(sendEmail, { deps: { pool, nats }, logger }),
    getEmailPreferences: adapt(getEmailPreferences, { deps: { pool, nats }, logger }),
    updateEmailPreferences: adapt(updateEmailPreferences, { deps: { pool, nats }, logger }),
    registerDeviceToken: adapt(registerDeviceTokenHandler, { deps: { pool, nats }, logger }),
    unregisterDeviceToken: adapt(unregisterDeviceTokenHandler, { deps: { pool, nats }, logger }),
    listDeviceTokens: adapt(listDeviceTokensHandler, { deps: { pool, nats }, logger }),
    listEmailTemplates: adapt(listEmailTemplates, { deps: { pool, nats }, logger }),
    getEmailTemplate: adapt(getEmailTemplate, { deps: { pool, nats }, logger }),
    createEmailTemplate: adapt(createEmailTemplate, { deps: { pool, nats }, logger }),
    updateEmailTemplate: adapt(updateEmailTemplate, { deps: { pool, nats }, logger }),
    deleteEmailTemplate: adapt(deleteEmailTemplate, { deps: { pool, nats }, logger }),
    previewEmailTemplate: adapt(previewEmailTemplate, { deps: { pool, nats }, logger }),
    broadcast: adapt(broadcast, { deps, logger }),
  });

  logger.info('gRPC NotificationService registered', {
    methods: [
      'create',
      'list',
      'dismiss',
      'getNotification',
      'getUnreadCount',
      'markAllRead',
      'deleteNotification',
      'getNotificationPreferences',
      'updateNotificationPreferences',
      'resetNotificationPreferences',
      'cleanupExpiredNotifications',
      'sendEmail',
      'getEmailPreferences',
      'updateEmailPreferences',
      'registerDeviceToken',
      'unregisterDeviceToken',
      'listDeviceTokens',
      'listEmailTemplates',
      'getEmailTemplate',
      'createEmailTemplate',
      'updateEmailTemplate',
      'deleteEmailTemplate',
      'previewEmailTemplate',
      'broadcast',
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
