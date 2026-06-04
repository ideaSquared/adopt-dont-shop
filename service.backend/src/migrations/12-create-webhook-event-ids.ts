/**
 * ADS-734 — per-event idempotency table for inbound email-delivery
 * webhooks.
 *
 * The webhook signature middleware narrows the replay window to 120 s,
 * but within that window an attacker who captures a signed payload can
 * still replay it. `webhook_event_ids` records every event we've seen;
 * the composite primary key on (provider, event_id) makes a replay a
 * cheap unique-constraint failure that the service translates into a
 * 200 `{ deduplicated: true }` response.
 *
 * See `docs/security/webhook-replay-protection.md`.
 */
import { DataTypes, type QueryInterface } from 'sequelize';
import { runInTransaction } from './_helpers';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'webhook_event_ids',
        {
          provider: {
            type: DataTypes.STRING(32),
            allowNull: false,
            primaryKey: true,
          },
          event_id: {
            type: DataTypes.STRING(255),
            allowNull: false,
            primaryKey: true,
          },
          received_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
        },
        { transaction: t }
      );

      await queryInterface.addIndex('webhook_event_ids', {
        fields: ['received_at'],
        name: 'webhook_event_ids_received_at_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable('webhook_event_ids');
  },
};
