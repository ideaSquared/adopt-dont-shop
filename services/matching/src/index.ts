import { connect, type NatsConnection } from 'nats';

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';
import { runServiceShutdown } from '@adopt-dont-shop/service-bootstrap';

import { loadConfig } from './config.js';
import { startGrpcServer, type RunningGrpcServer } from './grpc/server.js';
import { createServer } from './server.js';

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.matching' });

  let nats: NatsConnection | undefined;
  let pool: ReturnType<typeof createDbClient> | undefined;
  let grpc: RunningGrpcServer | undefined;
  let grpcReady = false;

  try {
    const config = loadConfig();

    // Connect deps FIRST so we crash here rather than after starting
    // to accept traffic. Same boot order as services/rescue,
    // services/audit, services/pets.
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
    // Reports back via gdpr.erasureCompleted with service='matching'.
    const { registerGdprSubscriber } = await import('@adopt-dont-shop/events');
    const { eraseMatching } = await import('./gdpr/erase.js');
    registerGdprSubscriber({
      nats,
      pool,
      service: 'matching',
      erase: eraseMatching,
      onError: (err, subject) => logger.error('gdpr erasure subscriber error', { subject, err }),
    });

    const httpServer = createServer({ config, logger, isReady: () => grpcReady });
    await httpServer.listen({ port: config.port, host: config.host });

    logger.info('service.matching running', {
      http: { port: config.port, host: config.host },
      grpc: { port: grpc.port, host: config.host },
      schema: config.schema,
      natsUrl: config.natsUrl,
      environment: config.environment,
    });

    const shutdown = async (signal: string): Promise<void> => {
      logger.info('service.matching shutting down', { signal });
      await runServiceShutdown({ httpServer, grpc, nats, pool, logger });
      process.exit(0);
    };

    process.once('SIGTERM', () => void shutdown('SIGTERM'));
    process.once('SIGINT', () => void shutdown('SIGINT'));
  } catch (err) {
    logger.error('service.matching failed to start', { err });
    try {
      await grpc?.shutdown();
    } catch {
      // Swallow — already on the failure path.
    }
    try {
      await nats?.drain();
    } catch {
      // Same.
    }
    try {
      await pool?.end();
    } catch {
      // Same.
    }
    process.exit(1);
  }
};

void main();
