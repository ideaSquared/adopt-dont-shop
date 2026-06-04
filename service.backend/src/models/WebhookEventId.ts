import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';

/**
 * ADS-734: per-event idempotency for inbound email-delivery webhooks.
 *
 * Each row records a (provider, event_id) pair we have already processed.
 * A unique constraint on the composite primary key turns a replay into a
 * cheap INSERT … unique-violation that the webhook idempotency service
 * catches and translates into a 200 `{ deduplicated: true }` response.
 *
 * Storage policy:
 *   - Composite PK on (provider, event_id) — cross-provider IDs that
 *     happen to collide are still distinct events.
 *   - `received_at` is indexed for the daily TTL cleanup job that drops
 *     rows older than 7 days (well beyond the 120 s signature-skew
 *     window, but long enough to absorb provider-side retry storms).
 *   - No audit columns: ops scratch, not a domain entity.
 *
 * See `docs/security/webhook-replay-protection.md`.
 */
interface WebhookEventIdAttributes {
  provider: string;
  event_id: string;
  received_at: Date;
}

type WebhookEventIdCreationAttributes = Optional<WebhookEventIdAttributes, 'received_at'>;

class WebhookEventId
  extends Model<WebhookEventIdAttributes, WebhookEventIdCreationAttributes>
  implements WebhookEventIdAttributes
{
  public provider!: string;
  public event_id!: string;
  public received_at!: Date;
}

WebhookEventId.init(
  {
    provider: {
      type: DataTypes.STRING(32),
      primaryKey: true,
      allowNull: false,
    },
    event_id: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      allowNull: false,
    },
    received_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'webhook_event_ids',
    modelName: 'WebhookEventId',
    timestamps: false,
    underscored: true,
    indexes: [{ fields: ['received_at'], name: 'webhook_event_ids_received_at_idx' }],
  }
);

export default WebhookEventId;
