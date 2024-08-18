// src/models/UserRole.ts
import { DataTypes, Model } from 'sequelize'
import sequelize from '../sequelize'
import Role from './Role'
import User from './User'

class UserRole extends Model {
  public user_id!: string
  public role_id!: number
  public created_at!: Date
  public updated_at!: Date
}

UserRole.init(
  {
    user_id: {
      type: DataTypes.STRING,
      references: {
        model: User,
        key: 'user_id',
      },
      primaryKey: true,
    },
    role_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Role,
        key: 'role_id',
      },
      primaryKey: true,
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
    tableName: 'user_roles',
    timestamps: false,
  },
)

export default UserRole
