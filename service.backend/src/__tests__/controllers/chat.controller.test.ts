import { vi } from 'vitest';
// Mock config first
vi.mock('../../config', () => ({
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
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

// Mock dependencies before imports
vi.mock('../../services/chat.service');
vi.mock('../../services/file-upload.service');
vi.mock('../../models/User');
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  loggerHelpers: {
    logRequest: vi.fn(),
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
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    // Clear all mocks
    vi.clearAllMocks();
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

        (User.findAll as vi.Mock).mockResolvedValue([
          { userId: 'rescue-staff-1' },
        ]);
        (ChatService.createChat as vi.Mock).mockResolvedValue(mockChat);

        await ChatController.createChat(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

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

        (User.findAll as vi.Mock).mockResolvedValue(rescueStaff);
        (ChatService.createChat as vi.Mock).mockResolvedValue(mockChat);

        await ChatController.createChat(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(ChatService.createChat).toHaveBeenCalledWith(
          expect.objectContaining({
            participantIds: expect.arrayContaining(['user-123', 'staff-1', 'staff-2']),
          })
        );
      });

      it('should send initial message if provided', async () => {
        mockRequest.body = {
          rescueId: 'rescue-456',
          initialMessage: 'Hello',
        };

        (User.findAll as vi.Mock).mockResolvedValue([]);
        (ChatService.createChat as vi.Mock).mockResolvedValue({
          chatId: 'chat-001',
        });
        (ChatService.sendMessage as vi.Mock).mockResolvedValue({
          messageId: 'msg-001',
        });

        await ChatController.createChat(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(ChatService.sendMessage).toHaveBeenCalledWith({
          chatId: 'chat-001',
          senderId: 'user-123',
          content: 'Hello',
          type: 'text',
        });
      });
    });

    describe('when rescue ID is invalid', () => {
      it('should handle rescue lookup failure gracefully', async () => {
        mockRequest.body = {
          rescueId: 'invalid-rescue',
        };

        (User.findAll as vi.Mock).mockRejectedValue(new Error('Rescue not found'));
        (ChatService.createChat as vi.Mock).mockResolvedValue({
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

        (User.findAll as vi.Mock).mockResolvedValue([]);
        (ChatService.createChat as vi.Mock).mockRejectedValue(
          new Error('Database error')
        );

        await ChatController.createChat(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.any(String),
          })
        );
      });

      it('should log error with request details', async () => {
        mockRequest.body = { type: 'inquiry' };

        (User.findAll as vi.Mock).mockResolvedValue([]);
        (ChatService.createChat as vi.Mock).mockRejectedValue(
          new Error('Creation failed')
        );

        await ChatController.createChat(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(logger.error).toHaveBeenCalledWith(
          'Failed to create chat',
          expect.objectContaining({
            error: expect.any(Error),
          })
        );
      });
    });
  });

  describe('getChatById - Retrieve specific chat', () => {
    describe('when chat exists and user has access', () => {
      it('should return chat with 200 status', async () => {
        mockRequest.params = { chatId: 'chat-001' };

        const mockChat = {
          chatId: 'chat-001',
          type: 'application',
          participants: [
            { User: { userId: 'user-123', firstName: 'John', lastName: 'Doe' } },
          ],
          messages: [],
        };

        (ChatService.getChatById as vi.Mock).mockResolvedValue(mockChat);

        await ChatController.getChatById(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            chat: expect.objectContaining({
              chatId: 'chat-001',
            }),
          })
        );
      });

      it('should include participant names', async () => {
        mockRequest.params = { chatId: 'chat-001' };

        const mockChat = {
          chatId: 'chat-001',
          participants: [
            {
              User: {
                userId: 'user-1',
                firstName: 'Alice',
                lastName: 'Smith',
                getFullName: () => 'Alice Smith',
              },
            },
          ],
          toJSON: () => ({ chatId: 'chat-001', participants: [] }),
        };

        (ChatService.getChatById as vi.Mock).mockResolvedValue(mockChat);

        await ChatController.getChatById(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        const responseData = (mockResponse.json as vi.Mock).mock.calls[0][0];
        expect(responseData.chat.participants[0].name).toBe('Alice Smith');
      });
    });

    describe('when chat not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { chatId: 'nonexistent' };

        (ChatService.getChatById as vi.Mock).mockResolvedValue(null);

        await ChatController.getChatById(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'Chat not found',
          })
        );
      });
    });

    describe('when user is not a participant', () => {
      it('should return 403 forbidden', async () => {
        mockRequest.params = { chatId: 'chat-001' };

        const mockChat = {
          chatId: 'chat-001',
          participants: [
            { User: { userId: 'other-user' } },
          ],
        };

        (ChatService.getChatById as vi.Mock).mockResolvedValue(mockChat);

        await ChatController.getChatById(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'Access denied',
          })
        );
      });
    });
  });

  describe('sendMessage - Send message in chat', () => {
    describe('when sending valid message', () => {
      it('should send message and return 201 status', async () => {
        mockRequest.params = { chatId: 'chat-001' };
        mockRequest.body = {
          content: 'Hello there!',
          type: 'text',
        };

        const mockMessage = {
          messageId: 'msg-001',
          chatId: 'chat-001',
          senderId: 'user-123',
          content: 'Hello there!',
        };

        (ChatService.sendMessage as vi.Mock).mockResolvedValue(mockMessage);

        await ChatController.sendMessage(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: mockMessage,
          })
        );
      });

      it('should include sender info in request', async () => {
        mockRequest.params = { chatId: 'chat-001' };
        mockRequest.body = { content: 'Test', type: 'text' };

        (ChatService.sendMessage as vi.Mock).mockResolvedValue({});

        await ChatController.sendMessage(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(ChatService.sendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            chatId: 'chat-001',
            senderId: 'user-123',
            content: 'Test',
            type: 'text',
          })
        );
      });
    });

    describe('when message send fails', () => {
      it('should return 500 error', async () => {
        mockRequest.params = { chatId: 'chat-001' };
        mockRequest.body = { content: 'Test' };

        (ChatService.sendMessage as vi.Mock).mockRejectedValue(
          new Error('Rate limit exceeded')
        );

        await ChatController.sendMessage(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.any(String),
          })
        );
      });
    });
  });

  describe('getMessages - Retrieve chat messages', () => {
    describe('when retrieving messages with pagination', () => {
      it('should return messages with 200 status', async () => {
        mockRequest.params = { chatId: 'chat-001' };
        mockRequest.query = { page: '1', limit: '20' };

        const mockMessages = {
          messages: [
            {
              messageId: 'msg-001',
              content: 'Hello',
              Sender: { firstName: 'John', lastName: 'Doe' },
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
          },
        };

        (ChatService.getMessages as vi.Mock).mockResolvedValue(mockMessages);

        await ChatController.getMessages(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            messages: expect.any(Array),
            pagination: expect.any(Object),
          })
        );
      });

      it('should include sender names in messages', async () => {
        mockRequest.params = { chatId: 'chat-001' };

        const mockMessages = {
          messages: [
            {
              messageId: 'msg-001',
              Sender: {
                getFullName: () => 'Jane Smith',
              },
              toJSON: () => ({ messageId: 'msg-001' }),
            },
          ],
          pagination: { page: 1, limit: 20, total: 1 },
        };

        (ChatService.getMessages as vi.Mock).mockResolvedValue(mockMessages);

        await ChatController.getMessages(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        const responseData = (mockResponse.json as vi.Mock).mock.calls[0][0];
        expect(responseData.messages[0].sender_name).toBe('Jane Smith');
      });
    });

    describe('when no messages found', () => {
      it('should return empty array with 200 status', async () => {
        mockRequest.params = { chatId: 'chat-001' };

        (ChatService.getMessages as vi.Mock).mockResolvedValue({
          messages: [],
          pagination: { page: 1, limit: 20, total: 0 },
        });

        await ChatController.getMessages(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            messages: [],
          })
        );
      });
    });
  });

  describe('markAsRead - Mark messages as read', () => {
    describe('when marking messages as read', () => {
      it('should update read status and return 200', async () => {
        mockRequest.params = { chatId: 'chat-001' };

        (ChatService.markMessagesAsRead as vi.Mock).mockResolvedValue(undefined);

        await ChatController.markAsRead(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Messages marked as read',
          })
        );
      });

      it('should call service with correct parameters', async () => {
        mockRequest.params = { chatId: 'chat-001' };

        (ChatService.markMessagesAsRead as vi.Mock).mockResolvedValue(undefined);

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
      it('should return count with 200 status', async () => {
        (ChatService.getUnreadMessageCount as vi.Mock).mockResolvedValue(5);

        await ChatController.getUnreadCount(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            unreadCount: 5,
          })
        );
      });
    });

    describe('when user has no unread messages', () => {
      it('should return zero count', async () => {
        (ChatService.getUnreadMessageCount as vi.Mock).mockResolvedValue(0);

        await ChatController.getUnreadCount(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            unreadCount: 0,
          })
        );
      });
    });
  });

  describe('addParticipant - Add participant to chat', () => {
    describe('when adding valid participant', () => {
      it('should add participant and return 200', async () => {
        mockRequest.params = { chatId: 'chat-001' };
        mockRequest.body = { userId: 'new-user-456' };

        (ChatService.addParticipant as vi.Mock).mockResolvedValue(undefined);

        await ChatController.addParticipant(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Participant added successfully',
          })
        );
      });

      it('should call service with correct parameters', async () => {
        mockRequest.params = { chatId: 'chat-001' };
        mockRequest.body = { userId: 'new-user-456' };

        (ChatService.addParticipant as vi.Mock).mockResolvedValue(undefined);

        await ChatController.addParticipant(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(ChatService.addParticipant).toHaveBeenCalledWith(
          'chat-001',
          'new-user-456',
          'user-123'
        );
      });
    });

    describe('when participant already exists', () => {
      it('should return error', async () => {
        mockRequest.params = { chatId: 'chat-001' };
        mockRequest.body = { userId: 'existing-user' };

        (ChatService.addParticipant as vi.Mock).mockRejectedValue(
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
      it('should remove participant and return 200', async () => {
        mockRequest.params = { chatId: 'chat-001', participantId: 'user-456' };

        (ChatService.removeParticipant as vi.Mock).mockResolvedValue(undefined);

        await ChatController.removeParticipant(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
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
      it('should soft delete and return 200', async () => {
        mockRequest.params = { chatId: 'chat-001' };

        (ChatService.deleteChat as vi.Mock).mockResolvedValue(undefined);

        await ChatController.deleteChat(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Chat deleted successfully',
          })
        );
      });

      it('should call service with correct parameters', async () => {
        mockRequest.params = { chatId: 'chat-001' };

        (ChatService.deleteChat as vi.Mock).mockResolvedValue(undefined);

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
      it('should add reaction and return 201', async () => {
        mockRequest.params = { chatId: 'chat-001', messageId: 'msg-001' };
        mockRequest.body = { reactionType: 'like' };

        const mockReaction = {
          reactionId: 'reaction-001',
          messageId: 'msg-001',
          userId: 'user-123',
          reactionType: 'like',
        };

        (ChatService.addMessageReaction as vi.Mock).mockResolvedValue(mockReaction);

        await ChatController.addReaction(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            reaction: mockReaction,
          })
        );
      });
    });
  });

  describe('removeReaction - Remove reaction from message', () => {
    describe('when removing reaction', () => {
      it('should remove reaction and return 200', async () => {
        mockRequest.params = { chatId: 'chat-001', messageId: 'msg-001' };
        mockRequest.body = { reactionType: 'like' };

        (ChatService.removeMessageReaction as vi.Mock).mockResolvedValue(undefined);

        await ChatController.removeReaction(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Reaction removed successfully',
          })
        );
      });
    });
  });

  describe('uploadAttachment - Upload file attachment', () => {
    describe('when uploading file', () => {
      it('should upload and return file URL', async () => {
        mockRequest.params = { chatId: 'chat-001' };
        mockRequest.body = { file: 'base64-encoded-file' };

        const mockUpload = {
          url: 'https://storage.example.com/file.jpg',
          fileId: 'file-001',
        };

        (FileUploadService.uploadFile as vi.Mock).mockResolvedValue(mockUpload);

        await ChatController.uploadAttachment(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            attachment: mockUpload,
          })
        );
      });
    });

    describe('when file upload fails', () => {
      it('should return 500 error', async () => {
        mockRequest.params = { chatId: 'chat-001' };
        mockRequest.body = { file: 'invalid-data' };

        (FileUploadService.uploadFile as vi.Mock).mockRejectedValue(
          new Error('Upload failed')
        );

        await ChatController.uploadAttachment(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
      });
    });
  });

  describe('Error handling and logging', () => {
    it('should log performance metrics', async () => {
      mockRequest.params = { chatId: 'chat-001' };
      (ChatService.getUnreadMessageCount as vi.Mock).mockResolvedValue(0);

      await ChatController.getUnreadCount(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(loggerHelpers.logRequest).toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      mockRequest.body = { type: 'inquiry' };
      (User.findAll as vi.Mock).mockResolvedValue([]);
      (ChatService.createChat as vi.Mock).mockRejectedValue(
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
