import { describe, expect, it, beforeEach } from 'vitest';
import { QueryTypes } from 'sequelize';
import sequelize from '../../sequelize';
import '../../models/index';
import EmailPreference from '../../models/EmailPreference';
import User from '../../models/User';
import { installIsoCheckConstraints } from '../../models/iso-check-constraints';

const isPostgres = sequelize.getDialect() === 'postgres';
const describePg = isPostgres ? describe : describe.skip;

describe('iso check constraints', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
    await installIsoCheckConstraints();
  });

  it('SQLite path is a no-op', async () => {
    if (isPostgres) {
      return;
    }
    await expect(installIsoCheckConstraints()).resolves.toBeUndefined();
  });

  describePg('Postgres path', () => {
    it.each([
      {
        constraint: 'pets_adoption_fee_currency_iso_check',
        sql: `INSERT INTO pets (pet_id, name, rescue_id, type, status, gender, age_group,
                                adoption_fee_minor, adoption_fee_currency, archived, featured,
                                priority_listing, special_needs, house_trained, view_count,
                                favorite_count, application_count, images, videos, tags,
                                created_at, updated_at, version)
              VALUES (gen_random_uuid(), 'X', gen_random_uuid(), 'dog', 'available', 'male',
                      'adult', 0, 'gbp', false, false, false, false, false, 0, 0, 0,
                      ARRAY[]::jsonb[], ARRAY[]::jsonb[], ARRAY[]::text[], now(), now(), 0)`,
      },
      {
        constraint: 'rescues_country_iso_check',
        sql: `INSERT INTO rescues (rescue_id, name, email, address, city, postcode, country,
                                   contact_person, status, created_at, updated_at, version)
              VALUES (gen_random_uuid(), 'X', 'x@x.test', '1 Lane', 'Town', 'AB1 2CD',
                      'United Kingdom', 'X', 'pending', now(), now(), 0)`,
      },
    ])('rejects values that violate $constraint', async ({ sql, constraint }) => {
      await expect(sequelize.query(sql, { type: QueryTypes.INSERT })).rejects.toThrow(
        new RegExp(constraint)
      );
    });

    // The language columns sit on tables (users, email_preferences) with
    // many other required fields, so testing the CHECK via INSERT means
    // copy-pasting a long column list. Easier: create a valid row through
    // Sequelize, then UPDATE only the language column via raw SQL to
    // bypass the JS-side validator and prove the DB CHECK fires.
    it('rejects a non-BCP-47 language on users via UPDATE', async () => {
      const user = await User.create({
        email: 'lang@x.test',
        password: 'x',
        firstName: 'A',
        lastName: 'B',
      } as never);
      await expect(
        sequelize.query(`UPDATE users SET language = 'EN_US' WHERE user_id = :id`, {
          replacements: { id: user.userId },
          type: QueryTypes.UPDATE,
        })
      ).rejects.toThrow(/users_language_bcp47_check/);
    });

    it('rejects a non-BCP-47 language on email_preferences via UPDATE', async () => {
      const user = await User.create({
        email: 'pref@x.test',
        password: 'x',
        firstName: 'A',
        lastName: 'B',
      } as never);
      const pref = await EmailPreference.create({ userId: user.userId } as never);
      await expect(
        sequelize.query(
          `UPDATE email_preferences SET language = 'english' WHERE preference_id = :id`,
          {
            replacements: { id: (pref as unknown as { preferenceId: string }).preferenceId },
            type: QueryTypes.UPDATE,
          }
        )
      ).rejects.toThrow(/email_preferences_language_bcp47_check/);
    });
  });
});
