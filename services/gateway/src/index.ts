import { createLogger } from '@adopt-dont-shop/observability';

import { loadConfig } from './config.js';
import { createServer } from './server.js';

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.gateway' });

  try {
    const config = loadConfig();
    const server = createServer({ config, logger });

    await server.listen({ port: config.port, host: config.host });

    logger.info('service.gateway listening', {
      port: config.port,
      host: config.host,
      upstream: config.upstreamBackendUrl,
      environment: config.environment,
    });

    const shutdown = async (signal: string): Promise<void> => {
      logger.info('service.gateway shutting down', { signal });
      try {
        await server.close();
      } catch (err) {
        logger.error('error during shutdown', { err });
      }
      process.exit(0);
    };

    process.once('SIGTERM', () => void shutdown('SIGTERM'));
    process.once('SIGINT', () => void shutdown('SIGINT'));
  } catch (err) {
    logger.error('service.gateway failed to start', { err });
    process.exit(1);
  }
};

void main();
