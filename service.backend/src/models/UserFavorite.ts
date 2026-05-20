import { Association, BelongsToGetAssociationMixin, DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType, getArrayType, getGeometryType } from '../sequelize';
import { generateUuidV7 } from '../utils/uuid';
import Pet from './Pet';
import User from './User';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

interface UserFavoriteAttributes {
  id: string;
  userId: string;
  petId: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

// Sequelize 7's alpha.9 `ForeignKey<T>` brand is missing, and using
// `InferAttributes` on a model with `BelongsToGetAssociationMixin`
// triggers TS2589 deep instantiation. Fall back to the explicit
// attributes interface pattern the rest of the project already uses.
interface UserFavoriteCreationAttributes extends Optional<
  UserFavoriteAttributes,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
> {}

class UserFavorite
  extends Model<UserFavoriteAttributes, UserFavoriteCreationAttributes>
  implements UserFavoriteAttributes
{
  public id!: string;
  public userId!: string;
  public petId!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;

  // Associations
  public getUser!: BelongsToGetAssociationMixin<User>;
  public getPet!: BelongsToGetAssociationMixin<Pet>;

  public user?: User;
  public pet?: Pet;

  public static associations: {
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
