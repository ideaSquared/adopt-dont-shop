import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Invitation, StaffMember, User } from '../../Models'
import { completeAccountSetupService } from '../../services/authService'

// Mock dependencies
jest.mock('jsonwebtoken')
jest.mock('bcryptjs')
jest.mock('../../models', () => ({
  Invitation: {
    findOne: jest.fn(),
  },
  User: {
    create: jest.fn(),
  },
  StaffMember: {
    create: jest.fn(),
  },
}))

describe('completeAccountSetupService', () => {
  const mockToken = 'valid-token'
  const mockPassword = 'new-password'
  const mockDecodedToken = { email: 'test@example.com', rescue_id: 'rescue123' }
  const mockHashedPassword = 'hashed-password'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should complete account setup successfully', async () => {
    // Mock jwt.verify to return decoded token
    ;(jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken)

    // Mock Invitation.findOne to return a valid invitation
    const mockInvitation = { destroy: jest.fn() }
    ;(Invitation.findOne as jest.Mock).mockResolvedValue(mockInvitation)

    // Mock bcrypt.hash to return a hashed password
    ;(bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedPassword)

    // Mock User.create to create a user
    const mockUser = { user_id: 'user123', email: mockDecodedToken.email }
    ;(User.create as jest.Mock).mockResolvedValue(mockUser)

    // Mock StaffMember.create to create a staff member entry
    ;(StaffMember.create as jest.Mock).mockResolvedValue({})

    // Call completeAccountSetupService
    const result = await completeAccountSetupService(mockToken, mockPassword)

    // Assertions
    expect(jwt.verify).toHaveBeenCalledWith(mockToken, process.env.JWT_SECRET)
    expect(Invitation.findOne).toHaveBeenCalledWith({
      where: { email: mockDecodedToken.email, token: mockToken },
    })
    expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 10)
    expect(User.create).toHaveBeenCalledWith({
      email: mockDecodedToken.email,
      password: mockHashedPassword,
    })
    expect(StaffMember.create).toHaveBeenCalledWith({
      user_id: mockUser.user_id,
      rescue_id: mockDecodedToken.rescue_id,
      verified_by_rescue: false,
    })
    expect(mockInvitation.destroy).toHaveBeenCalled()
    expect(result).toEqual({
      message: 'Account setup complete',
      user: mockUser,
    })
  })

  it('should throw an error if token is invalid', async () => {
    // Mock jwt.verify to throw an error
    ;(jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid token')
    })

    await expect(
      completeAccountSetupService(mockToken, mockPassword),
    ).rejects.toThrow('Invalid token')

    expect(jwt.verify).toHaveBeenCalledWith(mockToken, process.env.JWT_SECRET)
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

    expect(jwt.verify).toHaveBeenCalledWith(mockToken, process.env.JWT_SECRET)
    expect(Invitation.findOne).toHaveBeenCalledWith({
      where: { email: mockDecodedToken.email, token: mockToken },
    })
  })

  it('should throw an error if user creation fails', async () => {
    // Mock jwt.verify to return decoded token
    ;(jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken)

    // Mock Invitation.findOne to return a valid invitation
    const mockInvitation = { destroy: jest.fn() }
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

    expect(jwt.verify).toHaveBeenCalledWith(mockToken, process.env.JWT_SECRET)
    expect(Invitation.findOne).toHaveBeenCalledWith({
      where: { email: mockDecodedToken.email, token: mockToken },
    })
    expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 10)
    expect(User.create).toHaveBeenCalledWith({
      email: mockDecodedToken.email,
      password: mockHashedPassword,
    })
    expect(mockInvitation.destroy).not.toHaveBeenCalled()
  })

  it('should throw an error if StaffMember creation fails', async () => {
    // Mock jwt.verify to return decoded token
    ;(jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken)

    // Mock Invitation.findOne to return a valid invitation
    const mockInvitation = { destroy: jest.fn() }
    ;(Invitation.findOne as jest.Mock).mockResolvedValue(mockInvitation)

    // Mock bcrypt.hash to return a hashed password
    ;(bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedPassword)

    // Mock User.create to create a user
    const mockUser = { user_id: 'user123', email: mockDecodedToken.email }
    ;(User.create as jest.Mock).mockResolvedValue(mockUser)

    // Mock StaffMember.create to throw an error
    ;(StaffMember.create as jest.Mock).mockRejectedValue(
      new Error('Staff member creation failed'),
    )

    await expect(
      completeAccountSetupService(mockToken, mockPassword),
    ).rejects.toThrow('Staff member creation failed')

    expect(jwt.verify).toHaveBeenCalledWith(mockToken, process.env.JWT_SECRET)
    expect(Invitation.findOne).toHaveBeenCalledWith({
      where: { email: mockDecodedToken.email, token: mockToken },
    })
    expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 10)
    expect(User.create).toHaveBeenCalledWith({
      email: mockDecodedToken.email,
      password: mockHashedPassword,
    })
    expect(StaffMember.create).toHaveBeenCalledWith({
      user_id: mockUser.user_id,
      rescue_id: mockDecodedToken.rescue_id,
      verified_by_rescue: false,
    })
    expect(mockInvitation.destroy).not.toHaveBeenCalled()
  })
})
