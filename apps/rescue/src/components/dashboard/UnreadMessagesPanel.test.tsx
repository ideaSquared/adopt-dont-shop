/**
 * ADS-643: rescue staff need to see unread adopter messages on the dashboard.
 *
 * Behaviour under test:
 * - When unread conversations exist, the panel lists each with sender,
 *   snippet, and timestamp, capped to the top 5 most-recent.
 * - The total unread count is shown in the heading.
 * - When zero unread, an empty state explains how messages reach the panel.
 * - Clicking a row routes to /communication?conversation=<id>.
 * - The panel is rendered above other non-urgent widgets (the parent
 *   Dashboard owns this ordering; here we just verify the panel exists).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Conversation } from '@adopt-dont-shop/lib.chat';

const mockedUseUnreadConversations = vi.fn();
const mockedUseChat = vi.fn();

vi.mock('@adopt-dont-shop/lib.chat', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.chat')>(
    '@adopt-dont-shop/lib.chat'
  );
  return {
    ...actual,
    useUnreadConversations: () => mockedUseUnreadConversations(),
    useChat: () => mockedUseChat(),
  };
});

import { UnreadMessagesPanel } from './UnreadMessagesPanel';

const baseConversation = (overrides: Partial<Conversation>): Conversation => ({
  id: 'conv-1',
  participants: [],
  unreadCount: 0,
  updatedAt: '2026-05-01T10:00:00Z',
  createdAt: '2026-05-01T10:00:00Z',
  isActive: true,
  status: 'active',
  ...overrides,
});

const renderPanel = () =>
  render(
    <MemoryRouter>
      <UnreadMessagesPanel />
    </MemoryRouter>
  );

describe('UnreadMessagesPanel - ADS-643', () => {
  it('renders one row per unread conversation with sender, snippet, and a deep link', () => {
    const convA = baseConversation({
      id: 'conv-a',
      unreadCount: 2,
      updatedAt: '2026-05-22T10:00:00Z',
      lastMessage: {
        id: 'm-a',
        conversationId: 'conv-a',
        senderId: 'u-1',
        senderName: 'Alice Adopter',
        content: 'Hi, is Buddy still available?',
        timestamp: '2026-05-22T10:00:00Z',
        type: 'text',
        status: 'delivered',
      },
    });
    const convB = baseConversation({
      id: 'conv-b',
      unreadCount: 1,
      updatedAt: '2026-05-21T10:00:00Z',
      lastMessage: {
        id: 'm-b',
        conversationId: 'conv-b',
        senderId: 'u-2',
        senderName: 'Bob Adopter',
        content: 'Can we schedule a meet-and-greet?',
        timestamp: '2026-05-21T10:00:00Z',
        type: 'text',
        status: 'delivered',
      },
    });

    mockedUseUnreadConversations.mockReturnValue({
      totalUnread: 3,
      unreadByConversationId: { 'conv-a': 2, 'conv-b': 1 },
      markRead: vi.fn(),
    });
    mockedUseChat.mockReturnValue({ conversations: [convA, convB] });

    renderPanel();

    expect(screen.getByText(/Unread messages/i)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    expect(screen.getByText('Alice Adopter')).toBeInTheDocument();
    expect(screen.getByText(/Hi, is Buddy still available\?/)).toBeInTheDocument();

    expect(screen.getByText('Bob Adopter')).toBeInTheDocument();
    expect(screen.getByText(/Can we schedule a meet-and-greet\?/)).toBeInTheDocument();

    const aLink = screen.getByRole('link', { name: /Alice Adopter/i });
    expect(aLink).toHaveAttribute('href', '/communication?conversation=conv-a');
    const bLink = screen.getByRole('link', { name: /Bob Adopter/i });
    expect(bLink).toHaveAttribute('href', '/communication?conversation=conv-b');
  });

  it('orders rows by updatedAt descending and caps at 5 entries', () => {
    const makeConv = (id: string, day: number) =>
      baseConversation({
        id,
        unreadCount: 1,
        updatedAt: `2026-05-${day.toString().padStart(2, '0')}T10:00:00Z`,
        lastMessage: {
          id: `m-${id}`,
          conversationId: id,
          senderId: id,
          senderName: `Sender ${id}`,
          content: `snippet-${id}`,
          timestamp: `2026-05-${day.toString().padStart(2, '0')}T10:00:00Z`,
          type: 'text',
          status: 'delivered',
        },
      });
    const conversations = [
      makeConv('old1', 1),
      makeConv('old2', 2),
      makeConv('mid1', 10),
      makeConv('mid2', 11),
      makeConv('new1', 20),
      makeConv('new2', 21),
    ];

    mockedUseUnreadConversations.mockReturnValue({
      totalUnread: 6,
      unreadByConversationId: Object.fromEntries(conversations.map(c => [c.id, 1])),
      markRead: vi.fn(),
    });
    mockedUseChat.mockReturnValue({ conversations });

    renderPanel();

    const list = screen.getByTestId('unread-messages-list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(5);

    // newest first
    const links = within(list).getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/communication?conversation=new2');
    expect(links[1]).toHaveAttribute('href', '/communication?conversation=new1');
    // oldest should be excluded
    expect(screen.queryByText('snippet-old1')).not.toBeInTheDocument();
  });

  it('shows an empty state explaining how messages arrive when there are no unread', () => {
    mockedUseUnreadConversations.mockReturnValue({
      totalUnread: 0,
      unreadByConversationId: {},
      markRead: vi.fn(),
    });
    mockedUseChat.mockReturnValue({ conversations: [] });

    renderPanel();

    expect(screen.getByText(/No unread messages/i)).toBeInTheDocument();
    expect(screen.getByText(/pet/i)).toBeInTheDocument();
    expect(screen.getByText(/application/i)).toBeInTheDocument();
    expect(screen.getByText(/direct inquiry/i)).toBeInTheDocument();
  });

  it('ignores conversations with zero unread even if they are in the conversations list', () => {
    const read = baseConversation({
      id: 'read-1',
      unreadCount: 0,
      lastMessage: {
        id: 'm-r',
        conversationId: 'read-1',
        senderId: 'u-r',
        senderName: 'Already Read',
        content: 'old message',
        timestamp: '2026-05-22T10:00:00Z',
        type: 'text',
        status: 'read',
      },
    });
    const unread = baseConversation({
      id: 'unread-1',
      unreadCount: 1,
      lastMessage: {
        id: 'm-u',
        conversationId: 'unread-1',
        senderId: 'u-u',
        senderName: 'New Adopter',
        content: 'fresh message',
        timestamp: '2026-05-22T10:00:00Z',
        type: 'text',
        status: 'delivered',
      },
    });
    mockedUseUnreadConversations.mockReturnValue({
      totalUnread: 1,
      unreadByConversationId: { 'unread-1': 1, 'read-1': 0 },
      markRead: vi.fn(),
    });
    mockedUseChat.mockReturnValue({ conversations: [read, unread] });

    renderPanel();

    expect(screen.queryByText('Already Read')).not.toBeInTheDocument();
    expect(screen.getByText('New Adopter')).toBeInTheDocument();
  });

  it('renders a "View all" link to the Communication page', () => {
    mockedUseUnreadConversations.mockReturnValue({
      totalUnread: 1,
      unreadByConversationId: { 'unread-1': 1 },
      markRead: vi.fn(),
    });
    mockedUseChat.mockReturnValue({
      conversations: [
        baseConversation({
          id: 'unread-1',
          unreadCount: 1,
          lastMessage: {
            id: 'm-u',
            conversationId: 'unread-1',
            senderId: 'u-u',
            senderName: 'New Adopter',
            content: 'fresh message',
            timestamp: '2026-05-22T10:00:00Z',
            type: 'text',
            status: 'delivered',
          },
        }),
      ],
    });

    renderPanel();

    const viewAll = screen.getByRole('link', { name: /view all/i });
    expect(viewAll).toHaveAttribute('href', '/communication');
  });
});
