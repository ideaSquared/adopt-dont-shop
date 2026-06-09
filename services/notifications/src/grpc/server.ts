// gRPC server boot — binds NotificationServiceService to the three
// adapter-wrapped handlers and starts listening on GRPC_PORT.
//
// The server uses grpc-js's insecure credentials in dev. Production
// terminates TLS at nginx (already in front), so the gRPC port stays
// HTTP/2 cleartext on the cluster network. When a future deploy wants
// mTLS between services, swap to ServerCredentials.createSsl() here.

import { promisify } from 'node:util';

import { Server, ServerCredentials } from '@grpc/grpc-js';

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

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

export type RunningGrpcServer = {
  server: Server;
  port: number;
  // Calls `server.tryShutdown()` to drain in-flight calls cleanly.
  // grpc-js takes a node-style callback for shutdown; promisify so the
  // boot script can `await` it in a single shutdown sequence with
  // Fastify.
  shutdown: () => Promise<void>;
};

export const createGrpcServer = (opts: CreateGrpcServerOptions): Server => {
  const { config, pool, nats, logger, authClient } = opts;
  const deps = { pool, nats, authClient };
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

// Start the server listening on the configured port. Separated from
// createGrpcServer so tests can inspect the Server without binding a
// real port.
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
