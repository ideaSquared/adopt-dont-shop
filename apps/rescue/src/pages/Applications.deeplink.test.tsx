import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import Applications from './Applications';

const applications = [
  { id: 'app-1', petId: 'pet-1', petName: 'Rex' },
  { id: 'app-2', petId: 'pet-2', petName: 'Milo' },
];

const useApplicationsReturn = {
  applications,
  loading: false,
  error: null,
  filter: {},
  sort: {},
  pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
  updateFilter: vi.fn(),
  updateSort: vi.fn(),
  updateApplicationStatus: vi.fn(),
  refetch: vi.fn(),
};

const detailsFor = (id: string | null) => ({
  application: id ? { id, petName: 'Rex' } : null,
  references: [],
  homeVisits: [],
  timeline: [],
  timelineError: null,
  referencesError: null,
  homeVisitsError: null,
  loading: false,
  error: null,
  updateReferenceCheck: vi.fn(),
  scheduleHomeVisit: vi.fn(),
  updateHomeVisit: vi.fn(),
  addTimelineEvent: vi.fn(),
  transitionStage: vi.fn(),
  refetch: vi.fn(),
});

vi.mock('../hooks/useApplications', () => ({
  useApplications: () => useApplicationsReturn,
  useApplicationDetails: (id: string | null) => detailsFor(id),
}));

vi.mock('../components/applications/ApplicationList', () => ({
  default: ({
    applications: apps,
    onApplicationSelect,
  }: {
    applications: Array<{ id: string }>;
    onApplicationSelect: (a: { id: string }) => void;
  }) => (
    <div data-testid="application-list">
      {apps.map(a => (
        <button key={a.id} onClick={() => onApplicationSelect(a)}>
          select-{a.id}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../components/applications/ApplicationReview', () => ({
  default: ({ application, onClose }: { application: { id: string }; onClose: () => void }) => (
    <div>
      <p>Review {application.id}</p>
      <button onClick={onClose}>close-review</button>
    </div>
  ),
}));

vi.mock('../components/applications/BulkActionBar', () => ({ default: () => null }));
vi.mock('../components/applications/StageCountSummary', () => ({ default: () => null }));

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const renderAt = (route: string) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/applications" element={<Applications />} />
        <Route path="/applications/:id" element={<Applications />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>
  );

describe('Applications deep-linkable detail route (D4)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens the review for the application named in the URL', () => {
    renderAt('/applications/app-2');

    expect(screen.getByText('Review app-2')).toBeInTheDocument();
    // The master list stays mounted alongside the detail.
    expect(screen.getByTestId('application-list')).toBeInTheDocument();
  });

  it('does not open a review on the plain list route', () => {
    renderAt('/applications');

    expect(screen.queryByText(/^Review app-/)).not.toBeInTheDocument();
    expect(screen.getByTestId('application-list')).toBeInTheDocument();
  });

  it('reflects the selected application in the URL when a row is chosen', async () => {
    const user = userEvent.setup();
    renderAt('/applications');

    await user.click(screen.getByRole('button', { name: 'select-app-1' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/applications/app-1');
    expect(screen.getByText('Review app-1')).toBeInTheDocument();
    // Selection keeps the master list visible (master-detail preserved).
    expect(screen.getByTestId('application-list')).toBeInTheDocument();
  });

  it('returns to the list route when the review is closed', async () => {
    const user = userEvent.setup();
    renderAt('/applications/app-1');

    await user.click(screen.getByRole('button', { name: 'close-review' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/applications');
    expect(screen.queryByText('Review app-1')).not.toBeInTheDocument();
  });
});
