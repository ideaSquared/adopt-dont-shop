import type { NatsConnection } from 'nats';

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';
import {
  claimScheduledRun,
  startScheduler,
  type RunningScheduler,
  type ScheduledJob,
} from '@adopt-dont-shop/scheduler';
import {
  connectNats,
  installProcessErrorHandlers,
  runServiceShutdown,
} from '@adopt-dont-shop/service-bootstrap';

import { loadConfig } from './config.js';
import { createApplicationsClient } from './grpc/applications-client.js';
import { createAuthCohortClient } from './grpc/auth-client.js';
import { createPetsClient } from './grpc/pets-client.js';
import { createRescueClient } from './grpc/rescue-client.js';
import { validateAuthPrincipal } from './grpc/validate-auth-principal.js';
import {
  startEmailChannelWorker,
  type ResolveRecipient,
  type RunningEmailChannelWorker,
} from './email/channel-adapter.js';
import { createProvider } from './email/providers/factory.js';
import { startEmailWorker, type RunningEmailWorker } from './email/worker.js';
import { startGrpcServer, type RunningGrpcServer } from './grpc/server.js';
import { loadEmailQueueRetentionConfig } from './jobs/email-queue-retention-config.js';
import { purgeSentEmailQueue } from './jobs/email-queue-retention.js';
import {
  runWeeklyDigest,
  WEEKLY_DIGEST_ANCHOR_MS,
  WEEKLY_DIGEST_INTERVAL_MS,
} from './jobs/weekly-digest.js';
import { registerSubscribers } from './nats/subscribers.js';
import { createPushProvider } from './push/providers/factory.js';
import { startPushWorker, type RunningPushWorker } from './push/worker.js';
import { createServer } from './server.js';

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.notifications' });

  let nats: NatsConnection | undefined;
  let pool: Awaited<ReturnType<typeof createDbClient>> | undefined;
  let grpc: RunningGrpcServer | undefined;
  let emailWorker: RunningEmailWorker | undefined;
  let emailChannelWorker: RunningEmailChannelWorker | undefined;
  let pushWorker: RunningPushWorker | undefined;
  let scheduler: RunningScheduler | undefined;
  let grpcReady = false;

  try {
    const config = loadConfig();

    // Order: connect deps FIRST, then start servers. If pg or NATS is
    // unreachable, we crash here rather than start handling traffic
    // we can't serve.
    pool = createDbClient({
      connectionString: config.databaseUrl,
      schema: config.schema,
    });
    nats = await connectNats(config.natsUrl);
    // Create-or-update the JetStream DOMAIN_EVENTS stream before anything
    // publishes or subscribes. Idempotent across every service's boot.
    {
      const { ensureStream } = await import('@adopt-dont-shop/events');
      await ensureStream(nats);
    }

    // Drain the transactional outbox (ADS-1048): the relay publishes any
    // events the inline fast-path in withTransaction did not (a crash or NATS
    // outage in the commit→publish window) so no committed event is lost.
    const { startOutboxRelay } = await import('@adopt-dont-shop/events');
    const outboxRelay = startOutboxRelay({ pool, nats, logger });

    // Auth-cohort client for the Broadcast RPC. Only created when the
    // AUTH_GRPC_URL env is set; without it, Broadcast returns INTERNAL.
    const authClient = config.authGrpcUrl
      ? createAuthCohortClient({ address: config.authGrpcUrl })
      : undefined;

    // Boot validation: probe the auth service with the system principal
    // so a misconfigured svc-notifications seed is caught at startup
    // rather than silently failing on the first broadcast. Crashes on
    // PERMISSION_DENIED / UNAUTHENTICATED; tolerates UNAVAILABLE
    // (auth may still be starting).
    if (authClient) {
      await validateAuthPrincipal(authClient, logger);
    }

    // Cross-service clients for the cross-service event fan-out:
    //   - pets → pets.statusChanged (notify favouriters)
    //   - rescue → rescue.verified / rescue.rejected (notify staff)
    // Only created when their gRPC URL is set; without it the matching
    // fan-out no-ops gracefully (same degradation as Broadcast without auth).
    const petsClient = config.petsGrpcUrl
      ? createPetsClient({ address: config.petsGrpcUrl })
      : undefined;
    const rescueClient = config.rescueGrpcUrl
      ? createRescueClient({ address: config.rescueGrpcUrl })
      : undefined;
    // service.applications client for the weekly-digest job's
    // "still waiting on your shortlist" section (ADS-1270). Same
    // optional/no-op-gracefully treatment as petsClient/rescueClient above.
    const applicationsClient = config.applicationsGrpcUrl
      ? createApplicationsClient({ address: config.applicationsGrpcUrl })
      : undefined;

    grpc = await startGrpcServer({ config, pool, nats, logger, authClient });
    grpcReady = true;
    // NATS subscribers register AFTER gRPC so a fast event arriving on
    // applications.submitted before we're ready to handle gRPC calls
    // can't race against partially-constructed deps. Shutdown drains the
    // whole NATS connection later, which transparently cancels these.
    registerSubscribers({ nats, deps: { pool, nats }, logger, petsClient, rescueClient });

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
    // Email channel adapter: turns notifications.created into enqueued
    // transactional emails. Needs the auth client to resolve recipient
    // addresses; without it, we skip rather than enqueue address-less rows.
    if (config.emailChannelEnabled) {
      if (authClient) {
        const resolveRecipient: ResolveRecipient = async userId => {
          const res = await authClient.adminGetUser({ userId });
          const user = res.user;
          if (!user || !user.email) {
            return null;
          }
          const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
          return { email: user.email, name: name || undefined };
        };
        emailChannelWorker = startEmailChannelWorker({
          pool,
          nats,
          logger,
          resolveRecipient,
          fromEmail: config.defaultFromEmail,
          fromName: config.defaultFromName,
        });
      } else {
        logger.warn('email channel adapter disabled — no AUTH_GRPC_URL to resolve recipients');
      }
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
    // Scheduler + claim infra (ADS-1325: @adopt-dont-shop/scheduler, shared
    // with services/audit) backs the email-queue retention purge (ADS-1320):
    // 004_create_email_queue.ts documented a retention job that never
    // shipped, so sent rows accumulated forever.
    const emailQueueRetentionConfig = loadEmailQueueRetentionConfig();
    // Bound to a local const (not the outer `let pool`) so the claimRun
    // closure below type-narrows past `| undefined`.
    const dbPool = pool;
    const retentionDeps = { pool: dbPool, nats };
    const scheduledJobs: ScheduledJob[] = [
      {
        name: 'email-queue-retention-purge',
        intervalMs: emailQueueRetentionConfig.purgeIntervalMs,
        runOnStart: true,
        run: async () => {
          const { deletedCount } = await purgeSentEmailQueue(retentionDeps, {
            retentionDays: emailQueueRetentionConfig.retentionDays,
            batchSize: emailQueueRetentionConfig.batchSize,
          });
          logger.info('email-queue-retention-purge complete', { deletedCount });
        },
      },
    ];
    // ADS-1270: rebuild of the ADS-1245 weekly-digest scaffold, which was
    // shelved as send-nothing (its fan-out RPCs were never wired). Gated
    // OFF by default (WEEKLY_DIGEST_ENABLED) — a scheduled email send stays
    // dormant until explicitly enabled — and only registered when every
    // fan-out client it needs is actually configured; otherwise boot logs
    // why it didn't start rather than silently no-op forever.
    if (config.weeklyDigestEnabled) {
      if (authClient && petsClient && applicationsClient) {
        const digestDeps = {
          pool: dbPool,
          nats,
          authClient,
          petsClient,
          applicationsClient,
          logger,
        };
        scheduledJobs.push({
          name: 'weekly-digest',
          intervalMs: WEEKLY_DIGEST_INTERVAL_MS,
          anchorMs: WEEKLY_DIGEST_ANCHOR_MS,
          // Wait for the next Monday 09:00 UTC boundary rather than firing
          // on every boot/restart — unlike the retention purge, a false
          // start here sends real email.
          runOnStart: false,
          run: async () => {
            const result = await runWeeklyDigest(digestDeps);
            logger.info('weekly-digest complete', result);
          },
        });
      } else {
        logger.warn(
          'weekly-digest enabled but not started — requires AUTH_GRPC_URL, PETS_GRPC_URL and APPLICATIONS_GRPC_URL all set',
          {
            hasAuthClient: Boolean(authClient),
            hasPetsClient: Boolean(petsClient),
            hasApplicationsClient: Boolean(applicationsClient),
          }
        );
      }
    }
    scheduler = startScheduler(scheduledJobs, {
      logger,
      claimRun: (job, scheduledFor) => claimScheduledRun(dbPool, job, scheduledFor),
    });

    const httpServer = createServer({
      config,
      logger,
      isReady: () => grpcReady,
      readiness: { pool, nats },
    });
    await httpServer.listen({ port: config.port, host: config.host });

    logger.info('service.notifications running', {
      http: { port: config.port, host: config.host },
      grpc: { port: grpc.port, host: config.host },
      schema: config.schema,
      natsUrl: config.natsUrl,
      environment: config.environment,
    });

    const teardown = (): Promise<void> => {
      outboxRelay.stop();
      return runServiceShutdown({ httpServer, grpc, nats, pool, logger });
    };

    const shutdown = async (signal: string): Promise<void> => {
      logger.info('service.notifications shutting down', { signal });
      // Stop workers before draining the common deps.
      try {
        await emailWorker?.stop();
      } catch (err) {
        logger.error('email worker stop error', { err });
      }
      try {
        await emailChannelWorker?.stop();
      } catch (err) {
        logger.error('email channel worker stop error', { err });
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
      await teardown();
      process.exit(0);
    };

    process.once('SIGTERM', () => void shutdown('SIGTERM'));
    process.once('SIGINT', () => void shutdown('SIGINT'));

    // ADS-1040: last-resort handlers so an idle DB-pool 'error' event (or
    // any stray rejection) drains via the same teardown and exits non-zero,
    // instead of crashing the process undrained under `restart: always`.
    installProcessErrorHandlers({ logger, onFatal: teardown });
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
