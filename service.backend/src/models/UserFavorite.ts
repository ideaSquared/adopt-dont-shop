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
import { generateUuidV7 } from '../utils/uuid';
import Pet from './Pet';
import User from './User';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

class UserFavorite extends Model<
  InferAttributes<UserFavorite>,
  InferCreationAttributes<UserFavorite>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['userId']>;
  declare petId: ForeignKey<Pet['petId']>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date>;

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
      defaultValue: () => generateUuidV7(),
      primaryKey: true,
    },
    userId: {
      type: getUuidType(),
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    petId: {
      type: getUuidType(),
      allowNull: false,
      field: 'pet_id',
      references: {
        model: 'pets',
        key: 'pet_id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    modelName: 'UserFavorite',
    tableName: 'user_favorites',
    timestamps: true,
    paranoid: true,
    underscored: true,
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
      { fields: ['deleted_at'], name: 'user_favorites_deleted_at_idx' },
      ...auditIndexes('user_favorites'),
    ],
  })
);

export default UserFavorite;
