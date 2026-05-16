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
    expect(screen.getByText('Loading messages...')).toBeInTheDocument();
  });

  it('renders empty state when there are no messages', () => {
    mockUseAdminChatMessages.mockReturnValue({
      data: { data: { messages: [], pagination: { page: 1, pages: 1, total: 0 } } },
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
          pagination: { page: 1, pages: 1, total: 2 },
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

  it('shows delete-reason prompt when delete button is clicked', () => {
    mockUseAdminChatMessages.mockReturnValue({
      data: {
        data: {
          messages: [
            {
              id: 'msg-1',
              content: 'Offensive content',
              senderName: 'Alice',
              timestamp: new Date().toISOString(),
            },
          ],
          pagination: { page: 1, pages: 1, total: 1 },
        },
      },
      isLoading: false,
      refetch: mockRefetch,
    } as ReturnType<typeof useAdminChatMessages>);

    render(<MessagesTab chatId='chat-1' />);
    fireEvent.click(screen.getByTitle('Delete message'));
    expect(screen.getByPlaceholderText('Reason for deletion (optional)...')).toBeInTheDocument();
  });

  it('clears the delete prompt on cancel', () => {
    mockUseAdminChatMessages.mockReturnValue({
      data: {
        data: {
          messages: [
            {
              id: 'msg-1',
              content: 'Some message',
              senderName: 'Alice',
              timestamp: new Date().toISOString(),
            },
          ],
          pagination: { page: 1, pages: 1, total: 1 },
        },
      },
      isLoading: false,
      refetch: mockRefetch,
    } as ReturnType<typeof useAdminChatMessages>);

    render(<MessagesTab chatId='chat-1' />);
    fireEvent.click(screen.getByTitle('Delete message'));
    expect(screen.getByPlaceholderText('Reason for deletion (optional)...')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(
      screen.queryByPlaceholderText('Reason for deletion (optional)...')
    ).not.toBeInTheDocument();
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
          pagination: { page: 1, pages: 1, total: 1 },
        },
      },
      isLoading: false,
      refetch: mockRefetch,
    } as ReturnType<typeof useAdminChatMessages>);

    render(<MessagesTab chatId='chat-1' onMessageDeleted={onMessageDeleted} />);
    fireEvent.click(screen.getByTitle('Delete message'));

    const deleteButtons = screen.getAllByRole('button', { name: /delete message/i });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({ chatId: 'chat-1', messageId: 'msg-1' });
      expect(onMessageDeleted).toHaveBeenCalled();
    });
  });
});
