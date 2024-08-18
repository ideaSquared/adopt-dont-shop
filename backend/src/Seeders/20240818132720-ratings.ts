import { QueryInterface, QueryTypes } from 'sequelize'

interface Rating {
  rating_id: string
  user_id: string
  pet_id: string
  rating_type: string
  created_at: Date
  updated_at: Date
}

export async function seed(queryInterface: QueryInterface) {
  const users = await queryInterface.sequelize.query<{ user_id: string }>(
    `SELECT user_id FROM users`,
    { type: QueryTypes.SELECT },
  )

  const pets = await queryInterface.sequelize.query<{ pet_id: string }>(
    `SELECT pet_id FROM pets`,
    { type: QueryTypes.SELECT },
  )

  const ratings: Rating[] = []

  for (let i = 0; i < 10; i++) {
    // Create 10 ratings
    const user = users[Math.floor(Math.random() * users.length)]
    const pet = pets[Math.floor(Math.random() * pets.length)]

    ratings.push({
      rating_id: 'rating_' + Math.random().toString(36).slice(2, 12),
      user_id: user.user_id,
      pet_id: pet.pet_id,
      rating_type: 'like', // Assuming all ratings are 'like', you can randomize if needed
      created_at: new Date(),
      updated_at: new Date(),
    })
  }

  await queryInterface.bulkInsert('ratings', ratings)
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.bulkDelete('ratings', {})
}

