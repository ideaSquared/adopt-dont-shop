/**
 * Behavioural tests for the Audit Logs page (Admin App)
 *
 * Tests admin-facing behaviour:
 * - Admin sees the audit logs heading and description
 * - Loading state shown while logs are being fetched
 * - Error state shown when the API fails
 * - Admin sees rows for real audit events (action, user, IP, status)
 * - Admin can filter by action / resource / status (query re-runs)
 * - Admin can client-side search the loaded logs
 * - Admin can open and close the log detail modal
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../test-utils';
import userEvent from '@testing-library/user-event';
import { AuditLogLevel, AuditLogStatus, type AuditLog } from '@adopt-dont-shop/lib.audit-logs';
import Audit from '../pages/Audit';

const mockGetAuditLogs = vi.fn();

vi.mock('@adopt-dont-shop/lib.audit-logs', () => ({
  AuditLogLevel: { INFO: 'INFO', WARNING: 'WARNING', ERROR: 'ERROR' },
  AuditLogStatus: { SUCCESS: 'success', FAILURE: 'failure' },
  AuditLogsService: {
    getAuditLogs: (...args: unknown[]) => mockGetAuditLogs(...args),
  },
}));

const makeLog = (overrides: Partial<AuditLog> = {}): AuditLog => ({
  id: 1,
  service: 'auth',
  user: 'u1',
  userName: 'Jane Admin',
  userEmail: 'jane@example.com',
  userType: 'admin',
  action: 'update',
  level: AuditLogLevel.INFO,
  status: AuditLogStatus.SUCCESS,
  timestamp: new Date('2024-01-01T00:00:00Z'),
  metadata: { entityId: 'ent-9', details: { before: 1, after: 2 } },
  category: 'user_profile',
  ip_address: '10.0.0.1',
  user_agent: 'jest',
  ...overrides,
});

const paginated = (logs: AuditLog[]) => ({
  success: true,
  data: logs,
  pagination: { page: 1, limit: 50, total: logs.length, pages: 1 },
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe('Audit page', () => {
  it('shows the heading and description', async () => {
    mockGetAuditLogs.mockResolvedValue(paginated([makeLog()]));

    renderWithProviders(<Audit />);

    expect(screen.getByRole('heading', { name: 'Audit Logs' })).toBeInTheDocument();
    expect(
      screen.getByText(/System activity tracking and security monitoring/i)
    ).toBeInTheDocument();
  });

  it('renders rows for fetched audit events', async () => {
    mockGetAuditLogs.mockResolvedValue(
      paginated([
        makeLog({ id: 1, userName: 'Jane Admin', ip_address: '10.0.0.1' }),
        makeLog({ id: 2, userName: 'Bob Mod', action: 'delete', ip_address: '10.0.0.2' }),
      ])
    );

    renderWithProviders(<Audit />);

    expect(await screen.findByText('Jane Admin')).toBeInTheDocument();
    expect(screen.getByText('Bob Mod')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.1')).toBeInTheDocument();
  });

  it('shows an error banner when the query fails', async () => {
    mockGetAuditLogs.mockRejectedValue(new Error('boom'));

    renderWithProviders(<Audit />);

    expect(await screen.findByText(/Error loading audit logs: boom/i)).toBeInTheDocument();
  });

  it('re-runs the query with the selected action filter', async () => {
    mockGetAuditLogs.mockResolvedValue(paginated([makeLog()]));

    renderWithProviders(<Audit />);
    await screen.findByText('Jane Admin');

    const [actionSelect] = screen.getAllByRole('combobox');
    await userEvent.selectOptions(actionSelect, 'delete');

    await waitFor(() =>
      expect(mockGetAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ action: 'delete' }))
    );
  });

  it('filters loaded logs by the client-side search box', async () => {
    mockGetAuditLogs.mockResolvedValue(
      paginated([
        makeLog({ id: 1, userName: 'Jane Admin' }),
        makeLog({ id: 2, userName: 'Bob Mod' }),
      ])
    );

    renderWithProviders(<Audit />);
    await screen.findByText('Jane Admin');

    const search = screen.getByPlaceholderText(/Search by user, action, or resource/i);
    await userEvent.type(search, 'Bob');

    await waitFor(() => expect(screen.queryByText('Jane Admin')).not.toBeInTheDocument());
    expect(screen.getByText('Bob Mod')).toBeInTheDocument();
  });

  it('opens and closes the detail modal for a log with details', async () => {
    mockGetAuditLogs.mockResolvedValue(paginated([makeLog()]));

    renderWithProviders(<Audit />);
    await screen.findByText('Jane Admin');

    await userEvent.click(screen.getByRole('button', { name: 'View Details' }));

    expect(screen.getByText('Audit Log Details')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '×' }));

    await waitFor(() => expect(screen.queryByText('Audit Log Details')).not.toBeInTheDocument());
  });
});
