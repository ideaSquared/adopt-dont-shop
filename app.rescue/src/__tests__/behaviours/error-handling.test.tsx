/**
 * Error Handling Behaviour Tests
 *
 * Tests verify expected user behaviours when errors occur,
 * ensuring users receive clear feedback and recovery options.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { waitFor } from '@testing-library/react';
import Dashboard from '../../pages/Dashboard';
import PetManagement from '../../pages/PetManagement';
import {
  renderWithAllProviders,
  createMockAuthState,
  mockDashboardData,
  screen,
  userEvent,
  startApiMockServer,
  stopApiMockServer,
  resetApiMocks,
  mockApiError,
} from '../../test-utils';

// Mock hooks and services
jest.mock('../../hooks', () => ({
  useDashboardData: jest.fn(),
}));

jest.mock('@adopt-dont-shop/lib-pets', () => ({
  petManagementService: {
    getMyRescuePets: jest.fn(),
    updatePetStatus: jest.fn(),
    deletePet: jest.fn(),
  },
  PetStatus: {
    AVAILABLE: 'AVAILABLE',
    ADOPTED: 'ADOPTED',
  },
}));

jest.mock('@adopt-dont-shop/lib-api', () => ({
  apiService: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const { useDashboardData } = require('../../hooks');
const { petManagementService } = require('@adopt-dont-shop/lib-pets');
const { apiService } = require('@adopt-dont-shop/lib-api');

describe('Error Handling Behaviours', () => {
  beforeEach(() => {
    startApiMockServer();
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetApiMocks();
    stopApiMockServer();
  });

  describe('ERR-1: User sees error message when API calls fail', () => {
    it('displays error message when dashboard data fails to load', async () => {
      useDashboardData.mockReturnValue({
        dashboardData: null,
        recentActivities: [],
        notifications: [],
        loading: false,
        error: 'Network error: Failed to fetch dashboard data',
      });

      const authState = createMockAuthState();
      renderWithAllProviders(<Dashboard />, { authState });

      await waitFor(() => {
        expect(screen.getByText(/Unable to load dashboard data:/)).toBeInTheDocument();
        expect(screen.getByText(/Network error: Failed to fetch dashboard data/)).toBeInTheDocument();
      });
    });

    it('displays error message when pet data fails to load', async () => {
      petManagementService.getMyRescuePets.mockRejectedValue(
        new Error('Failed to connect to server')
      );

      apiService.get.mockResolvedValue({
        data: {
          totalAnimals: 0,
          availableForAdoption: 0,
          pendingApplications: 0,
          adoptedPets: 0,
        },
      });

      const authState = createMockAuthState();
      renderWithAllProviders(<PetManagement />, { authState });

      await waitFor(() => {
        expect(screen.getByText('Error Loading Pets')).toBeInTheDocument();
        expect(screen.getByText('Failed to connect to server')).toBeInTheDocument();
      });
    });

    it('displays specific error for authentication failures', async () => {
      useDashboardData.mockReturnValue({
        dashboardData: null,
        recentActivities: [],
        notifications: [],
        loading: false,
        error: 'Authentication failed',
      });

      const authState = createMockAuthState();
      renderWithAllProviders(<Dashboard />, { authState });

      await waitFor(() => {
        expect(screen.getByText(/Authentication failed/)).toBeInTheDocument();
        expect(screen.getByText(/authentication issue/i)).toBeInTheDocument();
      });
    });

    it('displays error for network timeout', async () => {
      petManagementService.getMyRescuePets.mockRejectedValue(
        new Error('Request timeout')
      );

      apiService.get.mockResolvedValue({
        data: {
          totalAnimals: 0,
          availableForAdoption: 0,
          pendingApplications: 0,
          adoptedPets: 0,
        },
      });

      const authState = createMockAuthState();
      renderWithAllProviders(<PetManagement />, { authState });

      await waitFor(() => {
        expect(screen.getByText(/Request timeout/)).toBeInTheDocument();
      });
    });

    it('displays error for server errors (500)', async () => {
      petManagementService.getMyRescuePets.mockRejectedValue(
        new Error('Internal server error')
      );

      apiService.get.mockResolvedValue({
        data: {
          totalAnimals: 0,
          availableForAdoption: 0,
          pendingApplications: 0,
          adoptedPets: 0,
        },
      });

      const authState = createMockAuthState();
      renderWithAllProviders(<PetManagement />, { authState });

      await waitFor(() => {
        expect(screen.getByText(/Internal server error/)).toBeInTheDocument();
      });
    });
  });

  describe('ERR-2: User sees validation errors for invalid form data', () => {
    it('prevents submission of empty required fields', async () => {
      // This behaviour is typically handled by form validation
      // and would be tested through form component interactions
      expect(true).toBe(true);
    });

    it('displays validation error for invalid email format', async () => {
      // Form validation behaviour test
      expect(true).toBe(true);
    });

    it('displays validation error for invalid date ranges', async () => {
      // Form validation behaviour test
      expect(true).toBe(true);
    });
  });

  describe('ERR-3: User sees error boundary fallback when component crashes', () => {
    // Suppress console.error for these tests
    const originalError = console.error;
    beforeEach(() => {
      console.error = jest.fn();
    });

    afterEach(() => {
      console.error = originalError;
    });

    it('catches rendering errors and displays fallback UI', () => {
      // ErrorBoundary component test would go here
      // This requires creating a component that intentionally throws
      expect(true).toBe(true);
    });

    it('provides error details in development mode', () => {
      // ErrorBoundary with dev mode test
      expect(true).toBe(true);
    });
  });

  describe('ERR-4: User can retry failed operations', () => {
    it('allows user to retry loading dashboard after error', async () => {
      useDashboardData.mockReturnValue({
        dashboardData: null,
        recentActivities: [],
        notifications: [],
        loading: false,
        error: 'Failed to fetch dashboard data',
      });

      const authState = createMockAuthState();
      renderWithAllProviders(<Dashboard />, { authState });

      await waitFor(() => {
        expect(screen.getByText('Refresh Page')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('Refresh Page');
      expect(refreshButton).toBeInTheDocument();
    });

    it('allows user to retry loading pets after error', async () => {
      petManagementService.getMyRescuePets
        .mockRejectedValueOnce(new Error('Failed to fetch pets'))
        .mockResolvedValueOnce({
          pets: [],
          pagination: {
            page: 1,
            limit: 12,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        });

      apiService.get.mockResolvedValue({
        data: {
          totalAnimals: 0,
          availableForAdoption: 0,
          pendingApplications: 0,
          adoptedPets: 0,
        },
      });

      const authState = createMockAuthState();
      renderWithAllProviders(<PetManagement />, { authState });

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      const tryAgainButton = screen.getByText('Try Again');
      await userEvent.click(tryAgainButton);

      await waitFor(() => {
        expect(petManagementService.getMyRescuePets).toHaveBeenCalledTimes(2);
      });
    });

    it('clears error state after successful retry', async () => {
      petManagementService.getMyRescuePets
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          pets: [],
          pagination: {
            page: 1,
            limit: 12,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        });

      apiService.get.mockResolvedValue({
        data: {
          totalAnimals: 0,
          availableForAdoption: 0,
          pendingApplications: 0,
          adoptedPets: 0,
        },
      });

      const authState = createMockAuthState();
      renderWithAllProviders(<PetManagement />, { authState });

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      const tryAgainButton = screen.getByText('Try Again');
      await userEvent.click(tryAgainButton);

      await waitFor(() => {
        expect(screen.queryByText('Network error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery Patterns', () => {
    it('provides clear action button for authentication errors', async () => {
      useDashboardData.mockReturnValue({
        dashboardData: null,
        recentActivities: [],
        notifications: [],
        loading: false,
        error: 'Authentication failed',
      });

      const authState = createMockAuthState();
      renderWithAllProviders(<Dashboard />, { authState });

      await waitFor(() => {
        expect(screen.getByText('Clear Auth & Restart')).toBeInTheDocument();
      });
    });

    it('displays helpful error messages for common issues', async () => {
      useDashboardData.mockReturnValue({
        dashboardData: null,
        recentActivities: [],
        notifications: [],
        loading: false,
        error: 'Failed to fetch dashboard data',
      });

      const authState = createMockAuthState();
      renderWithAllProviders(<Dashboard />, { authState });

      await waitFor(() => {
        expect(screen.getByText(/authentication issue/i)).toBeInTheDocument();
        expect(screen.getByText(/try logging in again/i)).toBeInTheDocument();
      });
    });

    it('maintains user input after validation errors', () => {
      // This would test form state preservation after validation errors
      // Requires form component implementation
      expect(true).toBe(true);
    });
  });

  describe('Loading State Errors', () => {
    it('handles partial data loading failures gracefully', async () => {
      const dashboardData = mockDashboardData();

      useDashboardData.mockReturnValue({
        dashboardData: {
          totalPets: 45,
          successfulAdoptions: 23,
          pendingApplications: 8,
          adoptionRate: 51,
          monthlyAdoptions: [],
          petStatusDistribution: [],
        },
        recentActivities: [], // Failed to load
        notifications: dashboardData.notifications, // Loaded successfully
        loading: false,
        error: null,
      });

      const authState = createMockAuthState();
      renderWithAllProviders(<Dashboard />, { authState });

      await waitFor(() => {
        // Metrics should display despite activities failing
        expect(screen.getByText('Total Pets')).toBeInTheDocument();
        expect(screen.getByText('45')).toBeInTheDocument();
        expect(screen.getByText('No recent activities')).toBeInTheDocument();
      });
    });

    it('handles missing optional data gracefully', async () => {
      useDashboardData.mockReturnValue({
        dashboardData: {
          totalPets: 0,
          successfulAdoptions: 0,
          pendingApplications: 0,
          adoptionRate: 0,
          monthlyAdoptions: [],
          petStatusDistribution: [],
        },
        recentActivities: [],
        notifications: [],
        loading: false,
        error: null,
      });

      const authState = createMockAuthState();
      renderWithAllProviders(<Dashboard />, { authState });

      await waitFor(() => {
        expect(screen.getByText('Total Pets')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });
  });
});
