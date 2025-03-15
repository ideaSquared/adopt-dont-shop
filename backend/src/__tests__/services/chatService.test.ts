import { Chat, ChatParticipant, Message } from '../../Models'
import { AuditLogger } from '../../services/auditLogService'
import * as chatService from '../../services/chatService'

// Mock the models, audit logger and sequelize
jest.mock('../../Models', () => ({
  Chat: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
  },
  ChatParticipant: {
    create: jest.fn(),
  },
  Message: {
    destroy: jest.fn(),
  },
}))

jest.mock('../../services/auditLogService')
jest.mock('../../sequelize', () => ({
  __esModule: true,
  default: {
    transaction: jest.fn().mockImplementation(() => ({
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    })),
    literal: jest.fn().mockReturnValue('mocked_literal'),
  },
}))

describe('ChatService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createChat', () => {
    it('should create a chat with a user and rescue', async () => {
      const mockChat = {
        chat_id: 'chat_123',
        rescue_id: 'rescue_123',
        application_id: 'app_123',
        status: 'active',
      }

      const mockChatParticipant = {
        chat_id: 'chat_123',
        participant_id: 'user_123',
        role: 'user',
      }

      // Mock the create methods
      ;(Chat.create as jest.Mock).mockResolvedValue(mockChat)
      ;(ChatParticipant.create as jest.Mock).mockResolvedValue(
        mockChatParticipant,
      )

      const result = await chatService.createChat(
        'user_123',
        'rescue_123',
        'app_123',
      )

      expect(Chat.create).toHaveBeenCalledWith(
        {
          rescue_id: 'rescue_123',
          application_id: 'app_123',
          status: 'active',
        },
        { transaction: expect.any(Object) },
      )

      expect(ChatParticipant.create).toHaveBeenCalledWith(
        {
          chat_id: 'chat_123',
          participant_id: 'user_123',
          role: 'user',
        },
        { transaction: expect.any(Object) },
      )

      expect(result).toEqual(mockChat)
    })

    it('should handle errors during chat creation', async () => {
      const error = new Error('Database error')
      ;(Chat.create as jest.Mock).mockRejectedValue(error)

      await expect(
        chatService.createChat('user_123', 'rescue_123'),
      ).rejects.toThrow(/Failed to create chat:/)
    })
  })

  describe('getChatById', () => {
    it('should return a chat with its participants and messages', async () => {
      const mockChat = {
        chat_id: 'chat_123',
        rescue_id: 'rescue_123',
        status: 'active',
        participants: [
          {
            participant_id: 'user_123',
            role: 'user',
            participant: {
              user_id: 'user_123',
              first_name: 'John',
              last_name: 'Doe',
            },
          },
        ],
        Messages: [
          {
            message_id: 'msg_123',
            content: 'Hello',
            User: {
              user_id: 'user_123',
              first_name: 'John',
              last_name: 'Doe',
            },
          },
        ],
      }

      ;(Chat.findByPk as jest.Mock).mockResolvedValue(mockChat)

      const result = await chatService.getChatById('chat_123')

      expect(Chat.findByPk).toHaveBeenCalledWith('chat_123', {
        include: expect.any(Array),
      })
      expect(result).toEqual(mockChat)
    })

    it('should return null for non-existent chat', async () => {
      ;(Chat.findByPk as jest.Mock).mockResolvedValue(null)

      const result = await chatService.getChatById('non_existent')
      expect(result).toBeNull()
    })
  })

  describe('updateChatStatus', () => {
    it('should update chat status', async () => {
      const mockChat = {
        chat_id: 'chat_123',
        rescue_id: 'rescue_123',
        status: 'active',
        update: jest
          .fn()
          .mockImplementation(function (
            this: any,
            { status }: { status: string },
          ) {
            this.status = status
            return this
          }),
      }

      ;(Chat.findByPk as jest.Mock).mockResolvedValue(mockChat)

      const result = await chatService.updateChatStatus(
        'chat_123',
        'locked',
        'user_123',
        { action: 'UPDATE_CHAT_STATUS' },
      )

      expect(mockChat.update).toHaveBeenCalledWith({ status: 'locked' })
      expect(AuditLogger.logAction).toHaveBeenCalled()
      expect(result.status).toBe('locked')
    })

    it('should throw error for non-existent chat', async () => {
      ;(Chat.findByPk as jest.Mock).mockResolvedValue(null)

      await expect(
        chatService.updateChatStatus('non_existent', 'locked', 'user_123', {}),
      ).rejects.toThrow('Chat not found')
    })
  })

  describe('deleteChat', () => {
    it('should delete a chat and its messages', async () => {
      const mockChat = {
        chat_id: 'chat_123',
        destroy: jest.fn().mockResolvedValue(undefined),
      }

      ;(Chat.findByPk as jest.Mock).mockResolvedValue(mockChat)
      ;(Message.destroy as jest.Mock).mockResolvedValue(undefined)

      await chatService.deleteChat('chat_123', 'user_123', {})

      expect(Message.destroy).toHaveBeenCalledWith({
        where: { chat_id: 'chat_123' },
      })
      expect(mockChat.destroy).toHaveBeenCalled()
      expect(AuditLogger.logAction).toHaveBeenCalled()
    })

    it('should throw error for non-existent chat', async () => {
      ;(Chat.findByPk as jest.Mock).mockResolvedValue(null)

      await expect(
        chatService.deleteChat('non_existent', 'user_123', {}),
      ).rejects.toThrow('Chat not found')
    })
  })
})
