import { DataTypes, QueryInterface } from 'sequelize'

export async function up(queryInterface: QueryInterface) {
  // Create ENUM types first
  await queryInterface.sequelize.query(`
    CREATE TYPE "enum_core_application_questions_category" AS ENUM (
      'PERSONAL_INFORMATION',
      'HOUSEHOLD_INFORMATION',
      'PET_OWNERSHIP_EXPERIENCE',
      'LIFESTYLE_COMPATIBILITY',
      'PET_CARE_COMMITMENT',
      'REFERENCES_VERIFICATION',
      'FINAL_ACKNOWLEDGMENTS'
    );
  `)

  await queryInterface.sequelize.query(`
    CREATE TYPE "enum_core_application_questions_question_type" AS ENUM (
      'TEXT',
      'EMAIL',
      'PHONE',
      'NUMBER',
      'BOOLEAN',
      'SELECT',
      'MULTI_SELECT',
      'ADDRESS'
    );
  `)

  // Create the table
  await queryInterface.createTable('core_application_questions', {
    question_key: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: queryInterface.sequelize.literal(
        `'q_' || left(md5(random()::text), 12)`,
      ),
    },
    category: {
      type: 'enum_core_application_questions_category',
      allowNull: false,
    },
    question_type: {
      type: 'enum_core_application_questions_question_type',
      allowNull: false,
    },
    question_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    options: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
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
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable('core_application_questions')
  await queryInterface.sequelize.query(
    `DROP TYPE IF EXISTS "enum_core_application_questions_category"`,
  )
  await queryInterface.sequelize.query(
    `DROP TYPE IF EXISTS "enum_core_application_questions_question_type"`,
  )
}
