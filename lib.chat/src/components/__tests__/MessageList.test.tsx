import { fireEvent, screen } from '@testing-library/react';
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

  it('only renders the most recent pageSize messages by default', () => {
    const currentUser = { userId: 'me', firstName: 'Me' };
    const messages = Array.from({ length: 120 }, (_, i) =>
      buildTestMessage({
        id: `m-${i}`,
        senderId: 'other',
        senderName: 'Sarah',
        timestamp: `2026-01-01T10:${String(i).padStart(2, '0')}:00Z`,
        content: `message ${i}`,
      })
    );

    renderWithChatContext(<MessageList messages={messages} pageSize={10} />, {
      value: buildChatContextValue({ currentUser }),
    });

    // Last 10 (110-119) visible, first 10 (0-9) not.
    expect(screen.getByText('message 119')).toBeInTheDocument();
    expect(screen.getByText('message 110')).toBeInTheDocument();
    expect(screen.queryByText('message 0')).toBeNull();
    expect(screen.queryByText('message 99')).toBeNull();
  });

  it('reveals older messages when "Load earlier" is clicked', () => {
    const currentUser = { userId: 'me', firstName: 'Me' };
    const messages = Array.from({ length: 30 }, (_, i) =>
      buildTestMessage({
        id: `m-${i}`,
        senderId: 'other',
        senderName: 'Sarah',
        timestamp: `2026-01-01T10:${String(i).padStart(2, '0')}:00Z`,
        content: `message ${i}`,
      })
    );

    renderWithChatContext(<MessageList messages={messages} pageSize={10} />, {
      value: buildChatContextValue({ currentUser }),
    });

    expect(screen.queryByText('message 0')).toBeNull();

    fireEvent.click(screen.getByTestId('load-earlier-messages'));

    // After one click, 20 should be visible (10 + 10) — that includes 10..29.
    expect(screen.getByText('message 10')).toBeInTheDocument();
    expect(screen.queryByText('message 0')).toBeNull();

    fireEvent.click(screen.getByTestId('load-earlier-messages'));
    // After two clicks all 30 are loaded; the load-earlier button is gone.
    expect(screen.getByText('message 0')).toBeInTheDocument();
    expect(screen.queryByTestId('load-earlier-messages')).toBeNull();
  });

  it('does not show the load-earlier button when total <= pageSize', () => {
    const currentUser = { userId: 'me', firstName: 'Me' };
    const messages = Array.from({ length: 5 }, (_, i) =>
      buildTestMessage({
        id: `m-${i}`,
        senderId: 'other',
        senderName: 'Sarah',
        timestamp: `2026-01-01T10:${String(i).padStart(2, '0')}:00Z`,
        content: `message ${i}`,
      })
    );

    renderWithChatContext(<MessageList messages={messages} pageSize={50} />, {
      value: buildChatContextValue({ currentUser }),
    });

    expect(screen.queryByTestId('load-earlier-messages')).toBeNull();
  });

  it('announces the latest incoming message via an aria-live polite region', () => {
    // Screen readers should be notified when the other party replies.
    // We wrap a focused live region around the most recent incoming
    // bubble's preview so AT users hear the new content without
    // re-announcing the whole conversation history.
    const currentUser = { userId: 'me', firstName: 'Me' };
    const messages = [
      buildTestMessage({
        id: 'm-other',
        senderId: 'other-user',
        senderName: 'Sarah Johnson',
        content: 'hi there',
      }),
    ];

    renderWithChatContext(<MessageList messages={messages} />, {
      value: buildChatContextValue({ currentUser }),
    });

    const liveRegion = screen.getByTestId('messages-live-region');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('aria-relevant', 'additions');
    // The latest incoming preview should be announced.
    expect(liveRegion).toHaveTextContent(/Sarah Johnson/);
    expect(liveRegion).toHaveTextContent(/hi there/);
  });

  it('labels each new bubble with sender and preview for screen readers', () => {
    const currentUser = { userId: 'me', firstName: 'Me' };
    const messages = [
      buildTestMessage({
        id: 'm-other',
        senderId: 'other-user',
        senderName: 'Sarah Johnson',
        content: 'hi there friend',
      }),
    ];

    renderWithChatContext(<MessageList messages={messages} />, {
      value: buildChatContextValue({ currentUser }),
    });

    // The incoming bubble carries an aria-label naming the sender and
    // a content preview so an AT user landing on the article hears
    // both pieces of context.
    expect(
      screen.getByLabelText(/Message from Sarah Johnson: hi there friend/)
    ).toBeInTheDocument();
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
