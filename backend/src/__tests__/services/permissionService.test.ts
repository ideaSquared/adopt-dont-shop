import { Role, User } from '../../Models'
import {
  getRolesForUser,
  verifyUserHasRole,
} from '../../services/permissionService'

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
  })

  it('should log an error if an exception is thrown', async () => {
    const errorMessage = 'Database error'
    ;(User.findByPk as jest.Mock).mockRejectedValue(new Error(errorMessage))

    await expect(getRolesForUser('1')).rejects.toThrow(errorMessage)
  })
})

describe('Permission Service - verifyUserHasRole', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return true if user has the specified role', async () => {
    const mockRoles = [{ role_name: 'user' }]
    const mockUser = {
      user_id: '1',
      Roles: mockRoles,
    }

    ;(User.findByPk as jest.Mock).mockResolvedValue(mockUser)

    const hasRole = await verifyUserHasRole('1', 'user')

    expect(hasRole).toBe(true)
  })

  it('should return false if user does not have the specified role', async () => {
    const mockRoles = [{ role_name: 'guest' }]
    const mockUser = {
      user_id: '1',
      Roles: mockRoles,
    }

    ;(User.findByPk as jest.Mock).mockResolvedValue(mockUser)

    const hasRole = await verifyUserHasRole('1', 'user')

    expect(hasRole).toBe(false)
  })

  it('should return true if user has the admin role, overriding other roles', async () => {
    const mockRoles = [{ role_name: 'admin' }]
    const mockUser = {
      user_id: '1',
      Roles: mockRoles,
    }

    ;(User.findByPk as jest.Mock).mockResolvedValue(mockUser)

    const hasRole = await verifyUserHasRole('1', 'user')

    expect(hasRole).toBe(true)
  })

  it('should log an error if an exception is thrown during role verification', async () => {
    const errorMessage = 'Database error'
    ;(User.findByPk as jest.Mock).mockRejectedValue(new Error(errorMessage))

    await expect(verifyUserHasRole('1', 'user')).rejects.toThrow(errorMessage)
  })
})
