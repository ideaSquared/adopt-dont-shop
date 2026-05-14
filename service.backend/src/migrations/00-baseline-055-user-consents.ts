import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — user_consents (rebaseline 9/10).
 *
 * Frozen snapshot of `UserConsent`'s sync() output. FKs (user_id,
 * created_by, updated_by) land in `00-baseline-999-foreign-keys.ts`.
 *
 * GDPR Art. 7 — append-only consent event log. Each grant / withdrawal
 * is a new row; latest row per (user_id, purpose) is the user's current
 * state. No `paranoid` — events are never soft-deleted.
 *
 * Source-of-truth note: legacy migration `12-create-user-consents.ts`
 * also creates this table via an explicit `createTable`, but predates
 * the `withAuditHooks` adoption — it does not declare a `version` column
 * and has no audit indexes. Today's `sync()` output (driven by
 * `withAuditHooks`) DOES emit `version` and the `*_created_by_idx` /
 * `*_updated_by_idx` indexes. The baseline mirrors `sync()`, not migration
 * 12. On fresh DBs the per-model file creates the table first; migration
 * 12 would then collide. Existing DBs are unaffected via the SequelizeMeta
 * pre-seed (see `docs/migrations/per-model-rebaseline.md` §3).
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'user_consents',
        {
          consent_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          user_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          purpose: {
            type: DataTypes.ENUM(
              'marketing_email',
              'analytics',
              'third_party_sharing',
              'profiling'
            ),
            allowNull: false,
          },
          granted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
          },
          policy_version: {
            type: DataTypes.STRING(32),
            allowNull: false,
          },
          source: {
            type: DataTypes.STRING(64),
            allowNull: true,
          },
          ip_address: {
            type: DataTypes.STRING(45),
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

      await queryInterface.addIndex('user_consents', {
        fields: ['user_id', 'purpose', 'created_at'],
        name: 'user_consents_user_purpose_idx',
        transaction: t,
      });
      await queryInterface.addIndex('user_consents', {
        fields: ['created_by'],
        name: 'user_consents_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('user_consents', {
        fields: ['updated_by'],
        name: 'user_consents_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged('00-baseline-055-user-consents');
    await queryInterface.dropTable('user_consents');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_user_consents_purpose');
  },
};
