import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getJsonType, getUuidType } from '../sequelize';
import { JsonObject } from '../types/common';
import { generateUuidV7 } from '../utils/uuid';
import { PetStatus } from './Pet';
import { installStatusTransitionTrigger } from './status-transitions';

/**
 * Append-only event log of every status change on a Pet.
 *
 * Same shape and rationale as ApplicationStatusTransition — see that file
 * for the full pattern explanation. The trigger denormalizes to_status
 * onto pets.status; the SQLite afterCreate hook is the JS fallback.
 *
 * Pets transition through:
 *   available → pending → adopted (the happy path)
 *   available ↔ medical_hold / behavioral_hold (operational pauses)
 *   adopted → deceased / not_available (terminal states)
 *
 * The first transition for a pet has from_status = NULL.
 */

interface PetStatusTransitionAttributes {
  transitionId: string;
  petId: string;
  fromStatus: PetStatus | null;
  toStatus: PetStatus;
  transitionedAt: Date;
  transitionedBy: string | null;
  reason: string | null;
  metadata: JsonObject | null;
}

interface PetStatusTransitionCreationAttributes
  extends Optional<
    PetStatusTransitionAttributes,
    'transitionId' | 'transitionedAt' | 'fromStatus' | 'transitionedBy' | 'reason' | 'metadata'
  > {}

class PetStatusTransition
  extends Model<PetStatusTransitionAttributes, PetStatusTransitionCreationAttributes>
  implements PetStatusTransitionAttributes
{
  public transitionId!: string;
  public petId!: string;
  public fromStatus!: PetStatus | null;
  public toStatus!: PetStatus;
  public transitionedAt!: Date;
  public transitionedBy!: string | null;
  public reason!: string | null;
  public metadata!: JsonObject | null;
}

PetStatusTransition.init(
  {
    transitionId: {
      type: getUuidType(),
      primaryKey: true,
      field: 'transition_id',
      defaultValue: () => generateUuidV7(),
    },
    petId: {
      type: getUuidType(),
      allowNull: false,
      field: 'pet_id',
      references: { model: 'pets', key: 'pet_id' },
      onDelete: 'CASCADE',
    },
    fromStatus: {
      type: DataTypes.ENUM(...Object.values(PetStatus)),
      allowNull: true,
      field: 'from_status',
    },
    toStatus: {
      type: DataTypes.ENUM(...Object.values(PetStatus)),
      allowNull: false,
      field: 'to_status',
    },
    transitionedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'transitioned_at',
      defaultValue: DataTypes.NOW,
    },
    transitionedBy: {
      // No FK enforcement on the actor — same pattern as AuditLog.user.
      // Forensic metadata that should survive user deletion; the
      // parent-side FK (pet_id, CASCADE) is what enforces lifecycle
      // integrity. Association in models/index.ts uses constraints: false.
      type: getUuidType(),
      allowNull: true,
      field: 'transitioned_by',
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: getJsonType(),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'pet_status_transitions',
    modelName: 'PetStatusTransition',
    underscored: true,
    timestamps: false,
    indexes: [
      {
        fields: ['pet_id', 'transitioned_at'],
        name: 'pet_status_transitions_pet_id_at_idx',
      },
      {
        fields: ['transitioned_by'],
        name: 'pet_status_transitions_transitioned_by_idx',
      },
    ],
    hooks: {
      // SQLite (test) fallback for the Postgres trigger below — see
      // ApplicationStatusTransition for the rationale.
      afterCreate: async (transition: PetStatusTransition) => {
        if (sequelize.getDialect() === 'postgres') {
          return;
        }
        const { Pet } = sequelize.models;
        if (!Pet) {
          return;
        }
        await Pet.update(
          { status: transition.toStatus },
          { where: { pet_id: transition.petId }, hooks: false }
        );
      },
    },
  }
);

installStatusTransitionTrigger(PetStatusTransition, {
  parentTable: 'pets',
  transitionTable: 'pet_status_transitions',
  parentFkColumn: 'pet_id',
  parentPkColumn: 'pet_id',
  statusColumn: 'status',
});

export default PetStatusTransition;
