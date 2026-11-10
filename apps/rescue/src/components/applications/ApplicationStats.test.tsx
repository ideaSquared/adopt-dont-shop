import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryWrapper } from '../../hooks/query-test-wrapper';

/**
 * UX P0/P1 #6: ApplicationStats used to render `null` whenever the apps
 * list was empty, leaving the dashboard header bare. With zero apps it
 * now still renders the stat cards with explicit "0" values so the user
 * can tell "API succeeded with no data" apart from "API errored".
 */

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

    render(<ApplicationStats />, { wrapper: QueryWrapper });

    await waitFor(() => {
      expect(screen.getByText(/error loading stats/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/backend exploded/i)).toBeInTheDocument();
  });

  it('renders zero-valued stat cards when there are no applications', async () => {
    getApplicationsMock.mockResolvedValueOnce({ applications: [], total: 0 });

    render(<ApplicationStats />, { wrapper: QueryWrapper });

    // Wait for the stat labels to appear (the loading skeleton goes away).
    expect(await screen.findByText(/total applications/i)).toBeInTheDocument();
    expect(screen.getByText(/submitted/i)).toBeInTheDocument();
    expect(screen.getByText(/approved/i)).toBeInTheDocument();
    // Multiple "0" values render — guard against accidental return-null.
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(3);
  });

  it('counts submitted and approved applications and averages processing time', async () => {
    getApplicationsMock.mockResolvedValueOnce({
      applications: [
        { status: 'submitted', submittedDaysAgo: 1 },
        { status: 'approved', submittedDaysAgo: 4 },
        { status: 'rejected', submittedDaysAgo: 8 },
      ],
      total: 3,
    });

    render(<ApplicationStats />, { wrapper: QueryWrapper });

    expect(await screen.findByText('Total Applications')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('6d')).toBeInTheDocument();
  });
});
