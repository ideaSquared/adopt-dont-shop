import { QueryInterface } from 'sequelize'

export async function seed(queryInterface: QueryInterface) {
  const permissions = [
    {
      permission_name: 'view_rescue_info',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      permission_name: 'edit_rescue_info',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      permission_name: 'delete_rescue',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      permission_name: 'view_staff',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      permission_name: 'add_staff',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      permission_name: 'edit_staff',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      permission_name: 'verify_staff',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      permission_name: 'delete_staff',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      permission_name: 'view_pet',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      permission_name: 'add_pet',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      permission_name: 'edit_pet',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      permission_name: 'delete_pet',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      permission_name: 'create_messages',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      permission_name: 'view_messages',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      permission_name: 'view_applications',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      permission_name: 'action_applications',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      permission_name: 'view_dashboard',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      permission_name: 'view_chat',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      permission_name: 'edit_profile',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]

  await queryInterface.bulkInsert('permissions', permissions)
}

export async function down(queryInterface: QueryInterface) {
  const permissionNames = [
    'view_rescue_info',
    'edit_rescue_info',
    'delete_rescue',
    'view_staff',
    'add_staff',
    'edit_staff',
    'verify_staff',
    'delete_staff',
    'view_pet',
    'add_pet',
    'edit_pet',
    'delete_pet',
    'create_messages',
    'view_messages',
    'view_applications',
    'action_applications',
    'view_dashboard',
    'view_chat',
    'edit_profile',
  ]

  await queryInterface.bulkDelete('permissions', {
    permission_name: permissionNames,
  })
}

