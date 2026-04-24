import { fireEvent, screen } from '@testing-library/react';
import { ConversationList } from '../ConversationList';
import {
  buildChatContextValue,
  buildTestConversation,
  renderWithChatContext,
} from '../../test-utils';

describe('ConversationList', () => {
  it('renders a list item for each conversation', () => {
    const conversations = [
      buildTestConversation({ id: 'c1', rescueName: 'Paws Rescue' }),
      buildTestConversation({ id: 'c2', rescueName: 'Happy Tails' }),
    ];
    renderWithChatContext(<ConversationList />, {
      value: buildChatContextValue({ conversations }),
    });

    expect(screen.getByText('Paws Rescue')).toBeInTheDocument();
    expect(screen.getByText('Happy Tails')).toBeInTheDocument();
  });

  it('invokes setActiveConversation and the onConversationSelect callback on click', () => {
    const setActiveConversation = jest.fn();
    const onSelect = jest.fn();
    const conversation = buildTestConversation({ id: 'c1', rescueName: 'Paws Rescue' });

    renderWithChatContext(<ConversationList onConversationSelect={onSelect} />, {
      value: buildChatContextValue({
        conversations: [conversation],
        setActiveConversation,
      }),
    });

    fireEvent.click(screen.getByText('Paws Rescue'));

    expect(setActiveConversation).toHaveBeenCalledWith(conversation);
    expect(onSelect).toHaveBeenCalledWith(conversation);
  });

  it('shows the empty state with the configured CTA when no conversations exist', () => {
    const emptyAction = { label: 'Discover Pets', onClick: jest.fn() };
    renderWithChatContext(
      <ConversationList
        emptyStateDescription="Nothing to see here yet."
        emptyAction={emptyAction}
      />,
      { value: buildChatContextValue({ conversations: [] }) }
    );

    expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    expect(screen.getByText('Nothing to see here yet.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Discover Pets' }));
    expect(emptyAction.onClick).toHaveBeenCalled();
  });

  it('renders unread badges + header count when conversations have unread messages', () => {
    renderWithChatContext(<ConversationList />, {
      value: buildChatContextValue({
        conversations: [
          buildTestConversation({ id: 'c1', rescueName: 'Paws Rescue', unreadCount: 3 }),
          buildTestConversation({ id: 'c2', rescueName: 'Happy Tails', unreadCount: 0 }),
        ],
      }),
    });

    // Row-level badge: the "3" appears on the active-but-not-selected row.
    expect(screen.getByText('3')).toBeInTheDocument();
    // Header-level counter surfaces the total.
    expect(screen.getByText(/3 unread/i)).toBeInTheDocument();
  });

  it('caps the unread badge at 99+', () => {
    renderWithChatContext(<ConversationList />, {
      value: buildChatContextValue({
        conversations: [
          buildTestConversation({ id: 'c1', rescueName: 'Noisy Rescue', unreadCount: 142 }),
        ],
      }),
    });

    expect(screen.getByText('99+')).toBeInTheDocument();
  });
});
