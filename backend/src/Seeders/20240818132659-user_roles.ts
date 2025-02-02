import { QueryInterface, QueryTypes } from 'sequelize'

export async function seed(queryInterface: QueryInterface) {
  const userRoles: {
    user_id: string
    role_id: number
    created_at: Date
    updated_at: Date
  }[] = []

  const users = await queryInterface.sequelize.query<{
    user_id: string
    email: string
  }>(`SELECT user_id, email FROM users`, { type: QueryTypes.SELECT })

  const roles = await queryInterface.sequelize.query<{
    role_id: number
    role_name: string
  }>(`SELECT role_id, role_name FROM roles`, { type: QueryTypes.SELECT })

  const frontendUsers = [
    {
      email: 'admin@example.com',
      roles: ['admin', 'verified_user'],
    },
    {
      email: 'rescue.manager@example.com',
      roles: [
        'rescue_manager',
        'pet_manager',
        'staff_manager',
        'communications_manager',
        'application_manager',
        'verified_user',
        'staff',
      ],
    },
    {
      email: 'pet.manager@example.com',
      roles: ['pet_manager', 'verified_user', 'staff'],
    },
    {
      email: 'staff.user@example.com',
      roles: ['staff', 'user'],
    },
    {
      email: 'staff.verifieduser@example.com',
      roles: ['staff', 'verified_user'],
    },
    {
      email: 'user1@example.com',
      roles: ['user'],
    },
    {
      email: 'user2@example.com',
      roles: ['user'],
    },
    {
      email: 'rescue.manager2@example.com',
      roles: [
        'rescue_manager',
        'pet_manager',
        'staff_manager',
        'communications_manager',
        'application_manager',
        'verified_user',
        'staff',
      ],
    },
  ]

  const assignRoleToUser = (email: string, roleNames: string[]) => {
    const user = users.find((u) => u.email === email)
    if (!user) return

    roleNames.forEach((role_name) => {
      const role = roles.find((r) => r.role_name === role_name)
      if (role) {
        userRoles.push({
          user_id: user.user_id,
          role_id: role.role_id,
          created_at: new Date(),
          updated_at: new Date(),
        })
      }
    })
  }

  frontendUsers.forEach((frontendUser) =>
    assignRoleToUser(frontendUser.email, frontendUser.roles),
  )

  await queryInterface.bulkInsert('user_roles', userRoles)
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.bulkDelete('user_roles', {})
}
