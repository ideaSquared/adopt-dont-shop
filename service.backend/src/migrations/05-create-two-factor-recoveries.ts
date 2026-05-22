/**
 * ADS (Batch KK): create the `two_factor_recoveries` table.
 *
 * Backs the email-bootstrapped 2FA recovery flow: a user with 2FA enabled
 * who has lost their TOTP device and all backup codes posts their email
 * to `/api/v1/auth/2fa/recover`; we issue a signed, single-use token (the
 * plaintext travels only in the email link, the SHA-256 hash lives here),
 * and on confirm we disable 2FA + revoke all sessions.
 *
 * Frozen createTable body matches `models/TwoFactorRecovery.ts`. Schema:
 *   - recovery_id  UUID PK   — uuidv7 client-side
 *   - user_id      UUID FK   — users.user_id, CASCADE on user delete
 *   - token        TEXT UQ   — SHA-256 hash of the emailed plaintext
 *   - expires_at   TIMESTAMP — 1 hour from issue
 *   - used         BOOLEAN   — flips on confirm; row preserved for audit
 *   - used_at      TIMESTAMP — when the token was consumed
 *   - created_by / updated_by audit columns + standard timestamps
 *
 * Indexes: token (unique), user_id, plus the audit_columns pair.
 */
import { DataTypes, type QueryInterface } from 'sequelize';
import { assertDestructiveDownAcknowledged, runInTransaction } from './_helpers';

const MIGRATION_KEY = '05-create-two-factor-recoveries';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.createTable(
        'two_factor_recoveries',
        {
          recovery_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'user_id' },
            onDelete: 'CASCADE',
          },
          token: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          expires_at: {
            type: DataTypes.DATE,
            allowNull: false,
          },
          used: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          used_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          created_by: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'users', key: 'user_id' },
            onDelete: 'SET NULL',
          },
          updated_by: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'users', key: 'user_id' },
            onDelete: 'SET NULL',
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
        { transaction }
      );

      await queryInterface.addIndex('two_factor_recoveries', {
        fields: ['token'],
        unique: true,
        name: 'two_factor_recoveries_token_unique',
        transaction,
      });
      await queryInterface.addIndex('two_factor_recoveries', {
        fields: ['user_id'],
        name: 'two_factor_recoveries_user_id_idx',
        transaction,
      });
      await queryInterface.addIndex('two_factor_recoveries', {
        fields: ['created_by'],
        name: 'two_factor_recoveries_created_by_idx',
        transaction,
      });
      await queryInterface.addIndex('two_factor_recoveries', {
        fields: ['updated_by'],
        name: 'two_factor_recoveries_updated_by_idx',
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.dropTable('two_factor_recoveries', { transaction });
    });
  },
};
