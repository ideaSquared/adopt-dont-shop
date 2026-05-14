import { DataTypes, type QueryInterface } from 'sequelize';
import { assertDestructiveDownAcknowledged, runInTransaction } from './_helpers';

/**
 * Per-model baseline — idempotency_keys (rebaseline 10/10, platform domain).
 *
 * Frozen snapshot of `IdempotencyKey`'s sync() output. Per-request scratch
 * keyed by SHA-256 hash of the client `Idempotency-Key` header. 24h TTL
 * with hard cleanup; no soft-delete, no audit columns, no `version`.
 *
 * The `user_id` foreign key declared on the model lands in
 * `00-baseline-999-foreign-keys.ts`; the column itself is created here so
 * the table is functionally usable before the FK file runs.
 *
 * No ENUMs to drop on `down`.
 */
const MIGRATION_KEY = '00-baseline-059-idempotency-keys';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'idempotency_keys',
        {
          key_hash: {
            type: DataTypes.CHAR(64),
            primaryKey: true,
            allowNull: false,
          },
          endpoint: {
            type: DataTypes.STRING(255),
            allowNull: false,
          },
          user_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          response_status: {
            type: DataTypes.INTEGER,
            allowNull: false,
          },
          response_body: {
            type: DataTypes.JSONB,
            allowNull: false,
          },
          expires_at: {
            type: DataTypes.DATE,
            allowNull: false,
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

      await queryInterface.addIndex('idempotency_keys', {
        fields: ['user_id'],
        name: 'idempotency_keys_user_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('idempotency_keys', {
        fields: ['expires_at'],
        name: 'idempotency_keys_expires_at_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await queryInterface.dropTable('idempotency_keys');
  },
};
