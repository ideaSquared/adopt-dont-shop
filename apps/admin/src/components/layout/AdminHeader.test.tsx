import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from '../../test-utils';
import { AdminHeader } from './AdminHeader';

const mockLogout = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({
    user: { firstName: 'Ada', lastName: 'Lovelace', userType: 'super_admin' },
    logout: mockLogout,
  }),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('AdminHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the mobile navigation from the hamburger button', async () => {
    const onMobileMenuOpen = vi.fn();
    renderWithProviders(<AdminHeader onMobileMenuOpen={onMobileMenuOpen} />);

    await userEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));

    expect(onMobileMenuOpen).toHaveBeenCalledTimes(1);
  });

  it('offers profile, account settings and sign out from the user menu', async () => {
    renderWithProviders(<AdminHeader />);

    await userEvent.click(screen.getByRole('button', { name: 'User menu' }));

    expect(screen.getByRole('menuitem', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Account Settings' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Sign Out' })).toBeInTheDocument();
  });

  it('navigates to the account page from the user menu', async () => {
    renderWithProviders(<AdminHeader />);

    await userEvent.click(screen.getByRole('button', { name: 'User menu' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Account Settings' }));

    expect(mockNavigate).toHaveBeenCalledWith('/account');
  });

  it('logs the user out from the user menu', async () => {
    renderWithProviders(<AdminHeader />);

    await userEvent.click(screen.getByRole('button', { name: 'User menu' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sign Out' }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
