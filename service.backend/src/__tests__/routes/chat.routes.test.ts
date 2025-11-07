// Mock dependencies BEFORE any imports that use them
jest.mock('../../controllers/chat.controller');
jest.mock('../../middleware/auth');
jest.mock('../../middleware/rbac', () => ({
  requirePermission: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
jest.mock('../../middleware/rate-limiter', () => ({
  authLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  generalLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));
jest.mock('../../services/file-upload.service', () => ({
  chatAttachmentUpload: {
    single: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  },
}));
jest.mock('../../validation/chat.validation', () => ({
  chatValidation: {
    createChat: (_req: unknown, _res: unknown, next: () => void) => next(),
    updateChat: (_req: unknown, _res: unknown, next: () => void) => next(),
    getChatById: (_req: unknown, _res: unknown, next: () => void) => next(),
    searchChats: (_req: unknown, _res: unknown, next: () => void) => next(),
    sendMessage: (_req: unknown, _res: unknown, next: () => void) => next(),
    getMessages: (_req: unknown, _res: unknown, next: () => void) => next(),
    markAsRead: (_req: unknown, _res: unknown, next: () => void) => next(),
    addParticipant: (_req: unknown, _res: unknown, next: () => void) => next(),
    removeParticipant: (_req: unknown, _res: unknown, next: () => void) => next(),
    addReaction: (_req: unknown, _res: unknown, next: () => void) => next(),
    removeReaction: (_req: unknown, _res: unknown, next: () => void) => next(),
  },
}));
jest.mock('../../middleware/validation', () => ({
  handleValidationErrors: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import express from 'express';
import request from 'supertest';
import { authenticateToken } from '../../middleware/auth';
import chatRoutes from '../../routes/chat.routes';
import { ChatController } from '../../controllers/chat.controller';
import { AuthenticatedRequest } from '../../types';

const MockedChatController = ChatController as jest.Mocked<typeof ChatController>;
const MockedAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;

describe('Chat Routes - PATCH /chats/:chatId', () => {
  let app: express.Application;
  const testChatId = 'chat_abc123';
  const testUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());

    // Mock authentication middleware to add user to request
    MockedAuthenticateToken.mockImplementation(async (req: AuthenticatedRequest, _res, next) => {
      req.user = {
        userId: testUserId,
        email: 'test@example.com',
        userType: 'ADOPTER',
        firstName: 'John',
        lastName: 'Doe',
      } as unknown as AuthenticatedRequest['user'];
      next();
    });

    // Mock controller response
    MockedChatController.updateChat = jest.fn().mockImplementation(async (_req, res) => {
      res.status(200).json({
        success: true,
        data: {
          chat_id: testChatId,
          status: 'archived',
          updated_at: new Date().toISOString(),
        },
      });
    });

    app.use('/api/v1/chats', chatRoutes);
  });

  describe('Status updates', () => {
    it('should archive chat successfully using PATCH', async () => {
      const response = await request(app)
        .patch(`/api/v1/chats/${testChatId}`)
        .send({ status: 'archived' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(MockedChatController.updateChat).toHaveBeenCalled();
    });

    it('should update chat to active status', async () => {
      MockedChatController.updateChat = jest.fn().mockImplementation(async (_req, res) => {
        res.status(200).json({
          success: true,
          data: {
            chat_id: testChatId,
            status: 'active',
            updated_at: new Date().toISOString(),
          },
        });
      });

      const response = await request(app)
        .patch(`/api/v1/chats/${testChatId}`)
        .send({ status: 'active' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(MockedChatController.updateChat).toHaveBeenCalled();
    });

    it('should lock chat successfully', async () => {
      MockedChatController.updateChat = jest.fn().mockImplementation(async (_req, res) => {
        res.status(200).json({
          success: true,
          data: {
            chat_id: testChatId,
            status: 'locked',
            updated_at: new Date().toISOString(),
          },
        });
      });

      const response = await request(app)
        .patch(`/api/v1/chats/${testChatId}`)
        .send({ status: 'locked' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(MockedChatController.updateChat).toHaveBeenCalled();
    });
  });

  describe('Field updates', () => {
    it('should update chat title', async () => {
      MockedChatController.updateChat = jest.fn().mockImplementation(async (_req, res) => {
        res.status(200).json({
          success: true,
          data: {
            chat_id: testChatId,
            title: 'New Chat Title',
            updated_at: new Date().toISOString(),
          },
        });
      });

      const response = await request(app)
        .patch(`/api/v1/chats/${testChatId}`)
        .send({ title: 'New Chat Title' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(MockedChatController.updateChat).toHaveBeenCalled();
    });

    it('should update multiple fields at once', async () => {
      MockedChatController.updateChat = jest.fn().mockImplementation(async (_req, res) => {
        res.status(200).json({
          success: true,
          data: {
            chat_id: testChatId,
            title: 'New Title',
            description: 'New Description',
            status: 'archived',
            updated_at: new Date().toISOString(),
          },
        });
      });

      const response = await request(app)
        .patch(`/api/v1/chats/${testChatId}`)
        .send({
          title: 'New Title',
          description: 'New Description',
          status: 'archived',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(MockedChatController.updateChat).toHaveBeenCalled();
    });
  });
});

describe('Chat Routes - PUT vs PATCH compatibility', () => {
  let app: express.Application;
  const testChatId = 'chat_abc123';
  const testUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());

    MockedAuthenticateToken.mockImplementation(async (req: AuthenticatedRequest, _res, next) => {
      req.user = {
        userId: testUserId,
        email: 'test@example.com',
        userType: 'ADOPTER',
        firstName: 'John',
        lastName: 'Doe',
      } as unknown as AuthenticatedRequest['user'];
      next();
    });

    MockedChatController.updateChat = jest.fn().mockImplementation(async (_req, res) => {
      res.status(200).json({
        success: true,
        data: {
          chat_id: testChatId,
          status: 'archived',
          updated_at: new Date().toISOString(),
        },
      });
    });

    app.use('/api/v1/chats', chatRoutes);
  });

  it('should support both PUT and PATCH for updating chat', async () => {
    // Test PUT
    const putResponse = await request(app)
      .put(`/api/v1/chats/${testChatId}`)
      .send({ status: 'archived' })
      .expect(200);

    expect(putResponse.body.success).toBe(true);
    expect(MockedChatController.updateChat).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();

    MockedChatController.updateChat = jest.fn().mockImplementation(async (_req, res) => {
      res.status(200).json({
        success: true,
        data: {
          chat_id: testChatId,
          status: 'archived',
          updated_at: new Date().toISOString(),
        },
      });
    });

    // Test PATCH
    const patchResponse = await request(app)
      .patch(`/api/v1/chats/${testChatId}`)
      .send({ status: 'archived' })
      .expect(200);

    expect(patchResponse.body.success).toBe(true);
    expect(MockedChatController.updateChat).toHaveBeenCalledTimes(1);
  });
});
