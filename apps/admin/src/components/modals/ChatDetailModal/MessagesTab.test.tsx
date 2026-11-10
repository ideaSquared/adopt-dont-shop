import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test-utils';
import { MessagesTab } from './MessagesTab';

const mockRefetch = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock('@adopt-dont-shop/lib.chat', () => ({
  useAdminChatMessages: vi.fn(),
  useAdminChatMutations: vi.fn(),
}));

import { useAdminChatMessages, useAdminChatMutations } from '@adopt-dont-shop/lib.chat';

const mockUseAdminChatMessages = vi.mocked(useAdminChatMessages);
const mockUseAdminChatMutations = vi.mocked(useAdminChatMutations);

const buildMutations = (overrides = {}) => ({
  deleteMessage: { mutateAsync: mockMutateAsync, isLoading: false },
  deleteChat: { mutateAsync: vi.fn(), isLoading: false },
  updateChatStatus: { mutateAsync: vi.fn(), isLoading: false },
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAdminChatMutations.mockReturnValue(
    buildMutations() as ReturnType<typeof useAdminChatMutations>
  );
});

describe('MessagesTab', () => {
  it('renders loading state on first page load', () => {
    mockUseAdminChatMessages.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: mockRefetch,
    } as ReturnType<typeof useAdminChatMessages>);

    render(<MessagesTab chatId='chat-1' />);
    expect(screen.getByLabelText('loading')).toBeInTheDocument();
  });

  it('renders empty state when there are no messages', () => {
    mockUseAdminChatMessages.mockReturnValue({
      data: {
        data: {
          messages: [],
          pagination: { page: 1, limit: 50, hasNext: false, hasPrev: false, nextCursor: null },
        },
      },
      isLoading: false,
      refetch: mockRefetch,
    } as ReturnType<typeof useAdminChatMessages>);

    render(<MessagesTab chatId='chat-1' />);
    expect(screen.getByText('No messages in this conversation')).toBeInTheDocument();
  });

  it('renders a list of messages', () => {
    mockUseAdminChatMessages.mockReturnValue({
      data: {
        data: {
          messages: [
            {
              id: 'msg-1',
              content: 'Hello there',
              senderName: 'Alice',
              timestamp: new Date().toISOString(),
            },
            { id: 'msg-2', content: 'Hi!', senderName: 'Bob', timestamp: new Date().toISOString() },
          ],
          pagination: { page: 1, limit: 50, hasNext: false, hasPrev: false, nextCursor: null },
        },
      },
      isLoading: false,
      refetch: mockRefetch,
    } as ReturnType<typeof useAdminChatMessages>);

    render(<MessagesTab chatId='chat-1' />);
    expect(screen.getByText('Hello there')).toBeInTheDocument();
    expect(screen.getByText('Hi!')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows Load More when more pages exist and pages via loadMore, not a page counter', () => {
    const mockLoadMore = vi.fn();
    mockUseAdminChatMessages.mockReturnValue({
      data: {
        data: {
          messages: [
            {
              id: 'msg-1',
              content: 'Hello there',
              senderName: 'Alice',
              timestamp: new Date().toISOString(),
            },
          ],
          pagination: { page: 1, limit: 50, hasNext: true, hasPrev: false, nextCursor: 'c1' },
        },
      },
      isLoading: false,
      isLoadingMore: false,
      hasMore: true,
      loadMore: mockLoadMore,
      refetch: mockRefetch,
    } as ReturnType<typeof useAdminChatMessages>);

    render(<MessagesTab chatId='chat-1' />);
    fireEvent.click(screen.getByRole('button', { name: 'Load More Messages' }));
    expect(mockLoadMore).toHaveBeenCalledTimes(1);
  });

  it('hides Load More when no older messages remain', () => {
    mockUseAdminChatMessages.mockReturnValue({
      data: {
        data: {
          messages: [
            {
              id: 'msg-1',
              content: 'Hello there',
              senderName: 'Alice',
              timestamp: new Date().toISOString(),
            },
          ],
          pagination: { page: 1, limit: 50, hasNext: false, hasPrev: false, nextCursor: null },
        },
      },
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: mockRefetch,
    } as ReturnType<typeof useAdminChatMessages>);

    render(<MessagesTab chatId='chat-1' />);
    expect(screen.queryByRole('button', { name: 'Load More Messages' })).not.toBeInTheDocument();
  });

  it('calls deleteMessage and onMessageDeleted after confirming delete', async () => {
    mockMutateAsync.mockResolvedValue(undefined);
    mockRefetch.mockResolvedValue(undefined);
    const onMessageDeleted = vi.fn();

    mockUseAdminChatMessages.mockReturnValue({
      data: {
        data: {
          messages: [
            {
              id: 'msg-1',
              content: 'Bad message',
              senderName: 'Alice',
              timestamp: new Date().toISOString(),
            },
          ],
          pagination: { page: 1, limit: 50, hasNext: false, hasPrev: false, nextCursor: null },
        },
      },
      isLoading: false,
      refetch: mockRefetch,
    } as ReturnType<typeof useAdminChatMessages>);

    render(<MessagesTab chatId='chat-1' onMessageDeleted={onMessageDeleted} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete message' }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({ chatId: 'chat-1', messageId: 'msg-1' });
      expect(onMessageDeleted).toHaveBeenCalled();
    });
  });
});
