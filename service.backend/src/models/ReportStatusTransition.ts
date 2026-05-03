import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getJsonType, getUuidType } from '../sequelize';
import { JsonObject } from '../types/common';
import { generateUuidV7 } from '../utils/uuid';
import { ReportStatus } from './Report';
import { installStatusTransitionTrigger } from './status-transitions';

/**
 * Append-only event log of every status change on a Report.
 *
 * Same shape and rationale as ApplicationStatusTransition — see that file
 * for the full pattern explanation. The trigger denormalizes to_status
 * onto reports.status; the SQLite afterCreate hook is the JS fallback.
 *
 * Reports transition through:
 *   pending → under_review → resolved | dismissed | escalated
 *
 * The first transition for a report has from_status = NULL.
 */

interface ReportStatusTransitionAttributes {
  transitionId: string;
  reportId: string;
  fromStatus: ReportStatus | null;
  toStatus: ReportStatus;
  transitionedAt: Date;
  transitionedBy: string | null;
  reason: string | null;
  metadata: JsonObject | null;
}

interface ReportStatusTransitionCreationAttributes extends Optional<
  ReportStatusTransitionAttributes,
  'transitionId' | 'transitionedAt' | 'fromStatus' | 'transitionedBy' | 'reason' | 'metadata'
> {}

class ReportStatusTransition
  extends Model<ReportStatusTransitionAttributes, ReportStatusTransitionCreationAttributes>
  implements ReportStatusTransitionAttributes
{
  public transitionId!: string;
  public reportId!: string;
  public fromStatus!: ReportStatus | null;
  public toStatus!: ReportStatus;
  public transitionedAt!: Date;
  public transitionedBy!: string | null;
  public reason!: string | null;
  public metadata!: JsonObject | null;
}

ReportStatusTransition.init(
  {
    transitionId: {
      type: getUuidType(),
      primaryKey: true,
      field: 'transition_id',
      defaultValue: () => generateUuidV7(),
    },
    reportId: {
      type: getUuidType(),
      allowNull: false,
      field: 'report_id',
      references: { model: 'reports', key: 'report_id' },
      onDelete: 'CASCADE',
    },
    fromStatus: {
      type: DataTypes.ENUM(...Object.values(ReportStatus)),
      allowNull: true,
      field: 'from_status',
    },
    toStatus: {
      type: DataTypes.ENUM(...Object.values(ReportStatus)),
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
      // parent-side FK (report_id, CASCADE) is what enforces lifecycle
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
    tableName: 'report_status_transitions',
    modelName: 'ReportStatusTransition',
    underscored: true,
    timestamps: false,
    indexes: [
      {
        fields: ['report_id', 'transitioned_at'],
        name: 'report_status_transitions_report_id_at_idx',
      },
      {
        fields: ['transitioned_by'],
        name: 'report_status_transitions_transitioned_by_idx',
      },
    ],
    hooks: {
      afterCreate: async (transition: ReportStatusTransition) => {
        if (sequelize.getDialect() === 'postgres') {
          return;
        }
        const { Report } = sequelize.models;
        if (!Report) {
          return;
        }
        await Report.update(
          { status: transition.toStatus },
          { where: { report_id: transition.reportId }, hooks: false }
        );
      },
    },
  }
);

installStatusTransitionTrigger(ReportStatusTransition, {
  parentTable: 'reports',
  transitionTable: 'report_status_transitions',
  parentFkColumn: 'report_id',
  parentPkColumn: 'report_id',
  statusColumn: 'status',
});

export default ReportStatusTransition;
