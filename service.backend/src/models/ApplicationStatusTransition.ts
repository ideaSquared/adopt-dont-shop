import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getJsonType, getUuidType } from '../sequelize';
import { JsonObject } from '../types/common';
import { generateUuidV7 } from '../utils/uuid';
import { ApplicationStatus } from './Application';
import { installStatusTransitionTrigger } from './status-transitions';

/**
 * Append-only event log of every status change on an Application.
 *
 * Application code never writes `applications.status` directly — it
 * inserts a row here and the AFTER INSERT trigger denormalizes
 * `to_status` back onto the parent row (Postgres only). This makes:
 *
 *   - history complete and immutable (no updated_at, no soft-delete)
 *   - "who moved this from reviewing to approved at 11:42?" a row, not
 *     a guess
 *   - status-timestamp consistency structural (the timestamp lives on
 *     the transition row, so a status without a timestamp is impossible)
 *
 * The first transition for an application has from_status = NULL — that
 * encodes "initial state assigned at creation".
 */

interface ApplicationStatusTransitionAttributes {
  transitionId: string;
  applicationId: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  transitionedAt: Date;
  transitionedBy: string | null;
  reason: string | null;
  metadata: JsonObject | null;
}

interface ApplicationStatusTransitionCreationAttributes extends Optional<
  ApplicationStatusTransitionAttributes,
  'transitionId' | 'transitionedAt' | 'fromStatus' | 'transitionedBy' | 'reason' | 'metadata'
> {}

class ApplicationStatusTransition
  extends Model<
    ApplicationStatusTransitionAttributes,
    ApplicationStatusTransitionCreationAttributes
  >
  implements ApplicationStatusTransitionAttributes
{
  public transitionId!: string;
  public applicationId!: string;
  public fromStatus!: ApplicationStatus | null;
  public toStatus!: ApplicationStatus;
  public transitionedAt!: Date;
  public transitionedBy!: string | null;
  public reason!: string | null;
  public metadata!: JsonObject | null;
}

ApplicationStatusTransition.init(
  {
    transitionId: {
      type: getUuidType(),
      primaryKey: true,
      field: 'transition_id',
      defaultValue: () => generateUuidV7(),
    },
    applicationId: {
      type: getUuidType(),
      allowNull: false,
      field: 'application_id',
      references: { model: 'applications', key: 'application_id' },
      onDelete: 'CASCADE',
    },
    fromStatus: {
      type: DataTypes.ENUM(...Object.values(ApplicationStatus)),
      allowNull: true,
      field: 'from_status',
    },
    toStatus: {
      type: DataTypes.ENUM(...Object.values(ApplicationStatus)),
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
      type: getUuidType(),
      allowNull: true,
      field: 'transitioned_by',
      references: { model: 'users', key: 'user_id' },
      onDelete: 'SET NULL',
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
    tableName: 'application_status_transitions',
    modelName: 'ApplicationStatusTransition',
    underscored: true,
    // Append-only: no updatedAt, no paranoid soft-delete. The createdAt
    // is `transitioned_at` (named for what it actually represents).
    timestamps: false,
    indexes: [
      // Most queries are "give me the history for this application in
      // chronological order" — composite index supports that directly.
      {
        fields: ['application_id', 'transitioned_at'],
        name: 'application_status_transitions_app_id_at_idx',
      },
      {
        fields: ['transitioned_by'],
        name: 'application_status_transitions_transitioned_by_idx',
      },
      // No CHECK constraint enforcing from_status = previous to_status —
      // the application service holds that invariant. A future Postgres
      // trigger could add it; out of scope here.
    ],
    hooks: {
      // JS fallback for non-Postgres environments (SQLite test DB).
      // Postgres has the trigger installed via installStatusTransitionTrigger
      // below; this hook is a no-op there. Without it, tests inserting
      // transitions wouldn't see applications.status update.
      afterCreate: async (transition: ApplicationStatusTransition) => {
        if (sequelize.getDialect() === 'postgres') {
          return;
        }
        const { Application } = sequelize.models;
        if (!Application) {
          return;
        }
        await Application.update(
          { status: transition.toStatus },
          { where: { application_id: transition.applicationId }, hooks: false }
        );
      },
    },
  }
);

// Wire the trigger that propagates to_status onto applications.status.
installStatusTransitionTrigger(ApplicationStatusTransition, {
  parentTable: 'applications',
  transitionTable: 'application_status_transitions',
  parentFkColumn: 'application_id',
  parentPkColumn: 'application_id',
  statusColumn: 'status',
});

export default ApplicationStatusTransition;
