import { Role, User } from '../Models'

export const getRolesForUser = async (userId: string): Promise<string[]> => {
  const userWithRoles = await User.findByPk<User>(userId, {
    include: [
      {
        model: Role,
        as: 'Roles',
        through: { attributes: [] },
        attributes: ['role_name'],
      },
    ],
  })

  if (
    !userWithRoles ||
    !userWithRoles.Roles ||
    userWithRoles.Roles.length === 0
  ) {
    return []
  }

  const roles = userWithRoles.Roles as Role[]
  const roleNames = roles.map((role: Role) => role.role_name)

  return roleNames
}

export const verifyUserHasRole = async (
  userId: string,
  roleName: string,
): Promise<boolean> => {
  const roles = await getRolesForUser(userId)
  const hasRole = roles.includes(roleName)

  // Admin override
  if (roles.includes('admin')) {
    return true // Admins automatically pass
  }

  return hasRole
}
