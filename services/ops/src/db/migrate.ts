// Migration entry point — runs the ops.* schema migrations via
// @adopt-dont-shop/db (which wraps node-pg-migrate with the four
// CAD-lesson fixes: createSchema, ignorePattern, search_path,
// advisory-lock retry).

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { runMigrations } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';

import { loadDatabaseConfig } from '../config.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.ops.migrate' });
  try {
    const config = loadDatabaseConfig();
    logger.info('running migrations', { schema: config.schema, migrationsDir: MIGRATIONS_DIR });
    await runMigrations({
      databaseUrl: config.databaseUrl,
      schema: config.schema,
      migrationsDir: MIGRATIONS_DIR,
    });
    logger.info('migrations complete');
  } catch (err) {
    logger.error('migrations failed', {
      message: (err as Error)?.message,
      stack: (err as Error)?.stack,
    });
    console.error(err);
    process.exit(1);
  }
};

void main();
