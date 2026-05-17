import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType } from '../sequelize';
import { generateUuidV7 } from '../utils/uuid';

export enum FosterPlacementStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface FosterPlacementAttributes {
  placementId: string;
  petId: string;
  fosterUserId: string;
  rescueId: string;
  startDate: Date;
  endDate: Date | null;
  status: FosterPlacementStatus;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

interface FosterPlacementCreationAttributes extends Optional<
  FosterPlacementAttributes,
  'placementId' | 'endDate' | 'status' | 'notes' | 'createdAt' | 'updatedAt' | 'deletedAt'
> {}

class FosterPlacement
  extends Model<FosterPlacementAttributes, FosterPlacementCreationAttributes>
  implements FosterPlacementAttributes
{
  public placementId!: string;
  public petId!: string;
  public fosterUserId!: string;
  public rescueId!: string;
  public startDate!: Date;
  public endDate!: Date | null;
  public status!: FosterPlacementStatus;
  public notes!: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
}

FosterPlacement.init(
  {
    placementId: {
      type: getUuidType(),
      primaryKey: true,
      field: 'placement_id',
      defaultValue: () => generateUuidV7(),
    },
    petId: {
      type: getUuidType(),
      allowNull: false,
      field: 'pet_id',
      references: { model: 'pets', key: 'pet_id' },
      onDelete: 'CASCADE',
    },
    fosterUserId: {
      type: getUuidType(),
      allowNull: false,
      field: 'foster_user_id',
      references: { model: 'users', key: 'user_id' },
      onDelete: 'RESTRICT',
    },
    rescueId: {
      type: getUuidType(),
      allowNull: false,
      field: 'rescue_id',
      references: { model: 'rescues', key: 'rescue_id' },
      onDelete: 'CASCADE',
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'start_date',
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'end_date',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(FosterPlacementStatus)),
      allowNull: false,
      defaultValue: FosterPlacementStatus.ACTIVE,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'foster_placements',
    modelName: 'FosterPlacement',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['pet_id'], name: 'foster_placements_pet_id_idx' },
      { fields: ['foster_user_id'], name: 'foster_placements_foster_user_id_idx' },
      { fields: ['rescue_id'], name: 'foster_placements_rescue_id_idx' },
      { fields: ['status'], name: 'foster_placements_status_idx' },
      {
        fields: ['pet_id'],
        name: 'foster_placements_active_pet_unique',
        unique: true,
        where: { status: 'active', deleted_at: null },
      },
    ],
  }
);

export default FosterPlacement;
