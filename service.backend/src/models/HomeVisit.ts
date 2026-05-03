import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType } from '../sequelize';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

export enum HomeVisitStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum HomeVisitOutcome {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CONDITIONAL = 'conditional',
}

interface HomeVisitAttributes {
  visit_id: string;
  application_id: string;
  scheduled_date: string;
  scheduled_time: string;
  assigned_staff: string | null;
  status: HomeVisitStatus;
  notes?: string | null;
  outcome?: HomeVisitOutcome | null;
  outcome_notes?: string | null;
  reschedule_reason?: string | null;
  cancelled_reason?: string | null;
  completed_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

interface HomeVisitCreationAttributes extends Optional<
  HomeVisitAttributes,
  'visit_id' | 'created_at' | 'updated_at'
> {}

class HomeVisit
  extends Model<HomeVisitAttributes, HomeVisitCreationAttributes>
  implements HomeVisitAttributes
{
  public visit_id!: string;
  public application_id!: string;
  public scheduled_date!: string;
  public scheduled_time!: string;
  public assigned_staff!: string | null;
  public status!: HomeVisitStatus;
  public notes!: string | null;
  public outcome!: HomeVisitOutcome | null;
  public outcome_notes!: string | null;
  public reschedule_reason!: string | null;
  public cancelled_reason!: string | null;
  public completed_at!: Date | null;

  // Timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

HomeVisit.init(
  {
    visit_id: {
      type: getUuidType(),
      defaultValue: () => generateUuidV7(),
      primaryKey: true,
    },
    application_id: {
      type: getUuidType(),
      allowNull: false,
      references: {
        model: 'applications',
        key: 'application_id',
      },
      onDelete: 'CASCADE',
    },
    scheduled_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    scheduled_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    /**
     * User assigned to conduct the visit. SET NULL on the user being
     * deleted lets the visit row survive the actor so audit trails stay
     * intact (the visit still happened, the staff member just left).
     * Plan 2.2: closing the FK gap that previously left this as a
     * free-form STRING.
     */
    assigned_staff: {
      type: getUuidType(),
      allowNull: true,
      references: { model: 'users', key: 'user_id' },
      onDelete: 'SET NULL',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(HomeVisitStatus)),
      allowNull: false,
      defaultValue: HomeVisitStatus.SCHEDULED,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    outcome: {
      type: DataTypes.ENUM(...Object.values(HomeVisitOutcome)),
      allowNull: true,
    },
    outcome_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    reschedule_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cancelled_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    modelName: 'HomeVisit',
    tableName: 'home_visits',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['application_id'],
        name: 'home_visits_application_id_idx',
      },
      {
        fields: ['status'],
      },
      {
        fields: ['assigned_staff'],
      },
      {
        fields: ['scheduled_date'],
      },
      ...auditIndexes('home_visits'),
    ],
  })
);

export default HomeVisit;
