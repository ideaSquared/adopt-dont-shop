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

vi.mock('@adopt-dont-shop/lib.components', async importOriginal => ({
  // Real Tabs: the page's tab behaviour is part of what these tests cover.
  ...(await importOriginal<typeof import('@adopt-dont-shop/lib.components')>()),
  ThemeToggle: () => <div data-testid="theme-toggle">Theme</div>,
}));

// The shared notifications tab fetches preferences; keep it loading.
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

  it('shows the shared personal tabs, defaulting to notifications', () => {
    renderAt('/user-settings');
    expect(screen.getAllByRole('tab').map(t => t.textContent)).toEqual([
      'Notifications',
      'Security',
      'Appearance',
    ]);
    expect(screen.getByText(/loading notification preferences/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Notifications' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it.each([
    ['#security', 'Security'],
    ['#appearance', 'Appearance'],
    ['#notifications', 'Notifications'],
    // Old bookmarks (and RescueSettings' redirect) still use #preferences.
    ['#preferences', 'Notifications'],
  ])('restores the tab from %s', (hash, name) => {
    renderAt(`/user-settings${hash}`);
    expect(screen.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
  });

  it('falls back to notifications for an unknown hash', () => {
    renderAt('/user-settings#nonexistent');
    expect(screen.getByRole('tab', { name: 'Notifications' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('persists the chosen tab in the hash', async () => {
    renderAt('/user-settings');
    fireEvent.click(screen.getByRole('tab', { name: 'Security' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('#security'));
    expect(screen.getByRole('tab', { name: 'Security' })).toHaveAttribute('aria-selected', 'true');
  });

  it('moves between tabs with the arrow keys and keeps the hash in step', async () => {
    renderAt('/user-settings');
    screen.getByRole('tab', { name: 'Notifications' }).focus();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Notifications' }), { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('#security'));
    expect(screen.getByRole('tab', { name: 'Security' })).toHaveFocus();
  });
});
