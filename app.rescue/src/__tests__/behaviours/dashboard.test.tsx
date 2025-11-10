/**
 * Dashboard Behaviour Tests
 *
 * Tests verify expected user behaviours when interacting with the Dashboard,
 * not implementation details. All external dependencies are mocked.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import Dashboard from '../../pages/Dashboard';
import {
  renderWithAllProviders,
  createMockAuthState,
  mockDashboardData,
  screen,
  waitFor,
  startApiMockServer,
  stopApiMockServer,
  resetApiMocks,
  mockDashboardApi,
  mockApiError,
} from '../../test-utils';

// Mock the useDashboardData hook
jest.mock('../../hooks', () => ({
  useDashboardData: jest.fn(),
}));

const { useDashboardData } = require('../../hooks');

describe('Dashboard Behaviours', () => {
  beforeEach(() => {
    startApiMockServer();
  });

  afterEach(() => {
    resetApiMocks();
    stopApiMockServer();
    jest.clearAllMocks();
  });

  describe('DB-1: User sees key metrics when viewing dashboard', () => {
    it('displays total pets metric with correct value', async () => {
      const dashboardData = mockDashboardData({
        metrics: {
          totalPets: 45,
          adoptions: 23,
          pendingApplications: 8,
          adoptionRate: 51,
        },
      });

      useDashboardData.mockReturnValue({
        dashboardData: {
          totalPets: dashboardData.metrics.totalPets,
          successfulAdoptions: dashboardData.metrics.adoptions,
          pendingApplications: dashboardData.metrics.pendingApplications,
          adoptionRate: dashboardData.metrics.adoptionRate,
          monthlyAdoptions: dashboardData.monthlyAdoptions,
          petStatusDistribution: dashboardData.petStatusDistribution,
        },
        recentActivities: dashboardData.recentActivities,
        notifications: dashboardData.notifications,
        loading: false,
        error: null,
      });

      const authState = createMockAuthState();
      renderWithAllProviders(<Dashboard />, { authState });

      await waitFor(() => {
        expect(screen.getByText('Total Pets')).toBeInTheDocument();
        expect(screen.getByText('45')).toBeInTheDocument();
      });
    });

    it('displays successful adoptions metric with correct value', async () => {
      const dashboardData = mockDashboardData({
        metrics: {
          totalPets: 45,
          adoptions: 23,
          pendingApplications: 8,
          adoptionRate: 51,
        },
      });

      useDashboardData.mockReturnValue({
        dashboardData: {
          totalPets: dashboardData.metrics.totalPets,
          successfulAdoptions: dashboardData.metrics.adoptions,
          pendingApplications: dashboardData.metrics.pendingApplications,
          adoptionRate: dashboardData.metrics.adoptionRate,
          monthlyAdoptions: dashboardData.monthlyAdoptions,
          petStatusDistribution: dashboardData.petStatusDistribution,
        },
        recentActivities: dashboardData.recentActivities,
        notifications: dashboardData.notifications,
        loading: false,
        error: null,
      });

      const authState = createMockAuthState();
      renderWithAllProviders(<Dashboard />, { authState });

      await waitFor(() => {
        expect(screen.getByText('Successful Adoptions')).toBeInTheDocument();
        expect(screen.getByText('23')).toBeInTheDocument();
      });
    });

    it('displays pending applications metric with correct value', async () => {
      const dashboardData = mockDashboardData({
        metrics: {
          totalPets: 45,
          adoptions: 23,
          pendingApplications: 8,
          adoptionRate: 51,
        },
      });

      useDashboardData.mockReturnValue({
        dashboardData: {
          totalPets: dashboardData.metrics.totalPets,
          successfulAdoptions: dashboardData.metrics.adoptions,
          pendingApplications: dashboardData.metrics.pendingApplications,
          adoptionRate: dashboardData.metrics.adoptionRate,
          monthlyAdoptions: dashboardData.monthlyAdoptions,
          petStatusDistribution: dashboardData.petStatusDistribution,
        },
        recentActivities: dashboardData.recentActivities,
        notifications: dashboardData.notifications,
        loading: false,
        error: null,
      });

      const authState = createMockAuthState();
      renderWithAllProviders(<Dashboard />, { authState });

      await waitFor(() => {
        expect(screen.getByText('Pending Applications')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument();
      });
    });

    it('displays adoption rate metric with correct value', async () => {
      const dashboardData = mockDashboardData({
        metrics: {
          totalPets: 45,
          adoptions: 23,
          pendingApplications: 8,
          adoptionRate: 51,
        },
      });

      useDashboardData.mockReturnValue({
        dashboardData: {
          totalPets: dashboardData.metrics.totalPets,
          successfulAdoptions: dashboardData.metrics.adoptions,
          pendingApplications: dashboardData.metrics.pendingApplications,
          adoptionRate: dashboardData.metrics.adoptionRate,
          monthlyAdoptions: dashboardData.monthlyAdoptions,
          petStatusDistribution: dashboardData.petStatusDistribution,
        },
        recentActivities: dashboardData.recentActivities,
        notifications: dashboardData.notifications,
        loading: false,
        error: null,
      });

      const authState = createMockAuthState();
      renderWithAllProviders(<Dashboard />, { authState });

      await waitFor(() => {
        expect(screen.getByText('Adoption Rate')).toBeInTheDocument();
        expect(screen.getByText('51%')).toBeInTheDocument();
      });
    });
  });

  describe('DB-2: User sees monthly adoptions chart showing adoption trends', () => {
    it('displays monthly adoption chart with correct months and values', async () => {
      const dashboardData = mockDashboardData({
        monthlyAdoptions: [
          { month: 'Jan', count: 5 },
          { month: 'Feb', count: 7 },
          { month: 'Mar', count: 6 },
          { month: 'Apr', count: 5 },
        ],
      });

      useDashboardData.mockReturnValue({
        dashboardData: {
          totalPets: 45,
          successfulAdoptions: 23,
          pendingApplications: 8,
          adoptionRate: 51,
          monthlyAdoptions: dashboardData.monthlyAdoptions.map(m => ({
            month: m.month,
            adoptions: m.count,
          })),
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
        expect(screen.getByText('Monthly Adoptions')).toBeInTheDocument();
        expect(screen.getByText('Jan')).toBeInTheDocument();
        expect(screen.getByText('Feb')).toBeInTheDocument();
        expect(screen.getByText('Mar')).toBeInTheDocument();
        expect(screen.getByText('Apr')).toBeInTheDocument();
      });
    });

    it('displays total adoptions summary', async () => {
      const dashboardData = mockDashboardData({
        monthlyAdoptions: [
          { month: 'Jan', count: 5 },
          { month: 'Feb', count: 7 },
          { month: 'Mar', count: 6 },
        ],
      });

      useDashboardData.mockReturnValue({
        dashboardData: {
          totalPets: 45,
          successfulAdoptions: 23,
          pendingApplications: 8,
          adoptionRate: 51,
          monthlyAdoptions: dashboardData.monthlyAdoptions.map(m => ({
            month: m.month,
            adoptions: m.count,
          })),
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
        expect(screen.getByText(/Total Adoptions:/)).toBeInTheDocument();
        // Total: 5 + 7 + 6 = 18
        expect(screen.getByText('18')).toBeInTheDocument();
      });
    });
  });

  describe('DB-3: User sees pet status distribution', () => {
    it('displays pet status distribution with all status types', async () => {
      const dashboardData = mockDashboardData({
        petStatusDistribution: [
          { status: 'AVAILABLE', count: 22 },
          { status: 'ADOPTED', count: 23 },
          { status: 'FOSTER', count: 5 },
          { status: 'PENDING', count: 3 },
        ],
      });

      useDashboardData.mockReturnValue({
        dashboardData: {
          totalPets: 53,
          successfulAdoptions: 23,
          pendingApplications: 8,
          adoptionRate: 43,
          monthlyAdoptions: [],
          petStatusDistribution: dashboardData.petStatusDistribution.map(s => ({
            name: s.status,
            value: s.count,
            color: '#3b82f6',
          })),
        },
        recentActivities: [],
        notifications: [],
        loading: false,
        error: null,
      });

      const authState = createMockAuthState();
      renderWithAllProviders(<Dashboard />, { authState });

      await waitFor(() => {
        expect(screen.getByText('Pet Status Distribution')).toBeInTheDocument();
        expect(screen.getByText('AVAILABLE')).toBeInTheDocument();
        expect(screen.getByText('ADOPTED')).toBeInTheDocument();
        expect(screen.getByText('FOSTER')).toBeInTheDocument();
        expect(screen.getByText('PENDING')).toBeInTheDocument();
      });
    });
  });

  describe('DB-4: User sees recent activities timeline', () => {
    it('displays recent activities with descriptions and timestamps', async () => {
      const dashboardData = mockDashboardData({
        recentActivities: [
          {
            activityId: 'act-1',
            type: 'adoption',
            description: 'Buddy was adopted by John Doe',
            timestamp: '2024-01-15T10:00:00Z',
          },
          {
            activityId: 'act-2',
            type: 'application',
            description: 'New application received for Max',
            timestamp: '2024-01-14T15:30:00Z',
          },
        ],
      });

      useDashboardData.mockReturnValue({
        dashboardData: {
          totalPets: 45,
          successfulAdoptions: 23,
          pendingApplications: 8,
          adoptionRate: 51,
          monthlyAdoptions: [],
          petStatusDistribution: [],
        },
        recentActivities: dashboardData.recentActivities.map(a => ({
          id: a.activityId,
          message: a.description,
          timestamp: a.timestamp,
        })),
        notifications: [],
        loading: false,
        error: null,
      });

      const authState = createMockAuthState();
      renderWithAllProviders(<Dashboard />, { authState });

      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
        expect(screen.getByText('Buddy was adopted by John Doe')).toBeInTheDocument();
        expect(screen.getByText('New application received for Max')).toBeInTheDocument();
      });
    });

    it('displays message when no recent activities exist', async () => {
      useDashboardData.mockReturnValue({
        dashboardData: {
          totalPets: 45,
          successfulAdoptions: 23,
          pendingApplications: 8,
          adoptionRate: 51,
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
        expect(screen.getByText('No recent activities')).toBeInTheDocument();
      });
    });
  });

  describe('DB-5: User sees notification counter with unread notifications', () => {
    it('displays notifications with unread count badge', async () => {
      const dashboardData = mockDashboardData({
        notifications: [
          {
            notificationId: 'notif-1',
            type: 'info',
            message: 'New application requires review',
            read: false,
            timestamp: '2024-01-15T12:00:00Z',
          },
          {
            notificationId: 'notif-2',
            type: 'success',
            message: 'Adoption approved',
            read: false,
            timestamp: '2024-01-15T11:00:00Z',
          },
          {
            notificationId: 'notif-3',
            type: 'warning',
            message: 'Home visit scheduled',
            read: true,
            timestamp: '2024-01-14T10:00:00Z',
          },
        ],
      });

      useDashboardData.mockReturnValue({
        dashboardData: {
          totalPets: 45,
          successfulAdoptions: 23,
          pendingApplications: 8,
          adoptionRate: 51,
          monthlyAdoptions: [],
          petStatusDistribution: [],
        },
        recentActivities: [],
        notifications: dashboardData.notifications.map(n => ({
          id: n.notificationId,
          type: n.type,
          title: n.type.charAt(0).toUpperCase() + n.type.slice(1),
          message: n.message,
          read: n.read,
          timestamp: n.timestamp,
        })),
        loading: false,
        error: null,
      });

      const authState = createMockAuthState();
      renderWithAllProviders(<Dashboard />, { authState });

      await waitFor(() => {
        expect(screen.getByText('Recent Notifications')).toBeInTheDocument();
        // Unread count badge should show 2
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('New application requires review')).toBeInTheDocument();
      });
    });

    it('displays message when no notifications exist', async () => {
      useDashboardData.mockReturnValue({
        dashboardData: {
          totalPets: 45,
          successfulAdoptions: 23,
          pendingApplications: 8,
          adoptionRate: 51,
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
        expect(screen.getByText('No notifications')).toBeInTheDocument();
      });
    });
  });

  describe('Loading and Error States', () => {
    it('displays loading message while fetching dashboard data', async () => {
      useDashboardData.mockReturnValue({
        dashboardData: null,
        recentActivities: [],
        notifications: [],
        loading: true,
        error: null,
      });

      const authState = createMockAuthState();
      renderWithAllProviders(<Dashboard />, { authState });

      expect(screen.getByText('Loading dashboard data...')).toBeInTheDocument();
      expect(screen.getByText('📊 Loading...')).toBeInTheDocument();
    });

    it('displays error message when dashboard data fails to load', async () => {
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
        expect(screen.getByText(/Unable to load dashboard data:/)).toBeInTheDocument();
        expect(screen.getByText(/Failed to fetch dashboard data/)).toBeInTheDocument();
        expect(screen.getByText('Refresh Page')).toBeInTheDocument();
      });
    });

    it('displays personalized welcome message for authenticated user', async () => {
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
        recentActivities: [],
        notifications: [],
        loading: false,
        error: null,
      });

      const authState = createMockAuthState({
        user: {
          userId: 'user-1',
          email: 'alice@rescue.org',
          firstName: 'Alice',
          lastName: 'Johnson',
          role: 'COORDINATOR',
          rescueId: 'rescue-1',
        },
      });

      renderWithAllProviders(<Dashboard />, { authState });

      await waitFor(() => {
        expect(screen.getByText(/Welcome back, Alice!/)).toBeInTheDocument();
      });
    });
  });
});
