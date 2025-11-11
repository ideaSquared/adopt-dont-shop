import { DataTypes, Model, Op, Optional } from 'sequelize';
import sequelize, { getJsonType } from '../sequelize';
import { JsonObject } from '../types/common';

// Device platform enum
export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

// Token status enum
export enum TokenStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  INVALID = 'invalid',
}

interface DeviceTokenAttributes {
  token_id: string;
  user_id: string;
  device_token: string;
  platform: DevicePlatform;
  app_version?: string | null;
  device_info?: JsonObject;
  status: TokenStatus;
  last_used_at?: Date | null;
  expires_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

interface DeviceTokenCreationAttributes
  extends Optional<
    DeviceTokenAttributes,
    'token_id' | 'status' | 'created_at' | 'updated_at' | 'deleted_at'
  > {}

class DeviceToken
  extends Model<DeviceTokenAttributes, DeviceTokenCreationAttributes>
  implements DeviceTokenAttributes
{
  public token_id!: string;
  public user_id!: string;
  public device_token!: string;
  public platform!: DevicePlatform;
  public app_version!: string | null;
  public device_info!: JsonObject;
  public status!: TokenStatus;
  public last_used_at!: Date | null;
  public expires_at!: Date | null;
  public created_at!: Date;
  public updated_at!: Date;
  public deleted_at!: Date | null;

  // Instance methods
  public isActive(): boolean {
    return this.status === TokenStatus.ACTIVE && (!this.expires_at || new Date() < this.expires_at);
  }

  public isExpired(): boolean {
    return this.expires_at ? new Date() > this.expires_at : false;
  }

  public markAsUsed(): void {
    this.last_used_at = new Date();
    if (this.status === TokenStatus.INACTIVE) {
      this.status = TokenStatus.ACTIVE;
    }
  }

  public markAsInvalid(): void {
    this.status = TokenStatus.INVALID;
  }
}

DeviceToken.init(
  {
    token_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: sequelize.literal(`'token_' || left(md5(random()::text), 12)`),
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'CASCADE',
    },
    device_token: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [10, 500],
      },
    },
    platform: {
      type: DataTypes.ENUM(...Object.values(DevicePlatform)),
      allowNull: false,
    },
    app_version: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    device_info: {
      type: getJsonType(),
      allowNull: false,
      defaultValue: {},
    },
    status: {
      type: DataTypes.ENUM(...Object.values(TokenStatus)),
      allowNull: false,
      defaultValue: TokenStatus.ACTIVE,
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expires_at: {
      type: DataTypes.DATE,
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
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'device_tokens',
    modelName: 'DeviceToken',
    timestamps: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      {
        fields: ['user_id'],
        name: 'device_tokens_user_id_idx',
      },
      {
        fields: ['device_token'],
        name: 'device_tokens_token_idx',
      },
      {
        fields: ['platform'],
        name: 'device_tokens_platform_idx',
      },
      {
        fields: ['status'],
        name: 'device_tokens_status_idx',
      },
      {
        fields: ['last_used_at'],
        name: 'device_tokens_last_used_idx',
      },
      {
        fields: ['expires_at'],
        name: 'device_tokens_expires_idx',
      },
      {
        fields: ['user_id', 'device_token'],
        unique: true,
        name: 'device_tokens_user_token_unique',
        where: {
          deleted_at: null,
        },
      },
    ],
    hooks: {
      beforeValidate: (deviceToken: DeviceToken) => {
        // Auto-set expires_at based on platform (iOS tokens expire more frequently)
        if (!deviceToken.expires_at) {
          const now = new Date();
          const expiryDays = deviceToken.platform === DevicePlatform.IOS ? 30 : 90;
          deviceToken.expires_at = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);
        }
      },
      beforeSave: (deviceToken: DeviceToken) => {
        // Auto-update status if expired
        if (deviceToken.isExpired() && deviceToken.status === TokenStatus.ACTIVE) {
          deviceToken.status = TokenStatus.EXPIRED;
        }
      },
    },
    scopes: {
      active: {
        where: {
          status: TokenStatus.ACTIVE,
          expires_at: { [Op.gt]: new Date() },
        },
      },
      byPlatform: (platform: DevicePlatform) => ({
        where: { platform },
      }),
      expired: {
        where: {
          [Op.or]: [{ status: TokenStatus.EXPIRED }, { expires_at: { [Op.lte]: new Date() } }],
        },
      },
      recentlyUsed: {
        where: {
          last_used_at: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      },
    },
  }
);

export default DeviceToken;
