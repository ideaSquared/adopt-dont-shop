import { describe, expect, it, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test-utils/render';
import { NavUserMenu } from './NavUserMenu';
import type { User } from '@adopt-dont-shop/lib.auth';

const baseUser: User = {
  userId: 'u1',
  email: 'alex@example.com',
  firstName: 'Alex',
  lastName: 'Rivera',
  emailVerified: true,
  userType: 'adopter',
  status: 'active',
};

const mockLogout = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useAuth: () => ({
      user: baseUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: mockLogout,
      updateProfile: vi.fn(),
      refreshUser: vi.fn(),
    }),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('NavUserMenu', () => {
  beforeEach(() => {
    mockLogout.mockReset();
    mockNavigate.mockReset();
  });

  it('renders an avatar trigger with the user initials', () => {
    renderWithProviders(<NavUserMenu />);
    const trigger = screen.getByRole('button', { name: /user menu/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('AR');
  });

  it('opens the menu on click and shows user name and email', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavUserMenu />);
    await user.click(screen.getByRole('button', { name: /user menu/i }));
    expect(await screen.findByText('Alex Rivera')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
  });

  it('links each menu item to the correct route', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavUserMenu />);
    await user.click(screen.getByRole('button', { name: /user menu/i }));
    expect(await screen.findByRole('menuitem', { name: /profile/i })).toHaveAttribute(
      'href',
      '/profile'
    );
    expect(screen.getByRole('menuitem', { name: /my applications/i })).toHaveAttribute(
      'href',
      '/applications'
    );
    expect(screen.getByRole('menuitem', { name: /settings/i })).toHaveAttribute(
      'href',
      '/profile?tab=settings'
    );
    expect(screen.getByRole('menuitem', { name: /help/i })).toHaveAttribute('href', '/help');
  });

  it('calls logout and navigates home when Log out is clicked', async () => {
    mockLogout.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(<NavUserMenu />);
    await user.click(screen.getByRole('button', { name: /user menu/i }));
    const logout = await screen.findByRole('menuitem', { name: /log out/i });
    await user.click(logout);
    expect(mockLogout).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('sets aria-expanded on the trigger when the menu is open', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavUserMenu />);
    const trigger = screen.getByRole('button', { name: /user menu/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    await vi.waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
