import { connect, type NatsConnection } from 'nats';

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';
import { runServiceShutdown } from '@adopt-dont-shop/service-bootstrap';

import { loadConfig } from './config.js';
import { startGrpcServer, type RunningGrpcServer } from './grpc/server.js';
import { createServer } from './server.js';

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.chat' });

  let nats: NatsConnection | undefined;
  let pool: Awaited<ReturnType<typeof createDbClient>> | undefined;
  let grpc: RunningGrpcServer | undefined;
  let grpcReady = false;

  try {
    const config = loadConfig();

    pool = createDbClient({
      connectionString: config.databaseUrl,
      schema: config.schema,
    });
    nats = await connect({ servers: config.natsUrl });
    // Create-or-update the JetStream DOMAIN_EVENTS stream before anything
    // publishes or subscribes. Idempotent across every service's boot.
    {
      const { ensureStream } = await import('@adopt-dont-shop/events');
      await ensureStream(nats);
    }

    grpc = await startGrpcServer({ config, pool, nats, logger });
    grpcReady = true;
    // GDPR erasure subscriber — drops the user's data in this schema.
    // Reports back via gdpr.erasureCompleted with service='chat'.
    const { registerGdprSubscriber } = await import('@adopt-dont-shop/events');
    const { eraseChat } = await import('./gdpr/erase.js');
    registerGdprSubscriber({
      nats,
      pool,
      service: 'chat',
      erase: eraseChat,
      onError: (err, subject) => logger.error('gdpr erasure subscriber error', { subject, err }),
    });

    const httpServer = createServer({ config, logger, isReady: () => grpcReady });
    await httpServer.listen({ port: config.port, host: config.host });

    logger.info('service.chat running', {
      http: { port: config.port, host: config.host },
      grpc: { port: grpc.port, host: config.host },
      schema: config.schema,
      natsUrl: config.natsUrl,
      environment: config.environment,
    });

    const shutdown = async (signal: string): Promise<void> => {
      logger.info('service.chat shutting down', { signal });
      await runServiceShutdown({ httpServer, grpc, nats, pool, logger });
      process.exit(0);
    };

    process.once('SIGTERM', () => void shutdown('SIGTERM'));
    process.once('SIGINT', () => void shutdown('SIGINT'));
  } catch (err) {
    logger.error('service.chat failed to start', { err });
    try {
      await grpc?.shutdown();
    } catch {
      // swallow
    }
    try {
      await nats?.drain();
    } catch {
      // swallow
    }
    try {
      await pool?.end();
    } catch {
      // swallow
    }
    process.exit(1);
  }
};

void main();
