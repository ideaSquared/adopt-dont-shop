import { DataTypes, type QueryInterface } from 'sequelize';
import {
  runInTransaction,
  dropEnumTypeIfExists,
  assertDestructiveDownAcknowledged,
} from './_helpers';

/**
 * Per-model rebaseline (domain: pets) — see
 * docs/migrations/per-model-rebaseline.md.
 *
 * Freezes the `breeds` lookup table shape produced by `sequelize.sync()`.
 * Cross-table FKs (created_by / updated_by → users) are deferred to
 * `00-baseline-999-foreign-keys.ts`.
 *
 * The Breed model opts out of the global `paranoid: true` default (a
 * soft-deleted breed leaves a deleted_at row that still collides on the
 * (species, name) unique index), so this table has NO `deleted_at`
 * column.
 *
 * The `enum_breeds_species` Postgres type is created with the same
 * labels as `enum_pets_type` but is a distinct Postgres type — Sequelize
 * derives the type name from (table, column).
 */

const MIGRATION_KEY = '00-baseline-019-breeds';

const PET_TYPE_VALUES = [
  'dog',
  'cat',
  'rabbit',
  'bird',
  'reptile',
  'small_mammal',
  'fish',
  'other',
] as const;

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      // Column order matches sync(): the model spreads auditColumns BEFORE
      // sequelize's auto-added timestamps, so created_by / updated_by come
      // before created_at / updated_at, with `version` last. No deleted_at
      // because paranoid: false on this model.
      await queryInterface.createTable(
        'breeds',
        {
          breed_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          species: {
            type: DataTypes.ENUM(...PET_TYPE_VALUES),
            allowNull: false,
          },
          name: {
            type: DataTypes.STRING(128),
            allowNull: false,
          },
          created_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          updated_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          created_at: {
            type: DataTypes.DATE,
            allowNull: false,
          },
          updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
          },
          version: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
        },
        { transaction: t }
      );

      // Composite unique on (species, name): one canonical breed per name
      // per species. Allows the same name across species (e.g. Persian cat
      // vs Persian rabbit).
      await queryInterface.addIndex('breeds', ['species', 'name'], {
        name: 'breeds_species_name_unique',
        unique: true,
        transaction: t,
      });
      await queryInterface.addIndex('breeds', ['name'], {
        name: 'breeds_name_idx',
        transaction: t,
      });
      await queryInterface.addIndex('breeds', ['created_by'], {
        name: 'breeds_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('breeds', ['updated_by'], {
        name: 'breeds_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await queryInterface.dropTable('breeds', {});
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_breeds_species');
  },
};
