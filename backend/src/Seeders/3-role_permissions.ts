import { QueryInterface, QueryTypes } from 'sequelize'

export async function seed(queryInterface: QueryInterface) {
  const rolePermissions: {
    role_id: number
    permission_id: number
    created_at: Date
    updated_at: Date
  }[] = []

  const roles = await queryInterface.sequelize.query<{
    role_id: number
    role_name: string
  }>(`SELECT role_id, role_name FROM roles`, { type: QueryTypes.SELECT })

  const permissions = await queryInterface.sequelize.query<{
    permission_id: number
    permission_name: string
  }>(`SELECT permission_id, permission_name FROM permissions`, {
    type: QueryTypes.SELECT,
  })

  const rolePermissionsMapping: Record<string, string[]> = {
    rescue_manager: ['view_rescue_info', 'edit_rescue_info', 'delete_rescue'],
    staff_manager: [
      'view_staff',
      'add_staff',
      'edit_staff',
      'verify_staff',
      'delete_staff',
    ],
    pet_manager: ['view_pet', 'add_pet', 'edit_pet', 'delete_pet'],
    communications_manager: ['create_messages', 'view_messages'],
    application_manager: ['view_applications', 'action_applications'],
    staff: ['view_dashboard'],
    admin: [],
    verified_user: ['view_chat'],
    user: ['edit_profile'],
  }

  const assignPermissionsToRole = (
    role_name: string,
    permissionNames: string[],
  ) => {
    const role = roles.find((role) => role.role_name === role_name)
    if (!role) return

    permissionNames.forEach((permission_name) => {
      const permission = permissions.find(
        (perm) => perm.permission_name === permission_name,
      )
      if (permission) {
        rolePermissions.push({
          role_id: role.role_id,
          permission_id: permission.permission_id,
          created_at: new Date(),
          updated_at: new Date(),
        })
      }
    })
  }

  for (const [role, permissions] of Object.entries(rolePermissionsMapping)) {
    assignPermissionsToRole(role, permissions)
  }

  await queryInterface.bulkInsert('role_permissions', rolePermissions)
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.bulkDelete('role_permissions', {})
}

