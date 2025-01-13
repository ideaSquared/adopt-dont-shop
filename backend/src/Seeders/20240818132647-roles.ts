import { QueryInterface } from 'sequelize'

export async function seed(queryInterface: QueryInterface) {
  const roles = [
    {
      role_name: 'rescue_manager',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      role_name: 'staff_manager',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      role_name: 'pet_manager',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      role_name: 'communications_manager',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      role_name: 'application_manager',
      created_at: new Date(),
      updated_at: new Date(),
    },
    { role_name: 'staff', created_at: new Date(), updated_at: new Date() },
    { role_name: 'admin', created_at: new Date(), updated_at: new Date() },
    {
      role_name: 'verified_user',
      created_at: new Date(),
      updated_at: new Date(),
    },
    { role_name: 'user', created_at: new Date(), updated_at: new Date() },
  ]

  await queryInterface.bulkInsert('roles', roles)
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.bulkDelete('roles', {})
}

