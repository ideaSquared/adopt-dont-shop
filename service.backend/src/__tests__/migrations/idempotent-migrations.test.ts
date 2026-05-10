/**
 * Idempotency tests for the rebaseline-coexistence patches on migrations
 * 04, 12, and 14.
 *
 * Each of these legacy migrations overlaps with an object created by one
 * of the per-model baseline files (`00-baseline-NNN-*.ts`). On a fresh DB
 * the per-model baseline runs first, so the legacy migration's `up()`
 * must be a no-op for the already-existing object while still creating it
 * on existing DBs that were bootstrapped from the old monolithic
 * `00-baseline.ts`.
 *
 * Tests are Postgres-only because the patches use Postgres-specific
 * `IF NOT EXISTS` syntax and `pg_constraint` / `information_schema`
 * lookups.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import sequelize from '../../sequelize';
import migration04 from '../../migrations/04-add-invitation-indexes-and-constraints';
import migration12 from '../../migrations/12-create-user-consents';
import migration14 from '../../migrations/14-add-revoked-tokens-updated-at';
import * as models from '../../models';

void models;

const isPostgres = sequelize.getDialect() === 'postgres';
const describeIfPostgres = isPostgres ? describe : describe.skip;

const queryInterface = sequelize.getQueryInterface();

const indexExists = async (table: string, name: string): Promise<boolean> => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM pg_indexes WHERE tablename = '${table}' AND indexname = '${name}'`
  );
  return (rows as unknown[]).length > 0;
};

const constraintExists = async (name: string): Promise<boolean> => {
  const [rows] = await sequelize.query(`SELECT 1 FROM pg_constraint WHERE conname = '${name}'`);
  return (rows as unknown[]).length > 0;
};

const tableExists = async (name: string): Promise<boolean> => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = '${name}'`
  );
  return (rows as unknown[]).length > 0;
};

const columnExists = async (table: string, column: string): Promise<boolean> => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.columns
       WHERE table_name = '${table}' AND column_name = '${column}'`
  );
  return (rows as unknown[]).length > 0;
};

const countColumns = async (table: string): Promise<number> => {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*)::int AS n FROM information_schema.columns WHERE table_name = '${table}'`
  );
  return (rows as Array<{ n: number }>)[0].n;
};

describeIfPostgres('rebaseline-coexistence idempotency patches', () => {
  beforeEach(async () => {
    // Each test starts from a clean schema rebuilt from models.
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('migration 04 — invitation indexes / constraint', () => {
    const indexes = [
      'invitations_rescue_id_idx',
      'invitations_user_id_idx',
      'invitations_email_idx',
    ];

    it('up() is a no-op when indexes and unique constraint already exist (fresh-DB-with-baseline path)', async () => {
      // Pre-create everything as the per-model baseline would.
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS "invitations_rescue_id_idx" ON "invitations" ("rescue_id")`
      );
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS "invitations_user_id_idx" ON "invitations" ("user_id")`
      );
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS "invitations_email_idx" ON "invitations" ("email")`
      );
      if (!(await constraintExists('invitations_token_unique'))) {
        await sequelize.query(
          `ALTER TABLE "invitations" ADD CONSTRAINT "invitations_token_unique" UNIQUE ("token")`
        );
      }

      await expect(migration04.up(queryInterface)).resolves.not.toThrow();

      for (const name of indexes) {
        expect(await indexExists('invitations', name)).toBe(true);
      }
      expect(await constraintExists('invitations_token_unique')).toBe(true);
    });

    it('up() creates the indexes and constraint when they do not exist (existing-DB-from-old-monolithic-baseline path)', async () => {
      // Drop everything the migration is responsible for.
      await sequelize.query(
        `ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_token_unique"`
      );
      for (const name of indexes) {
        await sequelize.query(`DROP INDEX IF EXISTS "${name}"`);
      }

      await migration04.up(queryInterface);

      for (const name of indexes) {
        expect(await indexExists('invitations', name)).toBe(true);
      }
      expect(await constraintExists('invitations_token_unique')).toBe(true);
    });
  });

  describe('migration 12 — user_consents table', () => {
    it('up() is a no-op when user_consents already exists (fresh-DB-with-baseline path)', async () => {
      // sync() already created user_consents from the model. Snapshot the
      // pre-state so we can assert up() did not alter it.
      expect(await tableExists('user_consents')).toBe(true);
      const colsBefore = await countColumns('user_consents');
      const indexBefore = await indexExists('user_consents', 'user_consents_user_purpose_idx');

      await expect(migration12.up(queryInterface)).resolves.not.toThrow();

      expect(await tableExists('user_consents')).toBe(true);
      expect(await countColumns('user_consents')).toBe(colsBefore);
      expect(await indexExists('user_consents', 'user_consents_user_purpose_idx')).toBe(
        indexBefore
      );
    });

    it('up() creates the table when it does not exist (existing-DB-from-old-monolithic-baseline path)', async () => {
      // Drop the model-created table; the migration should re-create it
      // using its own (older) shape.
      await sequelize.query(`DROP TABLE IF EXISTS "user_consents"`);
      // Drop the enum so up() can re-create it.
      await sequelize.query(`DROP TYPE IF EXISTS "enum_user_consents_purpose"`);
      expect(await tableExists('user_consents')).toBe(false);

      await migration12.up(queryInterface);

      expect(await tableExists('user_consents')).toBe(true);
      expect(await indexExists('user_consents', 'user_consents_user_purpose_idx')).toBe(true);
    });
  });

  describe('migration 14 — revoked_tokens.updated_at column', () => {
    it('up() is a no-op when updated_at already exists (fresh-DB-with-baseline path)', async () => {
      // Model already declares updated_at; ensure it is present before
      // running the migration.
      if (!(await columnExists('revoked_tokens', 'updated_at'))) {
        await sequelize.query(
          `ALTER TABLE "revoked_tokens"
             ADD COLUMN "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`
        );
      }
      const colsBefore = await countColumns('revoked_tokens');

      await expect(migration14.up(queryInterface)).resolves.not.toThrow();

      expect(await columnExists('revoked_tokens', 'updated_at')).toBe(true);
      expect(await countColumns('revoked_tokens')).toBe(colsBefore);
    });

    it('up() adds updated_at when it does not exist (existing-DB-from-old-monolithic-baseline path)', async () => {
      await sequelize.query(`ALTER TABLE "revoked_tokens" DROP COLUMN IF EXISTS "updated_at"`);
      expect(await columnExists('revoked_tokens', 'updated_at')).toBe(false);

      await migration14.up(queryInterface);

      expect(await columnExists('revoked_tokens', 'updated_at')).toBe(true);
    });
  });
});
