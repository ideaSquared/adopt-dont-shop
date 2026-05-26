import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';

vi.mock('@adopt-dont-shop/lib.chat', () => ({
  useAdminChats: () => ({
    data: { data: [] },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
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

describe('Messages page deep-link', () => {
  beforeEach(() => {
    chatDetailModalCalls.length = 0;
  });

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
