import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApplicationListItem } from '../../types/applications';

// Stub child components so we can render ApplicationList in isolation
vi.mock('./ApplicationStats', () => ({
  default: () => null,
}));

vi.mock('./ApplicationFilters', () => ({
  default: () => null,
}));

import ApplicationList from './ApplicationList';

// ApplicationListItem extends a wide backend type with many fields the list
// view never touches. Justified type assertion: keep the test fixture focused
// on the fields the render path actually reads.
const buildApplication = (overrides: Partial<ApplicationListItem> = {}): ApplicationListItem => {
  const base = {
    id: 'app-1',
    applicantName: 'Jane Doe',
    petName: 'Buddy',
    petType: 'dog',
    petBreed: 'Labrador',
    status: 'pending',
    priority: 'medium',
    submittedDaysAgo: 1,
    stage: 'PENDING',
    referencesStatus: 'pending',
    homeVisitStatus: 'not_scheduled',
    stageProgressPercentage: 0,
    data: { personalInfo: { email: 'jane@example.com' } },
    ...overrides,
  } as unknown as ApplicationListItem;
  return base;
};

const renderList = (application: ApplicationListItem, onApplicationSelect = vi.fn()) => {
  render(
    <ApplicationList
      applications={[application]}
      loading={false}
      error={null}
      filter={{}}
      sort={{ field: 'submittedAt', direction: 'desc' }}
      pagination={{ page: 1, limit: 10, total: 1, totalPages: 1 }}
      onFilterChange={vi.fn()}
      onSortChange={vi.fn()}
      onApplicationSelect={onApplicationSelect}
      selectedApplications={[]}
      onSelectionChange={vi.fn()}
    />
  );
  return { onApplicationSelect };
};

describe('ApplicationList stage action buttons', () => {
  it('invokes onApplicationSelect when Start Review is clicked on a pending application', () => {
    const application = buildApplication({ stage: 'PENDING' });
    const { onApplicationSelect } = renderList(application);

    fireEvent.click(screen.getByRole('button', { name: 'Start Review' }));

    expect(onApplicationSelect).toHaveBeenCalledWith(application);
  });

  it('invokes onApplicationSelect when Schedule Visit is clicked on a reviewing application', () => {
    const application = buildApplication({ stage: 'REVIEWING' });
    const { onApplicationSelect } = renderList(application);

    fireEvent.click(screen.getByRole('button', { name: 'Schedule Visit' }));

    expect(onApplicationSelect).toHaveBeenCalledWith(application);
  });

  it('invokes onApplicationSelect when View Details is clicked on a visiting application', () => {
    const application = buildApplication({ stage: 'VISITING' });
    const { onApplicationSelect } = renderList(application);

    fireEvent.click(screen.getByRole('button', { name: 'View Details' }));

    expect(onApplicationSelect).toHaveBeenCalledWith(application);
  });

  it('invokes onApplicationSelect when View Details is clicked on a deciding application', () => {
    const application = buildApplication({ stage: 'DECIDING' });
    const { onApplicationSelect } = renderList(application);

    fireEvent.click(screen.getByRole('button', { name: 'View Details' }));

    expect(onApplicationSelect).toHaveBeenCalledWith(application);
  });

  it('invokes onApplicationSelect when View Details is clicked on a resolved application', () => {
    const application = buildApplication({ stage: 'RESOLVED' });
    const { onApplicationSelect } = renderList(application);

    fireEvent.click(screen.getByRole('button', { name: 'View Details' }));

    expect(onApplicationSelect).toHaveBeenCalledWith(application);
  });
});
