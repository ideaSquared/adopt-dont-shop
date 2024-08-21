import { Role, User } from '../../Models'
import { getRolesForUser } from '../../services/permissionService'

jest.mock('../../Models', () => ({
  User: {
    findByPk: jest.fn(),
  },
  Role: jest.fn(),
}))

describe('Permission Service - getRolesForUser', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return an array of role names when user has roles', async () => {
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

  it('should return an empty array when user has no roles', async () => {
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

  it('should return an empty array when user does not exist', async () => {
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
})
