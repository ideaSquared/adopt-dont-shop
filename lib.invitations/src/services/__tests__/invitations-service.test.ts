import { InvitationsService } from '../invitations-service';
import { ApiService } from '@adopt-dont-shop/lib.api';

// Mock the ApiService
jest.mock('@adopt-dont-shop/lib.api');

describe('InvitationsService', () => {
  let service: InvitationsService;
  let mockApiService: jest.Mocked<ApiService>;

  beforeEach(() => {
    // Create a mock ApiService
    mockApiService = new ApiService() as jest.Mocked<ApiService>;

    service = new InvitationsService(mockApiService, {
      debug: false,
    });
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const config = service.getConfig();
      expect(config).toBeDefined();
      expect(config.debug).toBe(false);
    });

    it('should allow config updates', () => {
      service.updateConfig({ debug: true });
      expect(service.getConfig().debug).toBe(true);
    });
  });

  describe('sendInvitation', () => {
    it('should send invitation successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Invitation sent successfully',
        invitationId: 123,
      };

      mockApiService.post = jest.fn().mockResolvedValue(mockResponse);

      const result = await service.sendInvitation('rescue-1', {
        email: 'test@example.com',
        title: 'Volunteer',
      });

      expect(result).toEqual(mockResponse);
      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/rescues/rescue-1/invitations', {
        email: 'test@example.com',
        title: 'Volunteer',
      });
    });
  });

  describe('getPendingInvitations', () => {
    it('should get pending invitations successfully', async () => {
      const mockInvitations = [
        {
          invitation_id: 1,
          email: 'test@example.com',
          title: 'Volunteer',
          created_at: '2025-01-01',
          expiration: '2025-01-08',
        },
      ];

      mockApiService.get = jest.fn().mockResolvedValue({
        success: true,
        invitations: mockInvitations,
      });

      const result = await service.getPendingInvitations('rescue-1');

      expect(result).toEqual(mockInvitations);
      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/rescues/rescue-1/invitations');
    });

    it('should return empty array on error', async () => {
      mockApiService.get = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await service.getPendingInvitations('rescue-1');

      expect(result).toEqual([]);
    });
  });

  describe('cancelInvitation', () => {
    it('should cancel invitation successfully', async () => {
      mockApiService.delete = jest.fn().mockResolvedValue({ success: true });

      await service.cancelInvitation('rescue-1', 123);

      expect(mockApiService.delete).toHaveBeenCalledWith(
        '/api/v1/rescues/rescue-1/invitations/123'
      );
    });
  });

  describe('getInvitationDetails', () => {
    it('should get invitation details successfully', async () => {
      const mockDetails = {
        email: 'test@example.com',
        expiresAt: '2025-01-08',
      };

      mockApiService.get = jest.fn().mockResolvedValue({
        success: true,
        invitation: mockDetails,
      });

      const result = await service.getInvitationDetails('token123');

      expect(result).toEqual(mockDetails);
      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/invitations/details/token123');
    });

    it('should return null on error', async () => {
      mockApiService.get = jest.fn().mockRejectedValue(new Error('Not found'));

      const result = await service.getInvitationDetails('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Invitation accepted',
        userId: 'user-123',
      };

      mockApiService.post = jest.fn().mockResolvedValue(mockResponse);

      const payload = {
        token: 'token123',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        title: 'Volunteer',
      };

      const result = await service.acceptInvitation(payload);

      expect(result).toEqual(mockResponse);
      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/invitations/accept', payload);
    });
  });

  describe('healthCheck', () => {
    it('should return true by default', async () => {
      const result = await service.healthCheck();
      expect(result).toBe(true);
    });
  });
});
