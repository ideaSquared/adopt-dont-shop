// rescueService.test.ts

import { Invitation } from '../../Models'
import { cancelInvitationService } from '../../services/rescueService'

// Mock dependencies
jest.mock('../../Models', () => ({
  User: {
    findByPk: jest.fn(),
  },
  AuditLog: {
    create: jest.fn(),
  },
  Invitation: {
    findOne: jest.fn(),
  },
}))

describe('Rescue Service - Cancel Invitation', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should cancel an invitation successfully when invitation exists and is not used', async () => {
    const mockEmail = 'invitee@example.com'
    const mockRescueId = 'rescue123'
    const mockInvitation = {
      destroy: jest.fn(),
    }

    // Mock Invitation.findOne to return an invitation
    ;(Invitation.findOne as jest.Mock).mockResolvedValue(mockInvitation)

    // Call the cancelInvitationService function
    await cancelInvitationService(mockEmail, mockRescueId)

    // Verify Invitation.findOne was called with correct parameters
    expect(Invitation.findOne).toHaveBeenCalledWith({
      where: { email: mockEmail, rescue_id: mockRescueId, used: false },
    })

    // Verify invitation.destroy was called
    expect(mockInvitation.destroy).toHaveBeenCalled()
  })

  it('should throw an error if the invitation is not found or already used', async () => {
    const mockEmail = 'invitee@example.com'
    const mockRescueId = 'rescue123'

    // Mock Invitation.findOne to return null
    ;(Invitation.findOne as jest.Mock).mockResolvedValue(null)

    // Expect cancelInvitationService to throw an error
    await expect(
      cancelInvitationService(mockEmail, mockRescueId),
    ).rejects.toThrow('Invitation not found or already used')

    // Verify Invitation.findOne was called with correct parameters
    expect(Invitation.findOne).toHaveBeenCalledWith({
      where: { email: mockEmail, rescue_id: mockRescueId, used: false },
    })
  })

  it('should throw an error if destroying the invitation fails', async () => {
    const mockEmail = 'invitee@example.com'
    const mockRescueId = 'rescue123'
    const mockInvitation = {
      destroy: jest.fn().mockRejectedValue(new Error('Database error')),
    }

    // Mock Invitation.findOne to return an invitation
    ;(Invitation.findOne as jest.Mock).mockResolvedValue(mockInvitation)

    // Expect cancelInvitationService to throw an error
    await expect(
      cancelInvitationService(mockEmail, mockRescueId),
    ).rejects.toThrow('Database error')

    // Verify Invitation.findOne was called with correct parameters
    expect(Invitation.findOne).toHaveBeenCalledWith({
      where: { email: mockEmail, rescue_id: mockRescueId, used: false },
    })

    // Verify invitation.destroy was called
    expect(mockInvitation.destroy).toHaveBeenCalled()
  })
})
