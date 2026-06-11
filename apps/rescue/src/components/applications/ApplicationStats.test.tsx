import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * UX P0/P1 #6: ApplicationStats used to render `null` whenever the apps
 * list was empty, leaving the dashboard header bare. With zero apps it
 * now still renders the stat cards with explicit "0" values so the user
 * can tell "API succeeded with no data" apart from "API errored".
 */

vi.mock('./ApplicationStats.css', () => ({
  statsContainer: 'statsContainer',
  loadingCard: 'loadingCard',
  cardContent: 'cardContent',
  cardHeader: 'cardHeader',
  iconContainer: 'iconContainer',
  loadingIconPlaceholder: 'loadingIconPlaceholder',
  cardBody: 'cardBody',
  loadingTextPlaceholder: 'loadingTextPlaceholder',
  loadingValuePlaceholder: 'loadingValuePlaceholder',
  errorContainer: 'errorContainer',
  errorContent: 'errorContent',
  errorText: 'errorText',
  errorTitle: 'errorTitle',
  errorMessage: 'errorMessage',
  statCard: 'statCard',
  icon: () => 'icon',
  statLabel: 'statLabel',
  statValue: 'statValue',
  statChange: () => 'statChange',
}));

const getApplicationsMock = vi.fn();

vi.mock('../../services/applicationService', () => ({
  RescueApplicationService: class {
    getApplications = (...args: unknown[]) => getApplicationsMock(...args);
  },
}));

import ApplicationStats from './ApplicationStats';

describe('ApplicationStats empty and error states', () => {
  it('shows the error UI when the stats fetch rejects', async () => {
    getApplicationsMock.mockRejectedValueOnce(new Error('Backend exploded'));

    render(<ApplicationStats />);

    await waitFor(() => {
      expect(screen.getByText(/error loading stats/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/backend exploded/i)).toBeInTheDocument();
  });

  it('renders zero-valued stat cards when there are no applications', async () => {
    getApplicationsMock.mockResolvedValueOnce({ applications: [], total: 0 });

    render(<ApplicationStats />);

    // Wait for the stat labels to appear (the loading skeleton goes away).
    expect(await screen.findByText(/total applications/i)).toBeInTheDocument();
    expect(screen.getByText(/submitted/i)).toBeInTheDocument();
    expect(screen.getByText(/approved/i)).toBeInTheDocument();
    // Multiple "0" values render — guard against accidental return-null.
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(3);
  });
});
