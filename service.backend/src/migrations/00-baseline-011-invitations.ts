import { DataTypes, type QueryInterface } from 'sequelize';
import { assertDestructiveDownAcknowledged, runInTransaction } from './_helpers';

/**
 * Per-model baseline (rebaseline 1/10): `invitations`.
 *
 * Uses `withAuditHooks` (adds `version`, `created_by`, `updated_by`). The
 * model is NOT paranoid (no `deleted_at`). Cross-table FKs (`rescue_id`,
 * `user_id`, `invited_by`, `created_by`, `updated_by`) live in
 * `00-baseline-999-foreign-keys.ts`.
 *
 * Note: the legacy `04-add-invitation-indexes-and-constraints.ts`
 * migration adds the same `invitations_token_unique`,
 * `invitations_rescue_id_idx`, `invitations_user_id_idx`, and
 * `invitations_email_idx` constraints/indexes that today's model already
 * declares. Because the legacy migration runs AFTER this baseline (lex
 * order: `00-...` < `04-...`), and because it uses `addConstraint`/
 * `addIndex` without IF NOT EXISTS guards, fresh DBs would hit a duplicate
 * error today. This is a known artifact of the rebaseline; resolution is
 * tracked in §3 of the rebaseline design doc (the FK PR will adjust the
 * legacy migration's index order or add IF NOT EXISTS guards).
 */
const MIGRATION_KEY = '00-baseline-011-invitations';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'invitations',
        {
          invitation_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          email: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          token: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
          },
          rescue_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          user_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          title: {
            type: DataTypes.STRING(100),
            allowNull: true,
          },
          invited_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          expiration: {
            type: DataTypes.DATE,
            allowNull: false,
          },
          used: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
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
            defaultValue: DataTypes.NOW,
          },
          updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
        },
        { transaction: t }
      );

      await queryInterface.addIndex('invitations', ['token'], {
        unique: true,
        name: 'invitations_token_unique',
        transaction: t,
      });
      await queryInterface.addIndex('invitations', ['rescue_id'], {
        name: 'invitations_rescue_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('invitations', ['user_id'], {
        name: 'invitations_user_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('invitations', ['email'], {
        name: 'invitations_email_idx',
        transaction: t,
      });
      await queryInterface.addIndex('invitations', ['invited_by'], {
        name: 'invitations_invited_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('invitations', ['created_by'], {
        name: 'invitations_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('invitations', ['updated_by'], {
        name: 'invitations_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async t => {
      await queryInterface.dropTable('invitations', { transaction: t });
    });
  },
};
