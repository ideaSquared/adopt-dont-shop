/**
 * Tests for Admin Rescue Service
 *
 * Following TDD and behavior-driven testing principles:
 * - Test expected business behavior, not implementation details
 * - Tests document what the service should do from user's perspective
 * - Each test verifies a specific use case or requirement
 */

import { rescueService } from '../rescueService';
import type { AdminRescue, RescueVerificationPayload, AdminRescueFilters, StaffMember, StaffInvitation } from '@/types/rescue';

// Mock the API service
jest.mock('../libraryServices', () => ({
  apiService: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import { apiService } from '../libraryServices';

describe('Admin Rescue Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Fetching rescues', () => {
    it('should fetch all rescues with pagination', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            rescueId: '1',
            name: 'Happy Paws Rescue',
            email: 'contact@happypaws.org',
            status: 'verified',
            city: 'London',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1,
        },
      };

      (apiService.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await rescueService.getAll({ page: 1, limit: 20 });

      expect(apiService.get).toHaveBeenCalledWith('/api/v1/rescues', {
        page: '1',
        limit: '20',
      });
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should fetch rescues with search filter', async () => {
      const mockResponse = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      };

      (apiService.get as jest.Mock).mockResolvedValue(mockResponse);

      await rescueService.getAll({ search: 'Happy Paws', page: 1, limit: 20 });

      expect(apiService.get).toHaveBeenCalledWith('/api/v1/rescues', {
        search: 'Happy Paws',
        page: '1',
        limit: '20',
      });
    });

    it('should fetch rescues filtered by verification status', async () => {
      const mockResponse = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      };

      (apiService.get as jest.Mock).mockResolvedValue(mockResponse);

      await rescueService.getAll({ status: 'pending', page: 1, limit: 20 });

      expect(apiService.get).toHaveBeenCalledWith('/api/v1/rescues', {
        status: 'pending',
        page: '1',
        limit: '20',
      });
    });

    it('should fetch a single rescue by ID with statistics', async () => {
      const mockResponse = {
        success: true,
        data: {
          rescueId: '1',
          name: 'Happy Paws Rescue',
          email: 'contact@happypaws.org',
          status: 'verified',
          statistics: {
            totalPets: 50,
            availablePets: 30,
            adoptedPets: 20,
            staffCount: 5,
          },
        },
      };

      (apiService.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await rescueService.getById('1', { includeStats: true });

      expect(apiService.get).toHaveBeenCalledWith('/api/v1/rescues/1', {
        includeStats: 'true',
      });
      expect(result.rescueId).toBe('1');
      expect(result.statistics).toBeDefined();
    });
  });

  describe('Verifying rescues', () => {
    it('should verify a rescue successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Rescue verified successfully',
        data: {
          rescueId: '1',
          status: 'verified',
          verifiedAt: '2024-01-15T00:00:00.000Z',
        },
      };

      (apiService.get as jest.Mock).mockResolvedValue(mockResponse);

      const payload: RescueVerificationPayload = {
        status: 'verified',
        notes: 'All documents checked',
      };

      const result = await rescueService.verify('1', payload);

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/rescues/1/verify', {
        notes: 'All documents checked',
      });
      expect(result.status).toBe('verified');
    });

    it('should reject a rescue with reason', async () => {
      const mockResponse = {
        success: true,
        message: 'Rescue rejected',
        data: {
          rescueId: '1',
          status: 'rejected',
        },
      };

      (apiService.get as jest.Mock).mockResolvedValue(mockResponse);

      const payload: RescueVerificationPayload = {
        status: 'rejected',
        rejectionReason: 'Missing registration documents',
        notes: 'Requested additional documents',
      };

      const result = await rescueService.reject('1', payload);

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/rescues/1/reject', {
        reason: 'Missing registration documents',
        notes: 'Requested additional documents',
      });
      expect(result.status).toBe('rejected');
    });

    it('should handle verification errors gracefully', async () => {
      (apiService.get as jest.Mock).mockRejectedValue(new Error('Rescue not found'));

      await expect(
        rescueService.verify('invalid-id', { status: 'verified' })
      ).rejects.toThrow('Rescue not found');
    });
  });

  describe('Managing staff', () => {
    it('should fetch rescue staff members', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            staffMemberId: '1',
            userId: 'user-1',
            rescueId: 'rescue-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            title: 'Manager',
            addedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1,
        },
      };

      (apiService.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await rescueService.getStaff('rescue-1');

      expect(apiService.get).toHaveBeenCalledWith('/api/v1/rescues/rescue-1/staff', {});
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Manager');
    });

    it('should add a staff member to rescue', async () => {
      const mockResponse = {
        success: true,
        message: 'Staff member added successfully',
        data: {
          staffMemberId: '2',
          userId: 'user-2',
          title: 'Volunteer Coordinator',
        },
      };

      (apiService.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await rescueService.addStaff('rescue-1', {
        userId: 'user-2',
        title: 'Volunteer Coordinator',
      });

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/rescues/rescue-1/staff', {
        userId: 'user-2',
        title: 'Volunteer Coordinator',
      });
      expect(result.title).toBe('Volunteer Coordinator');
    });

    it('should remove a staff member from rescue', async () => {
      const mockResponse = {
        success: true,
        message: 'Staff member removed successfully',
      };

      (apiService.get as jest.Mock).mockResolvedValue(mockResponse);

      await rescueService.removeStaff('rescue-1', 'user-1');

      expect(apiService.delete).toHaveBeenCalledWith('/api/v1/rescues/rescue-1/staff/user-1');
    });
  });

  describe('Managing invitations', () => {
    it('should fetch pending invitations', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            invitationId: 1,
            email: 'newstaff@example.com',
            title: 'Assistant Manager',
            status: 'pending',
            createdAt: '2024-01-10T00:00:00.000Z',
          },
        ],
      };

      (apiService.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await rescueService.getInvitations('rescue-1');

      expect(apiService.get).toHaveBeenCalledWith('/api/v1/rescues/rescue-1/invitations');
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('newstaff@example.com');
    });

    it('should send a staff invitation', async () => {
      const mockResponse = {
        success: true,
        message: 'Invitation sent successfully',
        data: {
          invitationId: 2,
          email: 'newvolunteer@example.com',
        },
      };

      (apiService.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await rescueService.inviteStaff('rescue-1', {
        email: 'newvolunteer@example.com',
        title: 'Volunteer',
      });

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/rescues/rescue-1/invitations', {
        email: 'newvolunteer@example.com',
        title: 'Volunteer',
      });
      expect(result.invitationId).toBe(2);
    });

    it('should cancel a pending invitation', async () => {
      const mockResponse = {
        success: true,
        message: 'Invitation cancelled successfully',
      };

      (apiService.get as jest.Mock).mockResolvedValue(mockResponse);

      await rescueService.cancelInvitation('rescue-1', 5);

      expect(apiService.delete).toHaveBeenCalledWith('/api/v1/rescues/rescue-1/invitations/5');
    });
  });

  describe('Fetching analytics', () => {
    it('should fetch rescue analytics', async () => {
      const mockResponse = {
        success: true,
        data: {
          totalPets: 100,
          availablePets: 60,
          adoptedPets: 40,
          pendingApplications: 15,
          totalApplications: 75,
          staffCount: 8,
          monthlyAdoptions: 5,
          averageTimeToAdoption: 45,
        },
      };

      (apiService.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await rescueService.getAnalytics('rescue-1');

      expect(apiService.get).toHaveBeenCalledWith('/api/v1/rescues/rescue-1/analytics');
      expect(result.totalPets).toBe(100);
      expect(result.monthlyAdoptions).toBe(5);
    });
  });

  describe('Sending emails', () => {
    it('should send an email to a rescue', async () => {
      const mockResponse = {
        success: true,
        message: 'Email sent successfully',
      };

      (apiService.get as jest.Mock).mockResolvedValue(mockResponse);

      await rescueService.sendEmail('rescue-1', {
        subject: 'Welcome to the platform',
        body: 'Thank you for joining us!',
        template: 'welcome',
      });

      expect(apiService.post).toHaveBeenCalledWith('/api/v1/rescues/rescue-1/send-email', {
        subject: 'Welcome to the platform',
        body: 'Thank you for joining us!',
        template: 'welcome',
      });
    });
  });

  describe('Deleting rescues', () => {
    it('should soft delete a rescue', async () => {
      const mockResponse = {
        success: true,
        message: 'Rescue deleted successfully',
      };

      (apiService.get as jest.Mock).mockResolvedValue(mockResponse);

      await rescueService.delete('rescue-1', 'Violation of terms');

      expect(apiService.delete).toHaveBeenCalledWith('/api/v1/rescues/rescue-1', {
        reason: 'Violation of terms',
      });
    });
  });
});
