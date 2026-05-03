import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType } from '../sequelize';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

/**
 * Per-user application-flow preferences (plan 5.6 — typed preference
 * table replacing the User.applicationPreferences JSONB blob).
 *
 * 1:1 with User. Auto-created via User.afterCreate so consumers can
 * always assume the row exists.
 *
 * The legacy JSONB used three keys (`auto_populate`,
 * `quick_apply_enabled`, `completion_reminders`); this table maps them
 * to plan-spec column names plus two new fields the plan calls for
 * (`share_with_rescues`, `default_household_size`).
 *
 * Note: User.applicationDefaults (the rich profile snapshot —
 * personalInfo, livingSituation, references) stays as JSONB for now.
 * Splitting it into typed sub-tables is a separate larger slice.
 */
interface UserApplicationPrefsAttributes {
  user_id: string;
  auto_fill_profile: boolean;
  remember_answers: boolean;
  share_with_rescues: boolean;
  completion_reminders: boolean;
  default_household_size: number | null;
  created_at?: Date;
  updated_at?: Date;
}

interface UserApplicationPrefsCreationAttributes extends Optional<
  UserApplicationPrefsAttributes,
  | 'auto_fill_profile'
  | 'remember_answers'
  | 'share_with_rescues'
  | 'completion_reminders'
  | 'default_household_size'
  | 'created_at'
  | 'updated_at'
> {}

class UserApplicationPrefs
  extends Model<UserApplicationPrefsAttributes, UserApplicationPrefsCreationAttributes>
  implements UserApplicationPrefsAttributes
{
  public user_id!: string;
  public auto_fill_profile!: boolean;
  public remember_answers!: boolean;
  public share_with_rescues!: boolean;
  public completion_reminders!: boolean;
  public default_household_size!: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

UserApplicationPrefs.init(
  {
    user_id: {
      type: getUuidType(),
      primaryKey: true,
      references: { model: 'users', key: 'user_id' },
      onDelete: 'CASCADE',
    },
    auto_fill_profile: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    remember_answers: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    share_with_rescues: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    completion_reminders: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    default_household_size: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1, max: 50 },
    },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    tableName: 'user_application_prefs',
    modelName: 'UserApplicationPrefs',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [...auditIndexes('user_application_prefs')],
  })
);

export default UserApplicationPrefs;
