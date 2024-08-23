import Message from '../Models/Message'
import * as messageService from '../services/messageService'

jest.mock('../models/Message')

describe('Message Service', () => {
  it('should get all messages', async () => {
    ;(Message.findAll as jest.Mock).mockResolvedValue([
      { message_id: '1', conversation_id: 'conv1', message_text: 'Hello' },
    ])

    const messages = await messageService.getAllMessages()

    expect(messages).toEqual([
      { message_id: '1', conversation_id: 'conv1', message_text: 'Hello' },
    ])
  })

  // Implement other tests for message service methods
})
