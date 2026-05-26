/**
 * Smoke test for the ChatDetailModal breadcrumb header.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '../../test-utils';
import { ChatDetailModal } from './ChatDetailModal/index';

vi.mock('@adopt-dont-shop/lib.chat', () => ({
  useAdminChatById: () => ({
    data: {
      id: 'chat-1234567890abcdef',
      status: 'active',
      participants: [],
    },
    isLoading: false,
  }),
  useAdminChatMessages: () => ({
    data: { data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } },
    isLoading: false,
    refetch: vi.fn(),
  }),
  useAdminChatMutations: () => ({
    deleteChat: { mutateAsync: vi.fn() },
    updateChatStatus: { mutateAsync: vi.fn() },
    deleteMessage: { mutateAsync: vi.fn() },
  }),
}));

describe('ChatDetailModal — breadcrumb header', () => {
  it('renders Messages root link and the current chat label as the last segment', () => {
    render(<ChatDetailModal isOpen onClose={vi.fn()} chatId='chat-1234567890abcdef' />);

    const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i });

    const messagesLink = within(breadcrumb).getByRole('link', { name: 'Messages' });
    expect(messagesLink).toHaveAttribute('href', '/messages');

    // Current segment includes the last 8 chars of the chat id, no link
    expect(within(breadcrumb).queryByRole('link', { name: /Chat #/ })).toBeNull();
    expect(within(breadcrumb).getByText(/Chat #90abcdef/)).toBeInTheDocument();
  });
});
