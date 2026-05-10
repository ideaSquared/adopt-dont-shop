import { DataTypes, Op, type QueryInterface } from 'sequelize';
import {
  runInTransaction,
  dropEnumTypeIfExists,
  assertDestructiveDownAcknowledged,
} from './_helpers';

/**
 * Per-model rebaseline (domain: pets) — see
 * docs/migrations/per-model-rebaseline.md.
 *
 * Freezes the `pets` table shape produced by `sequelize.sync()` against
 * the Pet model at the time of the rebaseline. Cross-table FKs
 * (rescue_id → rescues, breed_id / secondary_breed_id → breeds,
 * created_by / updated_by → users) are deferred to
 * `00-baseline-zzz-foreign-keys.ts` so each per-model file is
 * independently reorderable without dependency cycles.
 *
 * `search_vector` is created as a plain TSVECTOR column here — the
 * trigger that maintains it (installGeneratedSearchVector) is installed
 * via the model's afterSync hook and is not part of the baseline schema.
 *
 * NULLABILITY note: `rescue_id` is NULLABLE in the produced sync output
 * (the belongsTo association overrides the model's `allowNull: false`
 * with the default `onDelete: SET NULL`). The migration replicates that
 * shape rather than the model declaration to stay sync-equivalent.
 */

const MIGRATION_KEY = '00-baseline-016-pets';

const PET_STATUS_VALUES = [
  'available',
  'pending',
  'adopted',
  'foster',
  'medical_hold',
  'behavioral_hold',
  'not_available',
  'deceased',
] as const;

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

