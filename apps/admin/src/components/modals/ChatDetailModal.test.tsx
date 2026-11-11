/**
 * Smoke tests for the ChatDetailModal — breadcrumb header and EntityInspector shell.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '../../test-utils';
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

const { grantedPermissions } = vi.hoisted(() => ({ grantedPermissions: new Set<string>() }));

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useHasPermission: (permission: string) => ({
      allowed: grantedPermissions.has(permission),
      isLoading: false,
      error: null,
    }),
  };
});

const mockUseEntityActivity = vi.fn();

vi.mock('../../hooks', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('../../hooks');
  return {
    ...actual,
    useEntityActivity: (...args: unknown[]) => mockUseEntityActivity(...args),
  };
});

describe('ChatDetailModal — breadcrumb header', () => {
  it('renders Messages root link and the current chat label as the last segment', () => {
    mockUseEntityActivity.mockReturnValue({ data: [], isLoading: false, error: null });
    render(<ChatDetailModal isOpen onClose={vi.fn()} chatId='chat-1234567890abcdef' />);

    const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i });

    const messagesLink = within(breadcrumb).getByRole('link', { name: 'Messages' });
    expect(messagesLink).toHaveAttribute('href', '/messages');

    // Current segment includes the last 8 chars of the chat id, no link
    expect(within(breadcrumb).queryByRole('link', { name: /Chat #/ })).toBeNull();
    expect(within(breadcrumb).getByText(/Chat #90abcdef/)).toBeInTheDocument();
  });
});

describe('ChatDetailModal — EntityInspector shell', () => {
  it('renders all chat detail tabs plus the new Activity tab', () => {
    mockUseEntityActivity.mockReturnValue({ data: [], isLoading: false, error: null });
    render(<ChatDetailModal isOpen onClose={vi.fn()} chatId='chat-1234567890abcdef' />);

    expect(screen.getByRole('tab', { name: 'Messages' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Participants' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Details' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Moderation' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Activity' })).toBeInTheDocument();
  });

  it('shows the activity empty state when the chat has no audit-log rows', () => {
    mockUseEntityActivity.mockReturnValue({ data: [], isLoading: false, error: null });
    render(<ChatDetailModal isOpen onClose={vi.fn()} chatId='chat-1234567890abcdef' />);

    fireEvent.click(screen.getByRole('tab', { name: 'Activity' }));

    expect(screen.getByText('No activity recorded for this chat.')).toBeInTheDocument();
    expect(mockUseEntityActivity).toHaveBeenCalledWith('chat', 'chat-1234567890abcdef');
  });

  it('renders activity items returned by useEntityActivity', () => {
    mockUseEntityActivity.mockReturnValue({
      data: [
        {
          activityId: '1',
          activityType: 'chat',
          action: 'CREATE',
          description: 'Created chat: Buddy',
          category: 'Chat',
          ipAddress: null,
          userAgent: null,
          createdAt: '2024-06-01T12:00:00.000Z',
        },
      ],
      isLoading: false,
      error: null,
    });
    render(<ChatDetailModal isOpen onClose={vi.fn()} chatId='chat-1234567890abcdef' />);

    fireEvent.click(screen.getByRole('tab', { name: 'Activity' }));

    expect(screen.getByText('Created chat: Buddy')).toBeInTheDocument();
  });
});

describe('ChatDetailModal — management actions', () => {
  const renderModal = () => {
    mockUseEntityActivity.mockReturnValue({ data: [], isLoading: false, error: null });
    render(<ChatDetailModal isOpen onClose={vi.fn()} chatId='chat-1234567890abcdef' />);
  };

  it('shows Archive and Delete to a user holding chat.moderate:any', () => {
    grantedPermissions.clear();
    grantedPermissions.add('chats.read').add('chat.moderate:any');
    renderModal();

    expect(screen.getByRole('button', { name: /archive/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
  });

  it('hides Archive and Delete from a chats.read holder without chat.moderate:any', () => {
    grantedPermissions.clear();
    grantedPermissions.add('chats.read');
    renderModal();

    expect(screen.getByRole('button', { name: /^close$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /archive/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
  });
});
