import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType } from '../sequelize';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

export enum ProfileVisibility {
  PUBLIC = 'public',
  RESCUES_ONLY = 'rescues_only',
  PRIVATE = 'private',
}

/**
 * Per-user privacy preferences (plan 5.6 — typed preference table
 * replacing the User.privacySettings JSONB blob).
 *
 * 1:1 with User. A row is auto-created by User.afterCreate so consumers
 * can always assume the row exists.
 */
interface UserPrivacyPrefsAttributes {
  user_id: string;
  profile_visibility: ProfileVisibility;
  show_last_seen: boolean;
  show_location: boolean;
  allow_search_indexing: boolean;
  allow_data_export: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface UserPrivacyPrefsCreationAttributes
  extends Optional<
    UserPrivacyPrefsAttributes,
    | 'profile_visibility'
    | 'show_last_seen'
    | 'show_location'
    | 'allow_search_indexing'
    | 'allow_data_export'
    | 'created_at'
    | 'updated_at'
  > {}

class UserPrivacyPrefs
  extends Model<UserPrivacyPrefsAttributes, UserPrivacyPrefsCreationAttributes>
  implements UserPrivacyPrefsAttributes
{
  public user_id!: string;
  public profile_visibility!: ProfileVisibility;
  public show_last_seen!: boolean;
  public show_location!: boolean;
  public allow_search_indexing!: boolean;
  public allow_data_export!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

UserPrivacyPrefs.init(
  {
    user_id: {
      type: getUuidType(),
      primaryKey: true,
      references: { model: 'users', key: 'user_id' },
      onDelete: 'CASCADE',
    },
    profile_visibility: {
      type: DataTypes.ENUM(...Object.values(ProfileVisibility)),
      allowNull: false,
      defaultValue: ProfileVisibility.RESCUES_ONLY,
    },
    show_last_seen: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    show_location: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    allow_search_indexing: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    allow_data_export: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    tableName: 'user_privacy_prefs',
    modelName: 'UserPrivacyPrefs',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [...auditIndexes('user_privacy_prefs')],
  })
);

export default UserPrivacyPrefs;