const GENDER_VALUES = ['male', 'female', 'unknown'] as const;
const SIZE_VALUES = ['extra_small', 'small', 'medium', 'large', 'extra_large'] as const;
const AGE_GROUP_VALUES = ['baby', 'young', 'adult', 'senior'] as const;
const ENERGY_LEVEL_VALUES = ['low', 'medium', 'high', 'very_high'] as const;
const VACCINATION_STATUS_VALUES = ['up_to_date', 'partial', 'not_vaccinated', 'unknown'] as const;
const SPAY_NEUTER_STATUS_VALUES = ['spayed', 'neutered', 'not_altered', 'unknown'] as const;

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      // Column order matches the sync() output: explicit timestamps
      // (createdAt/updatedAt/deletedAt) declared on the model land before
      // the auditColumns spread, so created_by / updated_by / version come
      // last.
      await queryInterface.createTable(
        'pets',
        {
          pet_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          name: {
            type: DataTypes.STRING(100),
            allowNull: false,
          },
          rescue_id: {
            // NULLABLE in sync output despite model's allowNull: false.
            type: DataTypes.UUID,
            allowNull: true,
          },
          short_description: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          long_description: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          age_years: {
            type: DataTypes.INTEGER,
            allowNull: true,
          },
          age_months: {
            type: DataTypes.INTEGER,
            allowNull: true,
          },
          birth_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
          },
          is_birth_date_estimate: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          age_group: {
            type: DataTypes.ENUM(...AGE_GROUP_VALUES),
            allowNull: false,
            defaultValue: 'adult',
          },
          gender: {
            type: DataTypes.ENUM(...GENDER_VALUES),
            allowNull: false,
            defaultValue: 'unknown',
          },
          status: {
            type: DataTypes.ENUM(...PET_STATUS_VALUES),
            allowNull: false,
            defaultValue: 'available',
          },
          type: {
            type: DataTypes.ENUM(...PET_TYPE_VALUES),
            allowNull: false,
          },
          breed_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          secondary_breed_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          weight_kg: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
          },
          size: {
            type: DataTypes.ENUM(...SIZE_VALUES),
            allowNull: false,
            defaultValue: 'medium',
          },
          color: {
            type: DataTypes.STRING(100),
            allowNull: true,
          },
          markings: {
            type: DataTypes.STRING(255),
            allowNull: true,
          },
          microchip_id: {
            type: DataTypes.STRING(50),
            allowNull: true,
            // Auto-creates the `pets_microchip_id_key` unique constraint
            // alongside the partial unique index added below — both shapes
            // appear in sync output.
            unique: true,
          },
          archived: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          featured: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          priority_listing: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          adoption_fee_minor: {
            type: DataTypes.INTEGER,
            allowNull: true,
          },
          adoption_fee_currency: {
            type: DataTypes.CHAR(3),
            allowNull: true,
            defaultValue: 'GBP',
          },
          special_needs: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          special_needs_description: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          house_trained: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          good_with_children: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
          },
          good_with_dogs: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
          },
          good_with_cats: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
          },
          good_with_small_animals: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
          },
          energy_level: {
            type: DataTypes.ENUM(...ENERGY_LEVEL_VALUES),
            allowNull: false,
            defaultValue: 'medium',
          },
          exercise_needs: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          grooming_needs: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          training_notes: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          temperament: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true,
          },
          medical_notes: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          behavioral_notes: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          surrender_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          intake_date: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          vaccination_status: {
            type: DataTypes.ENUM(...VACCINATION_STATUS_VALUES),
            allowNull: false,
            defaultValue: 'unknown',
          },
          vaccination_date: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          spay_neuter_status: {
            type: DataTypes.ENUM(...SPAY_NEUTER_STATUS_VALUES),
            allowNull: false,
            defaultValue: 'unknown',
          },
          spay_neuter_date: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          last_vet_checkup: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          location: {
            type: DataTypes.GEOMETRY('POINT'),
            allowNull: true,
          },
          available_since: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          adopted_date: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          foster_start_date: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          foster_end_date: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          view_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          favorite_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          application_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          search_vector: {
            type: DataTypes.TSVECTOR,
            allowNull: true,
          },
          tags: {
            type: DataTypes.ARRAY(DataTypes.STRING),
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
        },
        { transaction: t }
      );

      // Single-column / direction-of-access indexes that the model declares.
      // FK columns are indexed here to satisfy the standards check; the
      // referenced FK constraints land in 00-baseline-zzz-foreign-keys.ts.
      await queryInterface.addIndex('pets', ['rescue_id'], {
        name: 'pets_rescue_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('pets', ['status'], {
        name: 'pets_status_idx',
        transaction: t,
      });
      await queryInterface.addIndex('pets', ['type'], {
        name: 'pets_type_idx',
        transaction: t,
      });
      await queryInterface.addIndex('pets', ['size'], {
        name: 'pets_size_idx',
        transaction: t,
      });
      await queryInterface.addIndex('pets', ['age_group'], {
        name: 'pets_age_group_idx',
        transaction: t,
      });
      await queryInterface.addIndex('pets', ['gender'], {
        name: 'pets_gender_idx',
        transaction: t,
      });
      await queryInterface.addIndex('pets', ['breed_id'], {
        name: 'pets_breed_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('pets', ['secondary_breed_id'], {
        name: 'pets_secondary_breed_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('pets', ['featured'], {
        name: 'pets_featured_idx',
        transaction: t,
      });
      await queryInterface.addIndex('pets', ['priority_listing'], {
        name: 'pets_priority_idx',
        transaction: t,
      });
      await queryInterface.addIndex('pets', ['created_at'], {
        name: 'pets_created_at_idx',
        transaction: t,
      });
      await queryInterface.addIndex('pets', ['available_since'], {
        name: 'pets_available_since_idx',
        transaction: t,
      });
      // Partial unique index — only one non-null microchip_id per row.
      // The full unique constraint (`pets_microchip_id_key`) added by the
      // column-level `unique: true` above is the redundant looser shape;
      // both appear in sync output.
      await queryInterface.addIndex('pets', ['microchip_id'], {
        name: 'pets_microchip_unique',
        unique: true,
        where: { microchip_id: { [Op.ne]: null } },
        transaction: t,
      });
      await queryInterface.addIndex('pets', ['search_vector'], {
        name: 'pets_search_vector_gin_idx',
        using: 'gin',
        transaction: t,
      });
      await queryInterface.addIndex('pets', ['location'], {
        name: 'pets_location_gist_idx',
        using: 'gist',
        transaction: t,
      });
      await queryInterface.addIndex('pets', ['status', 'rescue_id'], {
        name: 'pets_status_rescue_idx',
        transaction: t,
      });
      await queryInterface.addIndex('pets', ['status', 'type', 'size'], {
        name: 'pets_status_type_size_idx',
        transaction: t,
      });
      await queryInterface.addIndex('pets', ['deleted_at'], {
        name: 'pets_deleted_at_idx',
        transaction: t,
      });
      await queryInterface.addIndex('pets', ['created_by'], {
        name: 'pets_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('pets', ['updated_by'], {
        name: 'pets_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    // Pass an explicit options object — sequelize's PostgresQueryInterface
    // mutates `options` to drop the per-column ENUM types when a model is
    // registered, which throws if `options` is undefined.
    await queryInterface.dropTable('pets', {});
    // Each ENUM was the only consumer of its type; drop them so they don't
    // leak into pg_type.
    const sequelize = queryInterface.sequelize;
    await dropEnumTypeIfExists(sequelize, 'enum_pets_age_group');
    await dropEnumTypeIfExists(sequelize, 'enum_pets_gender');
    await dropEnumTypeIfExists(sequelize, 'enum_pets_status');
    await dropEnumTypeIfExists(sequelize, 'enum_pets_type');
    await dropEnumTypeIfExists(sequelize, 'enum_pets_size');
    await dropEnumTypeIfExists(sequelize, 'enum_pets_energy_level');
    await dropEnumTypeIfExists(sequelize, 'enum_pets_vaccination_status');
    await dropEnumTypeIfExists(sequelize, 'enum_pets_spay_neuter_status');
  },
};
