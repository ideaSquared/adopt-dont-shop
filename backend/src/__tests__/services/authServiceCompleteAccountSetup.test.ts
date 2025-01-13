import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Invitation, Role, StaffMember, User } from '../../Models'
import { AuditLogger } from '../../services/auditLogService'
import { completeAccountSetupService } from '../../services/authService'

// Mock dependencies
jest.mock('jsonwebtoken')
jest.mock('bcryptjs')
jest.mock('../../Models', () => ({
  Invitation: {
    findOne: jest.fn(),
  },
  User: {
    create: jest.fn(),
  },
  StaffMember: {
    create: jest.fn(),
  },
  Role: {
    findAll: jest.fn(),
  },
}))
jest.mock('../../services/auditLogService', () => ({
  AuditLogger: {
    logAction: jest.fn(),
  },
}))

describe('completeAccountSetupService', () => {
  const mockToken = 'valid-token'
  const mockPassword = 'new-password'
  const mockDecodedToken = { email: 'test@example.com', rescue_id: 'rescue123' }
  const mockHashedPassword = 'hashed-password'
  const mockSecretKey = 'my-secret-key'

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.SECRET_KEY = mockSecretKey // Ensure SECRET_KEY is set
  })

  it('should complete account setup successfully', async () => {
    // Mock jwt.verify to return decoded token
    ;(jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken)

    // Mock Invitation.findOne to return a valid invitation
    const mockInvitationUpdate = jest.fn()
    const mockInvitation = { update: mockInvitationUpdate }
    ;(Invitation.findOne as jest.Mock).mockResolvedValue(mockInvitation)

    // Mock bcrypt.hash to return a hashed password
    ;(bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedPassword)

    // Mock User.create to create a user
    const mockAddRole = jest.fn()
    const mockUser = {
      user_id: 'user123',
      email: mockDecodedToken.email,
      addRole: mockAddRole,
    }
    ;(User.create as jest.Mock).mockResolvedValue(mockUser)

    // Mock Role.findAll to return roles
    const mockRoles = [
      { role_id: 'role1', role_name: 'verified_user' },
      { role_id: 'role2', role_name: 'staff' },
    ]
    ;(Role.findAll as jest.Mock).mockResolvedValue(mockRoles)

    // Mock StaffMember.create to create a staff member entry
    ;(StaffMember.create as jest.Mock).mockResolvedValue({})

    // Call completeAccountSetupService
    const result = await completeAccountSetupService(mockToken, mockPassword)

    // Assertions
    expect(jwt.verify).toHaveBeenCalledWith(mockToken, mockSecretKey)
    expect(Invitation.findOne).toHaveBeenCalledWith({
      where: { email: mockDecodedToken.email, token: mockToken },
    })
    expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 10)
    expect(User.create).toHaveBeenCalledWith({
      email: mockDecodedToken.email,
      password: mockHashedPassword,
    })
    expect(Role.findAll).toHaveBeenCalledWith({
      where: { role_name: ['verified_user', 'staff'] },
    })
    expect(mockAddRole).toHaveBeenCalledTimes(mockRoles.length)
    for (const role of mockRoles) {
      expect(mockAddRole).toHaveBeenCalledWith(role)
    }
    expect(StaffMember.create).toHaveBeenCalledWith({
      user_id: mockUser.user_id,
      rescue_id: mockDecodedToken.rescue_id,
      verified_by_rescue: false,
    })
    expect(mockInvitationUpdate).toHaveBeenCalledWith({
      user_id: mockUser.user_id,
      used: true,
    })
    expect(result).toEqual({
      message: 'Account setup complete',
      user: mockUser,
    })
  })

  it('should throw an error if SECRET_KEY is missing', async () => {
    // Remove SECRET_KEY from environment variables
    delete process.env.SECRET_KEY

    await expect(
      completeAccountSetupService(mockToken, mockPassword),
    ).rejects.toThrow('Internal server error')

    expect(AuditLogger.logAction).toHaveBeenCalledWith(
      'AuthService',
      'Missing SECRET_KEY environment variable',
      'ERROR',
    )
  })

  it('should throw an error if token is invalid', async () => {
    // Mock jwt.verify to throw an error
    ;(jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid token')
    })

    await expect(
      completeAccountSetupService(mockToken, mockPassword),
    ).rejects.toThrow('Invalid token')

    expect(jwt.verify).toHaveBeenCalledWith(mockToken, mockSecretKey)
    expect(Invitation.findOne).not.toHaveBeenCalled()
  })

  it('should throw an error if invitation is not found', async () => {
    // Mock jwt.verify to return decoded token
    ;(jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken)

    // Mock Invitation.findOne to return null (invitation not found)
    ;(Invitation.findOne as jest.Mock).mockResolvedValue(null)

    await expect(
      completeAccountSetupService(mockToken, mockPassword),
    ).rejects.toThrow('Invalid or expired token')

    expect(jwt.verify).toHaveBeenCalledWith(mockToken, mockSecretKey)
    expect(Invitation.findOne).toHaveBeenCalledWith({
      where: { email: mockDecodedToken.email, token: mockToken },
    })
  })

  it('should throw an error if user creation fails', async () => {
    // Mock jwt.verify to return decoded token
    ;(jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken)

    // Mock Invitation.findOne to return a valid invitation
    const mockInvitation = { update: jest.fn() }
    ;(Invitation.findOne as jest.Mock).mockResolvedValue(mockInvitation)

    // Mock bcrypt.hash to return a hashed password
    ;(bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedPassword)

    // Mock User.create to throw an error
    ;(User.create as jest.Mock).mockRejectedValue(
      new Error('User creation failed'),
    )

    await expect(
      completeAccountSetupService(mockToken, mockPassword),
    ).rejects.toThrow('User creation failed')

    expect(jwt.verify).toHaveBeenCalledWith(mockToken, mockSecretKey)
    expect(Invitation.findOne).toHaveBeenCalledWith({
      where: { email: mockDecodedToken.email, token: mockToken },
    })
    expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 10)
    expect(User.create).toHaveBeenCalledWith({
      email: mockDecodedToken.email,
      password: mockHashedPassword,
    })
    expect(mockInvitation.update).not.toHaveBeenCalled()
  })

  it('should throw an error if Role.findAll fails', async () => {
    // Mock jwt.verify to return decoded token
    ;(jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken)

    // Mock Invitation.findOne to return a valid invitation
    const mockInvitation = { update: jest.fn() }
    ;(Invitation.findOne as jest.Mock).mockResolvedValue(mockInvitation)

    // Mock bcrypt.hash to return a hashed password
    ;(bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedPassword)

    // Mock User.create to create a user
    const mockUser = {
      user_id: 'user123',
      email: mockDecodedToken.email,
      addRole: jest.fn(),
    }
    ;(User.create as jest.Mock).mockResolvedValue(mockUser)

    // Mock Role.findAll to throw an error
    ;(Role.findAll as jest.Mock).mockRejectedValue(
      new Error('Role fetch failed'),
    )

    await expect(
      completeAccountSetupService(mockToken, mockPassword),
    ).rejects.toThrow('Role fetch failed')

    expect(jwt.verify).toHaveBeenCalledWith(mockToken, mockSecretKey)
    expect(Invitation.findOne).toHaveBeenCalledWith({
      where: { email: mockDecodedToken.email, token: mockToken },
    })
    expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 10)
    expect(User.create).toHaveBeenCalledWith({
      email: mockDecodedToken.email,
      password: mockHashedPassword,
    })
    expect(Role.findAll).toHaveBeenCalledWith({
      where: { role_name: ['verified_user', 'staff'] },
    })
    expect(mockUser.addRole).not.toHaveBeenCalled()
    expect(mockInvitation.update).not.toHaveBeenCalled()
  })

  it('should throw an error if StaffMember creation fails', async () => {
    // Mock jwt.verify to return decoded token
    ;(jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken)

    // Mock Invitation.findOne to return a valid invitation
    const mockInvitation = { update: jest.fn() }
    ;(Invitation.findOne as jest.Mock).mockResolvedValue(mockInvitation)

    // Mock bcrypt.hash to return a hashed password
    ;(bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedPassword)

    // Mock User.create to create a user
    const mockAddRole = jest.fn()
    const mockUser = {
      user_id: 'user123',
      email: mockDecodedToken.email,
      addRole: mockAddRole,
    }
    ;(User.create as jest.Mock).mockResolvedValue(mockUser)

    // Mock Role.findAll to return roles
    const mockRoles = [
      { role_id: 'role1', role_name: 'verified_user' },
      { role_id: 'role2', role_name: 'staff' },
    ]
    ;(Role.findAll as jest.Mock).mockResolvedValue(mockRoles)

    // Mock StaffMember.create to throw an error
    ;(StaffMember.create as jest.Mock).mockRejectedValue(
      new Error('Staff member creation failed'),
    )

    await expect(
      completeAccountSetupService(mockToken, mockPassword),
    ).rejects.toThrow('Staff member creation failed')

    expect(jwt.verify).toHaveBeenCalledWith(mockToken, mockSecretKey)
    expect(Invitation.findOne).toHaveBeenCalledWith({
      where: { email: mockDecodedToken.email, token: mockToken },
    })
    expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 10)
    expect(User.create).toHaveBeenCalledWith({
      email: mockDecodedToken.email,
      password: mockHashedPassword,
    })
    expect(Role.findAll).toHaveBeenCalledWith({
      where: { role_name: ['verified_user', 'staff'] },
    })
    expect(mockAddRole).toHaveBeenCalledTimes(mockRoles.length)
    expect(StaffMember.create).toHaveBeenCalledWith({
      user_id: mockUser.user_id,
      rescue_id: mockDecodedToken.rescue_id,
      verified_by_rescue: false,
    })
    expect(mockInvitation.update).not.toHaveBeenCalled()
  })
})
