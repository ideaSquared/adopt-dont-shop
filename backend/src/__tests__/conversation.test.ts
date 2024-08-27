import { Conversation } from '../Models'
import { getAllConversations } from '../services/conversationService'

jest.mock('../Models', () => ({
  Conversation: {
    findAll: jest.fn(),
  },
  Participant: {},
  User: {},
}))

describe('getAllConversations', () => {
  it('should return the expected conversations with participants', async () => {
    const mockConversations = [
      {
        conversation_id: '1',
        started_by: 'user1',
        started_at: new Date('2023-08-01'),
        last_message: 'Hello',
        last_message_at: new Date('2023-08-02'),
        last_message_by: 'user2',
        pet_id: 'pet1',
        status: 'active',
        unread_messages: 5,
        messages_count: 10,
        created_at: new Date('2023-08-01'),
        updated_at: new Date('2023-08-02'),
        participants: [
          {
            User: {
              first_name: 'John',
              email: 'john@example.com',
            },
          },
          {
            User: {
              first_name: 'Jane',
              email: 'jane@example.com',
            },
          },
        ],
      },
      {
        conversation_id: '2',
        started_by: 'user3',
        started_at: new Date('2023-08-03'),
        last_message: 'Hi there',
        last_message_at: new Date('2023-08-04'),
        last_message_by: 'user4',
        pet_id: 'pet2',
        status: 'completed',
        unread_messages: 0,
        messages_count: 20,
        created_at: new Date('2023-08-03'),
        updated_at: new Date('2023-08-04'),
        participants: [
          {
            User: {
              first_name: 'Alice',
              email: 'alice@example.com',
            },
          },
        ],
      },
    ]

    ;(Conversation.findAll as jest.Mock).mockResolvedValue(mockConversations)

    const result = await getAllConversations()

    expect(Conversation.findAll).toHaveBeenCalledTimes(1)
    expect(result).toEqual([
      {
        conversation_id: '1',
        started_by: 'user1',
        started_at: new Date('2023-08-01'),
        last_message: 'Hello',
        last_message_at: new Date('2023-08-02'),
        last_message_by: 'user2',
        pet_id: 'pet1',
        status: 'active',
        unread_messages: 5,
        messages_count: 10,
        created_at: new Date('2023-08-01'),
        updated_at: new Date('2023-08-02'),
        participants: [
          {
            name: 'John',
            email: 'john@example.com',
          },
          {
            name: 'Jane',
            email: 'jane@example.com',
          },
        ],
      },
      {
        conversation_id: '2',
        started_by: 'user3',
        started_at: new Date('2023-08-03'),
        last_message: 'Hi there',
        last_message_at: new Date('2023-08-04'),
        last_message_by: 'user4',
        pet_id: 'pet2',
        status: 'completed',
        unread_messages: 0,
        messages_count: 20,
        created_at: new Date('2023-08-03'),
        updated_at: new Date('2023-08-04'),
        participants: [
          {
            name: 'Alice',
            email: 'alice@example.com',
          },
        ],
      },
    ])
  })
})
