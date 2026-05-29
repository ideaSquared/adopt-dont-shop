import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getJsonType, getUuidType } from '../sequelize';
import { generateUuidV7 } from '../utils/uuid';

export type ApplicationDraftAttributes = {
  draftId: string;
  userId: string;
  petId: string;
  answers: Record<string, unknown>;
  expiresAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type ApplicationDraftCreationAttributes = Optional<
  ApplicationDraftAttributes,
  'draftId' | 'expiresAt' | 'createdAt' | 'updatedAt'
>;

class ApplicationDraft
  extends Model<ApplicationDraftAttributes, ApplicationDraftCreationAttributes>
  implements ApplicationDraftAttributes
{
  public draftId!: string;
  public userId!: string;
  public petId!: string;
  public answers!: Record<string, unknown>;
  public expiresAt!: Date | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

ApplicationDraft.init(
  {
    draftId: {
      type: getUuidType(),
      primaryKey: true,
      field: 'draft_id',
      defaultValue: () => generateUuidV7(),
    },
    userId: {
      type: getUuidType(),
      allowNull: false,
      field: 'user_id',
      references: { model: 'users', key: 'user_id' },
      onDelete: 'CASCADE',
    },
    petId: {
      type: getUuidType(),
      allowNull: false,
      field: 'pet_id',
      references: { model: 'pets', key: 'pet_id' },
      onDelete: 'CASCADE',
    },
    answers: {
      type: getJsonType(),
      allowNull: false,
      defaultValue: {},
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at',
    },
  },
  {
    sequelize,
    tableName: 'application_drafts',
    modelName: 'ApplicationDraft',
    timestamps: true,
    // Drafts are ephemeral and replaced on every keystroke — soft-delete
    // adds no value and the unique index on (user_id, pet_id) would
    // collide with the soft-deleted row on the next upsert.
    paranoid: false,
    underscored: true,
    indexes: [
      {
        fields: ['user_id', 'pet_id'],
        name: 'application_drafts_user_pet_unique',
        unique: true,
      },
      { fields: ['expires_at'], name: 'application_drafts_expires_at_idx' },
    ],
  }
);

export default ApplicationDraft;
