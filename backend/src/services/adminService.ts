import { Role, User, UserRole } from '../Models'
import { AuditLogger } from './auditLogService'

export const addRoleToUserService = async (
  userId: string,
  role: string,
): Promise<void> => {
  await AuditLogger.logAction(
    'RoleService',
    `Attempting to add role '${role}' to user with ID: ${userId}`,
    'INFO',
  )
  const roleInstance = await Role.findOne({ where: { role_name: role } })
  if (!roleInstance) {
    await AuditLogger.logAction(
      'RoleService',
      `Role '${role}' not found when adding to user with ID: ${userId}`,
      'ERROR',
    )
    throw new Error('Role not found')
  }

  await UserRole.create({ user_id: userId, role_id: roleInstance.role_id })
  await AuditLogger.logAction(
    'RoleService',
    `Successfully added role '${role}' to user with ID: ${userId}`,
    'INFO',
  )
}

export const removeRoleFromUserService = async (
  userId: string,
  roleName: string,
): Promise<void> => {
  await AuditLogger.logAction(
    'RoleService',
    `Attempting to remove role '${roleName}' from user with ID: ${userId}`,
    'INFO',
  )
  const roleRecord = await Role.findOne({ where: { role_name: roleName } })
  if (!roleRecord) {
    await AuditLogger.logAction(
      'RoleService',
      `Role '${roleName}' not found when removing from user with ID: ${userId}`,
      'ERROR',
    )
    throw new Error(`Role '${roleName}' does not exist`)
  }

  const user = await User.findByPk(userId)
  if (!user) {
    await AuditLogger.logAction(
      'RoleService',
      `User with ID: ${userId} not found when removing role '${roleName}'`,
      'ERROR',
    )
    throw new Error('User not found')
  }

  const deletionCount = await UserRole.destroy({
    where: {
      user_id: userId,
      role_id: roleRecord.role_id,
    },
  })

  if (deletionCount === 0) {
    await AuditLogger.logAction(
      'RoleService',
      `Role '${roleName}' not assigned to user with ID: ${userId}, cannot remove`,
      'WARNING',
    )
    throw new Error(`Role '${roleName}' not assigned to user`)
  }

  await AuditLogger.logAction(
    'RoleService',
    `Successfully removed role '${roleName}' from user with ID: ${userId}`,
    'INFO',
  )
}
