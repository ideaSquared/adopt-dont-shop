import { describe, expect, it, beforeEach } from 'vitest';
import sequelize from '../../sequelize';
import '../../models/index';
import User from '../../models/User';
import Rescue from '../../models/Rescue';

/**
 * Email columns use CITEXT (Postgres) / TEXT COLLATE NOCASE (SQLite) so
 * the DB itself enforces case-insensitive uniqueness (plan 5.5.7).
 *
 * Before this change, the beforeValidate hook lowercased emails before the
 * uniqueness check, which meant a raw INSERT bypassing the hook could store
 * both Foo@x.com and foo@x.com as distinct rows. CITEXT closes that gap at
 * the column level in both dialects.
 */
describe('Email case-insensitive uniqueness via CITEXT', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  describe('User.email', () => {
    it('rejects a second user whose email differs only in case', async () => {
      await User.create({
        email: 'Foo@Example.com',
        password: 'hunter2hunter2',
        firstName: 'First',
        lastName: 'User',
      } as never);

      await expect(
        User.create({
          email: 'foo@example.com',
          password: 'hunter2hunter2',
          firstName: 'Second',
          lastName: 'User',
        } as never)
      ).rejects.toThrow();
    });

    it('accepts a user whose email is genuinely different', async () => {
      await User.create({
        email: 'alice@example.com',
        password: 'hunter2hunter2',
        firstName: 'Alice',
        lastName: 'Smith',
      } as never);

      await expect(
        User.create({
          email: 'bob@example.com',
          password: 'hunter2hunter2',
          firstName: 'Bob',
          lastName: 'Jones',
        } as never)
      ).resolves.toBeDefined();
    });
  });

  describe('Rescue.email', () => {
    it('rejects a second rescue whose email differs only in case', async () => {
      await Rescue.create({
        name: 'First Rescue',
        email: 'Rescue@Example.com',
        address: '1 Lane',
        city: 'Town',
        postcode: 'AB1 2CD',
        country: 'GB',
        contactPerson: 'Alice',
        status: 'pending',
      } as never);

      await expect(
        Rescue.create({
          name: 'Second Rescue',
          email: 'rescue@example.com',
          address: '2 Lane',
          city: 'Town',
          postcode: 'AB1 2CD',
          country: 'GB',
          contactPerson: 'Bob',
          status: 'pending',
        } as never)
      ).rejects.toThrow();
    });
  });
});
