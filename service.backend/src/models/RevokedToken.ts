import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';

type RevokedTokenAttributes = {
  jti: string;
  user_id: string;
  expires_at: Date;
  revoked_at: Date;
};

type RevokedTokenCreationAttributes = Optional<RevokedTokenAttributes, 'revoked_at'>;

class RevokedToken
  extends Model<RevokedTokenAttributes, RevokedTokenCreationAttributes>
  implements RevokedTokenAttributes
{
  public jti!: string;
  public user_id!: string;
  public expires_at!: Date;
  public revoked_at!: Date;
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
  },
  {
    sequelize,
    tableName: 'revoked_tokens',
    modelName: 'RevokedToken',
    timestamps: false,
    indexes: [
      { fields: ['expires_at'], name: 'revoked_tokens_expires_at_idx' },
      { fields: ['user_id'], name: 'revoked_tokens_user_id_idx' },
    ],
  }
);

export default RevokedToken;
