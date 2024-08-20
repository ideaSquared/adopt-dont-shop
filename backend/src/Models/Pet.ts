// src/models/Pet.ts
import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../sequelize'

interface PetAttributes {
  pet_id: string
  name?: string
  owner_id?: string
  short_description?: string
  long_description?: string
  age?: number
  gender?: string
  status?: string
  type?: string
  archived?: boolean
  created_at?: Date
  updated_at?: Date
  images?: string[]
  vaccination_status?: string
  breed?: string
  other_pets?: string
  household?: string
  energy?: string
  family?: string
  temperament?: string
  health?: string
  size?: string
  grooming_needs?: string
  training_socialization?: string
  commitment_level?: string
}

interface PetCreationAttributes extends Optional<PetAttributes, 'pet_id'> {}

class Pet
  extends Model<PetAttributes, PetCreationAttributes>
  implements PetAttributes
{
  public pet_id!: string
  public name!: string
  public owner_id!: string
  public short_description!: string
  public long_description!: string
  public age!: number
  public gender!: string
  public status!: string
  public type!: string
  public archived!: boolean
  public created_at!: Date
  public updated_at!: Date
  public images!: string[]
  public vaccination_status!: string
  public breed!: string
  public other_pets!: string
  public household!: string
  public energy!: string
  public family!: string
  public temperament!: string
  public health!: string
  public size!: string
  public grooming_needs!: string
  public training_socialization!: string
  public commitment_level!: string
}

Pet.init(
  {
    pet_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: sequelize.literal(
        `'pet_' || left(md5(random()::text), 12)`,
      ),
    },
    name: {
      type: DataTypes.TEXT,
    },
    owner_id: {
      type: DataTypes.STRING,
    },
    short_description: {
      type: DataTypes.TEXT,
    },
    long_description: {
      type: DataTypes.TEXT,
    },
    age: {
      type: DataTypes.INTEGER,
    },
    gender: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.STRING,
    },
    type: {
      type: DataTypes.STRING,
    },
    archived: {
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
    images: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
    },
    vaccination_status: {
      type: DataTypes.STRING(255),
    },
    breed: {
      type: DataTypes.STRING(255),
    },
    other_pets: {
      type: DataTypes.TEXT,
    },
    household: {
      type: DataTypes.TEXT,
    },
    energy: {
      type: DataTypes.TEXT,
    },
    family: {
      type: DataTypes.TEXT,
    },
    temperament: {
      type: DataTypes.TEXT,
    },
    health: {
      type: DataTypes.TEXT,
    },
    size: {
      type: DataTypes.TEXT,
    },
    grooming_needs: {
      type: DataTypes.TEXT,
    },
    training_socialization: {
      type: DataTypes.TEXT,
    },
    commitment_level: {
      type: DataTypes.TEXT,
    },
  },
  {
    sequelize,
    tableName: 'pets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
)

export default Pet
