import Redis from 'ioredis';
import { connect, type NatsConnection } from 'nats';
import type { Server as IOServer } from 'socket.io';

import { createLogger, initializeSentry } from '@adopt-dont-shop/observability';
import {
  assertPrincipalVerificationConfig,
  installProcessErrorHandlers,
  withShutdownDeadline,
} from '@adopt-dont-shop/service-bootstrap';

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
import { registerAuthSubscribers } from './ws/auth-subscriber.js';
import { registerChatSubscribers } from './ws/chat-subscriber.js';
import { registerNotificationSubscribers } from './ws/notifications-subscriber.js';
import { SocketRegistry } from './ws/socket-registry.js';
import { attachSocketServer } from './ws/socket-server.js';

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.gateway' });

  // ADS-1041: initialize backend error tracking (GlitchTip/Sentry SDK). No-op
  // unless SENTRY_DSN is set AND NODE_ENV is production/staging. The gateway
  // boots its own server (not createMicroserviceServer), so it needs its own
  // call site.
  initializeSentry({ serviceName: 'service.gateway', logger });

  let nats: NatsConnection | undefined;
  let io: IOServer | undefined;
  // Dedicated Redis pub/sub pair for the Socket.IO redis-adapter (ADS-818).
  // Separate from the rate-limit Redis client because the subscriber
  // connection enters subscribe mode and can't run other commands.
  let socketAdapterPub: Redis | undefined;
  let socketAdapterSub: Redis | undefined;
  let notificationsClient: ReturnType<typeof createNotificationsClient> | undefined;
  let authClient: ReturnType<typeof createAuthClient> | undefined;
  let petsClient: ReturnType<typeof createPetsClient> | undefined;
  let rescueClient: ReturnType<typeof createRescueClient> | undefined;
  let auditClient: ReturnType<typeof createAuditClient> | undefined;
  let matchingClient: ReturnType<typeof createMatchingClient> | undefined;
  let moderationClient: ReturnType<typeof createModerationClient> | undefined;
  let applicationsClient: ReturnType<typeof createApplicationsClient> | undefined;
  let chatClient: ReturnType<typeof createChatClient> | undefined;

  // Close the 9 gRPC clients (and any future ones) through one helper so the
  // success path (logs) and the boot-failure path (silent) can't drift apart.
  // `log: false` swallows errors, matching the original error-path cleanup
  // which never logged. Reads the closed-over client `let`s, so it works for
  // both signal-driven shutdown and the boot-failure catch.
  const closeGrpcClients = (log: boolean): void => {
    const clients: ReadonlyArray<{ label: string; client: { close(): void } | undefined }> = [
      { label: 'notifications client', client: notificationsClient },
      { label: 'auth client', client: authClient },
      { label: 'pets client', client: petsClient },
      { label: 'rescue client', client: rescueClient },
      { label: 'audit client', client: auditClient },
      { label: 'matching client', client: matchingClient },
      { label: 'moderation client', client: moderationClient },
      { label: 'applications client', client: applicationsClient },
      { label: 'chat client', client: chatClient },
    ];
    for (const { label, client } of clients) {
      try {
        client?.close();
      } catch (err) {
        if (log) {
          logger.error(`${label} close error`, { err });
        }
      }
    }
  };

  try {
    const config = loadConfig();

    // Fail closed in production without PRINCIPAL_SIGNING_KEY: the gateway
    // signs the principal tokens downstream services verify, so a prod
    // gateway that can't sign would force every downstream into header-trust.
    assertPrincipalVerificationConfig();

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
    // Create-or-update the JetStream DOMAIN_EVENTS stream before anything
    // publishes or subscribes. Idempotent across every service's boot.
    {
      const { ensureStream } = await import('@adopt-dont-shop/events');
      await ensureStream(nats);
    }

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
    // Bind the Socket.IO redis-adapter when a Redis URL is configured so
    // emitToUser() fans out across replicas (ADS-818). Without it the server
    // runs single-replica with the default in-process adapter.
    let redisAdapter: { pubClient: Redis; subClient: Redis } | undefined;
    if (config.rateLimit.redisUrl) {
      socketAdapterPub = new Redis(config.rateLimit.redisUrl, { lazyConnect: false });
      socketAdapterSub = socketAdapterPub.duplicate();
      socketAdapterPub.on('error', (err: Error) =>
        logger.warn('socket adapter Redis (pub) error', { message: err.message })
      );
      socketAdapterSub.on('error', (err: Error) =>
        logger.warn('socket adapter Redis (sub) error', { message: err.message })
      );
      redisAdapter = { pubClient: socketAdapterPub, subClient: socketAdapterSub };
    }
    io = attachSocketServer({
      httpServer: server.server,
      registry,
      logger,
      config,
      authClient,
      redisAdapter,
    });
    registerNotificationSubscribers({ nats, registry, logger });
    registerChatSubscribers({ nats, registry, logger });
    registerAuthSubscribers({ nats, io, logger });

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

    // ADS-1051: the gateway is the one process serving public HTTP *and*
    // long-lived WebSockets, so io.close()/server.close() can block
    // indefinitely. Race the whole teardown against runServiceShutdown's 25s
    // deadline (→ process.exit(1)) so a rollout can't hang until SIGKILL,
    // dropping connections, instead of draining.
    const teardown = (): Promise<void> =>
      withShutdownDeadline(
        async () => {
          try {
            if (io) {
              await new Promise<void>(resolve => io!.close(() => resolve()));
            }
          } catch (err) {
            logger.error('socket.io close error', { err });
          }
          try {
            socketAdapterPub?.disconnect();
            socketAdapterSub?.disconnect();
          } catch (err) {
            logger.error('socket adapter redis close error', { err });
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
          closeGrpcClients(true);
        },
        { logger }
      );

    const shutdown = async (signal: string): Promise<void> => {
      logger.info('service.gateway shutting down', { signal });
      await teardown();
      process.exit(0);
    };

    process.once('SIGTERM', () => void shutdown('SIGTERM'));
    process.once('SIGINT', () => void shutdown('SIGINT'));

    // ADS-1040: last-resort handlers so an idle DB-pool 'error' event (or any
    // stray rejection) drains via the same teardown and exits non-zero,
    // instead of crashing the process undrained under `restart: always`.
    installProcessErrorHandlers({ logger, onFatal: teardown });
  } catch (err) {
    // Error's message/stack are non-enumerable — logging { err } serializes
    // to {} and hides the cause.
    logger.error('service.gateway failed to start', {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    try {
      await nats?.drain();
    } catch {
      // Swallow — already on the failure path.
    }
    try {
      socketAdapterPub?.disconnect();
      socketAdapterSub?.disconnect();
    } catch {
      // Same.
    }
    closeGrpcClients(false);
    process.exit(1);
  }
};

void main();
