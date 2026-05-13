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
 * Freezes the `pet_media` table shape produced by `sequelize.sync()`
 * against the PetMedia model at the time of the rebaseline. Cross-table
 * FKs (pet_id → pets, created_by / updated_by → users) are deferred to
 * `00-baseline-999-foreign-keys.ts`.
 */

const MIGRATION_KEY = '00-baseline-017-pet-media';

const PET_MEDIA_TYPE_VALUES = ['image', 'video'] as const;

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      // Column order matches sync(): the model spreads auditColumns BEFORE
      // sequelize's auto-added timestamps, so created_by / updated_by come
      // before created_at / updated_at / deleted_at, with `version` last.
      await queryInterface.createTable(
        'pet_media',
        {
          media_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          pet_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          type: {
            type: DataTypes.ENUM(...PET_MEDIA_TYPE_VALUES),
            allowNull: false,
          },
          url: {
            type: DataTypes.TEXT,
            allowNull: false,
          },
          thumbnail_url: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          caption: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          order_index: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          is_primary: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          duration_seconds: {
            type: DataTypes.INTEGER,
            allowNull: true,
          },
          uploaded_at: {
            type: DataTypes.DATE,
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
          deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          version: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
        },
        { transaction: t }
      );

      await queryInterface.addIndex('pet_media', ['pet_id', 'order_index'], {
        name: 'pet_media_pet_order_idx',
        transaction: t,
      });
      await queryInterface.addIndex('pet_media', ['pet_id', 'type'], {
        name: 'pet_media_pet_type_idx',
        transaction: t,
      });
      // Partial unique: at most one is_primary=true media row per pet.
      await queryInterface.addIndex('pet_media', ['pet_id'], {
        name: 'pet_media_one_primary_per_pet',
        unique: true,
        where: { is_primary: true },
        transaction: t,
      });
      await queryInterface.addIndex('pet_media', ['created_by'], {
        name: 'pet_media_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('pet_media', ['updated_by'], {
        name: 'pet_media_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await queryInterface.dropTable('pet_media', {});
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_pet_media_type');
  },
};
