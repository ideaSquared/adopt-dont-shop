import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, within } from '@/test-utils/render';
import { BottomTabBar } from './BottomTabBar';
import type { User } from '@adopt-dont-shop/lib.auth';

const authState: { user: User | null; isAuthenticated: boolean } = {
  user: null,
  isAuthenticated: false,
};
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

vi.mock('@/contexts/ChatContext', () => ({
  useChat: () => chatState,
}));

describe('BottomTabBar', () => {
  beforeEach(() => {
    authState.user = null;
    authState.isAuthenticated = false;
    chatState.unreadMessageCount = 0;
  });

  it('does not render when the user is unauthenticated', () => {
    const { container } = renderWithProviders(<BottomTabBar />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a navigation region with 5 primary tabs when authenticated', () => {
    authState.user = baseUser;
    authState.isAuthenticated = true;
    renderWithProviders(<BottomTabBar />);
    const nav = screen.getByRole('navigation', { name: /primary/i });
    expect(within(nav).getByRole('link', { name: /discover/i })).toHaveAttribute(
      'href',
      '/discover'
    );
    expect(within(nav).getByRole('link', { name: /search/i })).toHaveAttribute('href', '/search');
    expect(within(nav).getByRole('link', { name: /favorites/i })).toHaveAttribute(
      'href',
      '/favorites'
    );
    expect(within(nav).getByRole('link', { name: /messages/i })).toHaveAttribute('href', '/chat');
    expect(within(nav).getByRole('button', { name: /user menu/i })).toBeInTheDocument();
  });

  it('shows the unread-messages badge when unreadMessageCount > 0', () => {
    authState.user = baseUser;
    authState.isAuthenticated = true;
    chatState.unreadMessageCount = 3;
    renderWithProviders(<BottomTabBar />);
    const messages = screen.getByRole('link', { name: /messages/i });
    expect(within(messages).getByText('3')).toBeInTheDocument();
  });
});
