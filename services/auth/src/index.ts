import { connect, type NatsConnection } from 'nats';

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';

import { loadConfig } from './config.js';
import { createBcryptPasswordHasher } from './grpc/password-hasher.js';
import { startGrpcServer, type RunningGrpcServer } from './grpc/server.js';
import { createJwtTokenIssuer } from './grpc/token-issuer.js';
import { createServer } from './server.js';

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.auth' });

  let nats: NatsConnection | undefined;
  let pool: ReturnType<typeof createDbClient> | undefined;
  let grpc: RunningGrpcServer | undefined;
  let httpClosed = false;

  try {
    const config = loadConfig();

    // Connect deps FIRST so we crash here rather than after starting
    // to accept traffic. Same boot order as services/notifications.
    pool = createDbClient({
      connectionString: config.databaseUrl,
      schema: config.schema,
    });
    nats = await connect({ servers: config.natsUrl });

    const passwordHasher = createBcryptPasswordHasher();
    const tokenIssuer = createJwtTokenIssuer({
      accessSecret: config.jwtSecret,
      refreshSecret: config.jwtRefreshSecret,
    });

    grpc = await startGrpcServer({
      config,
      pool,
      nats,
      passwordHasher,
      tokenIssuer,
      logger,
    });

    // GDPR erasure subscriber. Listens on `gdpr.erasureRequested`,
    // scrubs the user's row + drops sessions/prefs/roles, then publishes
    // `gdpr.erasureCompleted` with service='auth'. The subscriber lives
    // for the whole process — drained on shutdown via nats.drain().
    const { registerGdprSubscriber } = await import('@adopt-dont-shop/events');
    const { eraseAuth } = await import('./gdpr/erase.js');
    registerGdprSubscriber({
      nats,
      pool,
      service: 'auth',
      erase: eraseAuth,
      onError: (err, subject) => logger.error('gdpr erasure subscriber error', { subject, err }),
    });

    const httpServer = createServer({ config, logger });
    await httpServer.listen({ port: config.port, host: config.host });

    logger.info('service.auth running', {
      http: { port: config.port, host: config.host },
      grpc: { port: grpc.port, host: config.host },
      schema: config.schema,
      natsUrl: config.natsUrl,
      environment: config.environment,
    });

    const shutdown = async (signal: string): Promise<void> => {
      logger.info('service.auth shutting down', { signal });
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
    logger.error('service.auth failed to start', { err });
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
