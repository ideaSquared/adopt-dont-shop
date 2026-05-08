import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType } from '../sequelize';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

/**
 * GDPR Art. 7 — record of consent.
 *
 * Each row is an immutable event. Granting / withdrawing consent for a
 * given purpose appends a new row; the latest row per (user_id, purpose)
 * is the user's current state. We never UPDATE — auditors need to see
 * exactly when a user opted in or out and which policy version was in
 * force at the time.
 */
export enum ConsentPurpose {
  MARKETING_EMAIL = 'marketing_email',
  ANALYTICS = 'analytics',
  THIRD_PARTY_SHARING = 'third_party_sharing',
  PROFILING = 'profiling',
}

interface UserConsentAttributes {
  consentId: string;
  userId: string;
  purpose: ConsentPurpose;
  granted: boolean;
  policyVersion: string;
  source?: string | null;
  ipAddress?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserConsentCreationAttributes
  extends Optional<UserConsentAttributes, 'consentId' | 'source' | 'ipAddress' | 'createdAt' | 'updatedAt'> {}

class UserConsent
  extends Model<UserConsentAttributes, UserConsentCreationAttributes>
  implements UserConsentAttributes
{
  public consentId!: string;
  public userId!: string;
  public purpose!: ConsentPurpose;
  public granted!: boolean;
  public policyVersion!: string;
  public source!: string | null;
  public ipAddress!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserConsent.init(
  {
    consentId: {
      type: getUuidType(),
      primaryKey: true,
      field: 'consent_id',
      defaultValue: () => generateUuidV7(),
    },
    userId: {
      type: getUuidType(),
      allowNull: false,
      field: 'user_id',
      references: { model: 'users', key: 'user_id' },
      onDelete: 'CASCADE',
    },
    purpose: {
      type: DataTypes.ENUM(...Object.values(ConsentPurpose)),
      allowNull: false,
    },
    granted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    policyVersion: {
      type: DataTypes.STRING(32),
      allowNull: false,
      field: 'policy_version',
    },
    source: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address',
    },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    modelName: 'UserConsent',
    tableName: 'user_consents',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
      { fields: ['user_id', 'purpose', 'created_at'], name: 'user_consents_user_purpose_idx' },
      ...auditIndexes('user_consents'),
    ],
  })
);

export default UserConsent;
