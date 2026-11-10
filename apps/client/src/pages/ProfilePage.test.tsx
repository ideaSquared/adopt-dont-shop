import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@adopt-dont-shop/lib.components';
import { createMockUser } from '@adopt-dont-shop/lib.dev-tools';

const updateProfileMock = vi.fn();

const mockUser = {
  ...createMockUser({
    userId: 'user-1',
    email: 'adopter@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }),
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
    apiService: {
      get: vi.fn().mockResolvedValue({ user: {}, exportedAt: '2026-09-07T00:00:00Z' }),
    },
  };
});

// The shared sections are covered in lib.account; this stub keeps the page's
// own "Privacy & data" section reachable.
vi.mock('@adopt-dont-shop/lib.account', () => ({
  AccountSettings: ({
    value,
    onChange,
    extraSections = [],
    showAccountDetails = true,
  }: {
    value: string;
    onChange: (id: string) => void;
    extraSections?: ReadonlyArray<{ id: string; label: string; content: React.ReactNode }>;
    showAccountDetails?: boolean;
  }) => (
    <div>
      <p>Open settings section: {value || 'none'}</p>
      {showAccountDetails && <p>Shared details form</p>}
      {extraSections.map(section => (
        <button key={section.id} onClick={() => onChange(section.id)}>
          Change {section.label}
        </button>
      ))}
      {extraSections.find(section => section.id === value)?.content}
    </div>
  ),
}));

import { ProfilePage } from './ProfilePage';
import { apiService, applicationService } from '@/services';

const renderProfilePage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/profile']}>
          <ProfilePage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const openPrivacyTab = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('tab', { name: /^settings$/i }));
  await user.click(screen.getByRole('button', { name: /change privacy & data/i }));
};

describe('ProfilePage settings', () => {
  it('opens the settings tab with no section expanded', async () => {
    const user = userEvent.setup();
    renderProfilePage();

    await user.click(screen.getByRole('tab', { name: /^settings$/i }));

    expect(screen.getByText('Open settings section: none')).toBeInTheDocument();
  });

  it('leaves name and phone to the Profile tab rather than the shared details form', async () => {
    const user = userEvent.setup();
    renderProfilePage();

    await user.click(screen.getByRole('tab', { name: /^settings$/i }));

    expect(screen.queryByText('Shared details form')).not.toBeInTheDocument();
  });
});

describe('ProfilePage settings save', () => {
  beforeEach(() => {
    updateProfileMock.mockReset();
  });

  it('persists profile preferences via the auth API and surfaces a success message', async () => {
    const user = userEvent.setup();
    updateProfileMock.mockResolvedValue(undefined);

    renderProfilePage();

    await openPrivacyTab(user);

    // Toggle a privacy setting so the form reveals the Save button
    await user.click(screen.getByLabelText(/show email address/i));

    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledTimes(1);
    });

    const patch = updateProfileMock.mock.calls[0][0];
    expect(patch.privacySettings).toBeDefined();
    expect(patch.preferences).toBeDefined();
    // Notification preferences are saved by the shared Notifications tab, not the profile.
    expect(patch.notificationPreferences).toBeUndefined();

    await waitFor(() => {
      expect(screen.getByText(/settings saved successfully/i)).toBeInTheDocument();
    });
  });

  it('shows an error message and does not silently swallow API failures', async () => {
    const user = userEvent.setup();
    updateProfileMock.mockRejectedValue(new Error('Network error: backend unreachable'));

    // Suppress expected console.error from the failure path
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderProfilePage();

    await openPrivacyTab(user);

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

describe('ProfilePage self-service data export (ADS-1320)', () => {
  const getExportMock = vi.mocked(apiService.get);
  const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
  const revokeObjectURLMock = vi.fn();

  beforeEach(() => {
    getExportMock.mockReset();
    getExportMock.mockResolvedValue({ user: {}, exportedAt: '2026-09-07T00:00:00Z' });
    createObjectURLMock.mockClear();
    revokeObjectURLMock.mockClear();
    URL.createObjectURL = createObjectURLMock;
    URL.revokeObjectURL = revokeObjectURLMock;
  });

  it('downloads the export bundle from GET /api/v1/users/me/export', async () => {
    const user = userEvent.setup();
    renderProfilePage();

    await openPrivacyTab(user);
    await user.click(await screen.findByRole('button', { name: /download my data/i }));

    await waitFor(() => {
      expect(getExportMock).toHaveBeenCalledWith('/api/v1/users/me/export');
    });
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
  });

  it('shows an error when the export fails', async () => {
    const user = userEvent.setup();
    getExportMock.mockRejectedValue(new Error('boom'));
    renderProfilePage();

    await openPrivacyTab(user);
    await user.click(await screen.findByRole('button', { name: /download my data/i }));

    expect(await screen.findByText(/failed to download your data/i)).toBeInTheDocument();
  });
});

describe('ProfilePage applications tab', () => {
  const getApplicationsMock = vi.mocked(applicationService.getUserApplications);

  it('lists the adopter applications with a readable status', async () => {
    const user = userEvent.setup();
    getApplicationsMock.mockResolvedValue([
      {
        id: 'application-abcdef123456',
        petId: 'pet-1',
        petName: 'Biscuit',
        status: 'approved',
        submittedAt: '2024-03-05T10:00:00Z',
        createdAt: '2024-03-05T10:00:00Z',
      },
    ] as Awaited<ReturnType<typeof applicationService.getUserApplications>>);
    renderProfilePage();

    await user.click(screen.getByRole('tab', { name: /^applications$/i }));

    expect(await screen.findByText('Application #123456')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Biscuit' })).toBeInTheDocument();
    expect(screen.getByText('Submitted 5 Mar 2024')).toBeInTheDocument();
  });

  it('shows an error when the applications cannot be loaded', async () => {
    const user = userEvent.setup();
    getApplicationsMock.mockRejectedValue(new Error('boom'));
    renderProfilePage();

    await user.click(screen.getByRole('tab', { name: /^applications$/i }));

    expect(await screen.findByText(/failed to load applications/i)).toBeInTheDocument();
  });
});
