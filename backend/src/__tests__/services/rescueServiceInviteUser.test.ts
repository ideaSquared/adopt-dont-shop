import jwt from 'jsonwebtoken'
import { Invitation, User } from '../../Models'
import { sendInvitationEmail } from '../../services/emailService'
import { inviteUserService } from '../../services/rescueService'

jest.mock('jsonwebtoken')
jest.mock('../../Models', () => ({
  User: {
    findOne: jest.fn(),
  },
  Invitation: {
    create: jest.fn(),
  },
}))
jest.mock('../../services/emailService', () => ({
  sendInvitationEmail: jest.fn(),
}))
jest.mock('../../services/auditLogService', () => ({
  AuditLogger: {
    logAction: jest.fn(),
  },
}))

describe('Rescue Service - Invite User', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should send an invitation email and save the invitation with user_id if user exists', async () => {
    const mockEmail = 'invitee@example.com'
    const mockRescueId = 'rescue123'
    const mockToken = 'mocked-jwt-token'
    const mockUserId = 'existing-user-id'

    // Mock jwt.sign to return a token
    ;(jwt.sign as jest.Mock).mockReturnValue(mockToken)

    // Mock User.findOne to return an existing user
    ;(User.findOne as jest.Mock).mockResolvedValue({ user_id: mockUserId })

    // Call the inviteUserService function
    await inviteUserService(mockEmail, mockRescueId)

    // Verify jwt.sign was called with correct payload
    expect(jwt.sign).toHaveBeenCalledWith(
      { email: mockEmail, rescue_id: mockRescueId },
      process.env.SECRET_KEY,
      { expiresIn: '48h' },
    )

    // Verify Invitation.create was called with user_id included
    expect(Invitation.create).toHaveBeenCalledWith({
      email: mockEmail,
      token: mockToken,
      rescue_id: mockRescueId,
      user_id: mockUserId,
    })

    // Verify sendInvitationEmail was called with correct arguments
    expect(sendInvitationEmail).toHaveBeenCalledWith(mockEmail, mockToken)
  })

  it('should send an invitation email and save the invitation without user_id if user does not exist', async () => {
    const mockEmail = 'invitee@example.com'
    const mockRescueId = 'rescue123'
    const mockToken = 'mocked-jwt-token'

    ;(jwt.sign as jest.Mock).mockReturnValue(mockToken)
    ;(User.findOne as jest.Mock).mockResolvedValue(null) // User does not exist

    await inviteUserService(mockEmail, mockRescueId)

    // Verify Invitation.create was called with user_id as null
    expect(Invitation.create).toHaveBeenCalledWith({
      email: mockEmail,
      token: mockToken,
      rescue_id: mockRescueId,
      user_id: null,
    })

    // Verify sendInvitationEmail was called with correct arguments
    expect(sendInvitationEmail).toHaveBeenCalledWith(mockEmail, mockToken)
  })

  it('should throw an error if sending the invitation email fails', async () => {
    const mockEmail = 'invitee@example.com'
    const mockRescueId = 'rescue123'
    const mockToken = 'mocked-jwt-token'

    ;(jwt.sign as jest.Mock).mockReturnValue(mockToken)
    ;(User.findOne as jest.Mock).mockResolvedValue(null)
    ;(sendInvitationEmail as jest.Mock).mockRejectedValue(
      new Error('Email failed'),
    )

    // Expect inviteUserService to throw an error when sendInvitationEmail fails
    await expect(inviteUserService(mockEmail, mockRescueId)).rejects.toThrow(
      'Email failed',
    )

    // Verify Invitation.create was still called with user_id as null
    expect(Invitation.create).toHaveBeenCalledWith({
      email: mockEmail,
      token: mockToken,
      rescue_id: mockRescueId,
      user_id: null,
    })
  })

  it('should throw an error if saving the invitation fails', async () => {
    const mockEmail = 'invitee@example.com'
    const mockRescueId = 'rescue123'
    const mockToken = 'mocked-jwt-token'

    ;(jwt.sign as jest.Mock).mockReturnValue(mockToken)
    ;(User.findOne as jest.Mock).mockResolvedValue(null)
    ;(Invitation.create as jest.Mock).mockRejectedValue(
      new Error('Database error'),
    )

    // Expect inviteUserService to throw an error when Invitation.create fails
    await expect(inviteUserService(mockEmail, mockRescueId)).rejects.toThrow(
      'Database error',
    )

    // Verify that sendInvitationEmail was never called due to the error
    expect(sendInvitationEmail).not.toHaveBeenCalled()
  })
})
