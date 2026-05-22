import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType } from '../sequelize';
import { hashToken } from '../utils/secrets';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

/**
 * ADS: email-bootstrapped 2FA recovery (Batch KK).
 *
 * Issued when a user with 2FA enabled loses both their TOTP device and
 * all backup codes. The plaintext token only travels in the recovery
 * email link; the SHA-256 hash is stored here (mirrors Invitation /
 * password-reset token storage). One-shot: `used` flips to true on
 * confirm and the row is left in place for audit forensics.
 */
interface TwoFactorRecoveryAttributes {
  recovery_id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  used: boolean;
  used_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

type TwoFactorRecoveryCreationAttributes = Optional<
  TwoFactorRecoveryAttributes,
  'recovery_id' | 'used' | 'used_at'
>;

class TwoFactorRecovery
  extends Model<TwoFactorRecoveryAttributes, TwoFactorRecoveryCreationAttributes>
  implements TwoFactorRecoveryAttributes
{
  public recovery_id!: string;
  public user_id!: string;
  public token!: string;
  public expires_at!: Date;
  public used!: boolean;
  public used_at!: Date | null;
  public created_at!: Date;
  public updated_at!: Date;
}

TwoFactorRecovery.init(
  {
    recovery_id: {
      type: getUuidType(),
      defaultValue: () => generateUuidV7(),
      primaryKey: true,
    },
    user_id: {
      type: getUuidType(),
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'CASCADE',
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
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
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    tableName: 'two_factor_recoveries',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['token'],
        name: 'two_factor_recoveries_token_unique',
      },
      {
        fields: ['user_id'],
        name: 'two_factor_recoveries_user_id_idx',
      },
      ...auditIndexes('two_factor_recoveries'),
    ],
    hooks: {
      beforeSave: (recovery: TwoFactorRecovery) => {
        // Mirrors Invitation: callers write the raw token; the model
        // SHA-256-hashes it before persistence so a DB leak can't
        // forge a working recovery link.
        if (recovery.changed('token') && recovery.token) {
          recovery.token = hashToken(recovery.token);
        }
      },
    },
  })
);

export default TwoFactorRecovery;
