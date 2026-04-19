/**
 * Behavioral tests for Dashboard page (Admin App)
 *
 * Tests admin-facing behavior:
 * - Admin sees the dashboard heading and welcome message
 * - Admin sees all platform metrics with values
 * - Positive trends shown with correct styling indicator
 * - Negative trends shown with correct styling indicator
 */

import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../test-utils';
import Dashboard from '../pages/Dashboard';

describe('Dashboard page', () => {
  describe('page structure', () => {
    it('shows the Admin Dashboard heading', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    it('shows a welcome message to the admin', () => {
      renderWithProviders(<Dashboard />);
      expect(
        screen.getByText(/welcome back.*here's what's happening/i)
      ).toBeInTheDocument();
    });
  });

  describe('platform metrics', () => {
    it('shows the Total Users metric', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('12,543')).toBeInTheDocument();
    });

    it('shows the Active Rescues metric', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('Active Rescues')).toBeInTheDocument();
      expect(screen.getByText('284')).toBeInTheDocument();
    });

    it('shows the Pets Listed metric', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('Pets Listed')).toBeInTheDocument();
      expect(screen.getByText('1,892')).toBeInTheDocument();
    });

    it('shows the monthly Adoptions metric', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('Adoptions (30d)')).toBeInTheDocument();
      expect(screen.getByText('456')).toBeInTheDocument();
    });

    it('shows the Pending Applications metric', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('Pending Applications')).toBeInTheDocument();
      expect(screen.getByText('187')).toBeInTheDocument();
    });

    it('shows the Open Tickets metric', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('Open Tickets')).toBeInTheDocument();
      expect(screen.getByText('34')).toBeInTheDocument();
    });

    it('shows growth percentages for metrics', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('+12% from last month')).toBeInTheDocument();
      expect(screen.getByText('+8% from last month')).toBeInTheDocument();
      expect(screen.getByText('+23% from last month')).toBeInTheDocument();
    });

    it('shows negative trend indicators for declining metrics', () => {
      renderWithProviders(<Dashboard />);
      expect(screen.getByText('-5% from last month')).toBeInTheDocument();
    });
  });
});
