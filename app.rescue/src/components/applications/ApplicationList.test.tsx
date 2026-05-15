import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/**
 * Behaviour tests for the rescue ApplicationList component.
 *
 * - ADS-573: every stage's action button (Start Review / Schedule Visit /
 *   View Details / View) routes through `onApplicationSelect` so the row's
 *   primary CTA actually opens the review modal instead of being a no-op.
 * - ADS-576: the cosmetic bulk-select UI (per-row checkboxes + header chip)
 *   is gone since no bulk-actions toolbar exists in the product.
 */

// Stub the vanilla-extract CSS module so styles are plain class names.
vi.mock('./ApplicationList.css', () => ({
  container: 'container',
  statsSection: 'statsSection',
  filtersSection: 'filtersSection',
  header: 'header',
  headerLeft: 'headerLeft',
  headerRight: 'headerRight',
  title: 'title',
  sortSelect: 'sortSelect',
  tableContainer: 'tableContainer',
  loadingContainer: 'loadingContainer',
  spinner: 'spinner',
  loadingText: 'loadingText',
  emptyContainer: 'emptyContainer',
  emptyText: 'emptyText',
  tableWrapper: 'tableWrapper',
  table: 'table',
  tableHead: 'tableHead',
  tableRow: 'tableRow',
  tableHeader: 'tableHeader',
  tableBody: 'tableBody',
  tableCell: 'tableCell',
  applicantInfo: 'applicantInfo',
  applicantName: 'applicantName',
  applicantEmail: 'applicantEmail',
  petInfo: 'petInfo',
  petName: 'petName',
  petDetails: 'petDetails',
  priorityBadge: () => 'priorityBadge',
  progressIndicators: 'progressIndicators',
  progressBar: 'progressBar',
  progressStep: () => 'progressStep',
  progressLabel: 'progressLabel',
  actionsContainer: 'actionsContainer',
  actionButton: () => 'actionButton',
  errorContainer: 'errorContainer',
  errorContent: 'errorContent',
  errorText: 'errorText',
  errorTitle: 'errorTitle',
  errorMessage: 'errorMessage',
}));

// Stub child components so we exercise ApplicationList in isolation.
vi.mock('./ApplicationStats', () => ({
  default: () => <div data-testid="application-stats" />,
}));
vi.mock('./ApplicationFilters', () => ({
  default: () => <div data-testid="application-filters" />,
}));
vi.mock('../common/StatusBadge', () => ({
  default: ({ status }: { status: string }) => <span>{status}</span>,
}));

import ApplicationList from './ApplicationList';
import type { ApplicationListItem } from '../../types/applications';

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
    finalOutcome: undefined,
    stageProgressPercentage: 0,
    referencesStatus: 'pending',
    homeVisitStatus: 'not_scheduled',
    data: { personalInfo: { email: 'jane@example.com' } },
  } as unknown as ApplicationListItem;
  return { ...base, ...overrides };
};

const baseProps = {
  loading: false,
  error: null,
  filter: {},
  sort: { field: 'submittedAt' as const, direction: 'desc' as const },
  pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
  onFilterChange: vi.fn(),
  onSortChange: vi.fn(),
};

const renderList = (application: ApplicationListItem, onApplicationSelect = vi.fn()) => {
  render(
    <ApplicationList
      {...baseProps}
      applications={[application]}
      onApplicationSelect={onApplicationSelect}
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

describe('ApplicationList [ADS-576] selection UI removed', () => {
  it('renders no checkbox inputs in the table', () => {
    render(
      <ApplicationList
        {...baseProps}
        applications={[buildApplication()]}
        onApplicationSelect={vi.fn()}
      />
    );

    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('does not show a "selected" count chip in the header', () => {
    render(
      <ApplicationList
        {...baseProps}
        applications={[buildApplication(), buildApplication({ id: 'app-2' })]}
        onApplicationSelect={vi.fn()}
      />
    );

    expect(screen.queryByText(/selected$/i)).toBeNull();
  });
});
