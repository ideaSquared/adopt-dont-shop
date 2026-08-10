import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
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

      expect(useAdminChatsMock).toHaveBeenLastCalledWith({ status: 'active' });
    });

    it('re-queries with the search term as the user types', () => {
      renderWithProviders(<Messages />);

      fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'hello' } });

      expect(useAdminChatsMock).toHaveBeenLastCalledWith({ search: 'hello' });
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
});
