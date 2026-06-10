import { connect, type NatsConnection } from 'nats';

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';

import { loadConfig } from './config.js';
import { startGrpcServer, type RunningGrpcServer } from './grpc/server.js';
import { createServer } from './server.js';

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.applications' });

  let nats: NatsConnection | undefined;
  let pool: ReturnType<typeof createDbClient> | undefined;
  let grpc: RunningGrpcServer | undefined;
  let httpClosed = false;

  try {
    const config = loadConfig();

    // Connect deps FIRST so we crash here rather than after starting to
    // accept traffic. Same boot order as services/moderation,
    // services/audit, services/matching, services/rescue.
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
    // GDPR erasure subscriber — drops the user's data in this schema.
    // Reports back via gdpr.erasureCompleted with service='applications'.
    const { registerGdprSubscriber } = await import('@adopt-dont-shop/events');
    const { eraseApplications } = await import('./gdpr/erase.js');
    registerGdprSubscriber({
      nats,
      pool,
      service: 'applications',
      erase: eraseApplications,
      onError: (err, subject) => logger.error('gdpr erasure subscriber error', { subject, err }),
    });

    const httpServer = createServer({ config, logger });
    await httpServer.listen({ port: config.port, host: config.host });

    logger.info('service.applications running', {
      http: { port: config.port, host: config.host },
      grpc: { port: grpc.port, host: config.host },
      schema: config.schema,
      natsUrl: config.natsUrl,
      environment: config.environment,
    });

    const shutdown = async (signal: string): Promise<void> => {
      logger.info('service.applications shutting down', { signal });
      try {
        if (!httpClosed) {
          await httpServer.close();
          httpClosed = true;
        }
      } catch (err) {
        logger.error('http close error', { err });
      }
      try {
        await grpc?.shutdown();
      } catch (err) {
        logger.error('grpc shutdown error', { err });
      }
      try {
        await nats?.drain();
      } catch (err) {
        logger.error('nats drain error', { err });
      }
      try {
        await pool?.end();
      } catch (err) {
        logger.error('pool end error', { err });
      }
      process.exit(0);
    };

    process.once('SIGTERM', () => void shutdown('SIGTERM'));
    process.once('SIGINT', () => void shutdown('SIGINT'));
  } catch (err) {
    logger.error('service.applications failed to start', { err });
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
