import { QueryInterface } from 'sequelize'

export async function seed(queryInterface: QueryInterface) {
  const featureFlags = [
    {
      flag_id: 'flag_' + Math.random().toString(36).slice(2, 12),
      name: 'chat_beta',
      description: 'Enable beta access to the chat feature',
      enabled: false, // Start as disabled by default
      created_at: new Date(),
      updated_at: new Date(),
    },
    // {
    //   flag_id: 'flag_' + Math.random().toString(36).slice(2, 12),
    //   name: 'dark_mode',
    //   description: 'Toggle dark mode theme for the app',
    //   enabled: true, // Enabled by default
    //   created_at: new Date(),
    //   updated_at: new Date(),
    // },
    // {
    //   flag_id: 'flag_' + Math.random().toString(36).slice(2, 12),
    //   name: 'notifications',
    //   description: 'Enable notifications for user activities',
    //   enabled: true,
    //   created_at: new Date(),
    //   updated_at: new Date(),
    // },
    // {
    //   flag_id: 'flag_' + Math.random().toString(36).slice(2, 12),
    //   name: 'multi_language_support',
    //   description: 'Enable multiple language support for users',
    //   enabled: false, // Set to false as it may be a work-in-progress feature
    //   created_at: new Date(),
    //   updated_at: new Date(),
    // },
  ]

  await queryInterface.bulkInsert('feature_flags', featureFlags)
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.bulkDelete('feature_flags', {
    name: ['chat_beta'],
  })
}
