import { InvitationsService } from '../invitations-service';
import { ApiService } from '@adopt-dont-shop/lib.api';

// Mock the ApiService
vi.mock('@adopt-dont-shop/lib.api');

describe('InvitationsService', () => {
  let service: InvitationsService;
  let mockApiService: vi.Mocked<ApiService>;

  beforeEach(() => {
    // Create a mock ApiService
    mockApiService = new ApiService() as vi.Mocked<ApiService>;

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

    it('should construct its own ApiService when none is provided', () => {
      const standalone = new InvitationsService();
      expect(standalone.getConfig().debug).toBe(false);
    });

    it('should allow config updates', () => {
      service.updateConfig({ debug: true });
      expect(service.getConfig().debug).toBe(true);
    });

    it('should propagate an apiUrl change to the underlying ApiService', () => {
      mockApiService.updateConfig = vi.fn();

      service.updateConfig({ apiUrl: 'https://api.example.com' });

      expect(mockApiService.updateConfig).toHaveBeenCalledWith({
        apiUrl: 'https://api.example.com',
      });
      expect(service.getConfig().apiUrl).toBe('https://api.example.com');
    });

    it('should not touch the ApiService when no apiUrl is given', () => {
      mockApiService.updateConfig = vi.fn();

      service.updateConfig({ debug: true });

      expect(mockApiService.updateConfig).not.toHaveBeenCalled();
    });

    it('should return a config copy that cannot mutate internal state', () => {
      const config = service.getConfig();
      config.debug = true;

      expect(service.getConfig().debug).toBe(false);
    });
  });

  describe('sendInvitation', () => {
    it('should send invitation successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Invitation sent successfully',
        invitationId: 123,
      };

      mockApiService.post = vi.fn().mockResolvedValue(mockResponse);

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

    it('should re-throw when the API call fails', async () => {
      mockApiService.post = vi.fn().mockRejectedValue(new Error('Send failed'));

      await expect(
        service.sendInvitation('rescue-1', { email: 'test@example.com' })
      ).rejects.toThrow('Send failed');
    });

    it('should log the error in debug mode before re-throwing', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      service.updateConfig({ debug: true });
      mockApiService.post = vi.fn().mockRejectedValue(new Error('Send failed'));

      await expect(
        service.sendInvitation('rescue-1', { email: 'test@example.com' })
      ).rejects.toThrow('Send failed');
      expect(errorSpy).toHaveBeenCalledWith('Failed to send invitation:', expect.any(Error));

      errorSpy.mockRestore();
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

      mockApiService.get = vi.fn().mockResolvedValue({
        success: true,
        invitations: mockInvitations,
      });

      const result = await service.getPendingInvitations('rescue-1');

      expect(result).toEqual(mockInvitations);
      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/rescues/rescue-1/invitations');
    });

    it('should fall back to a bare array response shape', async () => {
      const mockInvitations = [
        {
          invitation_id: 2,
          email: 'bare@example.com',
          title: 'Helper',
          created_at: '2025-02-01',
          expiration: '2025-02-08',
        },
      ];

      mockApiService.get = vi.fn().mockResolvedValue(mockInvitations);

      const result = await service.getPendingInvitations('rescue-1');

      expect(result).toEqual(mockInvitations);
    });

    it('should return an empty array when the response is unrecognised', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({ success: false });

      const result = await service.getPendingInvitations('rescue-1');

      expect(result).toEqual([]);
    });

    it('should return an empty array when success is true but invitations is not an array', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({ success: true, invitations: null });

      const result = await service.getPendingInvitations('rescue-1');

      expect(result).toEqual([]);
    });

    it('should return empty array for a 404 (no invitations yet)', async () => {
      const notFoundError = Object.assign(new Error('Not found'), { status: 404 });
      mockApiService.get = vi.fn().mockRejectedValue(notFoundError);

      const result = await service.getPendingInvitations('rescue-1');

      expect(result).toEqual([]);
    });

    it('should re-throw on a 401 auth error', async () => {
      const authError = Object.assign(new Error('Unauthorized'), { status: 401 });
      mockApiService.get = vi.fn().mockRejectedValue(authError);

      await expect(service.getPendingInvitations('rescue-1')).rejects.toThrow('Unauthorized');
    });

    it('should re-throw on a 403 forbidden error', async () => {
      const forbiddenError = Object.assign(new Error('Forbidden'), { status: 403 });
      mockApiService.get = vi.fn().mockRejectedValue(forbiddenError);

      await expect(service.getPendingInvitations('rescue-1')).rejects.toThrow('Forbidden');
    });

    it('should re-throw on a 500 server error', async () => {
      const serverError = Object.assign(new Error('Internal Server Error'), { status: 500 });
      mockApiService.get = vi.fn().mockRejectedValue(serverError);

      await expect(service.getPendingInvitations('rescue-1')).rejects.toThrow(
        'Internal Server Error'
      );
    });

    it('should re-throw on a network error (no status)', async () => {
      mockApiService.get = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(service.getPendingInvitations('rescue-1')).rejects.toThrow('Network error');
    });

    it('should re-throw when status comes from a nested response object', async () => {
      const serverError = { response: { status: 503 } };
      mockApiService.get = vi.fn().mockRejectedValue(serverError);

      await expect(service.getPendingInvitations('rescue-1')).rejects.toEqual(serverError);
    });

    it('should swallow a non-Error rejection without a status and log in debug mode', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      service.updateConfig({ debug: true });
      // A plain object without `status` and not an Error instance: not auth,
      // not >=500, and not a network Error — so it is treated as empty.
      mockApiService.get = vi.fn().mockRejectedValue({ message: 'odd' });

      const result = await service.getPendingInvitations('rescue-1');

      expect(result).toEqual([]);
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to get pending invitations:',
        expect.anything()
      );

      errorSpy.mockRestore();
    });
  });

  describe('cancelInvitation', () => {
    it('should cancel invitation successfully', async () => {
      mockApiService.delete = vi.fn().mockResolvedValue({ success: true });

      await service.cancelInvitation('rescue-1', 123);

      expect(mockApiService.delete).toHaveBeenCalledWith(
        '/api/v1/rescues/rescue-1/invitations/123'
      );
    });

    it('should re-throw when cancellation fails', async () => {
      mockApiService.delete = vi.fn().mockRejectedValue(new Error('Cancel failed'));

      await expect(service.cancelInvitation('rescue-1', 123)).rejects.toThrow('Cancel failed');
    });

    it('should log the error in debug mode before re-throwing', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      service.updateConfig({ debug: true });
      mockApiService.delete = vi.fn().mockRejectedValue(new Error('Cancel failed'));

      await expect(service.cancelInvitation('rescue-1', 123)).rejects.toThrow('Cancel failed');
      expect(errorSpy).toHaveBeenCalledWith('Failed to cancel invitation:', expect.any(Error));

      errorSpy.mockRestore();
    });
  });

  describe('getInvitationDetails', () => {
    it('should get invitation details successfully', async () => {
      const mockDetails = {
        email: 'test@example.com',
        expiresAt: '2025-01-08',
      };

      mockApiService.get = vi.fn().mockResolvedValue({
        success: true,
        invitation: mockDetails,
      });

      const result = await service.getInvitationDetails('token123');

      expect(result).toEqual(mockDetails);
      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/invitations/details/token123');
    });

    it('should return null when the response has no invitation', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({ success: true, invitation: null });

      const result = await service.getInvitationDetails('token123');

      expect(result).toBeNull();
    });

    it('should return null when the response is not successful', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({ success: false });

      const result = await service.getInvitationDetails('token123');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockApiService.get = vi.fn().mockRejectedValue(new Error('Not found'));

      const result = await service.getInvitationDetails('invalid-token');

      expect(result).toBeNull();
    });

    it('should log the error in debug mode before returning null', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      service.updateConfig({ debug: true });
      mockApiService.get = vi.fn().mockRejectedValue(new Error('Not found'));

      const result = await service.getInvitationDetails('invalid-token');

      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalledWith('Failed to get invitation details:', expect.any(Error));

      errorSpy.mockRestore();
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Invitation accepted',
        userId: 'user-123',
      };

      mockApiService.post = vi.fn().mockResolvedValue(mockResponse);

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

    it('should re-throw when acceptance fails', async () => {
      mockApiService.post = vi.fn().mockRejectedValue(new Error('Accept failed'));

      const payload = {
        token: 'token123',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
      };

      await expect(service.acceptInvitation(payload)).rejects.toThrow('Accept failed');
    });

    it('should log the error in debug mode before re-throwing', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      service.updateConfig({ debug: true });
      mockApiService.post = vi.fn().mockRejectedValue(new Error('Accept failed'));

      const payload = {
        token: 'token123',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
      };

      await expect(service.acceptInvitation(payload)).rejects.toThrow('Accept failed');
      expect(errorSpy).toHaveBeenCalledWith('Failed to accept invitation:', expect.any(Error));

      errorSpy.mockRestore();
    });
  });

  describe('healthCheck', () => {
    it('should return true by default', async () => {
      const result = await service.healthCheck();
      expect(result).toBe(true);
    });
  });
});
