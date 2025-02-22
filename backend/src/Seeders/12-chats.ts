import { QueryInterface, QueryTypes } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Get rescue IDs first since we need them for all chats
  const rescues = await queryInterface.sequelize.query<{ rescue_id: string }>(
    `SELECT rescue_id FROM rescues ORDER BY rescue_id LIMIT 2`,
    { type: QueryTypes.SELECT },
  )

  if (!rescues.length) {
    throw new Error(
      'No rescues found in the database. Cannot create chats without rescues.',
    )
  }

  // Ensure we have at least two rescues for our chat scenarios
  if (rescues.length < 2) {
    throw new Error('Need at least two rescues to create chat scenarios.')
  }

  // Get user IDs for regular users and rescue staff
  const users = await queryInterface.sequelize.query<{
    user_id: string
    email: string
  }>(
    `SELECT user_id, email FROM users WHERE email IN (
      'user1@example.com',
      'user2@example.com',
      'rescue.manager@example.com',
      'staff.user@example.com',
      'staff.verifieduser@example.com',
      'rescue.manager2@example.com',
      'pet.manager@example.com'
    )`,
    { type: QueryTypes.SELECT },
  )

  // Get some application IDs
  const applications = await queryInterface.sequelize.query<{
    application_id: string
  }>(`SELECT application_id FROM applications LIMIT 5`, {
    type: QueryTypes.SELECT,
  })

  // Create chats with meaningful data
  const chats = [
    // Active application discussion for Max
    {
      chat_id: 'chat_max_' + Math.random().toString(36).slice(2, 12),
      application_id: applications[0]?.application_id || null,
      rescue_id: rescues[0].rescue_id, // First rescue
      status: 'active',
      created_at: new Date('2024-03-01T10:00:00Z'),
      updated_at: new Date('2024-03-01T10:00:00Z'),
    },
    // Follow-up chat about Luna
    {
      chat_id: 'chat_luna_' + Math.random().toString(36).slice(2, 12),
      application_id: applications[1]?.application_id || null,
      rescue_id: rescues[0].rescue_id, // First rescue
      status: 'active',
      created_at: new Date('2024-02-15T14:30:00Z'),
      updated_at: new Date('2024-03-01T09:15:00Z'),
    },
    // General inquiry about senior cats
    {
      chat_id: 'chat_seniors_' + Math.random().toString(36).slice(2, 12),
      application_id: null,
      rescue_id: rescues[1].rescue_id, // Second rescue
      status: 'active',
      created_at: new Date('2024-02-28T16:45:00Z'),
      updated_at: new Date('2024-03-01T11:20:00Z'),
    },
    // Archived successful adoption chat for Daisy
    {
      chat_id: 'chat_daisy_' + Math.random().toString(36).slice(2, 12),
      application_id: applications[2]?.application_id || null,
      rescue_id: rescues[1].rescue_id, // Second rescue
      status: 'archived',
      created_at: new Date('2024-01-15T09:00:00Z'),
      updated_at: new Date('2024-02-01T15:45:00Z'),
    },
    // Active chat about Buddy & Mittens
    {
      chat_id: 'chat_buddy_mittens_' + Math.random().toString(36).slice(2, 12),
      application_id: null,
      rescue_id: rescues[0].rescue_id, // First rescue
      status: 'active',
      created_at: new Date('2024-02-25T13:20:00Z'),
      updated_at: new Date('2024-03-01T10:30:00Z'),
    },
    // Recently archived chat about Rocky
    {
      chat_id: 'chat_rocky_' + Math.random().toString(36).slice(2, 12),
      application_id: applications[3]?.application_id || null,
      rescue_id: rescues[1].rescue_id, // Second rescue
      status: 'archived',
      created_at: new Date('2024-02-20T11:15:00Z'),
      updated_at: new Date('2024-02-28T16:30:00Z'),
    },
  ]

  await queryInterface.bulkInsert('chats', chats)
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkDelete('chats', {})
}
