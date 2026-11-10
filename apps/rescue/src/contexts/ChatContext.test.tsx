import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatProvider } from './ChatContext';
import { staffService } from '../services/staffService';

const { libChatProvider } = vi.hoisted(() => ({
  libChatProvider: vi.fn(({ children }: { children: React.ReactNode }) => <>{children}</>),
}));

vi.mock('@adopt-dont-shop/lib.chat', () => ({
  ChatProvider: libChatProvider,
  useChat: vi.fn(),
}));

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  // GET /auth/me does not carry the rescue id, so the provider must not rely on it.
  useAuth: () => ({
    user: { userId: 'user-1', firstName: 'Sam' },
    isAuthenticated: true,
  }),
}));

vi.mock('../services/libraryServices', () => ({ chatService: {} }));

vi.mock('../services/staffService', () => ({
  staffService: { getMyRescueId: vi.fn() },
}));

const renderProvider = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ChatProvider>
        <p>chat child</p>
      </ChatProvider>
    </QueryClientProvider>
  );

const lastChatUser = () => libChatProvider.mock.calls.at(-1)?.[0].user;

describe('rescue ChatProvider', () => {
  beforeEach(() => {
    libChatProvider.mockClear();
  });

  it('identifies the viewer as rescue staff using the rescue from their staff membership', async () => {
    vi.mocked(staffService.getMyRescueId).mockResolvedValue('rescue-9');

    renderProvider();

    await waitFor(() =>
      expect(lastChatUser()).toMatchObject({ userId: 'user-1', rescueId: 'rescue-9' })
    );
    expect(screen.getByText('chat child')).toBeInTheDocument();
  });

  it('treats a user with no rescue membership as an adopter', async () => {
    vi.mocked(staffService.getMyRescueId).mockResolvedValue(null);

    renderProvider();

    await waitFor(() => expect(staffService.getMyRescueId).toHaveBeenCalled());
    expect(lastChatUser()?.rescueId).toBeUndefined();
  });
});
