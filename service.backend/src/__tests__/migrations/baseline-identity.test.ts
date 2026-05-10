/**
 * Round-trip tests for the per-model baseline migrations covering the
 * Identity & auth domain (rebaseline 1/10).
 *
 *   00-baseline-001-users
 *   00-baseline-002-roles
 *   00-baseline-003-permissions
 *   00-baseline-004-role-permissions
 *   00-baseline-005-user-roles
 *   00-baseline-006-refresh-tokens
 *   00-baseline-007-revoked-tokens
 *   00-baseline-008-ip-rules
 *   00-baseline-009-field-permissions
 *   00-baseline-010-staff-members
 *   00-baseline-011-invitations
 *
 * Each test runs `up` against an empty schema (no model state — we drop
 * any table the model would have created via sync() so up() actually has
 * work to do), asserts the table + expected indexes exist, then runs
 * `down` and asserts the table is gone. Postgres-only — the migration
 * bodies use dialect-specific features (CITEXT, ENUM types, GEOMETRY)
 * that have no SQLite equivalent.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import sequelize from '../../sequelize';
import baseline001 from '../../migrations/00-baseline-001-users';
import baseline002 from '../../migrations/00-baseline-002-roles';
import baseline003 from '../../migrations/00-baseline-003-permissions';
import baseline004 from '../../migrations/00-baseline-004-role-permissions';
import baseline005 from '../../migrations/00-baseline-005-user-roles';
import baseline006 from '../../migrations/00-baseline-006-refresh-tokens';
import baseline007 from '../../migrations/00-baseline-007-revoked-tokens';
import baseline008 from '../../migrations/00-baseline-008-ip-rules';
import baseline009 from '../../migrations/00-baseline-009-field-permissions';
import baseline010 from '../../migrations/00-baseline-010-staff-members';
import baseline011 from '../../migrations/00-baseline-011-invitations';

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

type ColumnInfo = { data_type: string; udt_name: string; is_nullable: string };

const describeColumn = async (table: string, column: string): Promise<ColumnInfo | undefined> => {
  const [rows] = await sequelize.query(
    `SELECT data_type, udt_name, is_nullable FROM information_schema.columns
       WHERE table_name = '${table}' AND column_name = '${column}'`
  );
  return (rows as ColumnInfo[])[0];
};

/**
 * Drop tables (and their dependent ENUMs) in reverse-creation order before
 * each test so `up()` always operates on an empty schema. We can't use
 * sequelize.sync({ force: true }) here because that would *create* the
 * tables, defeating the test.
 *
 * The list intentionally enumerates every table the suite touches; CASCADE
 * handles the unlikely-but-possible case of a stray dependent object.
 */
const TABLES = [
  'invitations',
  'staff_members',
  'field_permissions',
  'ip_rules',
  'revoked_tokens',
  'refresh_tokens',
  'user_roles',
  'role_permissions',
  'permissions',
  'roles',
  'users',
] as const;

const ENUMS = [
  'enum_users_status',
  'enum_users_user_type',
  'enum_ip_rules_type',
  'enum_field_permissions_resource',
  'enum_field_permissions_access_level',
] as const;

const dropAll = async (): Promise<void> => {
  for (const table of TABLES) {
    await sequelize.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
  }
  for (const enumName of ENUMS) {
    await sequelize.query(`DROP TYPE IF EXISTS "${enumName}"`);
  }
};

// Destructive `down()` is gated by env vars (assertDestructiveDownAcknowledged);
// set them once for the whole suite. The key changes per-migration so each
// test sets it before invoking down().
const setDownKey = (key: string): void => {
  process.env.MIGRATION_ALLOW_DESTRUCTIVE_DOWN = '1';
  process.env.MIGRATION_DESTRUCTIVE_DOWN_KEY = key;
};

const clearDownKey = (): void => {
  delete process.env.MIGRATION_ALLOW_DESTRUCTIVE_DOWN;
  delete process.env.MIGRATION_DESTRUCTIVE_DOWN_KEY;
};

