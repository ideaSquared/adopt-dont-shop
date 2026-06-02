import { DataTypes, type QueryInterface } from 'sequelize';
import { assertDestructiveDownAcknowledged, runInTransaction, tableExists } from './_helpers';

/**
 * Per-model baseline — adopter_match_profile (orphan-table backfill, ADS-784 C2).
 *
 * This table previously existed ONLY via the catch-all `00-baseline.ts` sync()
 * — no per-model baseline and no entry in `00-baseline-999-foreign-keys.ts`.
 * Once sync() is eventually removed it would vanish. This file freezes the
 * `AdopterMatchProfile` model's sync() output so the table survives.
 *
 * The model uses `withAuditHooks`, so it carries `version` + `created_by` /
 * `updated_by` audit columns and the matching audit indexes, plus the
 * `notify_new_matches` index. `paranoid: false` — no `deleted_at`.
 *
 * Cross-table FKs (user_id PK → users, created_by / updated_by → users) land
 * in `00-baseline-999-foreign-keys.ts` so this file is independently orderable.
 *
 * ADS-784: idempotency guard — sync() already creates this table on a clean DB
 * and sorts before this file, so the guard makes it a no-op today and a real
 * create once sync() is gone.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    if (await tableExists(queryInterface, 'adopter_match_profile')) {
      return;
    }
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'adopter_match_profile',
        {
          user_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          preferred_types: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          preferred_sizes: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          preferred_age_groups: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          preferred_energy: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          preferred_temperament: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          lifestyle: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          max_distance_km: {
            type: DataTypes.INTEGER,
            allowNull: true,
          },
          open_to_special_needs: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          notify_new_matches: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          min_notification_score: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 75,
          },
          last_notified_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          inferred_prefs: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          prefs_updated_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          allergies: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null,
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

      await queryInterface.addIndex('adopter_match_profile', {
        fields: ['notify_new_matches'],
        name: 'adopter_match_profile_notify_idx',
        transaction: t,
      });
      await queryInterface.addIndex('adopter_match_profile', {
        fields: ['created_by'],
        name: 'adopter_match_profile_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('adopter_match_profile', {
        fields: ['updated_by'],
        name: 'adopter_match_profile_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged('00-baseline-062-adopter-match-profile');
    await queryInterface.dropTable('adopter_match_profile');
  },
};
