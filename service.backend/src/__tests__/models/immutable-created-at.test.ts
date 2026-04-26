import { describe, expect, it, beforeEach } from 'vitest';
import { QueryTypes } from 'sequelize';
import sequelize from '../../sequelize';
import models from '../../models/index';
import User from '../../models/User';
import { installImmutableCreatedAtTriggers } from '../../models/immutable-created-at';

/**
 * The BEFORE UPDATE trigger that locks created_at (plan 5.5.10) only
 * exists on Postgres — installImmutableCreatedAtTriggers short-circuits
 * on SQLite to keep the in-memory test path simple. Helper is called
 * explicitly from the boot script after sequelize.sync() returns; tests
 * call it explicitly here to mirror that flow.
 */
const isPostgres = sequelize.getDialect() === 'postgres';
const describePg = isPostgres ? describe : describe.skip;

describe('immutable created_at trigger', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
    await installImmutableCreatedAtTriggers(Object.values(models));
  });

  it('SQLite path is a no-op — UPDATE may rewrite created_at', async () => {
    if (isPostgres) {
      return;
    }
    const user = await User.create({
      email: 'immutable@test.local',
      password: 'irrelevant',
      firstName: 'A',
      lastName: 'B',
    } as never);
    const tampered = new Date(user.createdAt.getTime() - 86_400_000).toISOString();
    await sequelize.query(`UPDATE users SET created_at = :tampered WHERE user_id = :id`, {
      replacements: { tampered, id: user.userId },
      type: QueryTypes.UPDATE,
    });
    const [row] = await sequelize.query<{ created_at: string }>(
      `SELECT created_at FROM users WHERE user_id = :id`,
      { replacements: { id: user.userId }, type: QueryTypes.SELECT }
    );
    expect(new Date(row.created_at).toISOString()).toBe(tampered);
  });

  describePg('Postgres path', () => {
    it('rejects an UPDATE that mutates created_at', async () => {
      const user = await User.create({
        email: 'immutable@test.local',
        password: 'irrelevant',
        firstName: 'A',
        lastName: 'B',
      } as never);
      await expect(
        sequelize.query(
          `UPDATE users SET created_at = now() - interval '1 day' WHERE user_id = :id`,
          { replacements: { id: user.userId }, type: QueryTypes.UPDATE }
        )
      ).rejects.toThrow(/created_at is immutable/);
    });

    it('allows an UPDATE that leaves created_at untouched', async () => {
      const user = await User.create({
        email: 'untouched@test.local',
        password: 'irrelevant',
        firstName: 'A',
        lastName: 'B',
      } as never);
      await expect(user.update({ firstName: 'C' } as never)).resolves.toBeDefined();
      const reloaded = await User.findByPk(user.userId);
      expect(reloaded?.firstName).toBe('C');
    });

    it('installs the trigger on every table whose model has timestamps', async () => {
      const rows = await sequelize.query<{ relname: string }>(
        `SELECT c.relname FROM pg_trigger t
         JOIN pg_class c ON c.oid = t.tgrelid
         WHERE t.tgname LIKE '%_created_at_immutable'`,
        { type: QueryTypes.SELECT }
      );
      const tables = new Set(rows.map(r => r.relname));
      // Spot-check a handful of transactional tables.
      expect(tables.has('users')).toBe(true);
      expect(tables.has('pets')).toBe(true);
      expect(tables.has('rescues')).toBe(true);
      expect(tables.has('applications')).toBe(true);
      // Append-only tables (timestamps:false) should NOT have the trigger.
      expect(tables.has('audit_logs')).toBe(false);
      expect(tables.has('application_status_transitions')).toBe(false);
    });
  });
});
