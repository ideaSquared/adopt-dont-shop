import Conversation from '../Models/Conversation'
import * as conversationService from '../services/conversationService'

jest.mock('../models/Conversation')

describe('Conversation Service', () => {
  it('should get all conversations', async () => {
    ;(Conversation.findAll as jest.Mock).mockResolvedValue([
      { conversation_id: '1', started_by: 'user1' },
    ])

    const conversations = await conversationService.getAllConversations()

    expect(conversations).toEqual([
      { conversation_id: '1', started_by: 'user1' },
    ])
  })

  // Implement other tests for conversation service methods
})
