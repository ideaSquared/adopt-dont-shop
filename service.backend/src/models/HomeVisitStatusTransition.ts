import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getJsonType, getUuidType } from '../sequelize';
import { JsonObject } from '../types/common';
import { generateUuidV7 } from '../utils/uuid';
import { HomeVisitStatus } from './HomeVisit';
import { installStatusTransitionTrigger } from './status-transitions';

/**
 * Append-only event log of every status change on a HomeVisit.
 *
 * Same shape and rationale as ApplicationStatusTransition — see that file
 * for the full pattern explanation. The trigger denormalizes to_status
 * onto home_visits.status; the SQLite afterCreate hook is the JS fallback.
 *
 * Visits transition through:
 *   scheduled → in_progress → completed (or cancelled at any point)
 *
 * The first transition for a visit has from_status = NULL.
 */

interface HomeVisitStatusTransitionAttributes {
  transitionId: string;
  visitId: string;
  fromStatus: HomeVisitStatus | null;
  toStatus: HomeVisitStatus;
  transitionedAt: Date;
  transitionedBy: string | null;
  reason: string | null;
  metadata: JsonObject | null;
}

interface HomeVisitStatusTransitionCreationAttributes extends Optional<
  HomeVisitStatusTransitionAttributes,
  'transitionId' | 'transitionedAt' | 'fromStatus' | 'transitionedBy' | 'reason' | 'metadata'
> {}

class HomeVisitStatusTransition
  extends Model<HomeVisitStatusTransitionAttributes, HomeVisitStatusTransitionCreationAttributes>
  implements HomeVisitStatusTransitionAttributes
{
  public transitionId!: string;
  public visitId!: string;
  public fromStatus!: HomeVisitStatus | null;
  public toStatus!: HomeVisitStatus;
  public transitionedAt!: Date;
  public transitionedBy!: string | null;
  public reason!: string | null;
  public metadata!: JsonObject | null;
}

HomeVisitStatusTransition.init(
  {
    transitionId: {
      type: getUuidType(),
      primaryKey: true,
      field: 'transition_id',
      defaultValue: () => generateUuidV7(),
    },
    visitId: {
      type: getUuidType(),
      allowNull: false,
      field: 'visit_id',
      references: { model: 'home_visits', key: 'visit_id' },
      onDelete: 'CASCADE',
    },
    fromStatus: {
      type: DataTypes.ENUM(...Object.values(HomeVisitStatus)),
      allowNull: true,
      field: 'from_status',
    },
    toStatus: {
      type: DataTypes.ENUM(...Object.values(HomeVisitStatus)),
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
      // parent-side FK (visit_id, CASCADE) is what enforces lifecycle
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
    tableName: 'home_visit_status_transitions',
    modelName: 'HomeVisitStatusTransition',
    underscored: true,
    timestamps: false,
    indexes: [
      {
        fields: ['visit_id', 'transitioned_at'],
        name: 'home_visit_status_transitions_visit_id_at_idx',
      },
      {
        fields: ['transitioned_by'],
        name: 'home_visit_status_transitions_transitioned_by_idx',
      },
    ],
    hooks: {
      afterCreate: async (transition: HomeVisitStatusTransition) => {
        if (sequelize.getDialect() === 'postgres') {
          return;
        }
        const { HomeVisit } = sequelize.models;
        if (!HomeVisit) {
          return;
        }
        await HomeVisit.update(
          { status: transition.toStatus },
          { where: { visit_id: transition.visitId }, hooks: false }
        );
      },
    },
  }
);

installStatusTransitionTrigger(HomeVisitStatusTransition, {
  parentTable: 'home_visits',
  transitionTable: 'home_visit_status_transitions',
  parentFkColumn: 'visit_id',
  parentPkColumn: 'visit_id',
  statusColumn: 'status',
});

export default HomeVisitStatusTransition;
