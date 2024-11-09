import jwt from 'jsonwebtoken'
import { Invitation } from '../../Models'
import { sendInvitationEmail } from '../../services/emailService'
import { inviteUser } from '../../services/rescueService'

jest.mock('jsonwebtoken')
jest.mock('../../Models', () => ({
  Rescue: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  Invitation: {
    create: jest.fn(),
  },
}))
jest.mock('../../services/emailService', () => ({
  sendInvitationEmail: jest.fn(),
}))

describe('Rescue Service - Invite User', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should send an invitation email and save the invitation to the database', async () => {
    const mockEmail = 'invitee@example.com'
    const mockRescueId = 'rescue123'
    const mockToken = 'mocked-jwt-token'

    // Mock jwt.sign to return a token
    ;(jwt.sign as jest.Mock).mockReturnValue(mockToken)

    // Call the inviteUser function
    await inviteUser(mockEmail, mockRescueId)

    // Verify that jwt.sign was called with the correct payload
    expect(jwt.sign).toHaveBeenCalledWith(
      { email: mockEmail, rescue_id: mockRescueId },
      process.env.SECRET_KEY,
      { expiresIn: '48h' },
    )

    // Verify that Invitation.create was called with the correct data
    expect(Invitation.create).toHaveBeenCalledWith({
      email: mockEmail,
      token: mockToken,
      rescue_id: mockRescueId,
    })

    // Verify that sendInvitationEmail was called with the correct arguments
    expect(sendInvitationEmail).toHaveBeenCalledWith(mockEmail, mockToken)
  })

  it('should throw an error if sending the invitation email fails', async () => {
    const mockEmail = 'invitee@example.com'
    const mockRescueId = 'rescue123'
    const mockToken = 'mocked-jwt-token'

    ;(jwt.sign as jest.Mock).mockReturnValue(mockToken)
    ;(sendInvitationEmail as jest.Mock).mockRejectedValue(
      new Error('Email failed'),
    )

    // Expect inviteUser to throw an error when sendInvitationEmail fails
    await expect(inviteUser(mockEmail, mockRescueId)).rejects.toThrow(
      'Email failed',
    )

    // Verify that Invitation.create was still called with the correct data
    expect(Invitation.create).toHaveBeenCalledWith({
      email: mockEmail,
      token: mockToken,
      rescue_id: mockRescueId,
    })
  })

  it('should throw an error if saving the invitation fails', async () => {
    const mockEmail = 'invitee@example.com'
    const mockRescueId = 'rescue123'
    const mockToken = 'mocked-jwt-token'

    ;(jwt.sign as jest.Mock).mockReturnValue(mockToken)
    ;(Invitation.create as jest.Mock).mockRejectedValue(
      new Error('Database error'),
    )

    // Expect inviteUser to throw an error when Invitation.create fails
    await expect(inviteUser(mockEmail, mockRescueId)).rejects.toThrow(
      'Database error',
    )

    // Verify that sendInvitationEmail was never called due to the error
    expect(sendInvitationEmail).not.toHaveBeenCalled()
  })
})
