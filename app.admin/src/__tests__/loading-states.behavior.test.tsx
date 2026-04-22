/**
 * Behavioral tests for loading skeleton states (Admin App)
 *
 * Tests admin-facing behavior:
 * - DataTable shows skeleton rows (not text) while data is loading
 * - DataTable shows actual rows after data loads
 * - DataTable shows empty state when data is empty
 * - FieldPermissions shows skeleton while permissions are being fetched
 * - FieldPermissions shows actual field data after load completes
 * - MetricCard shows skeleton while loading
 * - MetricCard shows actual values after data loads
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../test-utils';
import { DataTable, type Column } from '../components/data/DataTable';
import { MetricCard } from '../components/ui/MetricCard';
import FieldPermissions from '../pages/FieldPermissions';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

const mockGet = vi.fn();
vi.mock('../services/libraryServices', () => ({
  apiService: {
    get: (url: string) => mockGet(url),
    post: vi.fn().mockResolvedValue({ success: true, data: [] }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

type SimpleRow = { id: string; name: string; status: string };

const simpleColumns: Column<SimpleRow>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
  { id: 'status', header: 'Status', accessor: 'status' },
];

const simpleRows: SimpleRow[] = [
  { id: '1', name: 'Alice', status: 'active' },
  { id: '2', name: 'Bob', status: 'pending' },
];

// ── DataTable loading states ──────────────────────────────────────────────────

describe('DataTable loading states', () => {
  describe('while loading', () => {
    it('renders skeleton placeholder rows instead of actual data', () => {
      const { container } = renderWithProviders(
        <DataTable columns={simpleColumns} data={[]} loading={true} />
      );
      const skeletonRows = container.querySelectorAll('[data-testid="skeleton-row"]');
      expect(skeletonRows.length).toBeGreaterThan(0);
    });

    it('does not show actual row data during loading', () => {
      renderWithProviders(<DataTable columns={simpleColumns} data={simpleRows} loading={true} />);
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    });

    it('does not show the empty state message during loading', () => {
      renderWithProviders(
        <DataTable columns={simpleColumns} data={[]} loading={true} emptyMessage='No items found' />
      );
      expect(screen.queryByText('No items found')).not.toBeInTheDocument();
    });

    it('shows skeleton rows for a selectable table', () => {
      const { container } = renderWithProviders(
        <DataTable columns={simpleColumns} data={[]} loading={true} selectable={true} />
      );
      const skeletonRows = container.querySelectorAll('[data-testid="skeleton-row"]');
      expect(skeletonRows.length).toBeGreaterThan(0);
    });
  });

  describe('after data loads', () => {
    it('shows actual row data once loading is complete', () => {
      renderWithProviders(<DataTable columns={simpleColumns} data={simpleRows} loading={false} />);
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('does not show skeleton rows once loading is complete', () => {
      const { container } = renderWithProviders(
        <DataTable columns={simpleColumns} data={simpleRows} loading={false} />
      );
      const skeletonRows = container.querySelectorAll('[data-testid="skeleton-row"]');
      expect(skeletonRows.length).toBe(0);
    });

    it('shows empty state message when data is empty and not loading', () => {
      renderWithProviders(
        <DataTable
          columns={simpleColumns}
          data={[]}
          loading={false}
          emptyMessage='No items found'
        />
      );
      expect(screen.getByText('No items found')).toBeInTheDocument();
    });
  });

  describe('column headers', () => {
    it('always shows column headers regardless of loading state', () => {
      renderWithProviders(<DataTable columns={simpleColumns} data={[]} loading={true} />);
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });
  });
});

// ── MetricCard loading states ─────────────────────────────────────────────────

describe('MetricCard loading states', () => {
  describe('while loading', () => {
    it('does not show the metric value while loading', () => {
      renderWithProviders(
        <MetricCard icon='👥' label='Total Users' value='12,543' loading={true} />
      );
      expect(screen.queryByText('12,543')).not.toBeInTheDocument();
    });

    it('still shows the label while loading', () => {
      renderWithProviders(
        <MetricCard icon='👥' label='Total Users' value='12,543' loading={true} />
      );
      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });
  });

  describe('after data loads', () => {
    it('shows the metric value once loading is complete', () => {
      renderWithProviders(
        <MetricCard icon='👥' label='Total Users' value='12,543' loading={false} />
      );
      expect(screen.getByText('12,543')).toBeInTheDocument();
    });

    it('shows the change indicator when provided', () => {
      renderWithProviders(
        <MetricCard
          icon='👥'
          label='Total Users'
          value='12,543'
          change='+5% this month'
          changePositive={true}
          loading={false}
        />
      );
      expect(screen.getByText(/5% this month/)).toBeInTheDocument();
    });
  });
});

// ── FieldPermissions loading states ──────────────────────────────────────────

describe('FieldPermissions loading states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('while loading', () => {
    it('shows a loading skeleton before field data arrives', () => {
      mockGet.mockImplementation(() => new Promise(() => {}));
      const { container } = renderWithProviders(<FieldPermissions />);
      expect(
        container.querySelector('[aria-label="Loading field permissions"]')
      ).toBeInTheDocument();
    });

    it('does not show field names while loading', () => {
      mockGet.mockImplementation(() => new Promise(() => {}));
      renderWithProviders(<FieldPermissions />);
      expect(screen.queryByText('email')).not.toBeInTheDocument();
    });
  });

  describe('after data loads', () => {
    it('shows field names once data has loaded', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/defaults/')) {
          return Promise.resolve({ data: { email: 'read', first_name: 'read' } });
        }
        return Promise.resolve({ data: [] });
      });

      renderWithProviders(<FieldPermissions />);

      await waitFor(() => {
        expect(screen.getByText('email')).toBeInTheDocument();
        expect(screen.getByText('first_name')).toBeInTheDocument();
      });
    });

    it('hides the loading skeleton once data has loaded', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/defaults/')) {
          return Promise.resolve({ data: { email: 'read' } });
        }
        return Promise.resolve({ data: [] });
      });

      const { container } = renderWithProviders(<FieldPermissions />);

      await waitFor(() => {
        expect(
          container.querySelector('[aria-label="Loading field permissions"]')
        ).not.toBeInTheDocument();
      });
    });
  });
});
