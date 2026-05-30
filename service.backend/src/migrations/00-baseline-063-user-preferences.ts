import { DataTypes, type QueryInterface } from 'sequelize';
import { assertDestructiveDownAcknowledged, runInTransaction, tableExists } from './_helpers';

/**
 * Per-model baseline — user_preferences (orphan-table backfill, ADS-784 C2).
 *
 * Like `adopter_match_profile`, this table previously existed ONLY via the
 * catch-all `00-baseline.ts` sync() — no per-model baseline and no entry in
 * `00-baseline-999-foreign-keys.ts`. This file freezes the `UserPreference`
 * model's sync() output so the table survives the eventual removal of sync().
 *
 * `UserPreference` is non-paranoid and does NOT use `withAuditHooks` — no
 * `version` / `created_by` / `updated_by` columns or audit indexes. Just the
 * composite unique index and the (user_id, preference_type) lookup index.
 *
 * The user_id FK → users lands in `00-baseline-999-foreign-keys.ts`.
 *
 * ADS-784: idempotency guard — no-op today (sync() made it), real create once
 * sync() is gone.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    if (await tableExists(queryInterface, 'user_preferences')) {
      return;
    }
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'user_preferences',
        {
          user_preference_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4,
          },
          user_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          preference_type: {
            type: DataTypes.STRING(32),
            allowNull: false,
          },
          preference_value: {
            type: DataTypes.STRING(128),
            allowNull: false,
          },
          score: {
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

      await queryInterface.addIndex('user_preferences', {
        fields: ['user_id', 'preference_type', 'preference_value'],
        name: 'user_preferences_user_type_value_unique',
        unique: true,
        transaction: t,
      });
      await queryInterface.addIndex('user_preferences', {
        fields: ['user_id', 'preference_type'],
        name: 'user_preferences_user_type_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged('00-baseline-063-user-preferences');
    await queryInterface.dropTable('user_preferences');
  },
};
