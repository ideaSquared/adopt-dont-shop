import { connect, type NatsConnection } from 'nats';

import { createDbClient } from '@adopt-dont-shop/db';
import { type SubscriptionHandle } from '@adopt-dont-shop/events';
import { createLogger } from '@adopt-dont-shop/observability';
import { runServiceShutdown } from '@adopt-dont-shop/service-bootstrap';

import { loadConfig } from './config.js';
import { startGrpcServer, type RunningGrpcServer } from './grpc/server.js';
import { registerGdprSubscribers } from './nats/gdpr-subscribers.js';
import { createGdprSagaMetrics, recordGdprSagaStates } from './nats/gdpr-metrics.js';
import { runGdprSweep, GDPR_SAGA_DEADLINE_MS, GDPR_SAGA_MAX_RETRIES } from './nats/gdpr-sweep.js';
import { registerSubscribers } from './nats/subscribers.js';
import { startScheduler, type RunningScheduler } from './scheduler/scheduler.js';
import { createServer } from './server.js';

const GDPR_SWEEP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.audit' });

  let nats: NatsConnection | undefined;
  let pool: ReturnType<typeof createDbClient> | undefined;
  let grpc: RunningGrpcServer | undefined;
  let subscriptions: SubscriptionHandle[] = [];
  let scheduler: RunningScheduler | undefined;
  let grpcReady = false;

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
    grpcReady = true;

    // NATS subscribers register AFTER the gRPC server is up so the
    // service is never in a state where it's accepting NATS messages
    // without being able to serve any query routed through gRPC.
    // Phase 10.4 — subscribes to *.actionTaken; persists every event.
    subscriptions = [
      ...registerSubscribers({ nats, pool, logger }),
      ...registerGdprSubscribers({ nats, pool, logger }),
    ];

    // ADS-830 — GDPR saga sweep scheduler.
    // Two jobs per tick:
    //   1. gdpr-sweep: marks overdue sagas timed_out, retries errored ones.
    //   2. gdpr-metrics: refreshes the gdpr_sagas gauge.
    const gdprMetrics = createGdprSagaMetrics();
    const deadlineMs =
      process.env.GDPR_SAGA_DEADLINE_MS !== undefined
        ? Number(process.env.GDPR_SAGA_DEADLINE_MS)
        : GDPR_SAGA_DEADLINE_MS;
    const maxRetries =
      process.env.GDPR_SAGA_MAX_RETRIES !== undefined
        ? Number(process.env.GDPR_SAGA_MAX_RETRIES)
        : GDPR_SAGA_MAX_RETRIES;

    scheduler = startScheduler(
      [
        {
          name: 'gdpr-sweep',
          intervalMs: GDPR_SWEEP_INTERVAL_MS,
          runOnStart: true,
          run: async () => {
            await runGdprSweep({ pool: pool!, nats: nats!, logger, deadlineMs, maxRetries });
          },
        },
        {
          name: 'gdpr-metrics',
          intervalMs: GDPR_SWEEP_INTERVAL_MS,
          runOnStart: true,
          run: async () => {
            await recordGdprSagaStates({ pool: pool!, metrics: gdprMetrics });
          },
        },
      ],
      { logger }
    );

    const httpServer = createServer({ config, logger, isReady: () => grpcReady });
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
        await scheduler?.stop();
      } catch (err) {
        logger.error('scheduler stop error', { err });
      }
      await runServiceShutdown({ httpServer, grpc, nats, pool, logger });
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
