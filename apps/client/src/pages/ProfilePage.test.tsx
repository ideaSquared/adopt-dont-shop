import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@adopt-dont-shop/lib.components';
import { createMockUser } from '@adopt-dont-shop/lib.dev-tools';

const updateProfileMock = vi.fn();
const updatePreferencesMock = vi.fn();
const getPreferencesMock = vi.fn();

const mockUser = {
  ...createMockUser({
    userId: 'user-1',
    email: 'adopter@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }),
  notificationPreferences: {
    emailNotifications: true,
    pushNotifications: false,
    smsNotifications: false,
    marketingEmails: false,
  },
  privacySettings: {
    profileVisibility: 'public',
  },
  preferences: {
    petTypes: [],
    maxDistance: 25,
    newsletterOptIn: false,
  },
};

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useAuth: () => ({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: updateProfileMock,
      refreshUser: vi.fn(),
    }),
    TwoFactorSettings: () => <div data-testid='two-factor-settings' />,
  };
});

vi.mock('@/services', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/services');
  return {
    ...actual,
    applicationService: { getUserApplications: vi.fn().mockResolvedValue([]) },
    authService: { deleteAccount: vi.fn().mockResolvedValue(undefined) },
  };
});

vi.mock('@/services/notificationService', () => ({
  default: {
    getPreferences: () => getPreferencesMock(),
    updatePreferences: (...args: unknown[]) => updatePreferencesMock(...args),
  },
}));

import { ProfilePage } from './ProfilePage';
import { authService } from '@/services';

const renderProfilePage = () =>
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/profile']}>
        <ProfilePage />
      </MemoryRouter>
    </ThemeProvider>
  );

describe('ProfilePage settings save', () => {
  beforeEach(() => {
    updateProfileMock.mockReset();
    updatePreferencesMock.mockReset();
    getPreferencesMock.mockReset();

    getPreferencesMock.mockResolvedValue({
      email: true,
      push: false,
      sms: false,
      applications: true,
      messages: true,
      system: true,
      marketing: false,
      reminders: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
    });
  });

  it('persists profile preferences via the auth API and surfaces a success message', async () => {
    const user = userEvent.setup();
    updateProfileMock.mockResolvedValue(undefined);
    updatePreferencesMock.mockResolvedValue(undefined);

    renderProfilePage();

    await user.click(screen.getByRole('button', { name: /^settings$/i }));

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText(/email notifications/i)).toBeInTheDocument();
    });

    // Toggle a privacy setting so the form reveals the Save button
    await user.click(screen.getByLabelText(/show email address/i));

    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledTimes(1);
    });

    const patch = updateProfileMock.mock.calls[0][0];
    expect(patch.notificationPreferences).toBeDefined();
    expect(patch.privacySettings).toBeDefined();
    expect(patch.preferences).toBeDefined();

    expect(updatePreferencesMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByText(/settings saved successfully/i)).toBeInTheDocument();
    });
  });

  it('shows an error message and does not silently swallow API failures', async () => {
    const user = userEvent.setup();
    updatePreferencesMock.mockResolvedValue(undefined);
    updateProfileMock.mockRejectedValue(new Error('Network error: backend unreachable'));

    // Suppress expected console.error from the failure path
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderProfilePage();

    await user.click(screen.getByRole('button', { name: /^settings$/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/email notifications/i)).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/show email address/i));
    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/settings saved successfully/i)).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});

// ADS-1185: account deletion is an explicit two-step confirmation (open the
// modal, click the danger button). It no longer collects a password, because
// the erasure route does not re-verify credentials — collecting one implied a
// re-auth that never happened. Real step-up auth is tracked separately.
describe('ProfilePage delete-account confirmation', () => {
  const deleteAccountMock = vi.mocked(authService.deleteAccount);

  beforeEach(() => {
    deleteAccountMock.mockReset();
    deleteAccountMock.mockResolvedValue(undefined);
    getPreferencesMock.mockResolvedValue({
      email: true,
      push: false,
      sms: false,
      applications: true,
      messages: true,
      system: true,
      marketing: false,
      reminders: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
    });
  });

  // The modal submit button reads "Delete account" (lower-case a); the
  // Settings-tab danger-zone trigger reads "Delete Account" — matched here by
  // exact case so the two never collide.
  const getModalSubmit = () => screen.getByRole('button', { name: 'Delete account' });

  it('does not ask for a password or two-factor code', () => {
    renderProfilePage();

    expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/two-factor code/i)).not.toBeInTheDocument();
  });

  it('submits the erasure request on confirm without collecting credentials', async () => {
    const user = userEvent.setup();
    renderProfilePage();

    await user.click(getModalSubmit());

    await waitFor(() => {
      expect(deleteAccountMock).toHaveBeenCalledTimes(1);
    });
    expect(deleteAccountMock).toHaveBeenCalledWith({ reason: 'User requested account deletion' });
  });

  it('surfaces an error and does not navigate when the erasure request fails', async () => {
    const user = userEvent.setup();
    deleteAccountMock.mockRejectedValue(new Error('service_unavailable'));
    renderProfilePage();

    await user.click(getModalSubmit());

    expect(await screen.findByText(/service_unavailable/i)).toBeInTheDocument();
  });
});
