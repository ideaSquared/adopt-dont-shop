import {
  Association,
  BelongsToGetAssociationMixin,
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
} from 'sequelize';
import sequelize, { getUuidType, getArrayType, getGeometryType } from '../sequelize';
import Pet from './Pet';
import User from './User';

class UserFavorite extends Model<
  InferAttributes<UserFavorite>,
  InferCreationAttributes<UserFavorite>
> {
  declare id: CreationOptional<string>;
  declare user_id: ForeignKey<User['userId']>;
  declare pet_id: ForeignKey<Pet['pet_id']>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
  declare deleted_at: CreationOptional<Date>;

  // Associations
  declare getUser: BelongsToGetAssociationMixin<User>;
  declare getPet: BelongsToGetAssociationMixin<Pet>;

  declare user?: NonAttribute<User>;
  declare pet?: NonAttribute<Pet>;

  declare static associations: {
    user: Association<UserFavorite, User>;
    pet: Association<UserFavorite, Pet>;
  };
}

UserFavorite.init(
  {
    id: {
      type: getUuidType(),
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    pet_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'pets',
        key: 'pet_id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'UserFavorite',
    tableName: 'user_favorites',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'pet_id'],
        name: 'unique_user_pet_favorite',
        where: {
          deleted_at: null,
        },
      },
      {
        fields: ['user_id'],
        name: 'idx_user_favorites_user_id',
      },
      {
        fields: ['pet_id'],
        name: 'idx_user_favorites_pet_id',
      },
      {
        fields: ['created_at'],
        name: 'idx_user_favorites_created_at',
      },
    ],
  }
);

export default UserFavorite;
