/**
 * ADS-643: Surfaces unread adopter messages on the rescue dashboard.
 *
 * Uses `useUnreadConversations` for the (real-time) unread counts and pairs
 * each id with the matching conversation from `useChat` to render sender,
 * snippet, and timestamp. Each row deep-links to the Communication page
 * with the conversation pre-selected via the `?conversation=<id>` query
 * param. Capped at 5 most-recent unread; full inbox via "View all".
 */
import { Card, Heading, Text } from '@adopt-dont-shop/lib.components';
import {
  safeFormatDistanceToNow,
  useChat,
  useUnreadConversations,
  type Conversation,
} from '@adopt-dont-shop/lib.chat';
import { Link } from 'react-router-dom';
import * as styles from './UnreadMessagesPanel.css';

const MAX_VISIBLE_UNREAD = 5;

const buildConversationLink = (conversationId: string): string =>
  `/communication?conversation=${encodeURIComponent(conversationId)}`;

type UnreadRowProps = {
  conversation: Conversation;
};

const UnreadRow = ({ conversation }: UnreadRowProps) => {
  const lastMessage = conversation.lastMessage;
  const senderName = lastMessage?.senderName ?? 'Adopter';
  const snippet = lastMessage?.content ?? 'New message';
  const timestamp = lastMessage?.timestamp ?? conversation.updatedAt;
  const relative = safeFormatDistanceToNow(timestamp);

  return (
    <li>
      <Link
        to={buildConversationLink(conversation.id)}
        className={styles.rowLink}
        aria-label={`${senderName}: ${snippet}`}
      >
        <div className={styles.rowTopLine}>
          <span className={styles.senderName}>
            <span className={styles.unreadDot} aria-hidden="true" />
            {senderName}
          </span>
          <span className={styles.timestamp}>{relative}</span>
        </div>
        <Text className={styles.snippet}>{snippet}</Text>
      </Link>
    </li>
  );
};

const EmptyState = () => (
  <div className={styles.emptyState}>
    <Text>No unread messages.</Text>
    <Text>
      New messages appear here when an adopter contacts you about a pet, sends a question on an
      application, or starts a direct inquiry.
    </Text>
  </div>
);

export const UnreadMessagesPanel = () => {
  const { totalUnread, unreadByConversationId } = useUnreadConversations();
  const { conversations } = useChat();

  // Pair unread ids with their conversation metadata. Conversations missing
  // from the list (rare race after socket reset) are skipped — there's
  // nothing useful to render without lastMessage / sender.
  const unreadConversations = conversations
    .filter(conv => (unreadByConversationId[conv.id] ?? 0) > 0)
    .slice()
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, MAX_VISIBLE_UNREAD);

  return (
    <Card className={styles.panel} data-testid="unread-messages-panel">
      <div className={styles.header}>
        <div className={styles.headingGroup}>
          <Heading level="h3">Unread messages</Heading>
          {totalUnread > 0 && (
            <span className={styles.countBadge} aria-label={`${totalUnread} unread`}>
              {totalUnread}
            </span>
          )}
        </div>
      </div>

      {unreadConversations.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className={styles.list} data-testid="unread-messages-list">
          {unreadConversations.map(conv => (
            <UnreadRow key={conv.id} conversation={conv} />
          ))}
        </ul>
      )}

      <div className={styles.footer}>
        <Link to="/communication" className={styles.viewAllLink}>
          View all messages
        </Link>
      </div>
    </Card>
  );
};
