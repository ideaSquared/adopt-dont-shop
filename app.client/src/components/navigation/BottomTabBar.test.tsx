import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, within } from '@/test-utils/render';
import { BottomTabBar } from './BottomTabBar';
import type { User } from '@adopt-dont-shop/lib.auth';

const authState: { user: User | null; isAuthenticated: boolean } = {
  user: null,
  isAuthenticated: false,
};
const chatState = { unreadMessageCount: 0 };
const matchPreferencesState = { hasPreferences: false, isLoading: false };

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

vi.mock('@/hooks/useMatchPreferences', () => ({
  useMatchPreferences: () => matchPreferencesState,
}));

describe('BottomTabBar', () => {
  beforeEach(() => {
    authState.user = null;
    authState.isAuthenticated = false;
    chatState.unreadMessageCount = 0;
    matchPreferencesState.hasPreferences = false;
    matchPreferencesState.isLoading = false;
  });

  it('does not render when the user is unauthenticated', () => {
    const { container } = renderWithProviders(<BottomTabBar />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a navigation region with the primary tabs when authenticated', () => {
    authState.user = baseUser;
    authState.isAuthenticated = true;
    renderWithProviders(<BottomTabBar />);
    const nav = screen.getByRole('navigation', { name: /primary/i });
    expect(within(nav).getByRole('link', { name: /discover/i })).toHaveAttribute(
      'href',
      '/discover'
    );
    expect(within(nav).getByRole('link', { name: /search/i })).toHaveAttribute('href', '/search');
    expect(within(nav).getByRole('link', { name: /top picks/i })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /favorites/i })).toHaveAttribute(
      'href',
      '/favorites'
    );
    expect(within(nav).getByRole('link', { name: /messages/i })).toHaveAttribute('href', '/chat');
    expect(within(nav).getByRole('button', { name: /user menu/i })).toBeInTheDocument();
  });

  it('routes Top Picks to /match/top-picks when preferences are set', () => {
    authState.user = baseUser;
    authState.isAuthenticated = true;
    matchPreferencesState.hasPreferences = true;
    renderWithProviders(<BottomTabBar />);
    expect(screen.getByRole('link', { name: /top picks/i })).toHaveAttribute(
      'href',
      '/match/top-picks'
    );
  });

  it('routes Top Picks to /match/onboarding when no preferences are set', () => {
    authState.user = baseUser;
    authState.isAuthenticated = true;
    matchPreferencesState.hasPreferences = false;
    renderWithProviders(<BottomTabBar />);
    expect(screen.getByRole('link', { name: /top picks/i })).toHaveAttribute(
      'href',
      '/match/onboarding'
    );
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
