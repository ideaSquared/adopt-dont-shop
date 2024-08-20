// src/models/UserPreference.ts
import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../sequelize'

interface UserPreferenceAttributes {
  preferences_id: string
  user_id: string
  preference_key: string
  preference_value: string
  created_at?: Date
  updated_at?: Date
}

interface UserPreferenceCreationAttributes
  extends Optional<UserPreferenceAttributes, 'preferences_id'> {}

class UserPreference
  extends Model<UserPreferenceAttributes, UserPreferenceCreationAttributes>
  implements UserPreferenceAttributes
{
  public preferences_id!: string
  public user_id!: string
  public preference_key!: string
  public preference_value!: string
  public created_at!: Date
  public updated_at!: Date
}

UserPreference.init(
  {
    preferences_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: sequelize.literal(
        `'user_preferences_' || left(md5(random()::text), 12)`,
      ),
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    preference_key: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    preference_value: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'user_preferences',
    timestamps: true,
  },
)

export default UserPreference
