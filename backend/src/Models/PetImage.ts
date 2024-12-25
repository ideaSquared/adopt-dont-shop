import { DataTypes, Model, Optional } from 'sequelize'
import { Pet } from '.'
import sequelize from '../sequelize'

export interface PetImageAttributes {
  image_id: string
  pet_id: string
  image_url: string
  created_at?: Date
  updated_at?: Date
}

export interface PetImageCreationAttributes
  extends Optional<PetImageAttributes, 'image_id'> {}

class PetImage
  extends Model<PetImageAttributes, PetImageCreationAttributes>
  implements PetImageAttributes
{
  public image_id!: string
  public pet_id!: string
  public image_url!: string
  public created_at!: Date
  public updated_at!: Date
}

PetImage.init(
  {
    image_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: sequelize.literal(
        `'img_' || left(md5(random()::text), 12)`,
      ),
    },
    pet_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: Pet, // Establishes a relationship with the Pet model
        key: 'pet_id',
      },
      onDelete: 'CASCADE', // Deletes images when the associated pet is deleted
    },
    image_url: {
      type: DataTypes.TEXT,
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
    tableName: 'pet_images',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
)

export default PetImage
