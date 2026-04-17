/**
 * Behavioral tests for FieldPermissions admin page.
 *
 * Covers:
 * - Field list loaded and displayed on mount
 * - handleSave correctly partitions changes into upserts vs deletes
 * - Partial delete failure shows per-field error and still refreshes to reflect DB state
 * - Switching resource tab triggers a fresh data fetch
 * - Switching role chip triggers a fresh data fetch
 * - Load failure shows error state
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen, waitFor, within } from '../test-utils';
import userEvent from '@testing-library/user-event';
import FieldPermissions from '../pages/FieldPermissions';
import type { FieldAccessMap, FieldPermissionRecord } from '@adopt-dont-shop/lib.permissions';

// ─── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock('../services/libraryServices', () => ({
  apiService: {
    get: (url: string) => mockGet(url),
    post: (url: string, body: unknown) => mockPost(url, body),
    delete: (url: string) => mockDelete(url),
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const usersDefaults: FieldAccessMap = {
  email: 'read',
  first_name: 'read',
  last_name: 'read',
  user_type: 'read',
};

const noOverrides: FieldPermissionRecord[] = [];

const existingOverride: FieldPermissionRecord[] = [
  {
    fieldPermissionId: 1,
    resource: 'users',
    fieldName: 'email',
    role: 'admin',
    accessLevel: 'write',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const setupGetMocks = (
  defaults: FieldAccessMap = usersDefaults,
  overrides: FieldPermissionRecord[] = noOverrides
) => {
  mockGet.mockImplementation((url: string) => {
    if (url.includes('/defaults/')) {
      return Promise.resolve({ data: defaults });
    }
    return Promise.resolve({ data: overrides });
  });
};

/**
 * Return the enabled (non-default) <select> for a given field row.
 * Each row has two comboboxes: [disabled default, enabled effective].
 */
const getEffectiveSelect = (fieldName: string): Element => {
  const row = screen.getByText(fieldName).closest('tr');
  const [, effectiveSelect] = within(row!).getAllByRole('combobox');
  return effectiveSelect;
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('FieldPermissions page', () => {
  beforeEach(() => {
    mockPost.mockResolvedValue({ success: true, data: [] });
    mockDelete.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('loading field data', () => {
    it('displays field names from the defaults response', async () => {
      setupGetMocks();
      renderWithProviders(<FieldPermissions />);

      await waitFor(() => {
        expect(screen.getByText('email')).toBeInTheDocument();
        expect(screen.getByText('first_name')).toBeInTheDocument();
        expect(screen.getByText('last_name')).toBeInTheDocument();
      });
    });

    it('shows error message when data load fails', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));
      renderWithProviders(<FieldPermissions />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load field permissions/i)).toBeInTheDocument();
      });
    });
  });

  describe('handleSave — change partitioning', () => {
    it('sends upsert for fields changed away from their default', async () => {
      setupGetMocks(usersDefaults, noOverrides);
      const user = userEvent.setup();
      renderWithProviders(<FieldPermissions />);

      await waitFor(() => expect(screen.getByText('email')).toBeInTheDocument());

      await user.selectOptions(getEffectiveSelect('email'), 'write');

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
      );
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
          '/api/v1/field-permissions/bulk',
          expect.objectContaining({
            overrides: expect.arrayContaining([
              expect.objectContaining({ fieldName: 'email', accessLevel: 'write' }),
            ]),
          })
        );
        expect(mockDelete).not.toHaveBeenCalled();
      });
    });

    it('sends DELETE when reverting a field that has an existing override', async () => {
      setupGetMocks(usersDefaults, existingOverride);
      const user = userEvent.setup();
      renderWithProviders(<FieldPermissions />);

      await waitFor(() => expect(screen.getByText('email')).toBeInTheDocument());

      await user.selectOptions(getEffectiveSelect('email'), 'read');

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
      );
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith('/api/v1/field-permissions/users/admin/email');
        expect(mockPost).not.toHaveBeenCalled();
      });
    });

    it('does not send DELETE when reverting a field with no existing override', async () => {
      setupGetMocks(usersDefaults, noOverrides);
      const user = userEvent.setup();
      renderWithProviders(<FieldPermissions />);

      await waitFor(() => expect(screen.getByText('email')).toBeInTheDocument());

      await user.selectOptions(getEffectiveSelect('email'), 'write');
      await user.selectOptions(getEffectiveSelect('email'), 'read');

      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    });
  });

  describe('handleSave — partial delete failure', () => {
    it('shows which fields failed to delete and still refreshes data', async () => {
      setupGetMocks(usersDefaults, existingOverride);
      mockDelete.mockRejectedValue(new Error('DB error'));

      const user = userEvent.setup();
      renderWithProviders(<FieldPermissions />);

      await waitFor(() => expect(screen.getByText('email')).toBeInTheDocument());

      await user.selectOptions(getEffectiveSelect('email'), 'read');

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
      );

      mockGet.mockClear();
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to revert.*email/i)).toBeInTheDocument();
      });
      expect(mockGet).toHaveBeenCalled();
    });
  });

  describe('resource and role switching', () => {
    it('fetches new data when admin switches to a different resource tab', async () => {
      setupGetMocks();
      renderWithProviders(<FieldPermissions />);

      await waitFor(() => expect(screen.getByText('email')).toBeInTheDocument());
      mockGet.mockClear();

      await userEvent.setup().click(screen.getByRole('button', { name: /^pets$/i }));

      await waitFor(() => expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/pets/')));
    });

    it('fetches new data when admin switches to a different role', async () => {
      setupGetMocks();
      renderWithProviders(<FieldPermissions />);

      await waitFor(() => expect(screen.getByText('email')).toBeInTheDocument());
      mockGet.mockClear();

      await userEvent.setup().click(screen.getByRole('button', { name: /adopter/i }));

      await waitFor(() =>
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/adopter'))
      );
    });
  });
});
