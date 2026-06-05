import { connect, type NatsConnection } from 'nats';
import type { Server as IOServer } from 'socket.io';

import { createLogger } from '@adopt-dont-shop/observability';

import { loadConfig } from './config.js';
import { createAuthClient } from './grpc-clients/auth-client.js';
import { createNotificationsClient } from './grpc-clients/notifications-client.js';
import { createPetsClient } from './grpc-clients/pets-client.js';
import { createServer } from './server.js';
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

  try {
    const config = loadConfig();

    // gRPC clients to extracted services come up before Fastify so the
    // route plugins / middleware can close over them.
    notificationsClient = createNotificationsClient({ address: config.notificationsGrpcUrl });
    authClient = createAuthClient({ address: config.authGrpcUrl });
    petsClient = createPetsClient({ address: config.petsGrpcUrl });

    const server = await createServer({
      config,
      logger,
      notificationsClient,
      authClient,
      petsClient,
    });

    await server.listen({ port: config.port, host: config.host });

    // NATS + Socket.IO get wired AFTER the HTTP server binds so the
    // underlying node http.Server exists for socket.io to attach to.
    nats = await connect({ servers: config.natsUrl });
    const registry = new SocketRegistry();
    io = attachSocketServer({ httpServer: server.server, registry, logger });
    registerNotificationSubscribers({ nats, registry, logger });

    logger.info('service.gateway listening', {
      port: config.port,
      host: config.host,
      upstream: config.upstreamBackendUrl,
      natsUrl: config.natsUrl,
      notificationsGrpcUrl: config.notificationsGrpcUrl,
      authGrpcUrl: config.authGrpcUrl,
      petsGrpcUrl: config.petsGrpcUrl,
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
    process.exit(1);
  }
};

void main();
