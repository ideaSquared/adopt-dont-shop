import Participant from '../Models/Participant'
import * as participantService from '../services/participantService'

jest.mock('../models/Participant')

describe('Participant Service', () => {
  it('should get all participants', async () => {
    ;(Participant.findAll as jest.Mock).mockResolvedValue([
      { participant_id: '1', user_id: 'user1', conversation_id: 'conv1' },
    ])

    const participants = await participantService.getAllParticipants()

    expect(participants).toEqual([
      { participant_id: '1', user_id: 'user1', conversation_id: 'conv1' },
    ])
  })

  // Implement other tests for participant service methods
})
