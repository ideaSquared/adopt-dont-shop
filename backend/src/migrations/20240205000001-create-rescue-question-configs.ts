import { DataTypes, QueryInterface } from 'sequelize'

export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable('rescue_question_configs', {
    config_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: queryInterface.sequelize.literal(
        `'cfg_' || left(md5(random()::text), 12)`,
      ),
    },
    rescue_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'rescues',
        key: 'rescue_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    question_key: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'core_application_questions',
        key: 'question_key',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    is_required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
  })

  // Add unique constraint to prevent duplicate configs for the same rescue and question
  await queryInterface.addIndex(
    'rescue_question_configs',
    ['rescue_id', 'question_key'],
    {
      unique: true,
      name: 'rescue_question_configs_rescue_question_unique',
    },
  )
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable('rescue_question_configs')
}
