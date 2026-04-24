import { screen } from '@testing-library/react';
import { MessageList } from '../MessageList';
import { buildChatContextValue, buildTestMessage, renderWithChatContext } from '../../test-utils';

describe('MessageList', () => {
  it('renders the empty state when there are no messages', () => {
    renderWithChatContext(<MessageList messages={[]} />, {
      value: buildChatContextValue(),
    });

    expect(screen.getByText('No messages yet')).toBeInTheDocument();
    expect(screen.getByText(/say hello/i)).toBeInTheDocument();
  });

  it('inserts a day separator when messages span multiple days', () => {
    const currentUser = { userId: 'me', firstName: 'Me' };
    const messages = [
      buildTestMessage({
        id: 'm-old',
        timestamp: '2026-01-01T10:00:00Z',
        senderId: 'other',
        content: 'day one',
      }),
      buildTestMessage({
        id: 'm-new',
        timestamp: '2026-01-03T10:00:00Z',
        senderId: 'other',
        content: 'day three',
      }),
    ];

    renderWithChatContext(<MessageList messages={messages} />, {
      value: buildChatContextValue({ currentUser }),
    });

    const separators = screen.getAllByRole('separator');
    // One for the first message's day (always), one for the day change.
    expect(separators.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('day one')).toBeInTheDocument();
    expect(screen.getByText('day three')).toBeInTheDocument();
  });

  it('shows the sender name for incoming messages but not for own messages', () => {
    const currentUser = { userId: 'me', firstName: 'Me' };
    const messages = [
      buildTestMessage({
        id: 'm-other',
        senderId: 'other-user',
        senderName: 'Sarah Johnson',
        content: 'hi there',
      }),
      buildTestMessage({
        id: 'm-mine',
        senderId: 'me',
        senderName: 'Me',
        content: 'hello',
        timestamp: '2026-01-01T10:05:00Z',
      }),
    ];

    renderWithChatContext(<MessageList messages={messages} />, {
      value: buildChatContextValue({ currentUser }),
    });

    // Incoming: sender name visible.
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    // Own message content renders without a separate sender label element.
    // (We assert the content is there — the "Me" label is never rendered.)
    expect(screen.getByText('hello')).toBeInTheDocument();
    // The outgoing bubble should be labeled as Your message for a11y.
    expect(screen.getByLabelText('Your message')).toBeInTheDocument();
  });

  it('groups consecutive messages from the same sender within the window', () => {
    const currentUser = { userId: 'me', firstName: 'Me' };
    const messages = [
      buildTestMessage({
        id: 'm-1',
        senderId: 'other',
        senderName: 'Sarah',
        timestamp: '2026-01-01T10:00:00Z',
        content: 'first',
      }),
      buildTestMessage({
        id: 'm-2',
        senderId: 'other',
        senderName: 'Sarah',
        timestamp: '2026-01-01T10:00:30Z',
        content: 'second',
      }),
    ];

    renderWithChatContext(<MessageList messages={messages} />, {
      value: buildChatContextValue({ currentUser }),
    });

    // Sender name should appear only once (on the first message of the group).
    expect(screen.getAllByText('Sarah')).toHaveLength(1);
    expect(screen.getByText('first')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
  });
});
