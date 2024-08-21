import { Role, User } from '../../Models'
import { AuditLogger } from '../../services/auditLogService'
import { getRolesForUser } from '../../services/permissionService'

jest.mock('../../Models', () => ({
  User: {
    findByPk: jest.fn(),
  },
  Role: jest.fn(),
}))

jest.mock('../../services/auditLogService', () => ({
  AuditLogger: {
    logAction: jest.fn(),
  },
}))

describe('Permission Service - getRolesForUser', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return an array of role names when user has roles and log the action', async () => {
    const mockRoles = [{ role_name: 'admin' }, { role_name: 'user' }]
    const mockUser = {
      user_id: '1',
      Roles: mockRoles,
    }

    ;(User.findByPk as jest.Mock).mockResolvedValue(mockUser)

    const roles = await getRolesForUser('1')

    expect(User.findByPk).toHaveBeenCalledWith('1', {
      include: [
        {
          model: Role,
          as: 'Roles',
          through: { attributes: [] },
          attributes: ['role_name'],
        },
      ],
    })

    expect(roles).toEqual(['admin', 'user'])
    expect(AuditLogger.logAction).toHaveBeenCalledWith(
      'PermissionService',
      'Roles retrieved for user with ID: 1 - Roles: admin, user',
      'INFO',
      '1',
    )
  })

  it('should return an empty array and log a warning when user has no roles', async () => {
    const mockUser = {
      user_id: '1',
      Roles: [],
    }

    ;(User.findByPk as jest.Mock).mockResolvedValue(mockUser)

    const roles = await getRolesForUser('1')

    expect(User.findByPk).toHaveBeenCalledWith('1', {
      include: [
        {
          model: Role,
          as: 'Roles',
          through: { attributes: [] },
          attributes: ['role_name'],
        },
      ],
    })

    expect(roles).toEqual([])
    expect(AuditLogger.logAction).toHaveBeenCalledWith(
      'PermissionService',
      'No roles found for user with ID: 1',
      'WARNING',
      '1',
    )
  })

  it('should return an empty array and log a warning when user does not exist', async () => {
    ;(User.findByPk as jest.Mock).mockResolvedValue(null)

    const roles = await getRolesForUser('1')

    expect(User.findByPk).toHaveBeenCalledWith('1', {
      include: [
        {
          model: Role,
          as: 'Roles',
          through: { attributes: [] },
          attributes: ['role_name'],
        },
      ],
    })

    expect(roles).toEqual([])
    expect(AuditLogger.logAction).toHaveBeenCalledWith(
      'PermissionService',
      'No roles found for user with ID: 1',
      'WARNING',
      '1',
    )
  })

  it('should log an error if an exception is thrown', async () => {
    const errorMessage = 'Database error'
    ;(User.findByPk as jest.Mock).mockRejectedValue(new Error(errorMessage))

    await expect(getRolesForUser('1')).rejects.toThrow(errorMessage)

    expect(AuditLogger.logAction).toHaveBeenCalledWith(
      'PermissionService',
      `Error retrieving roles for user with ID: 1. Error: ${errorMessage}`,
      'ERROR',
      '1',
    )
  })
})
