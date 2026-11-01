import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import UserSettings from './UserSettings';

// A staff member who lacks rescue:settings:update must still reach their own settings.
vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({ user: { userId: '1' } }),
  useHasPermission: () => ({ allowed: false, isLoading: false, error: null }),
  TwoFactorSettings: () => <div data-testid="two-factor">Two factor</div>,
}));

vi.mock('@adopt-dont-shop/lib.components', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">Theme</div>,
}));

vi.mock('../components/rescue/NotificationPreferencesForm', () => ({
  default: () => <div data-testid="notif-form">Notification Form</div>,
}));

const LocationProbe = () => <div data-testid="location">{useLocation().hash}</div>;

const renderAt = (route: string) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <UserSettings />
      <LocationProbe />
    </MemoryRouter>
  );

describe('UserSettings', () => {
  it('renders for a user without rescue settings permission', () => {
    renderAt('/user-settings');
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'My Settings' })).toBeInTheDocument();
  });

  it('shows only the personal tabs, defaulting to preferences', () => {
    renderAt('/user-settings');
    expect(screen.getAllByRole('tab').map(t => t.textContent)).toEqual([
      'Preferences',
      'Security',
      'Appearance',
    ]);
    expect(screen.getByRole('tab', { name: 'Preferences' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it.each([
    ['#security', 'Security'],
    ['#appearance', 'Appearance'],
    ['#preferences', 'Preferences'],
  ])('restores the tab from %s', (hash, name) => {
    renderAt(`/user-settings${hash}`);
    expect(screen.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
  });

  it('falls back to preferences for an unknown hash', () => {
    renderAt('/user-settings#nonexistent');
    expect(screen.getByRole('tab', { name: 'Preferences' })).toHaveAttribute(
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
});
