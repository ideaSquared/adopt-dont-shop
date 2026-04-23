import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, within } from '@/test-utils/render';
import { AppNavbar } from './AppNavbar';
import type { User } from '@adopt-dont-shop/lib.auth';

type AuthState = { user: User | null; isAuthenticated: boolean };

const authState: AuthState = { user: null, isAuthenticated: false };
const notificationsState = { unreadCount: 0 };
const chatState = { unreadMessageCount: 0 };

const baseUser: User = {
  userId: 'u1',
  email: 'alex@example.com',
  firstName: 'Alex',
  lastName: 'Rivera',
  emailVerified: true,
  userType: 'adopter',
  status: 'active',
};

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useAuth: () => ({
      user: authState.user,
      isAuthenticated: authState.isAuthenticated,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      refreshUser: vi.fn(),
    }),
  };
});

vi.mock('@/contexts/NotificationsContext', () => ({
  useNotifications: () => notificationsState,
}));

vi.mock('@/contexts/ChatContext', () => ({
  useChat: () => chatState,
}));

describe('AppNavbar', () => {
  beforeEach(() => {
    authState.user = null;
    authState.isAuthenticated = false;
    notificationsState.unreadCount = 0;
    chatState.unreadMessageCount = 0;
  });

  describe('logged out', () => {
    it('renders Log in and Sign up CTAs', () => {
      renderWithProviders(<AppNavbar />);
      expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login');
      expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute('href', '/register');
    });

    it('does not show Favorites / Messages / Notifications / user menu', () => {
      renderWithProviders(<AppNavbar />);
      expect(screen.queryByRole('link', { name: /favorites/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /messages/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /notifications/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /user menu/i })).not.toBeInTheDocument();
    });

    it('still shows Discover and Search so visitors can browse', () => {
      renderWithProviders(<AppNavbar />);
      expect(screen.getByRole('link', { name: /discover/i })).toHaveAttribute('href', '/discover');
      expect(screen.getByRole('link', { name: /search/i })).toHaveAttribute('href', '/search');
    });
  });

  describe('logged in', () => {
    beforeEach(() => {
      authState.user = baseUser;
      authState.isAuthenticated = true;
    });

    it('renders the primary adopter links', () => {
      renderWithProviders(<AppNavbar />);
      expect(screen.getByRole('link', { name: /discover/i })).toHaveAttribute('href', '/discover');
      expect(screen.getByRole('link', { name: /search/i })).toHaveAttribute('href', '/search');
      expect(screen.getByRole('link', { name: /favorites/i })).toHaveAttribute(
        'href',
        '/favorites'
      );
    });

    it('renders the user menu trigger', () => {
      renderWithProviders(<AppNavbar />);
      expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
    });

    it('hides the messages badge when there are no unread messages', () => {
      chatState.unreadMessageCount = 0;
      renderWithProviders(<AppNavbar />);
      const messagesLink = screen.getByRole('link', { name: /messages/i });
      expect(within(messagesLink).queryByText(/\d+/)).not.toBeInTheDocument();
    });

    it('shows the messages badge with the unread count', () => {
      chatState.unreadMessageCount = 4;
      renderWithProviders(<AppNavbar />);
      const messagesLink = screen.getByRole('link', { name: /messages/i });
      expect(within(messagesLink).getByText('4')).toBeInTheDocument();
    });

    it('shows the notifications badge with the unread count', () => {
      notificationsState.unreadCount = 7;
      renderWithProviders(<AppNavbar />);
      const notificationsLink = screen.getByRole('link', { name: /notifications/i });
      expect(within(notificationsLink).getByText('7')).toBeInTheDocument();
    });

    it('clamps notification counts over 99 to 99+', () => {
      notificationsState.unreadCount = 145;
      renderWithProviders(<AppNavbar />);
      const notificationsLink = screen.getByRole('link', { name: /notifications/i });
      expect(within(notificationsLink).getByText('99+')).toBeInTheDocument();
    });

    it('does not render the legacy swipe callout', () => {
      renderWithProviders(<AppNavbar />);
      expect(screen.queryByText(/try our new swipe feature/i)).not.toBeInTheDocument();
    });
  });

  it('points the logo at the home route', () => {
    renderWithProviders(<AppNavbar />);
    const logo = screen.getByRole('link', { name: /adopt don't shop/i });
    expect(logo).toHaveAttribute('href', '/');
  });
});
