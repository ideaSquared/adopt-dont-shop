import { randomUUID } from 'node:crypto';

import type { NatsConnection } from 'nats';

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';
import { PROTO_SCHEMA } from '@adopt-dont-shop/proto';
import {
  assertPrincipalVerificationConfig,
  connectNats,
  installProcessErrorHandlers,
  runServiceShutdown,
} from '@adopt-dont-shop/service-bootstrap';

import { createAuthService } from './auth.js';
import { loadConfig } from './config.js';
import { createGithubClient } from './github.js';
import { createGrpcCaller } from './grpc-caller.js';
import { createInvokeService } from './invoke.js';
import { createPgStore } from './pg-store.js';
import { createMethodResolver } from './proto-methods.js';
import { createServer } from './server.js';
import { createUnlocksService } from './unlocks.js';

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.ops' });

  let nats: NatsConnection | undefined;
  let pool: Awaited<ReturnType<typeof createDbClient>> | undefined;

  try {
    // Refuse to boot without PRINCIPAL_SIGNING_KEY (loadConfig also requires it).
    assertPrincipalVerificationConfig();
    const config = loadConfig();
    pool = createDbClient({ connectionString: config.databaseUrl, schema: config.schema });
    nats = await connectNats(config.natsUrl);
    const { ensureStream, startOutboxRelay } = await import('@adopt-dont-shop/events');
    await ensureStream(nats);
    const outboxRelay = startOutboxRelay({ pool, nats, logger });

    const store = createPgStore(pool, nats);
    const now = (): Date => new Date();
    const grpc = createGrpcCaller(config.grpcTargets);
    const auth = createAuthService({
      store,
      github:
        config.github === null ? null : createGithubClient({ fetchFn: fetch, ...config.github }),
      localLoginEnabled: config.authMode === 'local',
      sessionTtlHours: config.sessionTtlHours,
      now,
    });
    const invoke = createInvokeService({
      env: config.env,
      store,
      schema: PROTO_SCHEMA,
      resolveMethod: createMethodResolver(PROTO_SCHEMA),
      callGrpc: grpc.call,
      signingKey: config.principalSigningKey,
      now,
      logger,
    });
    const unlocks = createUnlocksService({
      env: config.env,
      store,
      discordWebhookUrl: config.discordWebhookUrl,
      fetchFn: fetch,
      now,
      logger,
      newId: randomUUID,
    });

    const httpServer = createServer({
      config,
      logger,
      auth,
      invoke,
      unlocks,
      store,
      schema: PROTO_SCHEMA,
      now,
      readiness: { pool, nats },
    });
    await httpServer.listen({ port: config.port, host: config.host });
    logger.info('service.ops running', {
      http: { port: config.port, host: config.host },
      opsEnv: config.env,
      authMode: config.authMode,
      unlocksEnabled: config.env === 'dev' || config.discordWebhookUrl !== undefined,
    });

    const teardown = async (): Promise<void> => {
      outboxRelay.stop();
      grpc.close();
      await runServiceShutdown({ httpServer, nats, pool, logger });
    };
    const shutdown = async (signal: string): Promise<void> => {
      logger.info('service.ops shutting down', { signal });
      await teardown();
      process.exit(0);
    };
    process.once('SIGTERM', () => void shutdown('SIGTERM'));
    process.once('SIGINT', () => void shutdown('SIGINT'));
    installProcessErrorHandlers({ logger, onFatal: teardown });
  } catch (err) {
    logger.error('service.ops failed to start', {
      message: err instanceof Error ? err.message : 'unknown',
    });
    await nats?.drain().catch(() => undefined);
    await pool?.end().catch(() => undefined);
    process.exit(1);
  }
};

void main();
