// Mock config first
jest.mock('../../config', () => ({
  config: {
    storage: {
      local: {
        maxFileSize: 10485760, // 10MB
        directory: '/tmp/uploads',
      },
    },
  },
}));

// Mock fs to prevent actual file system operations
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

// Mock dependencies before imports
jest.mock('../../services/chat.service');
jest.mock('../../services/file-upload.service');
jest.mock('../../services/email.service');
jest.mock('../../models/User');
const loggerMock = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  http: jest.fn(),
  end: jest.fn(),
  log: jest.fn(),
};

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: loggerMock,
  logger: loggerMock,
  loggerHelpers: {
    logRequest: jest.fn(),
    logBusiness: jest.fn(),
    logAuth: jest.fn(),
    logSecurity: jest.fn(),
  },
}));

import { Request, Response } from 'express';
import { ChatController } from '../../controllers/chat.controller';
import { ChatService } from '../../services/chat.service';
import { FileUploadService } from '../../services/file-upload.service';
import User, { UserType } from '../../models/User';
import { logger, loggerHelpers } from '../../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: User;
}

describe('ChatController', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockUser: Partial<User>;

  beforeEach(() => {
    mockUser = {
      userId: 'user-123',
      userType: UserType.ADOPTER,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    } as User;

    mockRequest = {
      user: mockUser as User,
      body: {},
      params: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('createChat - Create new chat conversation', () => {
    describe('when creating chat with valid data', () => {
      it('should create chat and return success response', async () => {
        const chatData = {
          rescueId: 'rescue-456',
          petId: 'pet-789',
          type: 'application',
          initialMessage: 'Hello, I am interested in this pet',
        };

        mockRequest.body = chatData;

        const mockChat = {
          chat_id: 'chat-001',
          rescue_id: 'rescue-456',
          pet_id: 'pet-789',
          application_id: null,
          type: 'application',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        (User.findAll as jest.Mock).mockResolvedValue([
          { userId: 'rescue-staff-1' },
        ]);
        (ChatService.createChat as jest.Mock).mockResolvedValue(mockChat);

        await ChatController.createChat(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              id: 'chat-001',
              chat_id: 'chat-001',
            }),
          })
        );
      });

      it('should include rescue staff as participants', async () => {
        mockRequest.body = {
          rescueId: 'rescue-456',
          type: 'inquiry',
        };

        const rescueStaff = [
          { userId: 'staff-1' },
          { userId: 'staff-2' },
        ];

        const mockChat = {
          chat_id: 'chat-001',
          rescue_id: 'rescue-456',
          type: 'inquiry',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        (User.findAll as jest.Mock).mockResolvedValue(rescueStaff);
        (ChatService.createChat as jest.Mock).mockResolvedValue(mockChat);

        await ChatController.createChat(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(ChatService.createChat).toHaveBeenCalledWith(
          expect.objectContaining({
            participantIds: expect.arrayContaining(['user-123', 'staff-1', 'staff-2']),
          }),
          'user-123'
        );
      });
    });

    describe('when rescue ID is invalid', () => {
      it('should handle rescue lookup failure gracefully', async () => {
        mockRequest.body = {
          rescueId: 'invalid-rescue',
        };

        (User.findAll as jest.Mock).mockRejectedValue(new Error('Rescue not found'));
        (ChatService.createChat as jest.Mock).mockResolvedValue({
          chatId: 'chat-001',
        });

        await ChatController.createChat(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        // Should still create chat without rescue participants
        expect(ChatService.createChat).toHaveBeenCalled();
      });
    });

    describe('when chat creation fails', () => {
      it('should return 500 error', async () => {
        mockRequest.body = {
          type: 'inquiry',
        };

        (User.findAll as jest.Mock).mockResolvedValue([]);
        (ChatService.createChat as jest.Mock).mockRejectedValue(
          new Error('Database error')
        );

        await ChatController.createChat(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Failed to create chat',
            message: 'Database error',
          })
        );
      });

      it('should log error with request details', async () => {
        mockRequest.body = { type: 'inquiry' };

        (User.findAll as jest.Mock).mockResolvedValue([]);
        (ChatService.createChat as jest.Mock).mockRejectedValue(
          new Error('Creation failed')
        );

        await ChatController.createChat(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(logger.error).toHaveBeenCalledWith(
          'Error creating chat:',
          expect.objectContaining({
            error: 'Creation failed',
            body: expect.any(Object),
            duration: expect.any(Number),
          })
        );
      });
    });
  });

  describe('getChatById - Retrieve specific chat', () => {
    describe('when chat exists and user has access', () => {
      it('should return chat data', async () => {
        mockRequest.params = { chatId: 'chat-001' };

        const mockChat = {
          chat_id: 'chat-001',
          rescue_id: 'rescue-456',
          pet_id: 'pet-789',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          Participants: [
            {
              participant_id: 'user-123',
              role: 'member',
              User: { userId: 'user-123', firstName: 'John', lastName: 'Doe', getFullName: () => 'John Doe' }
            },
          ],
          toJSON: () => ({
            chat_id: 'chat-001',
            rescue_id: 'rescue-456',
            pet_id: 'pet-789',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            Participants: [
              {
                participant_id: 'user-123',
                role: 'member',
                User: { userId: 'user-123', firstName: 'John', lastName: 'Doe', getFullName: () => 'John Doe' }
              },
            ],
          }),
        };

        (ChatService.getChatById as jest.Mock).mockResolvedValue(mockChat);

        await ChatController.getChatById(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              id: 'chat-001',
              chat_id: 'chat-001',
            }),
          })
        );
      });

      it('should include participant names', async () => {
        mockRequest.params = { chatId: 'chat-001' };

        const mockChat = {
          chat_id: 'chat-001',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          toJSON: () => ({
            chat_id: 'chat-001',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            Participants: [
              {
                participant_id: 'user-1',
                role: 'member',
                User: {
                  userId: 'user-1',
                  firstName: 'Alice',
                  lastName: 'Smith',
                  getFullName: () => 'Alice Smith',
                },
              },
            ],
          }),
        };

        (ChatService.getChatById as jest.Mock).mockResolvedValue(mockChat);

        await ChatController.getChatById(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(responseData.data.participants[0].name).toBe('Alice Smith');
      });
    });

    describe('when chat not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { chatId: 'nonexistent' };

        (ChatService.getChatById as jest.Mock).mockResolvedValue(null);

        await ChatController.getChatById(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Chat not found',
        });
      });
    });
  });

  describe('sendMessage - Send message in chat', () => {
    describe('when sending valid message', () => {
      it('should send message and return 201 status', async () => {
        mockRequest.params = { chatId: 'chat-001' };
        mockRequest.body = {
          content: 'Hello there!',
          messageType: 'text',
        };

        const mockMessage = {
          message_id: 'msg-001',
          chat_id: 'chat-001',
          sender_id: 'user-123',
          content: 'Hello there!',
          Sender: {
            userId: 'user-123',
            firstName: 'John',
            lastName: 'Doe',
            getFullName: () => 'John Doe',
          },
          toJSON: () => ({
            message_id: 'msg-001',
            chat_id: 'chat-001',
            sender_id: 'user-123',
            content: 'Hello there!',
          }),
        };

        (ChatService.sendMessage as jest.Mock).mockResolvedValue(mockMessage);

        await ChatController.sendMessage(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              message_id: 'msg-001',
              sender_name: 'John Doe',
            }),
            message: 'Message sent successfully',
          })
        );
      });

      it('should include sender info in request', async () => {
        mockRequest.params = { chatId: 'chat-001' };
        mockRequest.body = { content: 'Test', messageType: 'text' };

        const mockMessage = {
          toJSON: () => ({ message_id: 'msg-001' }),
          Sender: null,
        };

        (ChatService.sendMessage as jest.Mock).mockResolvedValue(mockMessage);

        await ChatController.sendMessage(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(ChatService.sendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            chatId: 'chat-001',
            senderId: 'user-123',
            content: 'Test',
            messageType: 'text',
          })
        );
      });
    });

    describe('when message send fails', () => {
      it('should return 500 error', async () => {
        mockRequest.params = { chatId: 'chat-001' };
        mockRequest.body = { content: 'Test' };

        (ChatService.sendMessage as jest.Mock).mockRejectedValue(
          new Error('Rate limit exceeded')
        );

        await ChatController.sendMessage(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Failed to send message',
            message: 'Rate limit exceeded',
          })
        );
      });
    });
  });

  describe('getMessages - Retrieve chat messages', () => {
    describe('when retrieving messages with pagination', () => {
      it('should return messages', async () => {
        mockRequest.params = { chatId: 'chat-001' };
        mockRequest.query = { page: '1', limit: '20' };

        const mockMessages = {
          messages: [
            {
              message_id: 'msg-001',
              chat_id: 'chat-001',
              sender_id: 'user-123',
              content: 'Hello',
              created_at: new Date().toISOString(),
              Sender: { firstName: 'John', lastName: 'Doe', getFullName: () => 'John Doe' },
              toJSON: () => ({
                message_id: 'msg-001',
                chat_id: 'chat-001',
                sender_id: 'user-123',
                content: 'Hello',
                created_at: new Date().toISOString(),
                Sender: { firstName: 'John', lastName: 'Doe' },
              }),
            },
          ],
          page: 1,
          total: 1,
          totalPages: 1,
        };

        (ChatService.getMessages as jest.Mock).mockResolvedValue(mockMessages);

        await ChatController.getMessages(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              messages: expect.any(Array),
              pagination: expect.any(Object),
            }),
          })
        );
      });

      it('should include sender names in messages', async () => {
        mockRequest.params = { chatId: 'chat-001' };

        const mockMessages = {
          messages: [
            {
              message_id: 'msg-001',
              chat_id: 'chat-001',
              sender_id: 'user-123',
              content: 'Hello',
              created_at: new Date().toISOString(),
              toJSON: () => ({
                message_id: 'msg-001',
                chat_id: 'chat-001',
                sender_id: 'user-123',
                content: 'Hello',
                created_at: new Date().toISOString(),
                Sender: {
                  getFullName: () => 'Jane Smith',
                },
              }),
            },
          ],
          page: 1,
          total: 1,
          totalPages: 1,
        };

        (ChatService.getMessages as jest.Mock).mockResolvedValue(mockMessages);

        await ChatController.getMessages(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(responseData.data.messages[0].senderName).toBe('Jane Smith');
      });
    });

    describe('when no messages found', () => {
      it('should return empty array', async () => {
        mockRequest.params = { chatId: 'chat-001' };

        (ChatService.getMessages as jest.Mock).mockResolvedValue({
          messages: [],
          page: 1,
          total: 0,
          totalPages: 0,
        });

        await ChatController.getMessages(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              messages: [],
            }),
          })
        );
      });
    });
  });

  describe('markAsRead - Mark messages as read', () => {
    describe('when marking messages as read', () => {
      it('should update read status', async () => {
        mockRequest.params = { chatId: 'chat-001' };

        (ChatService.markMessagesAsRead as jest.Mock).mockResolvedValue(undefined);

        await ChatController.markAsRead(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Messages marked as read',
          })
        );
      });

      it('should call service with correct parameters', async () => {
        mockRequest.params = { chatId: 'chat-001' };

        (ChatService.markMessagesAsRead as jest.Mock).mockResolvedValue(undefined);

        await ChatController.markAsRead(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(ChatService.markMessagesAsRead).toHaveBeenCalledWith(
          'chat-001',
          'user-123'
        );
      });
    });
  });

  describe('getUnreadCount - Get unread message count', () => {
    describe('when user has unread messages', () => {
      it('should return count', async () => {
        mockRequest.params = { chatId: 'chat-001' };
        (ChatService.getUnreadMessageCount as jest.Mock).mockResolvedValue(5);

        await ChatController.getUnreadCount(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: { unreadCount: 5 },
          })
        );
      });
    });

    describe('when user has no unread messages', () => {
      it('should return zero count', async () => {
        mockRequest.params = { chatId: 'chat-001' };
        (ChatService.getUnreadMessageCount as jest.Mock).mockResolvedValue(0);

        await ChatController.getUnreadCount(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: { unreadCount: 0 },
          })
        );
      });
    });
  });

  describe('addParticipant - Add participant to chat', () => {
    describe('when adding valid participant', () => {
      it('should add participant', async () => {
        mockRequest.params = { chatId: 'chat-001' };
        mockRequest.body = { userId: 'new-user-456', role: 'member' };

        (ChatService.addParticipant as jest.Mock).mockResolvedValue(undefined);

        await ChatController.addParticipant(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Participant added successfully',
          })
        );
      });

      it('should call service with correct parameters', async () => {
        mockRequest.params = { chatId: 'chat-001' };
        mockRequest.body = { userId: 'new-user-456', role: 'admin' };

        (ChatService.addParticipant as jest.Mock).mockResolvedValue(undefined);

        await ChatController.addParticipant(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(ChatService.addParticipant).toHaveBeenCalledWith(
          'chat-001',
          'new-user-456',
          'user-123',
          'admin'
        );
      });
    });

    describe('when participant already exists', () => {
      it('should return error', async () => {
        mockRequest.params = { chatId: 'chat-001' };
        mockRequest.body = { userId: 'existing-user' };

        (ChatService.addParticipant as jest.Mock).mockRejectedValue(
          new Error('User is already a participant')
        );

        await ChatController.addParticipant(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
      });
    });
  });

  describe('removeParticipant - Remove participant from chat', () => {
    describe('when removing participant', () => {
      it('should remove participant', async () => {
        mockRequest.params = { chatId: 'chat-001', userId: 'user-456' };

        (ChatService.removeParticipant as jest.Mock).mockResolvedValue(undefined);

        await ChatController.removeParticipant(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Participant removed successfully',
          })
        );
      });
    });
  });

  describe('deleteChat - Soft delete chat', () => {
    describe('when deleting chat', () => {
      it('should soft delete chat', async () => {
        mockRequest.params = { chatId: 'chat-001' };

        (ChatService.deleteChat as jest.Mock).mockResolvedValue(undefined);

        await ChatController.deleteChat(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Chat deleted successfully',
          })
        );
      });

      it('should call service with correct parameters', async () => {
        mockRequest.params = { chatId: 'chat-001' };

        (ChatService.deleteChat as jest.Mock).mockResolvedValue(undefined);

        await ChatController.deleteChat(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(ChatService.deleteChat).toHaveBeenCalledWith('chat-001', 'user-123');
      });
    });
  });

  describe('addReaction - Add reaction to message', () => {
    describe('when adding reaction', () => {
      it('should add reaction', async () => {
        mockRequest.params = { messageId: 'msg-001' };
        mockRequest.body = { emoji: '👍' };

        const mockMessage = {
          message_id: 'msg-001',
          content: 'Hello',
          reactions: [{ emoji: '👍', userId: 'user-123' }],
        };

        (ChatService.addMessageReaction as jest.Mock).mockResolvedValue(mockMessage);

        await ChatController.addReaction(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockMessage,
            message: 'Reaction added successfully',
          })
        );
      });
    });
  });

  describe('removeReaction - Remove reaction from message', () => {
    describe('when removing reaction', () => {
      it('should remove reaction', async () => {
        mockRequest.params = { messageId: 'msg-001' };
        mockRequest.body = { emoji: '👍' };

        const mockMessage = {
          message_id: 'msg-001',
          content: 'Hello',
          reactions: [],
        };

        (ChatService.removeMessageReaction as jest.Mock).mockResolvedValue(mockMessage);

        await ChatController.removeReaction(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockMessage,
            message: 'Reaction removed successfully',
          })
        );
      });
    });
  });

  describe('uploadAttachment - Upload file attachment', () => {
    describe('when uploading file', () => {
      it('should upload and return file URL', async () => {
        mockRequest.params = { conversationId: 'chat-001' };
        mockRequest.file = {
          fieldname: 'file',
          originalname: 'test.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('test'),
          size: 1024,
        } as Express.Multer.File;

        const mockChat = {
          chat_id: 'chat-001',
          Participants: [
            { participant_id: 'user-123' },
          ],
        };

        const mockUploadResult = {
          success: true,
          upload: {
            upload_id: 'file-001',
            original_filename: 'test.jpg',
            url: 'https://storage.example.com/file.jpg',
            mime_type: 'image/jpeg',
            file_size: 1024,
          },
        };

        (ChatService.getChatById as jest.Mock).mockResolvedValue(mockChat);
        (FileUploadService.uploadFile as jest.Mock).mockResolvedValue(mockUploadResult);

        await ChatController.uploadAttachment(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              id: 'file-001',
              filename: 'test.jpg',
              url: 'https://storage.example.com/file.jpg',
              mimeType: 'image/jpeg',
              size: 1024,
            }),
          })
        );
      });
    });

    describe('when file upload fails', () => {
      it('should return 500 error', async () => {
        mockRequest.params = { conversationId: 'chat-001' };
        mockRequest.file = {
          fieldname: 'file',
          originalname: 'test.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('test'),
          size: 1024,
        } as Express.Multer.File;

        const mockChat = {
          chat_id: 'chat-001',
          Participants: [
            { participant_id: 'user-123' },
          ],
        };

        (ChatService.getChatById as jest.Mock).mockResolvedValue(mockChat);
        (FileUploadService.uploadFile as jest.Mock).mockRejectedValue(
          new Error('Upload failed')
        );

        await ChatController.uploadAttachment(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Failed to upload attachment',
            message: 'Upload failed',
          })
        );
      });
    });
  });

  describe('Error handling and logging', () => {
    it('should log performance metrics for createChat', async () => {
      mockRequest.body = { type: 'inquiry' };

      const mockChat = {
        chat_id: 'chat-001',
        rescue_id: null,
        pet_id: null,
        application_id: null,
        type: 'inquiry',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (User.findAll as jest.Mock).mockResolvedValue([]);
      (ChatService.createChat as jest.Mock).mockResolvedValue(mockChat);

      await ChatController.createChat(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(loggerHelpers.logRequest).toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      mockRequest.body = { type: 'inquiry' };
      (User.findAll as jest.Mock).mockResolvedValue([]);
      (ChatService.createChat as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      await ChatController.createChat(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
