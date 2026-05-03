import { DataTypes, Model, Optional, Op } from 'sequelize';
import sequelize, { getUuidType } from '../sequelize';
import { generateUuidV7 } from '../utils/uuid';

interface RefreshTokenAttributes {
  token_id: string;
  user_id: string;
  family_id: string;
  is_revoked: boolean;
  expires_at: Date;
  replaced_by_token_id: string | null;
  created_at?: Date;
  updated_at?: Date;
}

interface RefreshTokenCreationAttributes
  extends Optional<
    RefreshTokenAttributes,
    'is_revoked' | 'replaced_by_token_id' | 'created_at' | 'updated_at'
  > {}

class RefreshToken
  extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes>
  implements RefreshTokenAttributes
{
  public token_id!: string;
  public user_id!: string;
  public family_id!: string;
  public is_revoked!: boolean;
  public expires_at!: Date;
  public replaced_by_token_id!: string | null;
  public created_at!: Date;
  public updated_at!: Date;

  public isExpired(): boolean {
    return new Date() > this.expires_at;
  }
}

RefreshToken.init(
  {
    token_id: {
      type: getUuidType(),
      primaryKey: true,
      defaultValue: () => generateUuidV7(),
    },
    user_id: {
      type: getUuidType(),
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    family_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_revoked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    replaced_by_token_id: {
      type: getUuidType(),
      allowNull: true,
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
    tableName: 'refresh_tokens',
    modelName: 'RefreshToken',
    timestamps: true,
    underscored: true,
    // Hard expiration via expires_at + is_revoked. Hard-deleted on
    // logout/cleanup; no soft-delete semantics needed.
    paranoid: false,
    indexes: [
      { fields: ['user_id'], name: 'refresh_tokens_user_id_idx' },
      { fields: ['family_id'], name: 'refresh_tokens_family_id_idx' },
      { fields: ['is_revoked'], name: 'refresh_tokens_is_revoked_idx' },
      { fields: ['expires_at'], name: 'refresh_tokens_expires_at_idx' },
      { fields: ['user_id', 'family_id'], name: 'refresh_tokens_user_family_idx' },
    ],
    scopes: {
      active: {
        where: {
          is_revoked: false,
          expires_at: { [Op.gt]: new Date() },
        },
      },
    },
  }
);

export default RefreshToken;
