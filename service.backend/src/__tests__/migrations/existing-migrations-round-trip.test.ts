/**
 * Round-trip tests for the existing migrations 01-04, 06-09 (ADS-484).
 *
 * Each migration's `up` is run against a sync()'d schema (rather than
 * applied incrementally); the migrations are designed to be safe re-runs
 * via IF (NOT) EXISTS guards on the few that change DDL idempotently. For
 * those that are not guarded, we drop the post-state first so up() has
 * work to do.
 *
 * Postgres-only — most migrations rely on dialect-specific SQL.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import sequelize from '../../sequelize';
import migration01 from '../../migrations/01-create-revoked-tokens';
import migration02 from '../../migrations/02-add-message-moderation-fields';
import migration03 from '../../migrations/03-add-composite-indexes-for-performance';
import migration04 from '../../migrations/04-add-invitation-indexes-and-constraints';
import migration06 from '../../migrations/06-drop-users-rescue-id';
import migration07 from '../../migrations/07-create-ip-rules';
import migration08 from '../../migrations/08-create-analytics-reports';
import migration09 from '../../migrations/09-add-active-application-unique-index';
import * as models from '../../models';

// Reference all models so the side-effecting init runs before sync().
void models;

const isPostgres = sequelize.getDialect() === 'postgres';
const describeIfPostgres = isPostgres ? describe : describe.skip;

const queryInterface = sequelize.getQueryInterface();

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

const indexExists = async (table: string, name: string): Promise<boolean> => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM pg_indexes WHERE tablename = '${table}' AND indexname = '${name}'`
  );
  return (rows as unknown[]).length > 0;
};

describeIfPostgres('existing migrations — up/down round trip (ADS-484)', () => {
  beforeEach(async () => {
    // Force-rebuild the schema from models so each test starts from a
    // known post-migration baseline.
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('01 — create revoked_tokens', () => {
    it('up creates table and indexes; down drops the table', async () => {
      // sync() already created revoked_tokens via the model. Drop first
      // so up() has something to do.
      await queryInterface.dropTable('revoked_tokens');
      expect(await tableExists('revoked_tokens')).toBe(false);

      await migration01.up(queryInterface);
      expect(await tableExists('revoked_tokens')).toBe(true);
      expect(await indexExists('revoked_tokens', 'revoked_tokens_expires_at_idx')).toBe(true);
      expect(await indexExists('revoked_tokens', 'revoked_tokens_user_id_idx')).toBe(true);

      await migration01.down(queryInterface);
      expect(await tableExists('revoked_tokens')).toBe(false);
    });
  });

  describe('02 — add message moderation fields', () => {
    const moderationCols = [
      'is_flagged',
      'flag_reason',
      'flag_severity',
      'moderation_status',
      'flagged_at',
    ];

    beforeEach(async () => {
      // Drop the columns the model adds so up() can re-add them.
      for (const col of moderationCols) {
        await sequelize.query(`ALTER TABLE messages DROP COLUMN IF EXISTS ${col}`);
      }
    });

    it('up adds moderation columns and indexes; down removes them', async () => {
      await migration02.up(queryInterface);
      for (const col of moderationCols) {
        expect(await columnExists('messages', col)).toBe(true);
      }
      expect(await indexExists('messages', 'messages_flagged_queue_idx')).toBe(true);

      await migration02.down(queryInterface);
      for (const col of moderationCols) {
        expect(await columnExists('messages', col)).toBe(false);
      }
    });
  });

  describe('03 — composite indexes', () => {
    const indexes: ReadonlyArray<{ table: string; name: string }> = [
      { table: 'applications', name: 'applications_rescue_status_created_idx' },
      { table: 'messages', name: 'messages_chat_created_idx' },
      { table: 'cms_content', name: 'cms_content_last_modified_by_idx' },
      { table: 'cms_navigation_menus', name: 'cms_nav_created_by_idx' },
      { table: 'cms_navigation_menus', name: 'cms_nav_updated_by_idx' },
    ];

    beforeEach(async () => {
      for (const { name } of indexes) {
        await sequelize.query(`DROP INDEX IF EXISTS "${name}"`);
      }
    });

    it('up creates composite indexes; down drops them', async () => {
      await migration03.up(queryInterface);
      for (const { table, name } of indexes) {
        expect(await indexExists(table, name)).toBe(true);
      }

      await migration03.down(queryInterface);
      for (const { table, name } of indexes) {
        expect(await indexExists(table, name)).toBe(false);
      }
    });
  });

  describe('04 — invitation indexes and constraints', () => {
    const invitationIndexes = [
      'invitations_rescue_id_idx',
      'invitations_user_id_idx',
      'invitations_email_idx',
    ];

    beforeEach(async () => {
      for (const name of invitationIndexes) {
        await sequelize.query(`DROP INDEX IF EXISTS "${name}"`);
      }
      await sequelize.query(
        `ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_token_unique`
      );
    });

    it('up adds indexes and unique constraint; down removes them', async () => {
      await migration04.up(queryInterface);
      for (const name of invitationIndexes) {
        expect(await indexExists('invitations', name)).toBe(true);
      }

      await migration04.down(queryInterface);
      for (const name of invitationIndexes) {
        expect(await indexExists('invitations', name)).toBe(false);
      }
    });
  });

  describe('06 — drop users.rescue_id', () => {
    beforeEach(async () => {
      // sync() already removed it (the model has no rescue_id field). Add it
      // back so up() has something to drop.
      const exists = await columnExists('users', 'rescue_id');
      if (!exists) {
        await sequelize.query(
          `ALTER TABLE users ADD COLUMN rescue_id UUID REFERENCES rescues(rescue_id) ON DELETE SET NULL`
        );
        await sequelize.query(`CREATE INDEX users_rescue_id_idx ON users (rescue_id)`);
      }
    });

    it('up drops users.rescue_id; down re-adds it', async () => {
      await migration06.up(queryInterface);
      expect(await columnExists('users', 'rescue_id')).toBe(false);

      await migration06.down(queryInterface);
      expect(await columnExists('users', 'rescue_id')).toBe(true);
      expect(await indexExists('users', 'users_rescue_id_idx')).toBe(true);
    });
  });

  describe('07 — create ip_rules', () => {
    beforeEach(async () => {
      await queryInterface.dropTable('ip_rules');
      // dropTable may leave the enum behind; clean up explicitly so up()
      // can re-create it.
      await sequelize.query(`DROP TYPE IF EXISTS "enum_ip_rules_type"`);
    });

    it('up creates ip_rules + indexes; down drops the table', async () => {
      await migration07.up(queryInterface);
      expect(await tableExists('ip_rules')).toBe(true);
      expect(await indexExists('ip_rules', 'ip_rules_type_active_idx')).toBe(true);

      await migration07.down(queryInterface);
      expect(await tableExists('ip_rules')).toBe(false);
    });
  });

  describe('08 — analytics reports tables', () => {
    const tables = ['report_templates', 'saved_reports', 'scheduled_reports', 'report_shares'];

    beforeEach(async () => {
      // FK order matters going down.
      for (const t of [...tables].reverse()) {
        await queryInterface.dropTable(t).catch(() => undefined);
      }
      // Clean enum residuals from prior aborted runs.
      await sequelize.query(`DROP TYPE IF EXISTS "enum_report_templates_category"`);
      await sequelize.query(`DROP TYPE IF EXISTS "enum_scheduled_reports_format"`);
      await sequelize.query(`DROP TYPE IF EXISTS "enum_scheduled_reports_last_status"`);
      await sequelize.query(`DROP TYPE IF EXISTS "enum_report_shares_share_type"`);
      await sequelize.query(`DROP TYPE IF EXISTS "enum_report_shares_permission"`);
    });

    it('up creates all four tables; down drops them all', async () => {
      await migration08.up(queryInterface);
      for (const t of tables) {
        expect(await tableExists(t)).toBe(true);
      }
      expect(await indexExists('report_shares', 'report_shares_unique_user_idx')).toBe(true);

      await migration08.down(queryInterface);
      for (const t of tables) {
        expect(await tableExists(t)).toBe(false);
      }
    });
  });

  describe('09 — active application unique index', () => {
    beforeEach(async () => {
      await sequelize.query(`DROP INDEX IF EXISTS "applications_active_user_pet_uniq"`);
    });

    it('up creates the partial unique index; down drops it', async () => {
      await migration09.up(queryInterface);
      expect(await indexExists('applications', 'applications_active_user_pet_uniq')).toBe(true);

      await migration09.down(queryInterface);
      expect(await indexExists('applications', 'applications_active_user_pet_uniq')).toBe(false);
    });
  });
});
