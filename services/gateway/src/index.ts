import { connect, type NatsConnection } from 'nats';
import type { Server as IOServer } from 'socket.io';

import { createLogger } from '@adopt-dont-shop/observability';

import { loadConfig } from './config.js';
import { createApplicationsClient } from './grpc-clients/applications-client.js';
import { createAuditClient } from './grpc-clients/audit-client.js';
import { createAuthClient } from './grpc-clients/auth-client.js';
import { createChatClient } from './grpc-clients/chat-client.js';
import { createMatchingClient } from './grpc-clients/matching-client.js';
import { createModerationClient } from './grpc-clients/moderation-client.js';
import { createNotificationsClient } from './grpc-clients/notifications-client.js';
import { createPetsClient } from './grpc-clients/pets-client.js';
import { createRescueClient } from './grpc-clients/rescue-client.js';
import { createServer } from './server.js';
import { registerChatSubscribers } from './ws/chat-subscriber.js';
import { registerNotificationSubscribers } from './ws/notifications-subscriber.js';
import { SocketRegistry } from './ws/socket-registry.js';
import { attachSocketServer } from './ws/socket-server.js';

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.gateway' });

  let nats: NatsConnection | undefined;
  let io: IOServer | undefined;
  let notificationsClient: ReturnType<typeof createNotificationsClient> | undefined;
  let authClient: ReturnType<typeof createAuthClient> | undefined;
  let petsClient: ReturnType<typeof createPetsClient> | undefined;
  let rescueClient: ReturnType<typeof createRescueClient> | undefined;
  let auditClient: ReturnType<typeof createAuditClient> | undefined;
  let matchingClient: ReturnType<typeof createMatchingClient> | undefined;
  let moderationClient: ReturnType<typeof createModerationClient> | undefined;
  let applicationsClient: ReturnType<typeof createApplicationsClient> | undefined;
  let chatClient: ReturnType<typeof createChatClient> | undefined;

  try {
    const config = loadConfig();

    // gRPC clients to extracted services come up before Fastify so the
    // route plugins / middleware can close over them. The channels are
    // lazy — constructing a client doesn't open a connection until the
    // first call — so a service that isn't running yet doesn't block
    // gateway boot.
    notificationsClient = createNotificationsClient({ address: config.notificationsGrpcUrl });
    authClient = createAuthClient({ address: config.authGrpcUrl });
    petsClient = createPetsClient({ address: config.petsGrpcUrl });
    rescueClient = createRescueClient({ address: config.rescueGrpcUrl });
    auditClient = createAuditClient({ address: config.auditGrpcUrl });
    matchingClient = createMatchingClient({ address: config.matchingGrpcUrl });
    moderationClient = createModerationClient({ address: config.moderationGrpcUrl });
    applicationsClient = createApplicationsClient({ address: config.applicationsGrpcUrl });
    chatClient = createChatClient({ address: config.chatGrpcUrl });

    // NATS comes up BEFORE createServer so the GDPR erasure-request route
    // can publish on it. Socket.IO still attaches after server.listen.
    nats = await connect({ servers: config.natsUrl });

    const server = await createServer({
      config,
      logger,
      notificationsClient,
      authClient,
      petsClient,
      rescueClient,
      auditClient,
      matchingClient,
      moderationClient,
      applicationsClient,
      chatClient,
      nats,
    });

    await server.listen({ port: config.port, host: config.host });
    const registry = new SocketRegistry();
    io = attachSocketServer({ httpServer: server.server, registry, logger });
    registerNotificationSubscribers({ nats, registry, logger });
    registerChatSubscribers({ nats, registry, logger });

    logger.info('service.gateway listening', {
      port: config.port,
      host: config.host,
      natsUrl: config.natsUrl,
      notificationsGrpcUrl: config.notificationsGrpcUrl,
      authGrpcUrl: config.authGrpcUrl,
      petsGrpcUrl: config.petsGrpcUrl,
      rescueGrpcUrl: config.rescueGrpcUrl,
      auditGrpcUrl: config.auditGrpcUrl,
      matchingGrpcUrl: config.matchingGrpcUrl,
      moderationGrpcUrl: config.moderationGrpcUrl,
      applicationsGrpcUrl: config.applicationsGrpcUrl,
      chatGrpcUrl: config.chatGrpcUrl,
      environment: config.environment,
    });

    const shutdown = async (signal: string): Promise<void> => {
      logger.info('service.gateway shutting down', { signal });
      try {
        if (io) {
          await new Promise<void>(resolve => io!.close(() => resolve()));
        }
      } catch (err) {
        logger.error('socket.io close error', { err });
      }
      try {
        await server.close();
      } catch (err) {
        logger.error('http close error', { err });
      }
      try {
        await nats?.drain();
      } catch (err) {
        logger.error('nats drain error', { err });
      }
      try {
        notificationsClient?.close();
      } catch (err) {
        logger.error('notifications client close error', { err });
      }
      try {
        authClient?.close();
      } catch (err) {
        logger.error('auth client close error', { err });
      }
      try {
        petsClient?.close();
      } catch (err) {
        logger.error('pets client close error', { err });
      }
      try {
        rescueClient?.close();
      } catch (err) {
        logger.error('rescue client close error', { err });
      }
      try {
        auditClient?.close();
      } catch (err) {
        logger.error('audit client close error', { err });
      }
      try {
        matchingClient?.close();
      } catch (err) {
        logger.error('matching client close error', { err });
      }
      try {
        moderationClient?.close();
      } catch (err) {
        logger.error('moderation client close error', { err });
      }
      try {
        applicationsClient?.close();
      } catch (err) {
        logger.error('applications client close error', { err });
      }
      try {
        chatClient?.close();
      } catch (err) {
        logger.error('chat client close error', { err });
      }
      process.exit(0);
    };

    process.once('SIGTERM', () => void shutdown('SIGTERM'));
    process.once('SIGINT', () => void shutdown('SIGINT'));
  } catch (err) {
    logger.error('service.gateway failed to start', { err });
    try {
      await nats?.drain();
    } catch {
      // Swallow — already on the failure path.
    }
    try {
      notificationsClient?.close();
    } catch {
      // Same.
    }
    try {
      authClient?.close();
    } catch {
      // Same.
    }
    try {
      petsClient?.close();
    } catch {
      // Same.
    }
    try {
      rescueClient?.close();
    } catch {
      // Same.
    }
    try {
      auditClient?.close();
    } catch {
      // Same.
    }
    try {
      matchingClient?.close();
    } catch {
      // Same.
    }
    try {
      moderationClient?.close();
    } catch {
      // Same.
    }
    try {
      applicationsClient?.close();
    } catch {
      // Same.
    }
    try {
      chatClient?.close();
    } catch {
      // Same.
    }
    process.exit(1);
  }
};

void main();
