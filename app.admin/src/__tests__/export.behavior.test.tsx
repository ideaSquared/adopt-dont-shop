/**
 * Behavioral tests for data export functionality - Users page (Admin App)
 *
 * Tests export behavior on the Users page:
 * - Export button renders and shows dropdown with CSV/PDF options
 * - Export button is disabled while data loads or when no data is available
 * - Selecting CSV triggers CSV generation with the loaded user data
 * - Selecting PDF triggers PDF generation with the loaded user data
 * - Export service functions are correctly typed and callable
 * - ExportButton shows "Exporting..." during export progress
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../test-utils';
import userEvent from '@testing-library/user-event';
import Users from '../pages/Users';
import { ExportButton } from '../components/ui/ExportButton';
import { exportToCSV, exportToPDF } from '../services/exportService';
import type { AdminUser } from '../types/user';

// ── Module mocks ──────────────────────────────────────────────────────────────

const mockUseUsers = vi.fn();
const mockUseSuspendUser = vi.fn();
const mockUseUnsuspendUser = vi.fn();
const mockUseVerifyUser = vi.fn();
const mockUseDeleteUser = vi.fn();

vi.mock('../hooks', () => ({
  useUsers: (...args: unknown[]) => mockUseUsers(...args),
  useSuspendUser: () => mockUseSuspendUser(),
  useUnsuspendUser: () => mockUseUnsuspendUser(),
  useVerifyUser: () => mockUseVerifyUser(),
  useDeleteUser: () => mockUseDeleteUser(),
}));

vi.mock('../services/libraryServices', () => ({
  apiService: { patch: vi.fn(), post: vi.fn(), get: vi.fn() },
}));

vi.mock('../components/modals', () => ({
  UserDetailModal: () => null,
  EditUserModal: () => null,
  CreateSupportTicketModal: () => null,
  UserActionsMenu: () => null,
}));

const mockExportToCSV = vi.fn();
const mockExportToPDF = vi.fn();

vi.mock('../services/exportService', () => ({
  exportData: (
    data: unknown[],
    columns: unknown[],
    filename: string,
    title: string,
    format: string
  ) => {
    if (format === 'csv') {
      mockExportToCSV({ data, columns, filename, title });
    } else {
      mockExportToPDF({ data, columns, filename, title });
    }
  },
  exportToCSV: (...args: unknown[]) => mockExportToCSV(...args),
  exportToPDF: (...args: unknown[]) => mockExportToPDF(...args),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeUser = (overrides: Partial<AdminUser> = {}): AdminUser => ({
  userId: 'u1',
  email: 'test@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  userType: 'adopter',
  status: 'active',
  emailVerified: true,
  rescueName: null,
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-15T10:00:00Z',
  lastLogin: '2025-04-01T08:00:00Z',
  ...overrides,
});

const defaultMutationMock = () => ({ mutateAsync: vi.fn(), isLoading: false });

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Export functionality - Users page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSuspendUser.mockReturnValue(defaultMutationMock());
    mockUseUnsuspendUser.mockReturnValue(defaultMutationMock());
    mockUseVerifyUser.mockReturnValue(defaultMutationMock());
    mockUseDeleteUser.mockReturnValue(defaultMutationMock());
  });

  it('shows the Export button in the page header', () => {
    mockUseUsers.mockReturnValue({
      data: { data: [makeUser()] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderWithProviders(<Users />);
    expect(screen.getByTestId('export-button')).toBeInTheDocument();
  });

  it('shows Export dropdown with CSV and PDF options when clicked', async () => {
    const user = userEvent.setup();
    mockUseUsers.mockReturnValue({
      data: { data: [makeUser()] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderWithProviders(<Users />);

    await user.click(screen.getByTestId('export-button'));

    expect(screen.getByTestId('export-csv')).toBeInTheDocument();
    expect(screen.getByTestId('export-pdf')).toBeInTheDocument();
  });

  it('disables the Export button while users are loading', () => {
    mockUseUsers.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });
    renderWithProviders(<Users />);
    expect(screen.getByTestId('export-button')).toBeDisabled();
  });

  it('disables the Export button when no users are available', () => {
    mockUseUsers.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderWithProviders(<Users />);
    expect(screen.getByTestId('export-button')).toBeDisabled();
  });

  it('triggers CSV export with user data when CSV option is selected', async () => {
    const user = userEvent.setup();
    const userData = [makeUser({ userId: 'u1', email: 'a@b.com' })];
    mockUseUsers.mockReturnValue({
      data: { data: userData },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderWithProviders(<Users />);

    await user.click(screen.getByTestId('export-button'));
    await user.click(screen.getByTestId('export-csv'));

    expect(mockExportToCSV).toHaveBeenCalledTimes(1);
    const call = mockExportToCSV.mock.calls[0][0];
    expect(call.data).toEqual(userData);
    expect(call.filename).toBe('users-export');
  });

  it('triggers PDF export with user data when PDF option is selected', async () => {
    const user = userEvent.setup();
    const userData = [makeUser()];
    mockUseUsers.mockReturnValue({
      data: { data: userData },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderWithProviders(<Users />);

    await user.click(screen.getByTestId('export-button'));
    await user.click(screen.getByTestId('export-pdf'));

    expect(mockExportToPDF).toHaveBeenCalledTimes(1);
    const call = mockExportToPDF.mock.calls[0][0];
    expect(call.data).toEqual(userData);
    expect(call.title).toBe('User Management Export');
  });

  it('closes dropdown after export selection', async () => {
    const user = userEvent.setup();
    mockUseUsers.mockReturnValue({
      data: { data: [makeUser()] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderWithProviders(<Users />);

    await user.click(screen.getByTestId('export-button'));
    expect(screen.getByTestId('export-csv')).toBeVisible();

    await user.click(screen.getByTestId('export-csv'));
    expect(screen.queryByTestId('export-csv')).not.toBeVisible();
  });
});

// ── ExportButton component tests ──────────────────────────────────────────────

describe('ExportButton component', () => {
  it('shows "Exporting..." label while export is in progress', () => {
    renderWithProviders(<ExportButton onExport={vi.fn()} isExporting={true} />);
    expect(screen.getByText('Exporting...')).toBeInTheDocument();
  });

  it('shows "Export" label when not exporting', () => {
    renderWithProviders(<ExportButton onExport={vi.fn()} isExporting={false} />);
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('shows CSV and PDF options in the dropdown', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExportButton onExport={vi.fn()} />);

    await user.click(screen.getByTestId('export-button'));

    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('calls onExport with "csv" when CSV option is selected', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    renderWithProviders(<ExportButton onExport={onExport} />);

    await user.click(screen.getByTestId('export-button'));
    await user.click(screen.getByTestId('export-csv'));

    expect(onExport).toHaveBeenCalledWith('csv');
  });

  it('calls onExport with "pdf" when PDF option is selected', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    renderWithProviders(<ExportButton onExport={onExport} />);

    await user.click(screen.getByTestId('export-button'));
    await user.click(screen.getByTestId('export-pdf'));

    expect(onExport).toHaveBeenCalledWith('pdf');
  });
});

// ── Export service function tests ─────────────────────────────────────────────

describe('Export service functions', () => {
  it('exportToCSV is a callable function', () => {
    expect(typeof exportToCSV).toBe('function');
  });

  it('exportToPDF is a callable function', () => {
    expect(typeof exportToPDF).toBe('function');
  });
});
