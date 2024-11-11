import { Role, User, UserRole } from '../Models'

export const addRoleToUserService = async (
  userId: string,
  role: string,
): Promise<void> => {
  const roleInstance = await Role.findOne({ where: { role_name: role } })
  if (!roleInstance) throw new Error('Role not found')

  await UserRole.create({ user_id: userId, role_id: roleInstance.role_id })
}

export const removeRoleFromUserService = async (
  userId: string,
  roleName: string,
): Promise<void> => {
  // Find the role to get the role_id
  const roleRecord = await Role.findOne({ where: { role_name: roleName } })
  if (!roleRecord) {
    throw new Error(`Role '${roleName}' does not exist`)
  }

  // Check if the user exists
  const user = await User.findByPk(userId)
  if (!user) {
    throw new Error('User not found')
  }

  // Remove the role by deleting the record in UserRole
  const deletionCount = await UserRole.destroy({
    where: {
      user_id: userId,
      role_id: roleRecord.role_id,
    },
  })

  if (deletionCount === 0) {
    throw new Error(`Role '${roleName}' not assigned to user`)
  }
}
