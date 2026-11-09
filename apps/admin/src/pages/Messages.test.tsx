import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import type { Conversation } from '@adopt-dont-shop/lib.chat';

const { useAdminChatsMock } = vi.hoisted(() => ({ useAdminChatsMock: vi.fn() }));

vi.mock('@adopt-dont-shop/lib.chat', () => ({
  useAdminChats: useAdminChatsMock,
  useAdminChatStats: () => ({
    data: {
      totalChats: 0,
      activeChats: 0,
      totalMessages: 0,
      averageMessagesPerChat: 0,
    },
  }),
  useAdminChatMutations: () => ({
    deleteChat: { mutateAsync: vi.fn() },
    updateChatStatus: { mutateAsync: vi.fn() },
  }),
}));

const chatDetailModalCalls: Array<{ isOpen: boolean; chatId: string | null }> = [];

vi.mock('../components/modals', () => ({
  ChatDetailModal: (props: { isOpen: boolean; chatId: string | null; onClose: () => void }) => {
    chatDetailModalCalls.push({ isOpen: props.isOpen, chatId: props.chatId });
    return props.isOpen ? (
      <div data-testid='chat-detail-modal' data-chat-id={props.chatId ?? ''}>
        chat-detail-modal-open
      </div>
    ) : null;
  },
}));

import Messages from './Messages';

const conversation = (over: Partial<Conversation>): Conversation => ({
  id: 'chat-1',
  participants: [{ id: 'p1', name: 'Alice', type: 'user' }],
  unreadCount: 0,
  updatedAt: '2026-08-10T10:00:00Z',
  createdAt: '2026-08-01T10:00:00Z',
  isActive: true,
  status: 'active',
  ...over,
});

const emptyResult = { data: { data: [] }, isLoading: false, error: null, refetch: vi.fn() };

describe('Messages page', () => {
  beforeEach(() => {
    chatDetailModalCalls.length = 0;
    useAdminChatsMock.mockReset();
    useAdminChatsMock.mockReturnValue(emptyResult);
  });

  describe('deep-link', () => {
    it('opens the chat detail modal when ?chatId= is present in the URL', () => {
      renderWithProviders(<Messages />, { initialRoute: '/messages?chatId=chat-abc' });

      const modal = screen.getByTestId('chat-detail-modal');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('data-chat-id', 'chat-abc');
    });

    it('does not open the chat detail modal without a chatId param', () => {
      renderWithProviders(<Messages />, { initialRoute: '/messages' });

      expect(screen.queryByTestId('chat-detail-modal')).not.toBeInTheDocument();
    });
  });

  describe('filters', () => {
    it('re-queries with the selected status when the Status filter changes', () => {
      renderWithProviders(<Messages />);

      fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'active' } });

      expect(useAdminChatsMock).toHaveBeenLastCalledWith({ status: 'active', page: 1, limit: 20 });
    });

    it('offers only the statuses a chat can have, filtering Closed as locked', () => {
      renderWithProviders(<Messages />);

      const statusFilter = screen.getByLabelText('Status');
      expect(within(statusFilter).queryByRole('option', { name: 'Blocked' })).toBeNull();

      fireEvent.change(statusFilter, {
        target: {
          value: within(statusFilter).getByRole('option', { name: 'Closed' }).getAttribute('value'),
        },
      });

      expect(useAdminChatsMock).toHaveBeenLastCalledWith({ status: 'locked', page: 1, limit: 20 });
    });

    it('re-queries with the search term as the user types', () => {
      renderWithProviders(<Messages />);

      fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'hello' } });

      expect(useAdminChatsMock).toHaveBeenLastCalledWith({ search: 'hello', page: 1, limit: 20 });
    });

    it('renders the conversations returned for the selected filter', () => {
      useAdminChatsMock.mockImplementation((f?: { status?: string }) => ({
        data: {
          data:
            f?.status === 'active'
              ? [
                  conversation({
                    id: 'chat-active',
                    participants: [{ id: 'pa', name: 'ActiveAlice', type: 'user' }],
                  }),
                ]
              : [],
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      }));

      renderWithProviders(<Messages />);
      expect(screen.queryByText('ActiveAlice')).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'active' } });

      expect(screen.getAllByText('ActiveAlice').length).toBeGreaterThan(0);
    });
  });

  describe('pagination', () => {
    const pagedResult = {
      data: {
        data: [conversation({ id: 'chat-p' })],
        pagination: { page: 1, limit: 20, total: 45, totalPages: 3 },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    it('asks for the first page of 20 chats', () => {
      renderWithProviders(<Messages />);

      expect(useAdminChatsMock).toHaveBeenLastCalledWith({ page: 1, limit: 20 });
    });

    it('pages through every chat using the server total', () => {
      useAdminChatsMock.mockReturnValue(pagedResult);
      renderWithProviders(<Messages />);

      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));

      expect(useAdminChatsMock).toHaveBeenLastCalledWith({ page: 2, limit: 20 });
    });

    it('goes back to the first page when the filter changes', () => {
      useAdminChatsMock.mockReturnValue(pagedResult);
      renderWithProviders(<Messages />);
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));

      fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'active' } });

      expect(useAdminChatsMock).toHaveBeenLastCalledWith({ status: 'active', page: 1, limit: 20 });
    });

    it('steps back a page when the last chat on the current page is removed', () => {
      useAdminChatsMock.mockReturnValue({
        ...pagedResult,
        data: { ...pagedResult.data, pagination: { page: 1, limit: 20, total: 21, totalPages: 2 } },
      });
      const { rerender } = renderWithProviders(<Messages />);
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      expect(useAdminChatsMock).toHaveBeenLastCalledWith({ page: 2, limit: 20 });

      // The only chat on page 2 is deleted: the refetch for page 2 is empty
      // and the total drops to 20, which fits on page 1.
      useAdminChatsMock.mockReturnValue({
        ...pagedResult,
        data: { data: [], pagination: { page: 2, limit: 20, total: 20, totalPages: 1 } },
      });
      rerender(<Messages />);

      expect(useAdminChatsMock).toHaveBeenLastCalledWith({ page: 1, limit: 20 });
    });

    it('goes back to the first page when the search changes', () => {
      useAdminChatsMock.mockReturnValue(pagedResult);
      renderWithProviders(<Messages />);
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));

      fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'vet' } });

      expect(useAdminChatsMock).toHaveBeenLastCalledWith({ search: 'vet', page: 1, limit: 20 });
    });
  });
});
