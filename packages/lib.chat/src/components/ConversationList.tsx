import { Button, Spinner } from '@adopt-dont-shop/lib.components';
import { useChat } from '../context/use-chat';
import type { Conversation } from '../types';
import { safeFormatDistanceToNow } from '../utils/date-helpers';
import * as styles from './ConversationList.css';

type ConversationWithRescueName = Conversation & { rescueName?: string };

const computeInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Status filter for the list:
 * - `'active'`: show conversations whose status is `active` or undefined
 *   (legacy/default backend rows).
 * - `'resolved'`: show conversations whose status is `archived` or `closed`.
 * - `'all'` (default): no filtering, show everything from context.
 */
export type ConversationListFilter = 'active' | 'resolved' | 'all';

type ConversationListProps = {
  /**
   * Called after a conversation is selected and the active conversation has
   * been updated in context. Apps that sync URL state (e.g. `/chat/:id`)
   * perform that navigation here. When omitted, only the active conversation
   * in context changes.
   */
  onConversationSelect?: (conversation: Conversation) => void;
  /** Heading for the list. Defaults to "Conversations". */
  title?: string;
  /** Body copy for the empty state. */
  emptyStateDescription?: string;
  /** Optional CTA button shown in the empty state (e.g. "Discover Pets"). */
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  /** Show only active or only resolved conversations. Defaults to `'all'`. */
  filter?: ConversationListFilter;
};

const matchesFilter = (conversation: Conversation, filter: ConversationListFilter): boolean => {
  if (filter === 'all') {
    return true;
  }
  const status = conversation.status;
  if (filter === 'resolved') {
    return status === 'archived' || status === 'closed';
  }
  // 'active' — treat undefined/null status as active (legacy rows).
  return !status || status === 'active';
};

export function ConversationList({
  onConversationSelect,
  title = 'Conversations',
  emptyStateDescription = 'Start a conversation when you have a matching pet or application to discuss.',
  emptyAction,
  filter = 'all',
}: ConversationListProps) {
  const { conversations, activeConversation, setActiveConversation, isLoading } = useChat();

  const handleConversationClick = (conversation: Conversation) => {
    setActiveConversation(conversation);
    onConversationSelect?.(conversation);
  };

  const getUnreadCount = (conversation: Conversation) => conversation.unreadCount || 0;

  const visibleConversations = (conversations || []).filter((c) => matchesFilter(c, filter));

  const totalUnread = visibleConversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  if (isLoading && (!conversations || conversations.length === 0)) {
    return (
      <div className={styles.conversationContainer}>
        <div className={styles.loadingContainer}>
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.conversationContainer}>
      <div className={styles.header}>
        <h3>{title}</h3>
        {totalUnread > 0 && <span className={styles.headerCount}>{totalUnread} unread</span>}
      </div>

      {visibleConversations.length === 0 ? (
        <div className={styles.emptyState}>
          <div className="illustration" aria-hidden>
            {'\u{1F4AC}'}
          </div>
          <h4>No conversations yet</h4>
          <p>{emptyStateDescription}</p>
          {emptyAction && (
            <Button variant="primary" size="md" onClick={emptyAction.onClick}>
              {emptyAction.label}
            </Button>
          )}
        </div>
      ) : (
        <div className={styles.conversationsList}>
          {visibleConversations.map((conversationRaw) => {
            const conversation = conversationRaw as ConversationWithRescueName;
            const unreadCount = getUnreadCount(conversation);
            const isActive = activeConversation?.id === conversation.id;
            const hasUnread = unreadCount > 0 && !isActive;

            let rescueName = '';
            if (conversation.rescueName) {
              rescueName = conversation.rescueName;
            } else if (Array.isArray(conversation.participants)) {
              const rescueParticipant = conversation.participants.find((p) => p.type === 'rescue');
              rescueName = rescueParticipant?.name || '';
            }
            if (!rescueName) {
              rescueName = 'Rescue Organization';
            }

            const itemStyle = isActive
              ? styles.conversationItem.active
              : hasUnread
                ? styles.conversationItem.unread
                : styles.conversationItem.default;

            return (
              <button
                key={conversation.id}
                className={itemStyle}
                onClick={() => handleConversationClick(conversation)}
                aria-label={`${rescueName}${hasUnread ? `, ${unreadCount} unread message${unreadCount === 1 ? '' : 's'}` : ''}`}
              >
                <div className={hasUnread ? styles.avatarWithUnread : styles.avatar}>
                  {computeInitials(rescueName)}
                </div>
                <div className={styles.conversationBody}>
                  <div className={styles.conversationHeaderRow}>
                    <h4 className={hasUnread ? styles.rescueNameUnread : styles.rescueName}>
                      {rescueName}
                    </h4>
                    <span className={hasUnread ? styles.timestampUnread : styles.timestamp}>
                      {safeFormatDistanceToNow(conversation.updatedAt, 'just now')}
                    </span>
                  </div>

                  <div className={styles.bottomRow}>
                    {conversation.lastMessage ? (
                      <p className={hasUnread ? styles.lastMessageUnread : styles.lastMessage}>
                        {conversation.lastMessage.content}
                      </p>
                    ) : (
                      <p className={styles.lastMessage}>
                        <em>No messages yet</em>
                      </p>
                    )}
                    {hasUnread && (
                      <span className={styles.unreadBadge} aria-hidden>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>

                  {conversation.petId && (
                    <div className={styles.petInfo}>Pet #{conversation.petId}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
