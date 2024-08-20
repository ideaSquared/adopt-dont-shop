// src/models/Rescue.ts
import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../sequelize'

interface RescueAttributes {
  rescue_id: string
  rescue_name?: string
  rescue_type?: string
  reference_number?: string
  reference_number_verified?: boolean
  created_at?: Date
  updated_at?: Date
  address_line_1?: string
  address_line_2?: string
  city?: string
  county?: string
  postcode?: string
  country?: string
  location?: { type: string; coordinates: [number, number] }
}

export interface RescueCreationAttributes
  extends Optional<RescueAttributes, 'rescue_id'> {}

class Rescue
  extends Model<RescueAttributes, RescueCreationAttributes>
  implements RescueAttributes
{
  public rescue_id!: string
  public rescue_name!: string
  public rescue_type!: string
  public reference_number!: string
  public reference_number_verified!: boolean
  public created_at!: Date
  public updated_at!: Date
  public address_line_1!: string
  public address_line_2!: string
  public city!: string
  public county!: string
  public postcode!: string
  public country!: string
  public location!: { type: string; coordinates: [number, number] }
}

Rescue.init(
  {
    rescue_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: sequelize.literal(
        `'rescue_' || left(md5(random()::text), 12)`,
      ),
    },
    rescue_name: {
      type: DataTypes.TEXT,
    },
    rescue_type: {
      type: DataTypes.TEXT,
    },
    reference_number: {
      type: DataTypes.TEXT,
    },
    reference_number_verified: {
      type: DataTypes.BOOLEAN,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    address_line_1: {
      type: DataTypes.TEXT,
    },
    address_line_2: {
      type: DataTypes.TEXT,
    },
    city: {
      type: DataTypes.TEXT,
    },
    county: {
      type: DataTypes.TEXT,
    },
    postcode: {
      type: DataTypes.TEXT,
    },
    country: {
      type: DataTypes.TEXT,
    },
    location: {
      type: DataTypes.JSON,
    },
  },
  {
    sequelize,
    tableName: 'rescues',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
)

export default Rescue
