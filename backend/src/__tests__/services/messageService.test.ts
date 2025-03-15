import { Message, User } from '../../Models'
import * as messageService from '../../services/messageService'

// Mock the models
jest.mock('../../Models')

describe('MessageService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createMessage', () => {
    it('should create a message with default content format', async () => {
      const messageInput = {
        chat_id: 'chat_123',
        sender_id: 'user_123',
        content: 'Hello, world!',
      }

      const mockMessage = {
        message_id: 'msg_123',
        ...messageInput,
        content_format: 'plain',
      }

      ;(Message.create as jest.Mock).mockResolvedValue(mockMessage)

      const result = await messageService.createMessage(messageInput)

      expect(Message.create).toHaveBeenCalledWith({
        ...messageInput,
        content_format: 'plain',
      })
      expect(result).toEqual(mockMessage)
    })

    it('should create a message with specified content format and attachments', async () => {
      const attachments = [
        {
          attachment_id: 'att_123',
          filename: 'test.jpg',
          originalName: 'test.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          url: 'https://example.com/test.jpg',
        },
      ]

      const messageInput = {
        chat_id: 'chat_123',
        sender_id: 'user_123',
        content: 'Check out this image!',
        content_format: 'markdown' as const,
        attachments,
      }

      const mockMessage = {
        message_id: 'msg_123',
        ...messageInput,
      }

      ;(Message.create as jest.Mock).mockResolvedValue(mockMessage)

      const result = await messageService.createMessage(messageInput)

      expect(Message.create).toHaveBeenCalledWith(messageInput)
      expect(result).toEqual(mockMessage)
    })

    it('should handle errors during message creation', async () => {
      const messageInput = {
        chat_id: 'chat_123',
        sender_id: 'user_123',
        content: 'Hello, world!',
      }

      const error = new Error('Database error')
      ;(Message.create as jest.Mock).mockRejectedValue(error)

      await expect(messageService.createMessage(messageInput)).rejects.toThrow()
    })
  })

  describe('getMessagesByChat', () => {
    it('should return messages for a chat with user details', async () => {
      const mockMessages = [
        {
          message_id: 'msg_123',
          chat_id: 'chat_123',
          sender_id: 'user_123',
          content: 'Hello',
          content_format: 'plain',
          User: {
            user_id: 'user_123',
            first_name: 'John',
            last_name: 'Doe',
          },
        },
        {
          message_id: 'msg_124',
          chat_id: 'chat_123',
          sender_id: 'user_124',
          content: 'Hi there!',
          content_format: 'plain',
          User: {
            user_id: 'user_124',
            first_name: 'Jane',
            last_name: 'Smith',
          },
        },
      ]

      ;(Message.findAll as jest.Mock).mockResolvedValue(mockMessages)

      const result = await messageService.getMessagesByChat('chat_123')

      expect(Message.findAll).toHaveBeenCalledWith({
        where: { chat_id: 'chat_123' },
        include: [
          {
            model: User,
            as: 'User',
            attributes: ['user_id', 'first_name', 'last_name'],
          },
        ],
        order: [['created_at', 'DESC']],
      })
      expect(result).toEqual(mockMessages)
    })

    it('should return empty array for chat with no messages', async () => {
      ;(Message.findAll as jest.Mock).mockResolvedValue([])

      const result = await messageService.getMessagesByChat('chat_123')

      expect(Message.findAll).toHaveBeenCalled()
      expect(result).toEqual([])
    })

    it('should handle errors when fetching messages', async () => {
      const error = new Error('Database error')
      ;(Message.findAll as jest.Mock).mockRejectedValue(error)

      await expect(
        messageService.getMessagesByChat('chat_123'),
      ).rejects.toThrow()
    })
  })
})
