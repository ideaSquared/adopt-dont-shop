// Migration entry point — runs the rescue.* schema migrations via
// @adopt-dont-shop/db (which wraps node-pg-migrate with the four
// CAD-lesson fixes: createSchema, ignorePattern, search_path,
// advisory-lock retry).
//
// Invoked by `npm run db:migrate`. Production deploys run a compiled
// version against dist/migrations/.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runMigrations } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';

import { loadConfig } from '../config.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.rescue.migrate' });
  try {
    const config = loadConfig();
    logger.info('running migrations', {
      schema: config.schema,
      migrationsDir: MIGRATIONS_DIR,
    });
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
