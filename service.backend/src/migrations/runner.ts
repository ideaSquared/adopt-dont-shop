/**
 * Migration runner — replaces `sequelize-cli`.
 *
 * Sequelize 7 dropped first-party `sequelize-cli` support and the
 * community-recommended replacement is `umzug` (the same engine
 * sequelize-cli was built on, just exposed directly). This runner is a
 * thin shell over umzug pointed at our `SequelizeMeta` table, kept
 * identical in name and column shape to what sequelize-cli used so an
 * existing prod DB can be migrated to the new runner without renaming
 * tables.
 *
 * Today the `migrations/` directory is empty by design — schema is
 * derived from models via `sequelize.sync()` for dev and the first
 * production migration will be written when the project hits prod.
 * The runner is therefore a no-op until that first migration lands, at
 * which point `npm run db:migrate` starts applying it.
 *
 * Migration file shape (preserved from sequelize-cli):
 *
 *   import type { QueryInterface } from 'sequelize';
 *   export default {
 *     up: async (queryInterface: QueryInterface) => { ... },
 *     down: async (queryInterface: QueryInterface) => { ... },
 *   };
 */

import type { QueryInterface } from 'sequelize';
import { SequelizeStorage, Umzug } from 'umzug';
import type { SequelizeStorageConstructorOptions } from 'umzug/lib/storage/sequelize';

// SequelizeStorageConstructorOptions is a union of two SetRequired branches —
// pick the one that requires `sequelize` so we can name the expected type.
type UmzugSequelizeType = Extract<
  SequelizeStorageConstructorOptions,
  { sequelize: unknown }
>['sequelize'];
import sequelize from '../sequelize';
import { logger } from '../utils/logger';

type MigrationModule = {
  default: {
    up: (queryInterface: QueryInterface) => Promise<unknown>;
    down: (queryInterface: QueryInterface) => Promise<unknown>;
  };
};

const migrationsDir = __dirname;

export const umzug = new Umzug({
  migrations: {
    // Match both .ts (dev/test via ts-node) and .js (prod compiled) so
    // the same runner works from src/ and dist/ without conditional logic.
    glob: [
      '*.{ts,js}',
      {
        cwd: migrationsDir,
        ignore: ['runner.{ts,js}', '_helpers.{ts,js}', '*.test.{ts,js}', '*.d.ts'],
      },
    ],
    resolve: ({ name, path: filePath, context }) => {
      if (!filePath) {
        throw new Error(`Migration ${name} has no resolved file path`);
      }
      return {
        name,
        up: async () => {
          const mod = (await import(filePath)) as MigrationModule;
          return mod.default.up(context);
        },
        down: async () => {
          const mod = (await import(filePath)) as MigrationModule;
          return mod.default.down(context);
        },
      };
    },
  },
  context: sequelize.getQueryInterface(),
  // umzug's SequelizeStorage typings still target Sequelize 6's shape
  // (its `SequelizeType` expects `dialect?: { name?: string }`), but the
  // runtime contract is unchanged. We narrow with the local alias rather
  // than `any` so we still get autocomplete on the rest of the option bag.
  storage: new SequelizeStorage({
    sequelize: sequelize as unknown as UmzugSequelizeType,
    modelName: 'SequelizeMeta',
  }),
  logger: {
    info: event => logger.info('[umzug]', event),
    warn: event => logger.warn('[umzug]', event),
    error: event => logger.error('[umzug]', event),
    debug: event => logger.debug('[umzug]', event),
  },
});

const main = async () => {
  const [, , command, ...rest] = process.argv;

  switch (command) {
    case 'up':
    case 'db:migrate':
      await umzug.up();
      break;
    case 'down':
    case 'db:migrate:undo':
      await umzug.down({ step: rest[0] ? Number(rest[0]) : 1 });
      break;
    case 'status':
    case 'db:migrate:status': {
      const pending = await umzug.pending();
      const executed = await umzug.executed();
      logger.info('[umzug] executed', {
        count: executed.length,
        migrations: executed.map(m => m.name),
      });
      logger.info('[umzug] pending', {
        count: pending.length,
        migrations: pending.map(m => m.name),
      });
      break;
    }
    default:
      throw new Error(`Unknown command: ${command}. Use up | down | status`);
  }
};

if (require.main === module) {
  main()
    .catch(err => {
      logger.error('[umzug] failed', { err });
      process.exitCode = 1;
    })
    .finally(() => sequelize.close());
}
