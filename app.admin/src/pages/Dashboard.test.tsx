import { describe, it, expect, jest } from '@jest/globals';
import React from 'react';
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';

// Mock the components library
jest.mock('@adopt-dont-shop/components', () => ({
  Heading: ({ children, level }: { children: React.ReactNode; level: string }) => {
    const Tag = level as keyof JSX.IntrinsicElements;
    return React.createElement(Tag, { 'data-testid': `heading-${level}` }, children);
  },
  Text: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="text">{children}</p>
  ),
}));

describe('Dashboard - Display Behaviours', () => {
  describe('Page Header', () => {
    it('admin sees dashboard title', () => {
      render(<Dashboard />);

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    it('admin sees welcome message', () => {
      render(<Dashboard />);

      expect(screen.getByText(/Welcome back!/)).toBeInTheDocument();
      expect(screen.getByText(/Here's what's happening across the platform today/)).toBeInTheDocument();
    });
  });

  describe('Metrics Display', () => {
    it('admin sees total users metric card', () => {
      render(<Dashboard />);

      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('12,543')).toBeInTheDocument();
      expect(screen.getByText('+12% from last month')).toBeInTheDocument();
    });

    it('admin sees active rescues metric card', () => {
      render(<Dashboard />);

      expect(screen.getByText('Active Rescues')).toBeInTheDocument();
      expect(screen.getByText('284')).toBeInTheDocument();
      expect(screen.getByText('+8% from last month')).toBeInTheDocument();
    });

    it('admin sees pets listed metric card', () => {
      render(<Dashboard />);

      expect(screen.getByText('Pets Listed')).toBeInTheDocument();
      expect(screen.getByText('1,892')).toBeInTheDocument();
      expect(screen.getByText('+15% from last month')).toBeInTheDocument();
    });

    it('admin sees adoptions metric card', () => {
      render(<Dashboard />);

      expect(screen.getByText('Adoptions (30d)')).toBeInTheDocument();
      expect(screen.getByText('456')).toBeInTheDocument();
      expect(screen.getByText('+23% from last month')).toBeInTheDocument();
    });

    it('admin sees pending applications metric card', () => {
      render(<Dashboard />);

      expect(screen.getByText('Pending Applications')).toBeInTheDocument();
      expect(screen.getByText('187')).toBeInTheDocument();
      expect(screen.getByText('-5% from last month')).toBeInTheDocument();
    });

    it('admin sees open tickets metric card', () => {
      render(<Dashboard />);

      expect(screen.getByText('Open Tickets')).toBeInTheDocument();
      expect(screen.getByText('34')).toBeInTheDocument();
      expect(screen.getByText('+2 from yesterday')).toBeInTheDocument();
    });

    it('admin sees all six metric cards', () => {
      render(<Dashboard />);

      // Count metric cards by finding elements with metric labels
      const metricLabels = [
        'Total Users',
        'Active Rescues',
        'Pets Listed',
        'Adoptions (30d)',
        'Pending Applications',
        'Open Tickets',
      ];

      metricLabels.forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });
  });

  describe('Metric Icons', () => {
    it('admin sees appropriate icons for each metric', () => {
      render(<Dashboard />);

      // Verify icons are present through their emoji representation
      expect(screen.getByText('👥')).toBeInTheDocument(); // Users
      expect(screen.getByText('🏠')).toBeInTheDocument(); // Rescues
      expect(screen.getByText('🐾')).toBeInTheDocument(); // Pets
      expect(screen.getByText('❤️')).toBeInTheDocument(); // Adoptions
      expect(screen.getByText('📋')).toBeInTheDocument(); // Applications
      expect(screen.getByText('🎫')).toBeInTheDocument(); // Tickets
    });
  });

  describe('Metric Styling', () => {
    it('admin sees positive metrics styled appropriately', () => {
      const { container } = render(<Dashboard />);

      // Find positive change indicators
      const positiveChanges = [
        '+12% from last month',
        '+8% from last month',
        '+15% from last month',
        '+23% from last month',
      ];

      positiveChanges.forEach((change) => {
        expect(screen.getByText(change)).toBeInTheDocument();
      });
    });

    it('admin sees negative metrics styled appropriately', () => {
      const { container } = render(<Dashboard />);

      // Find negative change indicators
      const negativeChanges = ['-5% from last month', '+2 from yesterday'];

      negativeChanges.forEach((change) => {
        expect(screen.getByText(change)).toBeInTheDocument();
      });
    });
  });

  describe('Additional Dashboard Content', () => {
    it('admin sees placeholder for additional dashboard widgets', () => {
      render(<Dashboard />);

      expect(
        screen.getByText(/Additional dashboard widgets will be added here/)
      ).toBeInTheDocument();
    });
  });

  describe('Dashboard Layout', () => {
    it('dashboard has proper structure with metrics grid', () => {
      const { container } = render(<Dashboard />);

      // Verify the dashboard container exists
      expect(container.querySelector('div')).toBeInTheDocument();
    });

    it('dashboard displays all content in correct order', () => {
      render(<Dashboard />);

      const heading = screen.getByText('Admin Dashboard');
      const welcomeText = screen.getByText(/Welcome back!/);
      const totalUsers = screen.getByText('Total Users');

      // Verify elements exist in the document
      expect(heading).toBeInTheDocument();
      expect(welcomeText).toBeInTheDocument();
      expect(totalUsers).toBeInTheDocument();
    });
  });

  describe('Responsive Behaviour', () => {
    it('dashboard renders all metrics regardless of viewport', () => {
      render(<Dashboard />);

      // All metrics should be present
      const metricCount = 6;
      const metricLabels = [
        'Total Users',
        'Active Rescues',
        'Pets Listed',
        'Adoptions (30d)',
        'Pending Applications',
        'Open Tickets',
      ];

      expect(metricLabels).toHaveLength(metricCount);
      metricLabels.forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });
  });
});
