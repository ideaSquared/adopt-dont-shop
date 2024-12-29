import { Role, User } from '../Models'
import { AuditLogger } from './auditLogService'

export const getRolesForUser = async (userId: string): Promise<string[]> => {
  try {
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
      await AuditLogger.logAction(
        'PermissionService',
        `No roles found for user with ID: ${userId}`,
        'WARNING',
        userId,
      )
      return []
    }

    const roles = userWithRoles.Roles as Role[]
    const roleNames = roles.map((role: Role) => role.role_name)

    await AuditLogger.logAction(
      'PermissionService',
      `Roles retrieved for user with ID: ${userId} - Roles: ${roleNames.join(
        ', ',
      )}`,
      'INFO',
      userId,
    )

    return roleNames
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'PermissionService',
        `Error retrieving roles for user with ID: ${userId}. Error: ${error.message}`,
        'ERROR',
        userId,
      )
    } else {
      await AuditLogger.logAction(
        'PermissionService',
        `Unknown error retrieving roles for user with ID: ${userId}`,
        'ERROR',
        userId,
      )
    }
    throw error
  }
}

export const verifyUserHasRole = async (
  userId: string,
  roleName: string,
): Promise<boolean> => {
  try {
    const roles = await getRolesForUser(userId)
    const hasRole = roles.includes(roleName)

    // Admin override
    if (roles.includes('admin')) {
      await AuditLogger.logAction(
        'PermissionService',
        `User with ID: ${userId} has the admin role, overriding check for role: ${roleName}`,
        'INFO',
        userId,
      )
      return true // Admins automatically pass
    }

    await AuditLogger.logAction(
      'PermissionService',
      `User with ID: ${userId} ${
        hasRole ? 'has' : 'does not have'
      } the role: ${roleName}`,
      'INFO',
      userId,
    )

    return hasRole
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'PermissionService',
        `Error verifying role: ${roleName} for user with ID: ${userId}. Error: ${error.message}`,
        'ERROR',
        userId,
      )
    } else {
      await AuditLogger.logAction(
        'PermissionService',
        `Unknown error verifying role: ${roleName} for user with ID: ${userId}`,
        'ERROR',
        userId,
      )
    }
    throw error
  }
}
