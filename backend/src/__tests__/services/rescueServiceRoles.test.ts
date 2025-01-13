import {
  Role as RoleModel,
  User as UserModel,
  UserRole as UserRoleModel,
} from '../../Models'
import {
  addRoleToUserService,
  removeRoleFromUserService,
} from '../../services/rescueService'

// Mock dependencies
jest.mock('../../Models', () => ({
  User: {
    findByPk: jest.fn(),
  },
  Role: {
    findOne: jest.fn(),
  },
  UserRole: {
    create: jest.fn(),
    destroy: jest.fn(),
  },
  AuditLog: {
    create: jest.fn(),
  },
}))

describe('Role Service - Add and Remove Roles', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('addRoleToUserService', () => {
    it('should add a role to a user successfully', async () => {
      const userId = 'user123'
      const roleName = 'rescue_manager'
      const mockRole = { role_id: 1, role_name: roleName }
      const mockUser = { user_id: userId }

      // Mock RoleModel and UserModel to return expected values
      ;(RoleModel.findOne as jest.Mock).mockResolvedValue(mockRole)
      ;(UserModel.findByPk as jest.Mock).mockResolvedValue(mockUser)

      // Call addRoleToUserService
      await addRoleToUserService(userId, roleName)

      // Verify RoleModel.findOne was called with correct parameters
      expect(RoleModel.findOne).toHaveBeenCalledWith({
        where: { role_name: roleName },
      })
      // Verify UserModel.findByPk was called with correct parameters
      expect(UserModel.findByPk).toHaveBeenCalledWith(userId)
      // Verify UserRoleModel.create was called with correct parameters
      expect(UserRoleModel.create).toHaveBeenCalledWith({
        user_id: userId,
        role_id: mockRole.role_id,
      })
    })

    it('should throw an error if the role does not exist', async () => {
      const userId = 'user123'
      const roleName = 'non_existent_role'

      // Mock RoleModel to return null (role not found)
      ;(RoleModel.findOne as jest.Mock).mockResolvedValue(null)

      // Expect addRoleToUserService to throw an error
      await expect(addRoleToUserService(userId, roleName)).rejects.toThrow(
        `Role '${roleName}' does not exist`,
      )

      // Verify RoleModel.findOne was called with correct parameters
      expect(RoleModel.findOne).toHaveBeenCalledWith({
        where: { role_name: roleName },
      })
      // Verify UserRoleModel.create was not called
      expect(UserRoleModel.create).not.toHaveBeenCalled()
    })

    it('should throw an error if the user does not exist', async () => {
      const userId = 'user123'
      const roleName = 'rescue_manager'
      const mockRole = { role_id: 1, role_name: roleName }

      // Mock RoleModel and UserModel to return expected values
      ;(RoleModel.findOne as jest.Mock).mockResolvedValue(mockRole)
      ;(UserModel.findByPk as jest.Mock).mockResolvedValue(null)

      // Expect addRoleToUserService to throw an error
      await expect(addRoleToUserService(userId, roleName)).rejects.toThrow(
        'User not found',
      )

      // Verify RoleModel.findOne was called with correct parameters
      expect(RoleModel.findOne).toHaveBeenCalledWith({
        where: { role_name: roleName },
      })
      // Verify UserModel.findByPk was called with correct parameters
      expect(UserModel.findByPk).toHaveBeenCalledWith(userId)
      // Verify UserRoleModel.create was not called
      expect(UserRoleModel.create).not.toHaveBeenCalled()
    })
  })

  describe('removeRoleFromUserService', () => {
    it('should remove a role from a user successfully', async () => {
      const userId = 'user123'
      const roleName = 'rescue_manager'
      const mockRole = { role_id: 1, role_name: roleName }
      const mockUser = { user_id: userId }

      // Mock RoleModel and UserModel to return expected values
      ;(RoleModel.findOne as jest.Mock).mockResolvedValue(mockRole)
      ;(UserModel.findByPk as jest.Mock).mockResolvedValue(mockUser)
      ;(UserRoleModel.destroy as jest.Mock).mockResolvedValue(1) // Simulate successful deletion

      // Call removeRoleFromUserService
      await removeRoleFromUserService(userId, roleName)

      // Verify RoleModel.findOne was called with correct parameters
      expect(RoleModel.findOne).toHaveBeenCalledWith({
        where: { role_name: roleName },
      })
      // Verify UserModel.findByPk was called with correct parameters
      expect(UserModel.findByPk).toHaveBeenCalledWith(userId)
      // Verify UserRoleModel.destroy was called with correct parameters
      expect(UserRoleModel.destroy).toHaveBeenCalledWith({
        where: {
          user_id: userId,
          role_id: mockRole.role_id,
        },
      })
    })

    it('should throw an error if the role does not exist', async () => {
      const userId = 'user123'
      const roleName = 'non_existent_role'

      // Mock RoleModel to return null (role not found)
      ;(RoleModel.findOne as jest.Mock).mockResolvedValue(null)

      // Expect removeRoleFromUserService to throw an error
      await expect(removeRoleFromUserService(userId, roleName)).rejects.toThrow(
        `Role '${roleName}' does not exist`,
      )

      // Verify RoleModel.findOne was called with correct parameters
      expect(RoleModel.findOne).toHaveBeenCalledWith({
        where: { role_name: roleName },
      })
      // Verify UserRoleModel.destroy was not called
      expect(UserRoleModel.destroy).not.toHaveBeenCalled()
    })

    it('should throw an error if the user does not exist', async () => {
      const userId = 'user123'
      const roleName = 'rescue_manager'
      const mockRole = { role_id: 1, role_name: roleName }

      // Mock RoleModel and UserModel to return expected values
      ;(RoleModel.findOne as jest.Mock).mockResolvedValue(mockRole)
      ;(UserModel.findByPk as jest.Mock).mockResolvedValue(null)

      // Expect removeRoleFromUserService to throw an error
      await expect(removeRoleFromUserService(userId, roleName)).rejects.toThrow(
        'User not found',
      )

      // Verify RoleModel.findOne was called with correct parameters
      expect(RoleModel.findOne).toHaveBeenCalledWith({
        where: { role_name: roleName },
      })
      // Verify UserModel.findByPk was called with correct parameters
      expect(UserModel.findByPk).toHaveBeenCalledWith(userId)
      // Verify UserRoleModel.destroy was not called
      expect(UserRoleModel.destroy).not.toHaveBeenCalled()
    })

    it('should throw an error if the role is not assigned to the user', async () => {
      const userId = 'user123'
      const roleName = 'rescue_manager'
      const mockRole = { role_id: 1, role_name: roleName }
      const mockUser = { user_id: userId }

      // Mock RoleModel, UserModel, and UserRoleModel to simulate role not assigned to user
      ;(RoleModel.findOne as jest.Mock).mockResolvedValue(mockRole)
      ;(UserModel.findByPk as jest.Mock).mockResolvedValue(mockUser)
      ;(UserRoleModel.destroy as jest.Mock).mockResolvedValue(0) // Simulate no deletion

      // Expect removeRoleFromUserService to throw an error
      await expect(removeRoleFromUserService(userId, roleName)).rejects.toThrow(
        `Role '${roleName}' not assigned to user`,
      )

      // Verify RoleModel.findOne was called with correct parameters
      expect(RoleModel.findOne).toHaveBeenCalledWith({
        where: { role_name: roleName },
      })
      // Verify UserModel.findByPk was called with correct parameters
      expect(UserModel.findByPk).toHaveBeenCalledWith(userId)
      // Verify UserRoleModel.destroy was called with correct parameters
      expect(UserRoleModel.destroy).toHaveBeenCalledWith({
        where: {
          user_id: userId,
          role_id: mockRole.role_id,
        },
      })
    })
  })
})
