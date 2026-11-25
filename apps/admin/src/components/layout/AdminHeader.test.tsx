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

  it('names the user menu trigger with its visible initials, name and role (WCAG 2.5.3)', () => {
    renderWithProviders(<AdminHeader />);

    expect(screen.getByRole('button', { name: /user menu/i })).toHaveAccessibleName(
      'AL Ada Lovelace super admin, user menu'
    );
  });

  it('offers profile, account settings and sign out from the user menu', async () => {
    renderWithProviders(<AdminHeader />);

    await userEvent.click(screen.getByRole('button', { name: /user menu/i }));

    expect(screen.getByRole('menuitem', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Account Settings' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Sign Out' })).toBeInTheDocument();
  });

  it('navigates to the account page from the user menu', async () => {
    renderWithProviders(<AdminHeader />);

    await userEvent.click(screen.getByRole('button', { name: /user menu/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Account Settings' }));

    expect(mockNavigate).toHaveBeenCalledWith('/account');
  });

  it('logs the user out from the user menu', async () => {
    renderWithProviders(<AdminHeader />);

    await userEvent.click(screen.getByRole('button', { name: /user menu/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sign Out' }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
