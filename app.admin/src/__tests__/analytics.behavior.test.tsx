/**
 * Behavioral tests for Analytics page (Admin App)
 *
 * Tests admin-facing behavior:
 * - Admin sees the platform analytics heading
 * - Loading state shown while data is being fetched
 * - Error state shown when the API fails
 * - Admin sees real platform metrics (users, rescues, adoptions, listings)
 * - Admin can switch between time range periods
 * - Admin sees chart sections for adoption trends, applications, distribution, top rescues
 * - Admin can export a report
 * - Top rescues show real adoption counts
 * - Adoption trends chart renders real data
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../test-utils';
import userEvent from '@testing-library/user-event';
import Analytics from '../pages/Analytics';
import type { PlatformMetrics, DashboardAnalytics } from '../services/analyticsService';

const mockUsePlatformMetrics = vi.fn();
const mockUseDashboardAnalytics = vi.fn();

vi.mock('../hooks', () => ({
  usePlatformMetrics: () => mockUsePlatformMetrics(),
  useDashboardAnalytics: () => mockUseDashboardAnalytics(),
}));

const mockMetrics: PlatformMetrics = {
  users: { total: 12543, active: 9800, newThisMonth: 284, byRole: { adopter: 11000, rescue_staff: 1543 } },
  rescues: { total: 90, verified: 74, pending: 16, newThisMonth: 2 },
  pets: { total: 2800, available: 1892, adopted: 456, newThisMonth: 180 },
  applications: { total: 310, pending: 187, approved: 89, newThisMonth: 110 },
};

const mockAnalytics: DashboardAnalytics = {
  users: {
    totalUsers: 12543,
    activeUsers: 9800,
    newUsers: 284,
    userGrowthRate: 12.5,
    avgSessionDuration: 8.4,
    retentionRate: 78.2,
    topUserActivities: [],
  },
  adoptions: {
    totalAdoptions: 160,
    adoptionRate: 16.3,
    avgTimeToAdoption: 5.2,
    popularPetTypes: [
      { type: 'Dogs', count: 1245, adoptionRate: 45 },
      { type: 'Cats', count: 980, adoptionRate: 35 },
      { type: 'Rabbits', count: 234, adoptionRate: 8 },
    ],
    adoptionTrends: [
      { date: '2026-04-01', value: 12 },
      { date: '2026-04-02', value: 18 },
      { date: '2026-04-03', value: 15 },
    ],
    rescuePerformance: [
      { rescueId: 'r1', rescueName: 'Paws & Claws Rescue', adoptions: 234, averageTimeToAdoption: 4.5, adoptionRate: 25, totalPets: 45 },
      { rescueId: 'r2', rescueName: 'Happy Tails Haven', adoptions: 198, averageTimeToAdoption: 5.1, adoptionRate: 21, totalPets: 38 },
    ],
  },
  applications: {
    statusMetrics: { pending: 187, approved: 89, rejected: 34 },
    trends: [{ date: '2026-04-01', count: 10 }],
    avgProcessingTime: 48,
    totalApplications: 310,
    approvalRate: 72,
  },
  generatedAt: '2026-04-20T00:00:00Z',
};

describe('Analytics page', () => {
  beforeEach(() => {
    mockUsePlatformMetrics.mockReturnValue({ data: mockMetrics, isLoading: false, isError: false, error: null });
    mockUseDashboardAnalytics.mockReturnValue({ data: mockAnalytics, isLoading: false, isError: false, error: null });
  });

  describe('page structure', () => {
    it('shows the Platform Analytics heading', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('Platform Analytics')).toBeInTheDocument();
    });

    it('shows the page description', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('Comprehensive analytics and data insights')).toBeInTheDocument();
    });

    it('shows the Export Report button', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByRole('button', { name: /export report/i })).toBeInTheDocument();
    });
  });

  describe('time range filter', () => {
    it('shows the time range selector defaulting to last 30 days', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByDisplayValue('Last 30 Days')).toBeInTheDocument();
    });

    it('allows admin to select Last 7 Days', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Analytics />);
      await user.selectOptions(screen.getByDisplayValue('Last 30 Days'), '7days');
      expect(screen.getByDisplayValue('Last 7 Days')).toBeInTheDocument();
    });

    it('allows admin to select Last 90 Days', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Analytics />);
      await user.selectOptions(screen.getByDisplayValue('Last 30 Days'), '90days');
      expect(screen.getByDisplayValue('Last 90 Days')).toBeInTheDocument();
    });

    it('allows admin to select Last 12 Months', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Analytics />);
      await user.selectOptions(screen.getByDisplayValue('Last 30 Days'), '12months');
      expect(screen.getByDisplayValue('Last 12 Months')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading skeletons for stat cards while data loads', () => {
      mockUsePlatformMetrics.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null });
      mockUseDashboardAnalytics.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null });
      renderWithProviders(<Analytics />);
      expect(screen.queryByText('12,543')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows an error banner when analytics data fails to load', () => {
      mockUseDashboardAnalytics.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new Error('Server error') });
      renderWithProviders(<Analytics />);
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to load analytics data/i);
    });
  });

  describe('key metrics with live data', () => {
    it('shows the Total Users metric from real data', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('12,543')).toBeInTheDocument();
    });

    it('shows the Active Rescues metric from real data', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('Active Rescues')).toBeInTheDocument();
      expect(screen.getByText('74')).toBeInTheDocument();
    });

    it('shows Weekly Adoptions metric from real analytics data', () => {
      renderWithProviders(<Analytics />);
      const weeklyAdoptionsLabels = screen.getAllByText('Weekly Adoptions');
      expect(weeklyAdoptionsLabels.length).toBeGreaterThan(0);
    });

    it('shows Active Listings count from real metrics', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('Active Listings')).toBeInTheDocument();
      expect(screen.getByText('1,892')).toBeInTheDocument();
    });

    it('shows adoption rate as trend indicator', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText(/16.3% adoption rate/i)).toBeInTheDocument();
    });

    it('shows new users count as trend for Total Users card', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText(/284 new this month/i)).toBeInTheDocument();
    });
  });

  describe('chart sections', () => {
    it('shows the Adoption Trends chart section', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('Adoption Trends')).toBeInTheDocument();
    });

    it('shows the Applications by Status chart section', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('Applications by Status')).toBeInTheDocument();
    });

    it('shows the Pet Type Distribution chart section', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('Pet Type Distribution')).toBeInTheDocument();
    });

    it('shows the Top Performing Rescues section', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('Top Performing Rescues')).toBeInTheDocument();
    });
  });

  describe('pet type distribution with real data', () => {
    it('shows dog category from real data', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('Dogs')).toBeInTheDocument();
    });

    it('shows cat category from real data', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('Cats')).toBeInTheDocument();
    });

    it('shows percentage labels for each category', () => {
      renderWithProviders(<Analytics />);
      const percentages = screen.getAllByText(/%/);
      expect(percentages.length).toBeGreaterThan(0);
    });
  });

  describe('top performing rescues with real data', () => {
    it('shows the first ranked rescue from real data', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('Paws & Claws Rescue')).toBeInTheDocument();
    });

    it('shows the second rescue from real data', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('Happy Tails Haven')).toBeInTheDocument();
    });

    it('shows adoption count for top rescue', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('234')).toBeInTheDocument();
    });

    it('shows rank numbers for rescues', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('shows empty state message when no rescue data available', () => {
      mockUseDashboardAnalytics.mockReturnValue({
        data: {
          ...mockAnalytics,
          adoptions: { ...mockAnalytics.adoptions, rescuePerformance: [] },
        },
        isLoading: false,
        isError: false,
        error: null,
      });
      renderWithProviders(<Analytics />);
      expect(screen.getByText(/no rescue performance data/i)).toBeInTheDocument();
    });
  });
});
