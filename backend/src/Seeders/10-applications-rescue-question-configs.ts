import { QueryInterface, QueryTypes } from 'sequelize'

export async function up(queryInterface: QueryInterface) {
  // Get all rescues
  const rescues = await queryInterface.sequelize.query<{ rescue_id: string }>(
    `SELECT rescue_id FROM rescues`,
    { type: QueryTypes.SELECT },
  )

  // Get all core questions
  const coreQuestions = await queryInterface.sequelize.query<{
    question_key: string
  }>(`SELECT question_key FROM application_core_questions`, {
    type: QueryTypes.SELECT,
  })

  // Get existing configurations to avoid duplicates
  const existingConfigs = await queryInterface.sequelize.query<{
    rescue_id: string
    question_key: string
  }>(
    `SELECT rescue_id, question_key FROM application_rescue_question_configs`,
    {
      type: QueryTypes.SELECT,
    },
  )

  // Create configurations for each rescue and question combination that doesn't exist yet
  const configs = []
  for (const rescue of rescues) {
    for (const question of coreQuestions) {
      // Check if this configuration already exists
      const exists = existingConfigs.some(
        (config) =>
          config.rescue_id === rescue.rescue_id &&
          config.question_key === question.question_key,
      )

      if (!exists) {
        configs.push({
          config_id: `cfg_${Math.random().toString(36).slice(2, 14)}`,
          rescue_id: rescue.rescue_id,
          question_key: question.question_key,
          is_enabled: true,
          is_required: false,
          created_at: new Date(),
          updated_at: new Date(),
        })
      }
    }
  }

  if (configs.length > 0) {
    await queryInterface.bulkInsert(
      'application_rescue_question_configs',
      configs,
    )
  }
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.bulkDelete('application_rescue_question_configs', {})
}
