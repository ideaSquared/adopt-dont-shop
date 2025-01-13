// src/models/Rating.ts
import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../sequelize'

interface RatingAttributes {
  rating_id: string
  user_id?: string
  pet_id?: string
  rating_type?: string
  created_at?: Date
  updated_at?: Date
}

interface RatingCreationAttributes
  extends Optional<RatingAttributes, 'rating_id'> {}

class Rating
  extends Model<RatingAttributes, RatingCreationAttributes>
  implements RatingAttributes
{
  public rating_id!: string
  public user_id!: string
  public pet_id!: string
  public rating_type!: string
  public created_at!: Date
  public updated_at!: Date
}

Rating.init(
  {
    rating_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: sequelize.literal(
        `'rating_' || left(md5(random()::text), 12)`,
      ),
    },
    user_id: {
      type: DataTypes.STRING,
    },
    pet_id: {
      type: DataTypes.STRING,
    },
    rating_type: {
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
    tableName: 'ratings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
)

export default Rating
