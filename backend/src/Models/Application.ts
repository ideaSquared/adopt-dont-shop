// src/models/Application.ts
import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../sequelize'

interface ApplicationAttributes {
  application_id: string
  user_id: string
  pet_id: string
  description?: string
  status: string
  actioned_by?: string
  created_at?: Date
  updated_at?: Date
}

interface ApplicationCreationAttributes
  extends Optional<ApplicationAttributes, 'application_id'> {}

class Application
  extends Model<ApplicationAttributes, ApplicationCreationAttributes>
  implements ApplicationAttributes
{
  public application_id!: string
  public user_id!: string
  public pet_id!: string
  public description!: string
  public status!: string
  public actioned_by!: string
  public created_at!: Date
  public updated_at!: Date
}

Application.init(
  {
    application_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: sequelize.literal(
        `'application_' || left(md5(random()::text), 12)`,
      ),
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pet_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['pending', 'rejected', 'approved']],
      },
    },
    actioned_by: {
      type: DataTypes.STRING,
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
    tableName: 'applications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
)

export default Application
