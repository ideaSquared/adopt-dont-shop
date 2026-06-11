/**
 * UX P2 H: when the underlying applications query errors, the DataTable now
 * renders the inline error row (introduced by UX #5) in addition to whatever
 * top-of-page error treatment already existed. This pins down the wiring so
 * future refactors don't silently drop the inline affordance.
 *
 * Deep-link wiring (ADS): the Applications page is driven by the
 * `/applications/:applicationId` route param. Row clicks navigate, the
 * detail modal opens off the URL, close returns to `/applications` (with
 * filter query params preserved), and unknown ids redirect with a toast.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@adopt-dont-shop/lib.components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithProviders } from '../test-utils';
import type { AdminApplication } from '../services/applicationService';

// ── Module mocks ──────────────────────────────────────────────────────────────

const mockUseApplications = vi.fn();

vi.mock('../hooks', () => ({
  useApplications: (...args: unknown[]) => mockUseApplications(...args),
  useBulkUpdateApplications: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRescuesList: () => ({ data: { data: [] } }),
}));

vi.mock('../components/modals', () => ({
  BulkConfirmationModal: () => null,
}));

vi.mock('../components/detail', () => ({
  ApplicationDetailPanel: ({
    application,
    onClose,
  }: {
    application: AdminApplication;
    onClose: () => void;
  }) => (
    <div role='dialog' aria-label='Application detail'>
      <span data-testid='detail-application-id'>{application.applicationId}</span>
      <span>{application.applicantName}</span>
      <button type='button' onClick={onClose}>
        Close detail
      </button>
    </div>
  ),
}));

import Applications from './Applications';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const buildApplication = (overrides: Partial<AdminApplication> = {}): AdminApplication => ({
  applicationId: 'app-1',
  applicantName: 'Alice Applicant',
  applicantEmail: 'alice@example.com',
  petName: 'Rex',
  rescueName: 'Happy Tails',
  status: 'submitted',
  createdAt: new Date('2026-05-01T00:00:00Z').toISOString(),
  ...overrides,
});

const setApplicationsResult = (
  overrides: Partial<{
    data: AdminApplication[];
    isLoading: boolean;
    error: Error | null;
  }> = {}
) => {
  const data = overrides.data ?? [buildApplication()];
  mockUseApplications.mockReturnValue({
    data: {
      data,
      pagination: { pages: 1, total: data.length, page: 1, limit: 20 },
    },
    isLoading: overrides.isLoading ?? false,
    error: overrides.error ?? null,
  });
};

// ── Test harness with full routing ────────────────────────────────────────────

const LocationProbe = () => {
  const location = useLocation();
  return (
    <div data-testid='location-probe'>
      {location.pathname}
      {location.search}
    </div>
  );
};

const renderApplicationsAt = (initialRoute: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <ThemeProvider>
          <Routes>
            <Route path='/applications' element={<Applications />} />
            <Route path='/applications/:applicationId' element={<Applications />} />
          </Routes>
          <LocationProbe />
        </ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  mockUseApplications.mockReset();
});

// ── Pre-existing behaviour ───────────────────────────────────────────────────

describe('Applications page error wiring (UX P2 H)', () => {
  it('renders the inline DataTable error row when the applications query fails', () => {
    mockUseApplications.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch applications from server'),
    });

    renderWithProviders(<Applications />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/failed to fetch applications/i);
  });
});

// ── Deep-link behaviour ──────────────────────────────────────────────────────

describe('Applications page deep-link wiring', () => {
  it('opens the detail modal for the application matching the URL param', async () => {
    setApplicationsResult({
      data: [
        buildApplication({ applicationId: 'app-1', applicantName: 'Alice Applicant' }),
        buildApplication({ applicationId: 'app-2', applicantName: 'Bob Builder' }),
      ],
    });

    renderApplicationsAt('/applications/app-2');

    const dialog = await screen.findByRole('dialog', { name: /application detail/i });
    expect(dialog).toHaveTextContent('Bob Builder');
    expect(screen.getByTestId('detail-application-id')).toHaveTextContent('app-2');
  });

  it('navigates to the detail URL when a row is clicked', async () => {
    setApplicationsResult({
      data: [buildApplication({ applicationId: 'app-7', applicantName: 'Cara Clicker' })],
    });

    const user = userEvent.setup();
    renderApplicationsAt('/applications');

    // Click the row matching the applicant.
    const row = await screen.findByText('Cara Clicker');
    await user.click(row);

    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/applications/app-7');
    });
  });

  it('returns to /applications and preserves filter query params on close', async () => {
    setApplicationsResult({
      data: [buildApplication({ applicationId: 'app-9' })],
    });

    const user = userEvent.setup();
    renderApplicationsAt('/applications/app-9?status=submitted');

    const close = await screen.findByRole('button', { name: /close detail/i });
    await user.click(close);

    await waitFor(() => {
      const probe = screen.getByTestId('location-probe');
      expect(probe).toHaveTextContent('/applications');
      expect(probe).toHaveTextContent('status=submitted');
    });
  });

  it('redirects to /applications without crashing when the URL id is unknown', async () => {
    setApplicationsResult({
      data: [buildApplication({ applicationId: 'app-real' })],
    });

    renderApplicationsAt('/applications/does-not-exist');

    await waitFor(() => {
      const probe = screen.getByTestId('location-probe');
      expect(probe.textContent).toBe('/applications');
    });

    // No detail modal should be open.
    expect(screen.queryByRole('dialog', { name: /application detail/i })).toBeNull();
  });

  it('defers redirect while the applications query is still loading', () => {
    setApplicationsResult({ data: [], isLoading: true });

    renderApplicationsAt('/applications/app-loading');

    // We should still be at the deep-link URL — no redirect yet.
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/applications/app-loading');
  });
});
