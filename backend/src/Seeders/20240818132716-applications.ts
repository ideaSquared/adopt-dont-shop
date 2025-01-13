import { QueryInterface, QueryTypes } from 'sequelize'

interface Application {
  application_id: string
  user_id: string
  pet_id: string
  description: string
  status: string
  actioned_by: string | null
  created_at: Date
  updated_at: Date
}

export async function seed(queryInterface: QueryInterface) {
  const users = await queryInterface.sequelize.query<{
    user_id: string
    email: string
  }>(
    `SELECT user_id, email FROM users WHERE email IN ('user1@example.com', 'user2@example.com')`,
    { type: QueryTypes.SELECT },
  )

  const pets = await queryInterface.sequelize.query<{ pet_id: string }>(
    `SELECT pet_id FROM pets`,
    { type: QueryTypes.SELECT },
  )

  const applications: Application[] = []

  for (let i = 0; i < 10; i++) {
    // Create 10 applications
    const user = users[Math.floor(Math.random() * users.length)]
    const pet = pets[Math.floor(Math.random() * pets.length)]

    applications.push({
      application_id: 'application_' + Math.random().toString(36).slice(2, 12),
      user_id: user.user_id,
      pet_id: pet.pet_id,
      description: `Application description ${i + 1}`,
      status: ['pending', 'approved', 'rejected'][
        Math.floor(Math.random() * 3)
      ], // Random status
      actioned_by:
        users.find((u) => u.user_id !== user.user_id)?.user_id || null,
      created_at: new Date(),
      updated_at: new Date(),
    })
  }

  await queryInterface.bulkInsert('applications', applications)
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.bulkDelete('applications', {})
}

