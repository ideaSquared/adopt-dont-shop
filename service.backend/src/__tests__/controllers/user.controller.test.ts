import { Response } from 'express';
import { UserController } from '../../controllers/user.controller';
import { UserType } from '../../models/User';
import UserService from '../../services/user.service';
import { AuthenticatedRequest } from '../../types';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../services/user.service');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const MockedUserService = UserService as jest.Mocked<typeof UserService>;

describe('UserController', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;
  let controller: UserController;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: {
        userId: 'user-123',
        email: 'test@example.com',
        userType: UserType.ADOPTER,
        firstName: 'John',
        lastName: 'Doe',
      } as AuthenticatedRequest['user'],
      body: {},
      params: {},
    };

    res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };

    controller = new UserController();
  });

  describe('deleteAccount', () => {
    it('should delete user account successfully', async () => {
      const reason = 'No longer need the service';
      req.body = { reason };

      MockedUserService.deleteAccount = jest.fn().mockResolvedValue(undefined);

      await controller.deleteAccount(req as AuthenticatedRequest, res as Response);

      expect(MockedUserService.deleteAccount).toHaveBeenCalledWith('user-123', reason);
      expect(res.clearCookie).toHaveBeenCalledWith('authToken');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Account deleted successfully',
      });
    });

    it('should delete user account without reason', async () => {
      req.body = {};

      MockedUserService.deleteAccount = jest.fn().mockResolvedValue(undefined);

      await controller.deleteAccount(req as AuthenticatedRequest, res as Response);

      expect(MockedUserService.deleteAccount).toHaveBeenCalledWith('user-123', undefined);
      expect(res.clearCookie).toHaveBeenCalledWith('authToken');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Account deleted successfully',
      });
    });

    it('should handle user not found error', async () => {
      req.body = { reason: 'Test' };

      MockedUserService.deleteAccount = jest.fn().mockRejectedValue(new Error('User not found'));

      await controller.deleteAccount(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'User not found',
      });
    });

    it('should handle general deletion errors', async () => {
      req.body = { reason: 'Test' };

      MockedUserService.deleteAccount = jest.fn().mockRejectedValue(new Error('Database error'));

      await controller.deleteAccount(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to delete account',
      });
    });

    it('should handle missing user in request', async () => {
      req.user = undefined;
      req.body = { reason: 'Test' };

      // This would cause the service to be called with undefined, leading to an error
      MockedUserService.deleteAccount = jest.fn().mockRejectedValue(new Error('Invalid user'));

      await controller.deleteAccount(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to delete account',
      });
    });

    it('should log successful deletion', async () => {
      req.body = { reason: 'Test' };

      MockedUserService.deleteAccount = jest.fn().mockResolvedValue(undefined);

      await controller.deleteAccount(req as AuthenticatedRequest, res as Response);

      expect(logger.info).toHaveBeenCalledWith(
        'User account deleted',
        expect.objectContaining({
          userId: 'user-123',
          duration: expect.any(Number),
        })
      );
    });

    it('should log deletion errors', async () => {
      req.body = { reason: 'Test' };

      const error = new Error('Service error');
      MockedUserService.deleteAccount = jest.fn().mockRejectedValue(error);

      await controller.deleteAccount(req as AuthenticatedRequest, res as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Error deleting account:',
        expect.objectContaining({
          error: 'Service error',
          userId: 'user-123',
          duration: expect.any(Number),
        })
      );
    });
  });
});
