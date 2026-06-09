import { connect, type NatsConnection } from 'nats';

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';

import { loadConfig } from './config.js';
import { createProvider } from './email/providers/factory.js';
import { startEmailWorker, type RunningEmailWorker } from './email/worker.js';
import { startGrpcServer, type RunningGrpcServer } from './grpc/server.js';
import { registerSubscribers } from './nats/subscribers.js';
import { createPushProvider } from './push/providers/factory.js';
import { startPushWorker, type RunningPushWorker } from './push/worker.js';
import { runWeeklyDigest } from './scheduler/jobs/weekly-digest.js';
import { startScheduler, type RunningScheduler } from './scheduler/scheduler.js';
import { createServer } from './server.js';

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.notifications' });

  let nats: NatsConnection | undefined;
  let pool: Awaited<ReturnType<typeof createDbClient>> | undefined;
  let grpc: RunningGrpcServer | undefined;
  let emailWorker: RunningEmailWorker | undefined;
  let pushWorker: RunningPushWorker | undefined;
  let scheduler: RunningScheduler | undefined;
  let httpClosed = false;

  try {
    const config = loadConfig();

    // Order: connect deps FIRST, then start servers. If pg or NATS is
    // unreachable, we crash here rather than start handling traffic
    // we can't serve.
    pool = createDbClient({
      connectionString: config.databaseUrl,
      schema: config.schema,
    });
    nats = await connect({ servers: config.natsUrl });

    grpc = await startGrpcServer({ config, pool, nats, logger });
    // NATS subscribers register AFTER gRPC so a fast event arriving on
    // applications.submitted before we're ready to handle gRPC calls
    // can't race against partially-constructed deps. Shutdown drains the
    // whole NATS connection later, which transparently cancels these.
    registerSubscribers({ nats, deps: { pool, nats }, logger });

    // GDPR erasure subscriber — drops the user's notifications + prefs
    // + device tokens. Reported back via gdpr.erasureCompleted.
    const { registerGdprSubscriber } = await import('@adopt-dont-shop/events');
    const { eraseNotifications } = await import('./gdpr/erase.js');
    registerGdprSubscriber({
      nats,
      pool,
      service: 'notifications',
      erase: eraseNotifications,
      onError: (err, subject) => logger.error('gdpr erasure subscriber error', { subject, err }),
    });
    // Email worker drains the email_queue table. Enabled by default;
    // tests + the migrations-only smoke set EMAIL_WORKER_ENABLED=false
    // to keep the loop quiet. Provider factory enforces ADS-549 (no
    // silent console fallback in prod).
    if (config.emailWorkerEnabled) {
      const emailProviderConfig =
        config.emailProvider.kind === 'resend'
          ? ({
              kind: 'resend',
              resend: {
                apiKey: config.emailProvider.apiKey,
                fromEmail: config.emailProvider.fromEmail,
                fromName: config.emailProvider.fromName,
                replyTo: config.emailProvider.replyTo,
              },
            } as const)
          : config.emailProvider;
      const provider = createProvider({ config: emailProviderConfig, logger });
      if (!provider.validateConfiguration()) {
        throw new Error(`email provider '${provider.getName()}' failed validateConfiguration()`);
      }
      emailWorker = startEmailWorker({ pool, nats, provider, logger });
      logger.info('email worker started', { provider: provider.getName() });
    }
    if (config.pushWorkerEnabled) {
      const pushProviderConfig =
        config.pushProvider.kind === 'fcm'
          ? ({
              kind: 'fcm',
              fcm: {
                serviceAccountJson: config.pushProvider.serviceAccountJson,
                projectId: config.pushProvider.projectId,
              },
            } as const)
          : config.pushProvider;
      const provider = createPushProvider({ config: pushProviderConfig, logger });
      if (!provider.validateConfiguration()) {
        throw new Error(`push provider '${provider.getName()}' failed validateConfiguration()`);
      }
      pushWorker = startPushWorker({ pool, nats, provider, logger });
    }
    if (config.schedulerEnabled) {
      // Weekly digest: 7 days. Default tick is 60s — close enough to
      // schedule precision for any cadence we run today. Each job's
      // intervalMs governs when it actually fires.
      const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      scheduler = startScheduler(
        [
          {
            name: 'weekly-digest',
            intervalMs: ONE_WEEK_MS,
            run: async () => {
              await runWeeklyDigest({ deps: { pool: pool!, nats: nats! }, logger });
            },
          },
        ],
        { logger }
      );
    }
    const httpServer = createServer({ config, logger });
    await httpServer.listen({ port: config.port, host: config.host });

    logger.info('service.notifications running', {
      http: { port: config.port, host: config.host },
      grpc: { port: grpc.port, host: config.host },
      schema: config.schema,
      natsUrl: config.natsUrl,
      environment: config.environment,
    });

    const shutdown = async (signal: string): Promise<void> => {
      logger.info('service.notifications shutting down', { signal });
      // Stop accepting new traffic first, then drain pending work.
      try {
        if (!httpClosed) {
          await httpServer.close();
          httpClosed = true;
        }
      } catch (err) {
        logger.error('http close error', { err });
      }
      try {
        await emailWorker?.stop();
      } catch (err) {
        logger.error('email worker stop error', { err });
      }
      try {
        await pushWorker?.stop();
      } catch (err) {
        logger.error('push worker stop error', { err });
      }
      try {
        await scheduler?.stop();
      } catch (err) {
        logger.error('scheduler stop error', { err });
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
    logger.error('service.notifications failed to start', { err });
    try {
      await grpc?.shutdown();
    } catch {
      // Swallow — we're already on the failure path.
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
