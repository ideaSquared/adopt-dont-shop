import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { AuditLogLevel, AuditLogStatus, type AuditLog } from '@adopt-dont-shop/lib.audit-logs';

const { getAuditLogsMock } = vi.hoisted(() => ({ getAuditLogsMock: vi.fn() }));

vi.mock('@adopt-dont-shop/lib.audit-logs', () => ({
  AuditLogsService: { getAuditLogs: getAuditLogsMock },
  AuditLogStatus: { SUCCESS: 'success', FAILURE: 'failure' },
  AuditLogLevel: { INFO: 'INFO', WARNING: 'WARNING', ERROR: 'ERROR' },
}));

import Audit from './Audit';

const alice: AuditLog = {
  id: 1,
  service: 'auth',
  user: 'u1',
  userName: 'Alice',
  userEmail: 'alice@example.com',
  userType: 'admin',
  action: 'create',
  level: AuditLogLevel.INFO,
  status: AuditLogStatus.SUCCESS,
  timestamp: new Date('2026-08-10T10:00:00Z'),
  metadata: null,
  category: 'user',
  ip_address: '10.0.0.1',
  user_agent: 'jsdom',
};

const bob: AuditLog = {
  id: 2,
  service: 'rescue',
  user: 'u2',
  userName: 'Bob',
  userEmail: 'bob@example.com',
  userType: 'admin',
  action: 'delete',
  level: AuditLogLevel.WARNING,
  status: AuditLogStatus.FAILURE,
  timestamp: new Date('2026-08-10T09:00:00Z'),
  metadata: null,
  category: 'rescue',
  ip_address: '10.0.0.2',
  user_agent: 'jsdom',
};

const responseFor = (logs: AuditLog[]) => ({
  success: true,
  data: logs,
  pagination: { page: 1, limit: 50, total: logs.length, pages: 1 },
});

describe('Audit filters', () => {
  beforeEach(() => {
    getAuditLogsMock.mockReset();
    getAuditLogsMock.mockResolvedValue(responseFor([alice, bob]));
  });

  it('renders the audit log rows returned by the service', async () => {
    renderWithProviders(<Audit />);

    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('re-queries with the selected action when the Action filter changes', async () => {
    renderWithProviders(<Audit />);
    await screen.findByText('Alice');

    fireEvent.change(screen.getByLabelText('Action'), { target: { value: 'create' } });

    await waitFor(() =>
      expect(getAuditLogsMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'create' }))
    );
  });

  it('filters the rendered rows client-side as the search term is typed', async () => {
    renderWithProviders(<Audit />);
    await screen.findByText('Bob');

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'alice' } });

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });
});
