/**
 * Behavioural tests for the Security Center page (ADS-108).
 *
 * Tests admin-facing behaviour:
 * - All six security tabs render and are switchable
 * - The MFA tab embeds the lib.auth TwoFactorSettings component
 * - The IP Rules tab loads existing rules from the backend
 * - Creating an IP rule POSTs to the backend and refreshes the list
 * - The Sessions tab shows an empty-state when no sessions are returned
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../test-utils';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  TwoFactorSettings: () => <div data-testid='two-factor-settings'>2FA Settings</div>,
}));

const listSessions = vi.fn();
const listIpRules = vi.fn();
const createIpRule = vi.fn();
const deleteIpRule = vi.fn();
const getLoginHistory = vi.fn();
const getSuspiciousActivity = vi.fn();
const unlockAccount = vi.fn();
const forceLockAccount = vi.fn();
const revokeSession = vi.fn();
const revokeAllUserSessions = vi.fn();

vi.mock('../services/securityService', () => ({
  securityService: {
    listSessions: (...args: unknown[]) => listSessions(...args),
    listIpRules: (...args: unknown[]) => listIpRules(...args),
    createIpRule: (...args: unknown[]) => createIpRule(...args),
    deleteIpRule: (...args: unknown[]) => deleteIpRule(...args),
    getLoginHistory: (...args: unknown[]) => getLoginHistory(...args),
    getSuspiciousActivity: (...args: unknown[]) => getSuspiciousActivity(...args),
    unlockAccount: (...args: unknown[]) => unlockAccount(...args),
    forceLockAccount: (...args: unknown[]) => forceLockAccount(...args),
    revokeSession: (...args: unknown[]) => revokeSession(...args),
    revokeAllUserSessions: (...args: unknown[]) => revokeAllUserSessions(...args),
  },
}));

import SecurityCenter from '../pages/SecurityCenter';

beforeEach(() => {
  vi.clearAllMocks();
  listSessions.mockResolvedValue({ data: [], pagination: {} });
  listIpRules.mockResolvedValue([]);
  getLoginHistory.mockResolvedValue({ data: [], pagination: {} });
  getSuspiciousActivity.mockResolvedValue([]);
});

describe('SecurityCenter', () => {
  it('renders all six security tabs', () => {
    renderWithProviders(<SecurityCenter />);
    expect(screen.getByRole('tab', { name: /Two-Factor Auth/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Active Sessions/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /IP Restrictions/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Login History/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Suspicious Activity/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Account Recovery/i })).toBeInTheDocument();
  });

  it('shows the MFA tab by default with the TwoFactorSettings component', () => {
    renderWithProviders(<SecurityCenter />);
    expect(screen.getByTestId('two-factor-settings')).toBeInTheDocument();
  });

  it('loads and shows IP rules when the IP Restrictions tab is opened', async () => {
    listIpRules.mockResolvedValueOnce([
      {
        ipRuleId: 'rule-1',
        type: 'block',
        cidr: '10.0.0.0/8',
        label: 'corp test',
        isActive: true,
        expiresAt: null,
        createdBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    const user = userEvent.setup();
    renderWithProviders(<SecurityCenter />);
    await user.click(screen.getByRole('tab', { name: /IP Restrictions/i }));

    await waitFor(() => {
      // The description copy also mentions 10.0.0.0/8 as an example, so we
      // expect at least two matches once the rule row renders.
      expect(screen.getAllByText('10.0.0.0/8').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('corp test')).toBeInTheDocument();
    });
  });

  it('creates an IP rule via the inline form and refetches the list', async () => {
    listIpRules.mockResolvedValueOnce([]); // initial empty
    createIpRule.mockResolvedValueOnce({
      ipRuleId: 'rule-2',
      type: 'block',
      cidr: '203.0.113.0/24',
      label: null,
      isActive: true,
      expiresAt: null,
      createdBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    listIpRules.mockResolvedValueOnce([
      {
        ipRuleId: 'rule-2',
        type: 'block',
        cidr: '203.0.113.0/24',
        label: null,
        isActive: true,
        expiresAt: null,
        createdBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    const user = userEvent.setup();
    renderWithProviders(<SecurityCenter />);
    await user.click(screen.getByRole('tab', { name: /IP Restrictions/i }));

    await waitFor(() => {
      expect(listIpRules).toHaveBeenCalled();
    });

    await user.type(screen.getByPlaceholderText(/IP or CIDR/i), '203.0.113.0/24');
    await user.click(screen.getByRole('button', { name: /Add rule/i }));

    await waitFor(() => {
      expect(createIpRule).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'block', cidr: '203.0.113.0/24' })
      );
    });
    await waitFor(() => {
      expect(screen.getAllByText('203.0.113.0/24').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows an empty state on the Sessions tab when none are returned', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SecurityCenter />);
    await user.click(screen.getByRole('tab', { name: /Active Sessions/i }));

    await waitFor(() => {
      expect(listSessions).toHaveBeenCalled();
    });
    expect(await screen.findByText(/No active sessions/i)).toBeInTheDocument();
  });

  it('disables recovery buttons until a user ID is entered', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SecurityCenter />);
    await user.click(screen.getByRole('tab', { name: /Account Recovery/i }));

    const unlockBtn = screen.getByRole('button', { name: /Unlock account/i });
    const lockBtn = screen.getByRole('button', { name: /Force-lock & revoke/i });
    expect(unlockBtn).toBeDisabled();
    expect(lockBtn).toBeDisabled();

    await user.type(screen.getByPlaceholderText(/User ID/i), 'abc-123');
    expect(unlockBtn).not.toBeDisabled();
    expect(lockBtn).not.toBeDisabled();
  });
});
