import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../sequelize'

interface RoleAttributes {
  role_id: number
  role_name: string
  created_at?: Date
  updated_at?: Date
}

interface RoleCreationAttributes extends Optional<RoleAttributes, 'role_id'> {}

class Role
  extends Model<RoleAttributes, RoleCreationAttributes>
  implements RoleAttributes
{
  public role_id!: number
  public role_name!: string
  public created_at!: Date
  public updated_at!: Date
}

Role.init(
  {
    role_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    role_name: {
      type: DataTypes.STRING(255),
      unique: true,
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
    tableName: 'roles',
    timestamps: false,
  },
)

export default Role
