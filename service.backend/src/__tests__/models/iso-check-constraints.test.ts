import { describe, expect, it, beforeEach } from 'vitest';
import { QueryTypes } from 'sequelize';
import sequelize from '../../sequelize';
import '../../models/index';
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
  });
});
