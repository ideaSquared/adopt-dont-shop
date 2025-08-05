import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';

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
  assigned_staff: string;
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

interface HomeVisitCreationAttributes
  extends Optional<HomeVisitAttributes, 'visit_id' | 'created_at' | 'updated_at'> {}

class HomeVisit
  extends Model<HomeVisitAttributes, HomeVisitCreationAttributes>
  implements HomeVisitAttributes
{
  public visit_id!: string;
  public application_id!: string;
  public scheduled_date!: string;
  public scheduled_time!: string;
  public assigned_staff!: string;
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
      type: DataTypes.STRING,
      primaryKey: true,
    },
    application_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'applications',
        key: 'application_id',
      },
    },
    scheduled_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    scheduled_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    assigned_staff: {
      type: DataTypes.STRING,
      allowNull: false,
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
  },
  {
    sequelize,
    modelName: 'HomeVisit',
    tableName: 'home_visits',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['application_id'],
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
    ],
  }
);

// Sync the model to create the table if it doesn't exist
HomeVisit.sync({ alter: true }).catch(error => {
  console.error('Error syncing HomeVisit model:', error);
});

export default HomeVisit;
