/**
 * Behavioral tests for Dashboard page (Admin App)
 *
 * Tests admin-facing behavior:
 * - Admin sees the dashboard heading and welcome message
 * - Loading state shown while data is being fetched
 * - Error state shown when the API fails
 * - Admin sees all platform metrics with real data values
 * - Positive and negative trends shown correctly
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../test-utils';
import Dashboard from '../pages/Dashboard';
import type { PlatformMetrics } from '../services/analyticsService';

const mockUsePlatformMetrics = vi.fn();

vi.mock('../hooks', () => ({
  usePlatformMetrics: () => mockUsePlatformMetrics(),
}));

const mockMetrics: PlatformMetrics = {
  users: { total: 5000, active: 3200, newThisMonth: 120, byRole: { adopter: 4500, rescue_staff: 500 } },
  rescues: { total: 90, verified: 75, pending: 15, newThisMonth: 3 },
  pets: { total: 800, available: 350, adopted: 42, newThisMonth: 60 },
  applications: { total: 210, pending: 38, approved: 55, newThisMonth: 70 },
};

describe('Dashboard page', () => {
  beforeEach(() => {
    mockUsePlatformMetrics.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  describe('page structure', () => {
    it('shows the Admin Dashboard heading', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    it('shows a welcome message to the admin', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText(/welcome back.*here's what's happening/i)).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows skeleton cards while data is loading', () => {
      mockUsePlatformMetrics.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null });
      renderWithProviders(<Dashboard />);
      const busyCards = screen.getAllByRole('generic', { hidden: false }).filter(el => el.getAttribute('aria-busy') === 'true');
      expect(busyCards.length).toBeGreaterThan(0);
    });

    it('does not show metric values while loading', () => {
      mockUsePlatformMetrics.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null });
      renderWithProviders(<Dashboard />);
      expect(screen.queryByText('Total Users')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows an error banner when the API call fails', () => {
      mockUsePlatformMetrics.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
      });
      renderWithProviders(<Dashboard />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to load dashboard metrics/i);
    });

    it('displays the error message detail in the banner', () => {
      mockUsePlatformMetrics.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
      });
      renderWithProviders(<Dashboard />);
      expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    });
  });

  describe('platform metrics with live data', () => {
    beforeEach(() => {
      mockUsePlatformMetrics.mockReturnValue({ data: mockMetrics, isLoading: false, isError: false, error: null });
    });

    it('shows the Total Users metric with real value', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('5,000')).toBeInTheDocument();
    });

    it('shows the Active Rescues metric with real verified count', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('Active Rescues')).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('shows Pets Listed with available count', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('Pets Listed')).toBeInTheDocument();
      expect(screen.getByText('350')).toBeInTheDocument();
    });

    it('shows Adoptions (30d) with adopted count', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('Adoptions (30d)')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('shows Pending Applications count', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('Pending Applications')).toBeInTheDocument();
      expect(screen.getByText('38')).toBeInTheDocument();
    });

    it('shows new users this month metric', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('New Users (30d)')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
    });

    it('shows pending verification count as context for rescues', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText(/15 pending verification/i)).toBeInTheDocument();
    });

    it('shows active users count as context for new users metric', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText(/3,200 active users/i)).toBeInTheDocument();
    });
  });
});
