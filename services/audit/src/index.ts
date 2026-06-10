import { connect, type NatsConnection } from 'nats';

import { createDbClient } from '@adopt-dont-shop/db';
import { type SubscriptionHandle } from '@adopt-dont-shop/events';
import { createLogger } from '@adopt-dont-shop/observability';

import { loadConfig } from './config.js';
import { startGrpcServer, type RunningGrpcServer } from './grpc/server.js';
import { registerGdprSubscribers } from './nats/gdpr-subscribers.js';
import { registerSubscribers } from './nats/subscribers.js';
import { createServer } from './server.js';

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.audit' });

  let nats: NatsConnection | undefined;
  let pool: ReturnType<typeof createDbClient> | undefined;
  let grpc: RunningGrpcServer | undefined;
  let subscriptions: SubscriptionHandle[] = [];
  let httpClosed = false;

  try {
    const config = loadConfig();

    // Connect deps FIRST so we crash here rather than after starting
    // to accept traffic. Same boot order as services/rescue,
    // services/pets, etc.
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

    // NATS subscribers register AFTER the gRPC server is up so the
    // service is never in a state where it's accepting NATS messages
    // without being able to serve any query routed through gRPC.
    // Phase 10.4 — subscribes to *.actionTaken; persists every event.
    subscriptions = [
      ...registerSubscribers({ nats, pool, logger }),
      ...registerGdprSubscribers({ nats, pool, logger }),
    ];

    const httpServer = createServer({ config, logger });
    await httpServer.listen({ port: config.port, host: config.host });

    logger.info('service.audit running', {
      http: { port: config.port, host: config.host },
      grpc: { port: grpc.port, host: config.host },
      schema: config.schema,
      natsUrl: config.natsUrl,
      natsSubscriptions: subscriptions.length,
      environment: config.environment,
    });

    const shutdown = async (signal: string): Promise<void> => {
      logger.info('service.audit shutting down', { signal });
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
        // Draining the NatsConnection drains every Subscription on it
        // — no need to drain each subscription handle individually.
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
    logger.error('service.audit failed to start', { err });
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
