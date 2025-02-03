import { QueryInterface, QueryTypes } from 'sequelize'
import { AuditLogger } from '../services/auditLogService'

interface Application {
  application_id: string
  user_id: string
  pet_id: string
  rescue_id: string
  status: string
  actioned_by: string | null
  answers: string
  created_at: Date
  updated_at: Date
}

const generateAnswers = () => {
  return {
    home_type: ['House', 'Apartment', 'Condo', 'Other'][
      Math.floor(Math.random() * 4)
    ],
    own_or_rent: ['Own', 'Rent'][Math.floor(Math.random() * 2)],
    landlord_permission: Math.random() > 0.5,
    yard_size: ['No yard', 'Small', 'Medium', 'Large'][
      Math.floor(Math.random() * 4)
    ],
    household_members: Math.floor(Math.random() * 5) + 1,
    children_ages: Math.random() > 0.5 ? '3, 7, 12' : '',
    current_pets: Math.random() > 0.5,
    current_pet_details:
      Math.random() > 0.5 ? 'One dog (Golden Retriever) and two cats' : '',
    pet_experience: [
      ['First-time pet owner'],
      ['Previous pet owner'],
      ['Current pet owner'],
      ['Previous pet owner', 'Current pet owner'],
      ['Current pet owner', 'Professional experience'],
    ][Math.floor(Math.random() * 5)],
    veterinarian: Math.random() > 0.5,
    vet_name:
      Math.random() > 0.5
        ? 'Dr. Smith at City Pet Clinic - (555) 123-4567'
        : '',
    exercise_plan: [
      'Daily walks in the morning and evening, plus playtime in the backyard',
      'Regular walks and visits to the dog park',
      'Multiple walks per day and indoor play sessions',
      'Access to fenced yard and scheduled play sessions',
    ][Math.floor(Math.random() * 4)],
    daily_schedule: [
      'Work from home with flexible schedule',
      'Work 9-5, home evenings and weekends',
      'Part-time work, mostly home',
      'Retired, home most of the day',
    ][Math.floor(Math.random() * 4)],
    time_alone: Math.floor(Math.random() * 8),
    emergency_contact: [
      'Jane Smith - (555) 111-2222',
      'John Doe - (555) 333-4444',
      'Mary Johnson - (555) 555-6666',
      'Robert Wilson - (555) 777-8888',
    ][Math.floor(Math.random() * 4)],
  }
}

export async function seed(queryInterface: QueryInterface) {
  try {
    const users = await queryInterface.sequelize.query<{
      user_id: string
      email: string
    }>(
      `SELECT user_id, email FROM users WHERE email IN ('user1@example.com', 'user2@example.com')`,
      { type: QueryTypes.SELECT },
    )

    const pets = await queryInterface.sequelize.query<{
      pet_id: string
      owner_id: string
    }>(`SELECT pet_id, owner_id FROM pets`, { type: QueryTypes.SELECT })

    const applications: Application[] = []

    for (let i = 0; i < 10; i++) {
      const user = users[Math.floor(Math.random() * users.length)]
      const pet = pets[Math.floor(Math.random() * pets.length)]
      const status = ['pending', 'approved', 'rejected'][
        Math.floor(Math.random() * 3)
      ]

      applications.push({
        application_id:
          'application_' + Math.random().toString(36).slice(2, 12),
        user_id: user.user_id,
        pet_id: pet.pet_id,
        rescue_id: pet.owner_id,
        status,
        actioned_by:
          status !== 'pending'
            ? users.find((u) => u.user_id !== user.user_id)?.user_id || null
            : null,
        answers: JSON.stringify(generateAnswers()),
        created_at: new Date(),
        updated_at: new Date(),
      })
    }

    const insertQuery = `
      INSERT INTO applications (
        application_id,
        user_id,
        pet_id,
        rescue_id,
        status,
        actioned_by,
        answers,
        created_at,
        updated_at
      )
      VALUES ${applications
        .map(
          (app) => `(
            '${app.application_id}',
            '${app.user_id}',
            '${app.pet_id}',
            '${app.rescue_id}',
            '${app.status}',
            ${app.actioned_by ? `'${app.actioned_by}'` : 'NULL'},
            '${app.answers}'::jsonb,
            '${app.created_at.toISOString()}',
            '${app.updated_at.toISOString()}'
          )`,
        )
        .join(',')}
    `

    await queryInterface.sequelize.query(insertQuery)
  } catch (error) {
    await AuditLogger.logAction(
      'DatabaseService',
      'Error during application seeding',
      'ERROR',
      null,
      {
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        category: 'DATABASE_SEEDING',
      },
    )
    throw error
  }
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.bulkDelete('applications', {})
}
