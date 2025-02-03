import bcryptjs from 'bcryptjs'
import { QueryInterface } from 'sequelize'

export async function seed(queryInterface: QueryInterface) {
  const hashedPassword = await bcryptjs.hash('123456', 12)

  const users = [
    {
      user_id: 'user_' + Math.random().toString(36).slice(2, 12),
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin@example.com',
      password: hashedPassword,
      email_verified: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      user_id: 'user_' + Math.random().toString(36).slice(2, 12),
      first_name: 'Rescue',
      last_name: 'Manager',
      email: 'rescue.manager@example.com',
      password: hashedPassword,
      email_verified: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      user_id: 'user_' + Math.random().toString(36).slice(2, 12),
      first_name: 'Pet',
      last_name: 'Manager',
      email: 'pet.manager@example.com',
      password: hashedPassword,
      email_verified: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      user_id: 'user_' + Math.random().toString(36).slice(2, 12),
      first_name: 'Staff',
      last_name: 'User',
      email: 'staff.user@example.com',
      password: hashedPassword,
      email_verified: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      user_id: 'user_' + Math.random().toString(36).slice(2, 12),
      first_name: 'Staff',
      last_name: 'VerifiedUser',
      email: 'staff.verifieduser@example.com',
      password: hashedPassword,
      email_verified: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      user_id: 'user_' + Math.random().toString(36).slice(2, 12),
      first_name: 'User',
      last_name: 'User',
      email: 'user1@example.com',
      password: hashedPassword,
      email_verified: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      user_id: 'user_' + Math.random().toString(36).slice(2, 12),
      first_name: 'User2',
      last_name: 'User',
      email: 'user2@example.com',
      password: hashedPassword,
      email_verified: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      user_id: 'user_' + Math.random().toString(36).slice(2, 12),
      first_name: 'Rescue',
      last_name: 'Manager',
      email: 'rescue.manager2@example.com',
      password: hashedPassword,
      email_verified: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]

  await queryInterface.bulkInsert('users', users)
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.bulkDelete('users', {
    email: [
      'admin@example.com',
      'rescue.manager@example.com',
      'pet.manager@example.com',
      'staff.user@example.com',
      'staff.verifieduser@example.com',
      'user1@example.com',
      'user2@example.com',
      'rescue.manager2@example.com',
    ],
  })
}

