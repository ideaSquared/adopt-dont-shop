/**
 * Behavioral tests for Analytics page (Admin App)
 *
 * Tests admin-facing behavior:
 * - Admin sees the platform analytics heading
 * - Admin sees key platform metrics (adopters, rescues, adoptions, listings)
 * - Admin sees trend indicators (up/down) for each metric
 * - Admin can switch between time range periods
 * - Admin sees chart sections for growth, adoptions, distribution, and top rescues
 * - Admin can export a report
 * - Top rescues are ranked and show adoption counts
 */

import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../test-utils';
import userEvent from '@testing-library/user-event';
import Analytics from '../pages/Analytics';

describe('Analytics page', () => {
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

  describe('key metrics', () => {
    it('shows the Total Adopters metric', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('Total Adopters')).toBeInTheDocument();
      expect(screen.getByText('1,050')).toBeInTheDocument();
    });

    it('shows the Active Rescues metric', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('Active Rescues')).toBeInTheDocument();
      expect(screen.getByText('74')).toBeInTheDocument();
    });

    it('shows the Weekly Adoptions metric', () => {
      renderWithProviders(<Analytics />);
      // "Weekly Adoptions" appears as both a stat label and chart title
      const weeklyAdoptionsLabels = screen.getAllByText('Weekly Adoptions');
      expect(weeklyAdoptionsLabels.length).toBeGreaterThan(0);
    });

    it('shows the Active Listings metric', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('Active Listings')).toBeInTheDocument();
    });

    it('shows positive trend for total adopters', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('+14.2% vs last period')).toBeInTheDocument();
    });

    it('shows positive trend for active rescues', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('+10.4% vs last period')).toBeInTheDocument();
    });

    it('shows negative trend for weekly adoptions', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('-3.8% vs last week')).toBeInTheDocument();
    });
  });

  describe('chart sections', () => {
    it('shows the User Growth Trend chart section', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('User Growth Trend')).toBeInTheDocument();
    });

    it('shows the Weekly Adoptions chart section', () => {
      renderWithProviders(<Analytics />);
      // "Weekly Adoptions" appears as both a stat label and chart card title
      const weeklyAdoptionsElements = screen.getAllByText('Weekly Adoptions');
      expect(weeklyAdoptionsElements.length).toBeGreaterThan(0);
    });

    it('shows the Pet Type Distribution chart section', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('Pet Type Distribution')).toBeInTheDocument();
    });

    it('shows the Top Performing Rescues section', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('Top Performing Rescues')).toBeInTheDocument();
    });

    it('shows month labels in the growth chart', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('Jan')).toBeInTheDocument();
      expect(screen.getByText('Jun')).toBeInTheDocument();
    });

    it('shows day labels in the weekly adoptions chart', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Sat')).toBeInTheDocument();
    });
  });

  describe('pet type distribution', () => {
    it('shows dog category in the distribution chart', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('Dogs')).toBeInTheDocument();
    });

    it('shows cat category in the distribution chart', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('Cats')).toBeInTheDocument();
    });

    it('shows percentage labels for each category', () => {
      renderWithProviders(<Analytics />);
      const percentages = screen.getAllByText(/%/);
      expect(percentages.length).toBeGreaterThan(0);
    });
  });

  describe('top performing rescues', () => {
    it('shows the first ranked rescue', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('Paws & Claws Rescue')).toBeInTheDocument();
    });

    it('shows adoption counts for top rescues', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('234')).toBeInTheDocument();
    });

    it('shows location metadata for top rescues', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText(/London.*active listings/i)).toBeInTheDocument();
    });

    it('shows rank numbers for all top rescues', () => {
      renderWithProviders(<Analytics />);
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });
});
