/**
 * Behavioral tests for data export functionality - Rescues page (Admin App)
 *
 * Tests export behavior on the Rescues page:
 * - Export button renders once data loads
 * - Export button disabled while loading
 * - Selecting CSV triggers CSV generation with rescue data
 * - Selecting PDF triggers PDF generation with rescue data
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../test-utils';
import userEvent from '@testing-library/user-event';
import Rescues from '../pages/Rescues';
import type { AdminRescue } from '@/types/rescue';

// ── Module mocks ──────────────────────────────────────────────────────────────

const mockRescueGetAll = vi.fn();

vi.mock('@/services/rescueService', () => ({
  rescueService: {
    getAll: (...args: unknown[]) => mockRescueGetAll(...args),
    getById: vi.fn(),
    verify: vi.fn(),
    reject: vi.fn(),
  },
}));

vi.mock('@/components/modals', () => ({
  RescueDetailModal: () => null,
  RescueVerificationModal: () => null,
  SendEmailModal: () => null,
}));

const mockExportToCSV = vi.fn();
const mockExportToPDF = vi.fn();

vi.mock('@/services/exportService', () => ({
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
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeRescue = (overrides: Partial<AdminRescue> = {}): AdminRescue => ({
  rescueId: 'r1',
  name: 'Test Rescue',
  email: 'rescue@example.com',
  city: 'London',
  state: 'England',
  status: 'verified',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  verifiedAt: '2025-01-02T00:00:00Z',
  activeListings: 10,
  staffCount: 3,
  ...overrides,
});

const paginatedResult = (data: AdminRescue[]) => ({
  data,
  pagination: { page: 1, pages: 1, total: data.length },
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Export functionality - Rescues page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the Export button once rescue data has loaded', async () => {
    mockRescueGetAll.mockResolvedValue(paginatedResult([makeRescue()]));
    renderWithProviders(<Rescues />);
    await waitFor(() => expect(screen.getByTestId('export-button')).toBeInTheDocument());
  });

  it('enables Export button once rescue data has loaded', async () => {
    mockRescueGetAll.mockResolvedValue(paginatedResult([makeRescue()]));
    renderWithProviders(<Rescues />);
    await waitFor(() => expect(screen.getByTestId('export-button')).not.toBeDisabled());
  });

  it('shows CSV and PDF options in the export dropdown', async () => {
    const user = userEvent.setup();
    mockRescueGetAll.mockResolvedValue(paginatedResult([makeRescue()]));
    renderWithProviders(<Rescues />);

    await waitFor(() => expect(screen.getByTestId('export-button')).not.toBeDisabled());
    await user.click(screen.getByTestId('export-button'));

    expect(screen.getByTestId('export-csv')).toBeInTheDocument();
    expect(screen.getByTestId('export-pdf')).toBeInTheDocument();
  });

  it('triggers CSV export with rescue data when CSV option is selected', async () => {
    const user = userEvent.setup();
    const rescueData = [makeRescue()];
    mockRescueGetAll.mockResolvedValue(paginatedResult(rescueData));
    renderWithProviders(<Rescues />);

    await waitFor(() => expect(screen.getByTestId('export-button')).not.toBeDisabled());
    await user.click(screen.getByTestId('export-button'));
    await user.click(screen.getByTestId('export-csv'));

    expect(mockExportToCSV).toHaveBeenCalledTimes(1);
    const call = mockExportToCSV.mock.calls[0][0];
    expect(call.filename).toBe('rescues-export');
    expect(call.data).toEqual(rescueData);
  });

  it('triggers PDF export with rescue data when PDF option is selected', async () => {
    const user = userEvent.setup();
    const rescueData = [makeRescue()];
    mockRescueGetAll.mockResolvedValue(paginatedResult(rescueData));
    renderWithProviders(<Rescues />);

    await waitFor(() => expect(screen.getByTestId('export-button')).not.toBeDisabled());
    await user.click(screen.getByTestId('export-button'));
    await user.click(screen.getByTestId('export-pdf'));

    expect(mockExportToPDF).toHaveBeenCalledTimes(1);
    const call = mockExportToPDF.mock.calls[0][0];
    expect(call.title).toBe('Rescue Management Export');
    expect(call.data).toEqual(rescueData);
  });

  it('keeps Export button disabled when no rescues are found', async () => {
    mockRescueGetAll.mockResolvedValue(paginatedResult([]));
    renderWithProviders(<Rescues />);
    await waitFor(() => expect(mockRescueGetAll).toHaveBeenCalled());
    expect(screen.getByTestId('export-button')).toBeDisabled();
  });
});
