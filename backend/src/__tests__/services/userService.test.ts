import bcryptjs from 'bcryptjs'
import { Rescue, Role, StaffMember, User } from '../../Models'
import { createUser } from '../../services/authService'
import { sendVerificationEmail } from '../../services/emailService'

jest.mock('../../Models', () => ({
  User: { create: jest.fn(), findOne: jest.fn() },
  Rescue: { create: jest.fn(), findOne: jest.fn() },
  StaffMember: { create: jest.fn() },
  Role: { findOne: jest.fn(), findAll: jest.fn() },
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn() as jest.Mock<Promise<string>, [string, string | number]>,
}))

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'mocked-verification-token'),
  })),
}))

jest.mock('../../services/emailService', () => ({
  sendVerificationEmail: jest.fn(),
}))

// Manually mock bcrypt.hash
const bcryptHashMock = jest.fn<Promise<string>, [string, string | number]>()
bcryptHashMock.mockResolvedValue('hashed-password')
bcryptjs.hash = bcryptHashMock

describe('createUser', () => {
  const mockUser = {
    user_id: 1,
    email: 'test@example.com',
    addRole: jest.fn(),
  }

  const mockRole = { role_name: 'user' }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create a user, send a verification email, and assign a "user" role', async () => {
    ;(User.create as jest.Mock).mockResolvedValue(mockUser)
    ;(Role.findOne as jest.Mock).mockResolvedValue(mockRole)

    const userData = {
      email: 'test@example.com',
      password: 'plain-password',
      country: 'Country',
      city: 'City',
    }

    const result = await createUser(userData)

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        password: 'hashed-password',
        verification_token: 'mocked-verification-token',
        email_verified: false,
      }),
    )

    expect(sendVerificationEmail).toHaveBeenCalledWith(
      'test@example.com',
      'mocked-verification-token',
    )

    expect(mockUser.addRole).toHaveBeenCalledWith(mockRole)

    expect(result).toEqual({ user: mockUser })
  })

  it('should create a user and a rescue, associate the user as a staff member, and assign additional roles', async () => {
    ;(User.create as jest.Mock).mockResolvedValue(mockUser)
    ;(Role.findOne as jest.Mock).mockResolvedValue(mockRole)

    const mockRescue = { rescue_id: 1 }
    ;(Rescue.create as jest.Mock).mockResolvedValue(mockRescue)

    const mockStaffMember = { staff_member_id: 1 }
    ;(StaffMember.create as jest.Mock).mockResolvedValue(mockStaffMember)

    const mockRoles = [
      { role_name: 'staff' },
      { role_name: 'rescue_manager' },
      { role_name: 'staff_manager' },
      { role_name: 'pet_manager' },
      { role_name: 'communications_manager' },
      { role_name: 'application_manager' },
    ]

    ;(Role.findAll as jest.Mock).mockResolvedValue(mockRoles)

    const userData = {
      email: 'test@example.com',
      password: 'plain-password',
      country: 'Country',
      city: 'City',
    }

    const rescueData = {
      rescue_name: 'Rescue Name',
    }

    const result = await createUser(userData, rescueData)

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        password: 'hashed-password',
        verification_token: 'mocked-verification-token',
        email_verified: false,
      }),
    )

    expect(Rescue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        rescue_name: 'Rescue Name',
        reference_number_verified: false,
      }),
    )

    expect(StaffMember.create).toHaveBeenCalledWith({
      user_id: 1,
      rescue_id: 1,
      verified_by_rescue: true,
    })

    for (const role of mockRoles) {
      expect(mockUser.addRole).toHaveBeenCalledWith(role)
    }

    expect(result).toEqual({
      user: mockUser,
      rescue: mockRescue,
      staffMember: mockStaffMember,
    })
  })

  it('should handle the case where no "user" role exists', async () => {
    ;(User.create as jest.Mock).mockResolvedValue(mockUser)
    ;(Role.findOne as jest.Mock).mockResolvedValue(null) // No role found

    const userData = {
      email: 'test@example.com',
      password: 'plain-password',
      country: 'Country',
      city: 'City',
    }

    const result = await createUser(userData)

    expect(mockUser.addRole).not.toHaveBeenCalled()

    expect(result).toEqual({ user: mockUser })
  })
})
