import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getJsonType, getUuidType } from '../sequelize';

/**
 * Cache of responses to mutating requests, keyed by the SHA-256 hash of
 * the client-provided `Idempotency-Key` header. Plan 5.5.13.
 *
 * The middleware (see middleware/idempotency.ts) is the only writer.
 * A retried POST/PATCH/DELETE with the same key replays the cached
 * response instead of double-inserting — prevents the classic
 * "double-submitted application" bug after a flaky network.
 *
 * Storage policy:
 *   - 24h retention; expires_at lets a future cleanup job drop rows
 *   - Hash, not raw key — DB leak doesn't expose request IDs
 *   - No audit columns: this is per-request scratch, not a domain entity
 */
interface IdempotencyKeyAttributes {
  key_hash: string;
  endpoint: string;
  user_id: string | null;
  response_status: number;
  response_body: unknown;
  expires_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface IdempotencyKeyCreationAttributes
  extends Optional<IdempotencyKeyAttributes, 'created_at' | 'updated_at'> {}

class IdempotencyKey
  extends Model<IdempotencyKeyAttributes, IdempotencyKeyCreationAttributes>
  implements IdempotencyKeyAttributes
{
  public key_hash!: string;
  public endpoint!: string;
  public user_id!: string | null;
  public response_status!: number;
  public response_body!: unknown;
  public expires_at!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

IdempotencyKey.init(
  {
    key_hash: {
      // SHA-256 hex = 64 chars. CHAR(64) is denser than BYTEA on Postgres
      // and works on SQLite tests without a dialect-specific shim.
      type: DataTypes.CHAR(64),
      primaryKey: true,
    },
    endpoint: {
      // METHOD + path, e.g. 'POST /api/v1/applications'. Same client key
      // against a different endpoint is a different cache entry.
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    user_id: {
      type: getUuidType(),
      allowNull: true,
      references: { model: 'users', key: 'user_id' },
      onDelete: 'SET NULL',
    },
    response_status: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    response_body: {
      type: getJsonType(),
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
  {
    sequelize,
    tableName: 'idempotency_keys',
    modelName: 'IdempotencyKey',
    timestamps: true,
    underscored: true,
    // Per-request scratch with 24h TTL — drop expired rows hard via the
    // cleanup job. No soft-delete.
    paranoid: false,
    indexes: [
      { fields: ['user_id'], name: 'idempotency_keys_user_id_idx' },
      { fields: ['expires_at'], name: 'idempotency_keys_expires_at_idx' },
    ],
  }
);

export default IdempotencyKey;
