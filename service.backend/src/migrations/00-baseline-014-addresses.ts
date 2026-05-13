import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline (rebaseline 2/10): `addresses`.
 *
 * Polymorphic address book — `owner_type` ('user' | 'rescue') + `owner_id`
 * points at either users.user_id or rescues.rescue_id. Parent existence
 * is enforced at the application layer (see Address.ts header), so the
 * polymorphic FK has no DB-level constraint to defer.
 *
 * Audit FK constraints (`created_by`/`updated_by` → users) are deferred
 * to `00-baseline-999-foreign-keys.ts`.
 */
const MIGRATION_KEY = '00-baseline-014-addresses';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'addresses',
        {
          address_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          owner_type: {
            type: DataTypes.ENUM('user', 'rescue'),
            allowNull: false,
          },
          owner_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          label: {
            type: DataTypes.STRING(64),
            allowNull: true,
          },
          line_1: {
            type: DataTypes.STRING(255),
            allowNull: false,
          },
          line_2: {
            type: DataTypes.STRING(255),
            allowNull: true,
          },
          city: {
            type: DataTypes.STRING(128),
            allowNull: false,
          },
          region: {
            type: DataTypes.STRING(128),
            allowNull: true,
          },
          postal_code: {
            type: DataTypes.STRING(32),
            allowNull: false,
          },
          country: {
            type: DataTypes.CHAR(2),
            allowNull: false,
          },
          is_primary: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          // Audit columns (FK constraints added in 00-baseline-999-foreign-keys.ts).
          created_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          updated_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          version: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          created_at: {
            type: DataTypes.DATE,
            allowNull: false,
          },
          updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
          },
        },
        { transaction: t }
      );

      // Composite index for polymorphic-resolution + per-owner listings.
      await queryInterface.addIndex('addresses', ['owner_type', 'owner_id'], {
        name: 'addresses_owner_idx',
        transaction: t,
      });
      // Partial unique index — exactly one primary per owner.
      await queryInterface.addIndex('addresses', ['owner_type', 'owner_id'], {
        name: 'addresses_one_primary_per_owner',
        unique: true,
        where: { is_primary: true },
        transaction: t,
      });
      // Country + postal_code lookups for postcode-based search paths.
      await queryInterface.addIndex('addresses', ['country', 'postal_code'], {
        name: 'addresses_country_postal_idx',
        transaction: t,
      });
      await queryInterface.addIndex('addresses', ['created_by'], {
        name: 'addresses_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('addresses', ['updated_by'], {
        name: 'addresses_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async t => {
      await queryInterface.dropTable('addresses', { transaction: t });
    });
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_addresses_owner_type');
  },
};
