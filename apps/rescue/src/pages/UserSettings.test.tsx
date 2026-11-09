import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router';
import UserSettings from './UserSettings';

// A staff member who lacks rescue:settings:update must still reach their own settings.
vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({ user: { userId: '1' } }),
  useHasPermission: () => ({ allowed: false, isLoading: false, error: null }),
  TwoFactorSettings: () => <div data-testid="two-factor">Two factor</div>,
}));

// Real components (setup-tests stubs them): the list's open/close behaviour is
// part of what these tests cover.
vi.mock('@adopt-dont-shop/lib.components', async importOriginal => ({
  ...(await importOriginal<typeof import('@adopt-dont-shop/lib.components')>()),
}));

// The notifications summary and form fetch preferences; keep them loading.
vi.mock('@adopt-dont-shop/lib.api', async importOriginal => ({
  ...(await importOriginal<typeof import('@adopt-dont-shop/lib.api')>()),
  apiService: { get: () => new Promise(() => undefined) },
}));

const LocationProbe = () => <div data-testid="location">{useLocation().hash}</div>;

const renderAt = (route: string) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[route]}>
        <UserSettings />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('UserSettings', () => {
  it('renders for a user without rescue settings permission', () => {
    renderAt('/user-settings');
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'My Settings' })).toBeInTheDocument();
  });

  it('opens on the settings list with nothing expanded', () => {
    renderAt('/user-settings');
    expect(screen.getByRole('list', { name: 'Account settings' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^close/i })).not.toBeInTheDocument();
  });

  it.each([
    ['#email', 'Close email'],
    ['#password', 'Close password'],
    ['#notifications', 'Close notifications'],
  ])('reopens the section from %s', (hash, name) => {
    renderAt(`/user-settings${hash}`);
    expect(screen.getByRole('button', { name })).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows the plain list for an unknown or retired hash', () => {
    renderAt('/user-settings#security');
    expect(screen.queryByRole('button', { name: /^close/i })).not.toBeInTheDocument();
  });

  it('keeps the open section in the hash, and clears it on close', async () => {
    renderAt('/user-settings');
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('#password'));

    fireEvent.click(screen.getByRole('button', { name: 'Close password' }));
    await waitFor(() => expect(screen.getByTestId('location')).toBeEmptyDOMElement());
  });
});
