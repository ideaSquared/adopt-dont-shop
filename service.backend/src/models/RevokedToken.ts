import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';

type RevokedTokenAttributes = {
  jti: string;
  user_id: string;
  expires_at: Date;
  revoked_at: Date;
  updated_at: Date;
};

type RevokedTokenCreationAttributes = Optional<RevokedTokenAttributes, 'revoked_at' | 'updated_at'>;

class RevokedToken
  extends Model<RevokedTokenAttributes, RevokedTokenCreationAttributes>
  implements RevokedTokenAttributes
{
  public jti!: string;
  public user_id!: string;
  public expires_at!: Date;
  public revoked_at!: Date;
  public updated_at!: Date;
}

RevokedToken.init(
  {
    jti: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    revoked_at: {
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
    tableName: 'revoked_tokens',
    modelName: 'RevokedToken',
    // ADS-502: align with platform convention (timestamps: true) — `revoked_at`
    // doubles as createdAt (set once on revoke), `updated_at` exists for
    // forward compatibility. Disable createdAt mapping since we don't have a
    // separate `created_at` column.
    timestamps: true,
    createdAt: false,
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['expires_at'], name: 'revoked_tokens_expires_at_idx' },
      { fields: ['user_id'], name: 'revoked_tokens_user_id_idx' },
    ],
  }
);

export default RevokedToken;