describeIfPostgres('per-model baseline — Identity & auth (rebaseline 1/10)', () => {
  beforeAll(async () => {
    // Required for User.email (CITEXT). The other migrations don't need it
    // but creating it once is idempotent.
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS citext');
  });

  beforeEach(async () => {
    await dropAll();
    clearDownKey();
  });

  afterAll(async () => {
    clearDownKey();
    await sequelize.close();
  });

  describe('00-baseline-001-users', () => {
    it('up creates users with expected columns + indexes; down drops it', async () => {
      await baseline001.up(queryInterface);
      expect(await tableExists('users')).toBe(true);
      // Spot-check columns that exercise dialect-specific types and
      // paranoid/audit additions.
      expect((await describeColumn('users', 'email'))?.udt_name).toBe('citext');
      expect((await describeColumn('users', 'location'))?.udt_name).toBe('geometry');
      expect((await describeColumn('users', 'application_defaults'))?.udt_name).toBe('jsonb');
      expect(await columnExists('users', 'deleted_at')).toBe(true);
      expect(await columnExists('users', 'version')).toBe(true);
      expect(await columnExists('users', 'created_by')).toBe(true);
      expect(await indexExists('users', 'users_email_unique')).toBe(true);
      expect(await indexExists('users', 'users_deleted_at_idx')).toBe(true);
      expect(await indexExists('users', 'users_created_by_idx')).toBe(true);

      setDownKey('00-baseline-001-users');
      await baseline001.down(queryInterface);
      expect(await tableExists('users')).toBe(false);
    });

    it('down without env-var acknowledgement refuses to run', async () => {
      await baseline001.up(queryInterface);
      await expect(baseline001.down(queryInterface)).rejects.toThrow(/destructive/i);
    });
  });

  describe('00-baseline-002-roles', () => {
    it('up creates roles with the role_name column; down drops it', async () => {
      await baseline002.up(queryInterface);
      expect(await tableExists('roles')).toBe(true);
      // The model maps `name` → `role_name`; ensure the migration mirrors that.
      expect(await columnExists('roles', 'role_name')).toBe(true);
      expect(await columnExists('roles', 'name')).toBe(false);

      setDownKey('00-baseline-002-roles');
      await baseline002.down(queryInterface);
      expect(await tableExists('roles')).toBe(false);
    });
  });

  describe('00-baseline-003-permissions', () => {
    it('up creates permissions; down drops it', async () => {
      await baseline003.up(queryInterface);
      expect(await tableExists('permissions')).toBe(true);
      expect(await columnExists('permissions', 'permission_name')).toBe(true);

      setDownKey('00-baseline-003-permissions');
      await baseline003.down(queryInterface);
      expect(await tableExists('permissions')).toBe(false);
    });
  });

  describe('00-baseline-004-role-permissions', () => {
    it('up creates the junction table with composite PK; down drops it', async () => {
      await baseline004.up(queryInterface);
      expect(await tableExists('role_permissions')).toBe(true);
      // Composite primary key — both columns NOT NULL.
      expect((await describeColumn('role_permissions', 'role_id'))?.is_nullable).toBe('NO');
      expect((await describeColumn('role_permissions', 'permission_id'))?.is_nullable).toBe('NO');

      setDownKey('00-baseline-004-role-permissions');
      await baseline004.down(queryInterface);
      expect(await tableExists('role_permissions')).toBe(false);
    });
  });

  describe('00-baseline-005-user-roles', () => {
    it('up creates the junction table with composite PK; down drops it', async () => {
      await baseline005.up(queryInterface);
      expect(await tableExists('user_roles')).toBe(true);
      expect((await describeColumn('user_roles', 'user_id'))?.udt_name).toBe('uuid');
      expect((await describeColumn('user_roles', 'role_id'))?.udt_name).toBe('int4');

      setDownKey('00-baseline-005-user-roles');
      await baseline005.down(queryInterface);
      expect(await tableExists('user_roles')).toBe(false);
    });
  });

  describe('00-baseline-006-refresh-tokens', () => {
    it('up creates refresh_tokens with all five model-declared indexes; down drops it', async () => {
      await baseline006.up(queryInterface);
      expect(await tableExists('refresh_tokens')).toBe(true);
      expect(await indexExists('refresh_tokens', 'refresh_tokens_user_id_idx')).toBe(true);
      expect(await indexExists('refresh_tokens', 'refresh_tokens_family_id_idx')).toBe(true);
      expect(await indexExists('refresh_tokens', 'refresh_tokens_is_revoked_idx')).toBe(true);
      expect(await indexExists('refresh_tokens', 'refresh_tokens_expires_at_idx')).toBe(true);
      expect(await indexExists('refresh_tokens', 'refresh_tokens_user_family_idx')).toBe(true);

      setDownKey('00-baseline-006-refresh-tokens');
      await baseline006.down(queryInterface);
      expect(await tableExists('refresh_tokens')).toBe(false);
    });
  });

  describe('00-baseline-007-revoked-tokens', () => {
    it('up creates revoked_tokens including updated_at; down drops it', async () => {
      await baseline007.up(queryInterface);
      expect(await tableExists('revoked_tokens')).toBe(true);
      // updated_at was introduced in migration 14 — the baseline now reflects it.
      expect(await columnExists('revoked_tokens', 'updated_at')).toBe(true);
      expect(await indexExists('revoked_tokens', 'revoked_tokens_expires_at_idx')).toBe(true);
      expect(await indexExists('revoked_tokens', 'revoked_tokens_user_id_idx')).toBe(true);

      setDownKey('00-baseline-007-revoked-tokens');
      await baseline007.down(queryInterface);
      expect(await tableExists('revoked_tokens')).toBe(false);
    });
  });

  describe('00-baseline-008-ip-rules', () => {
    it('up creates ip_rules with native CIDR; down drops it and its enum', async () => {
      await baseline008.up(queryInterface);
      expect(await tableExists('ip_rules')).toBe(true);
      // The model declares cidr as DataTypes.CIDR — migration 13's promotion
      // is folded into the baseline.
      expect((await describeColumn('ip_rules', 'cidr'))?.udt_name).toBe('cidr');

      setDownKey('00-baseline-008-ip-rules');
      await baseline008.down(queryInterface);
      expect(await tableExists('ip_rules')).toBe(false);
    });
  });

  describe('00-baseline-009-field-permissions', () => {
    it('up creates field_permissions with composite unique + lookup indexes; down drops it', async () => {
      await baseline009.up(queryInterface);
      expect(await tableExists('field_permissions')).toBe(true);
      expect(await columnExists('field_permissions', 'deleted_at')).toBe(true);
      expect(await indexExists('field_permissions', 'unique_field_permission')).toBe(true);

      setDownKey('00-baseline-009-field-permissions');
      await baseline009.down(queryInterface);
      expect(await tableExists('field_permissions')).toBe(false);
    });
  });

  describe('00-baseline-010-staff-members', () => {
    it('up creates staff_members with audit + paranoid columns; down drops it', async () => {
      await baseline010.up(queryInterface);
      expect(await tableExists('staff_members')).toBe(true);
      expect(await columnExists('staff_members', 'version')).toBe(true);
      expect(await columnExists('staff_members', 'deleted_at')).toBe(true);
      expect(await indexExists('staff_members', 'staff_members_rescue_id_idx')).toBe(true);
      expect(await indexExists('staff_members', 'staff_members_user_id_idx')).toBe(true);
      expect(await indexExists('staff_members', 'staff_members_deleted_at_idx')).toBe(true);

      setDownKey('00-baseline-010-staff-members');
      await baseline010.down(queryInterface);
      expect(await tableExists('staff_members')).toBe(false);
    });
  });

  describe('00-baseline-011-invitations', () => {
    it('up creates invitations with token unique + lookup indexes; down drops it', async () => {
      await baseline011.up(queryInterface);
      expect(await tableExists('invitations')).toBe(true);
      expect(await columnExists('invitations', 'version')).toBe(true);
      expect(await columnExists('invitations', 'deleted_at')).toBe(false);
      expect(await indexExists('invitations', 'invitations_token_unique')).toBe(true);
      expect(await indexExists('invitations', 'invitations_email_idx')).toBe(true);
      expect(await indexExists('invitations', 'invitations_invited_by_idx')).toBe(true);

      setDownKey('00-baseline-011-invitations');
      await baseline011.down(queryInterface);
      expect(await tableExists('invitations')).toBe(false);
    });
  });
});
