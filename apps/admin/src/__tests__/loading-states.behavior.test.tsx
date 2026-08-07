/**
 * Behavioral tests for loading skeleton states (Admin App)
 *
 * Tests admin-facing behavior:
 * - FieldPermissions shows skeleton while permissions are being fetched
 * - FieldPermissions shows actual field data after load completes
 *
 * DataTable loading/empty/skeleton behaviour is covered at the source in
 * packages/lib.components (charts/DataTable.test.tsx) now that the admin app
 * uses the shared DataTable, so it is no longer duplicated here.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../test-utils';
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
