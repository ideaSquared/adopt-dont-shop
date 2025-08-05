import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('home_visits', {
    visit_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    application_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'applications',
        key: 'application_id',
      },
      onUpdate: 'CASCADE',
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
    assigned_staff: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'rescheduled', 'cancelled'),
      allowNull: false,
      defaultValue: 'scheduled',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    outcome: {
      type: DataTypes.ENUM('approved', 'rejected', 'conditional'),
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
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Add indexes
  await queryInterface.addIndex('home_visits', ['application_id']);
  await queryInterface.addIndex('home_visits', ['status']);
  await queryInterface.addIndex('home_visits', ['assigned_staff']);
  await queryInterface.addIndex('home_visits', ['scheduled_date']);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('home_visits');
}
