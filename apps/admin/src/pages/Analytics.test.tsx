import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import type {
  DashboardAnalytics,
  DashboardAnalyticsOptions,
  PlatformMetrics,
} from '../services/analyticsService';

// Capture the date range the page feeds into useDashboardAnalytics so we can
// assert the time-range filter actually drives the analytics query (the value
// that, in production, forms the react-query key).
const { useDashboardAnalyticsSpy } = vi.hoisted(() => ({
  useDashboardAnalyticsSpy: vi.fn((_options?: DashboardAnalyticsOptions): void => undefined),
}));

vi.mock('../hooks', () => {
  const platformMetrics: PlatformMetrics = {
    users: { total: 100, active: 80, newThisMonth: 5, byRole: {} },
    rescues: { total: 20, verified: 12, pending: 3, newThisMonth: 1 },
    pets: { total: 50, available: 30, adopted: 20, newThisMonth: 4 },
    applications: { total: 40, pending: 10, approved: 25, newThisMonth: 2 },
  };

  const dashboardAnalytics: DashboardAnalytics = {
    users: {
      totalUsers: 100,
      activeUsers: 80,
      newUsers: 5,
      userGrowthRate: 0.1,
      avgSessionDuration: 120,
      retentionRate: 0.6,
      topUserActivities: [],
    },
    adoptions: {
      totalAdoptions: 12,
      adoptionRate: 0.4,
      avgTimeToAdoption: 3,
      popularPetTypes: [{ type: 'Dog', count: 8, adoptionRate: 0.5 }],
      adoptionTrends: [{ date: '2026-08-01', value: 3 }],
      rescuePerformance: [
        {
          rescueId: 'r1',
          rescueName: 'Paws Rescue',
          adoptions: 5,
          averageTimeToAdoption: 3.2,
          adoptionRate: 0.5,
          totalPets: 10,
        },
      ],
    },
    applications: {
      statusMetrics: { pending: 3, approved: 5 },
      trends: [],
      avgProcessingTime: 2,
      totalApplications: 8,
      approvalRate: 0.5,
    },
    generatedAt: '2026-08-10T00:00:00.000Z',
  };

  return {
    usePlatformMetrics: () => ({ data: platformMetrics, isLoading: false }),
    useDashboardAnalytics: (options?: DashboardAnalyticsOptions) => {
      useDashboardAnalyticsSpy(options);
      return { data: dashboardAnalytics, isLoading: false, isError: false };
    },
  };
});

import Analytics from './Analytics';

const daySpanOf = (options: DashboardAnalyticsOptions | undefined): number => {
  if (!options?.startDate || !options?.endDate) {
    throw new Error('expected a start and end date');
  }
  return Math.round((options.endDate.getTime() - options.startDate.getTime()) / 86_400_000);
};

describe('Analytics filters', () => {
  beforeEach(() => {
    useDashboardAnalyticsSpy.mockClear();
  });

  it('renders the analytics data returned for the current range', () => {
    renderWithProviders(<Analytics />);

    expect(screen.getByText('Paws Rescue')).toBeInTheDocument();
  });

  it('drives the analytics query date range from the time-range filter', () => {
    renderWithProviders(<Analytics />);

    // Default is "Last 30 Days".
    const initial = useDashboardAnalyticsSpy.mock.calls.at(-1)?.[0];
    expect(daySpanOf(initial)).toBe(30);

    fireEvent.change(screen.getByLabelText('Time range'), { target: { value: '7days' } });

    const afterChange = useDashboardAnalyticsSpy.mock.calls.at(-1)?.[0];
    expect(daySpanOf(afterChange)).toBe(7);
  });
});
