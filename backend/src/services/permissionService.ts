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

  if (!userWithRoles || !userWithRoles.Roles) {
    return []
  }

  const roles = userWithRoles.Roles as Role[]

  return roles.map((role: Role) => role.role_name)
}
