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
 * Freezes the `pet_status_transitions` append-only event-log table shape
 * produced by `sequelize.sync()`. Cross-table FK (pet_id → pets) is
 * deferred to `00-baseline-zzz-foreign-keys.ts`. The trigger that
 * denormalises to_status onto pets.status (installStatusTransitionTrigger)
 * is installed via the model's afterSync hook and is not part of the
 * baseline schema — it lives with the model definition, not here.
 *
 * NULLABILITY note: `pet_id` is NULLABLE in the produced sync output
 * (the belongsTo association overrides the model's `allowNull: false`
 * with the default `onDelete: SET NULL`). The migration replicates that
 * shape rather than the model declaration to stay sync-equivalent.
 *
 * Each enum column gets its own Postgres ENUM type — `from_status` and
 * `to_status` carry the same labels but different type names because
 * Sequelize auto-derives the type name from (table, column).
 */

const MIGRATION_KEY = '00-baseline-018-pet-status-transitions';

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

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'pet_status_transitions',
        {
          transition_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          pet_id: {
            // NULLABLE in sync output despite model's allowNull: false.
            type: DataTypes.UUID,
            allowNull: true,
          },
          from_status: {
            type: DataTypes.ENUM(...PET_STATUS_VALUES),
            allowNull: true,
          },
          to_status: {
            type: DataTypes.ENUM(...PET_STATUS_VALUES),
            allowNull: false,
          },
          transitioned_at: {
            type: DataTypes.DATE,
            allowNull: false,
          },
          transitioned_by: {
            // No FK enforcement on the actor — forensic metadata that should
            // survive user deletion. The parent-side FK on pet_id is what
            // enforces lifecycle integrity.
            type: DataTypes.UUID,
            allowNull: true,
          },
          reason: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          metadata: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
        },
        { transaction: t }
      );

      await queryInterface.addIndex('pet_status_transitions', ['pet_id', 'transitioned_at'], {
        name: 'pet_status_transitions_pet_id_at_idx',
        transaction: t,
      });
      await queryInterface.addIndex('pet_status_transitions', ['transitioned_by'], {
        name: 'pet_status_transitions_transitioned_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await queryInterface.dropTable('pet_status_transitions', {});
    const sequelize = queryInterface.sequelize;
    await dropEnumTypeIfExists(sequelize, 'enum_pet_status_transitions_from_status');
    await dropEnumTypeIfExists(sequelize, 'enum_pet_status_transitions_to_status');
  },
};
