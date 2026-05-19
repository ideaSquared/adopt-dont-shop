import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType } from '../sequelize';

/**
 * Implicit preference scores derived from swipe history. Written by
 * swipe.service on every like / super_like (positive weight) and pass
 * (negative weight). Read by the CF scorer in the matching module
 * via the cached projection on `adopter_match_profile.inferred_prefs`.
 *
 * Composite uniqueness on (user_id, preference_type, preference_value)
 * is enforced by the table-level index — see `indexes` below.
 */
export interface UserPreferenceAttributes {
  user_preference_id: string;
  user_id: string;
  preference_type: string;
  preference_value: string;
  score: number;
  created_at?: Date;
  updated_at?: Date;
}

interface UserPreferenceCreationAttributes extends Optional<
  UserPreferenceAttributes,
  'user_preference_id' | 'score' | 'created_at' | 'updated_at'
> {}

class UserPreference
  extends Model<UserPreferenceAttributes, UserPreferenceCreationAttributes>
  implements UserPreferenceAttributes
{
  public user_preference_id!: string;
  public user_id!: string;
  public preference_type!: string;
  public preference_value!: string;
  public score!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

UserPreference.init(
  {
    user_preference_id: {
      type: getUuidType(),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: {
      type: getUuidType(),
      allowNull: false,
      references: { model: 'users', key: 'user_id' },
      onDelete: 'CASCADE',
    },
    preference_type: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    preference_value: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'user_preferences',
    modelName: 'UserPreference',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
      {
        fields: ['user_id', 'preference_type', 'preference_value'],
        name: 'user_preferences_user_type_value_unique',
        unique: true,
      },
      {
        fields: ['user_id', 'preference_type'],
        name: 'user_preferences_user_type_idx',
      },
    ],
  }
);

export default UserPreference;
