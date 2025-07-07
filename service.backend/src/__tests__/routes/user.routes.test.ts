import express from 'express';
import request from 'supertest';
import { authenticateToken } from '../../middleware/auth';
import userRoutes from '../../routes/user.routes';
import UserService from '../../services/user.service';
import { AuthenticatedRequest } from '../../types';

// Mock dependencies
jest.mock('../../services/user.service');
jest.mock('../../middleware/auth');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const MockedUserService = UserService as jest.Mocked<typeof UserService>;
const MockedAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;

describe('User Routes - DELETE /account', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());

    // Mock authentication middleware to add user to request
    MockedAuthenticateToken.mockImplementation(async (req: AuthenticatedRequest, _res, next) => {
      req.user = {
        userId: 'user-123',
        email: 'test@example.com',
        userType: 'ADOPTER',
        firstName: 'John',
        lastName: 'Doe',
      } as unknown as AuthenticatedRequest['user'];
      next();
    });

    app.use('/api/v1/users', userRoutes);
  });

  it('should delete user account successfully', async () => {
    MockedUserService.deleteAccount = jest.fn().mockResolvedValue(undefined);

    const response = await request(app)
      .delete('/api/v1/users/account')
      .send({ reason: 'No longer need the service' })
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      message: 'Account deleted successfully',
    });

    expect(MockedUserService.deleteAccount).toHaveBeenCalledWith(
      'user-123',
      'No longer need the service'
    );
  });

  it('should delete user account without reason', async () => {
    MockedUserService.deleteAccount = jest.fn().mockResolvedValue(undefined);

    const response = await request(app).delete('/api/v1/users/account').send({}).expect(200);

    expect(response.body).toEqual({
      success: true,
      message: 'Account deleted successfully',
    });

    expect(MockedUserService.deleteAccount).toHaveBeenCalledWith('user-123', undefined);
  });

  it('should handle user not found error', async () => {
    MockedUserService.deleteAccount = jest.fn().mockRejectedValue(new Error('User not found'));

    const response = await request(app)
      .delete('/api/v1/users/account')
      .send({ reason: 'Test deletion' })
      .expect(404);

    expect(response.body).toEqual({
      error: 'User not found',
    });
  });

  it('should handle general service errors', async () => {
    MockedUserService.deleteAccount = jest.fn().mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .delete('/api/v1/users/account')
      .send({ reason: 'Test deletion' })
      .expect(500);

    expect(response.body).toEqual({
      error: 'Failed to delete account',
    });
  });

  it('should require authentication', async () => {
    // Override mock to simulate no authentication
    MockedAuthenticateToken.mockImplementation(async (_req, res, _next) => {
      res.status(401).json({ error: 'Unauthorized' });
    });

    await request(app)
      .delete('/api/v1/users/account')
      .send({ reason: 'Test deletion' })
      .expect(401);

    expect(MockedUserService.deleteAccount).not.toHaveBeenCalled();
  });

  it('should set authToken cookie to be cleared', async () => {
    MockedUserService.deleteAccount = jest.fn().mockResolvedValue(undefined);

    const response = await request(app)
      .delete('/api/v1/users/account')
      .send({ reason: 'Test deletion' })
      .expect(200);

    // Check that response includes cookie clearing instruction
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('authToken=')])
    );
  });
});
