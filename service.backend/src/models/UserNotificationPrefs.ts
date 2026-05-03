import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType } from '../sequelize';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

export enum DigestFrequency {
  IMMEDIATE = 'immediate',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  NEVER = 'never',
}

/**
 * Per-user notification preferences (plan 5.6 — typed preference table
 * replacing the User.notificationPreferences JSONB blob).
 *
 * 1:1 with User. A row is auto-created by User.afterCreate so consumers
 * can always assume the row exists; defaults match the previous JSONB
 * defaults so behaviour for existing flows is unchanged.
 *
 * Quiet-hours window is local to the user's timezone column (also here,
 * not on User) — server-side scheduling honours both.
 */
interface UserNotificationPrefsAttributes {
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  digest_frequency: DigestFrequency;
  application_updates: boolean;
  pet_matches: boolean;
  rescue_updates: boolean;
  chat_messages: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
  created_at?: Date;
  updated_at?: Date;
}

interface UserNotificationPrefsCreationAttributes
  extends Optional<
    UserNotificationPrefsAttributes,
    | 'email_enabled'
    | 'push_enabled'
    | 'sms_enabled'
    | 'digest_frequency'
    | 'application_updates'
    | 'pet_matches'
    | 'rescue_updates'
    | 'chat_messages'
    | 'quiet_hours_start'
    | 'quiet_hours_end'
    | 'timezone'
    | 'created_at'
    | 'updated_at'
  > {}

class UserNotificationPrefs
  extends Model<UserNotificationPrefsAttributes, UserNotificationPrefsCreationAttributes>
  implements UserNotificationPrefsAttributes
{
  public user_id!: string;
  public email_enabled!: boolean;
  public push_enabled!: boolean;
  public sms_enabled!: boolean;
  public digest_frequency!: DigestFrequency;
  public application_updates!: boolean;
  public pet_matches!: boolean;
  public rescue_updates!: boolean;
  public chat_messages!: boolean;
  public quiet_hours_start!: string | null;
  public quiet_hours_end!: string | null;
  public timezone!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

UserNotificationPrefs.init(
  {
    user_id: {
      type: getUuidType(),
      primaryKey: true,
      references: { model: 'users', key: 'user_id' },
      onDelete: 'CASCADE',
    },
    email_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    push_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sms_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    digest_frequency: {
      type: DataTypes.ENUM(...Object.values(DigestFrequency)),
      allowNull: false,
      defaultValue: DigestFrequency.WEEKLY,
    },
    application_updates: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    pet_matches: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    rescue_updates: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    chat_messages: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    quiet_hours_start: { type: DataTypes.TIME, allowNull: true },
    quiet_hours_end: { type: DataTypes.TIME, allowNull: true },
    timezone: { type: DataTypes.STRING(64), allowNull: false, defaultValue: 'UTC' },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    tableName: 'user_notification_prefs',
    modelName: 'UserNotificationPrefs',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [...auditIndexes('user_notification_prefs')],
  })
);

export default UserNotificationPrefs;
