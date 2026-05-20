import { useChat } from '@/contexts/ChatContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import {
  ChatWindow,
  ConversationList,
  type ConversationListFilter,
  type ConversationStatus,
} from '@adopt-dont-shop/lib.chat';
import { Button, ConfirmDialog, toast, useConfirm } from '@adopt-dont-shop/lib.components';
import { CHAT_UPDATE } from '@adopt-dont-shop/lib.permissions';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import * as styles from './Communication.css';

// ADS-583: "resolved" maps to the backend's `archived` status. The backend's
// ChatStatus enum only accepts active|locked|archived; lib.chat's broader
// zod schema lists 'closed' too but the API rejects it. Mirror the admin
// archive flow to stay consistent.
const RESOLVED_STATUS: ConversationStatus = 'archived';
const ACTIVE_STATUS: ConversationStatus = 'active';

const FILTER_STORAGE_KEY = 'rescue.communication.filter';

const isFilterValue = (value: string | null): value is 'active' | 'resolved' =>
  value === 'active' || value === 'resolved';

const loadInitialFilter = (): 'active' | 'resolved' => {
  if (typeof window === 'undefined') {
    return 'active';
  }
  try {
    const stored = window.localStorage.getItem(FILTER_STORAGE_KEY);
    if (isFilterValue(stored)) {
      return stored;
    }
  } catch {
    // localStorage unavailable (e.g. private mode); fall through to default
  }
  return 'active';
};

const persistFilter = (filter: 'active' | 'resolved'): void => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(FILTER_STORAGE_KEY, filter);
  } catch {
    // ignore — filter still works in memory
  }
};

function Communication() {
  const { activeConversation, updateConversationStatus } = useChat();
  const { hasPermission } = usePermissions();
  const { confirm, confirmProps } = useConfirm();
  const [isMobile, setIsMobile] = useState(false);
  const [filter, setFilter] = useState<'active' | 'resolved'>(loadInitialFilter);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const showChat = isMobile && activeConversation !== null;
  const canManageChat = hasPermission(CHAT_UPDATE);

  const handleFilterChange = (next: 'active' | 'resolved') => {
    setFilter(next);
    persistFilter(next);
  };

  const isResolved =
    activeConversation?.status === RESOLVED_STATUS || activeConversation?.status === 'closed';

  const handleMarkResolved = async () => {
    if (!activeConversation) {
      return;
    }
    const confirmed = await confirm({
      title: 'Mark conversation as resolved',
      message:
        'This will move the conversation out of your Active inbox. A new message from the adopter will reopen it.',
      confirmText: 'Mark resolved',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (!confirmed) {
      return;
    }
    setIsUpdating(true);
    try {
      await updateConversationStatus(activeConversation.id, RESOLVED_STATUS);
      toast.success('Conversation marked as resolved');
    } catch {
      toast.error('Failed to mark conversation as resolved. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReopen = async () => {
    if (!activeConversation) {
      return;
    }
    setIsUpdating(true);
    try {
      await updateConversationStatus(activeConversation.id, ACTIVE_STATUS);
      toast.success('Conversation reopened');
    } catch {
      toast.error('Failed to reopen conversation. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const conversationListFilter: ConversationListFilter = filter;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1>Communication</h1>
        <p>Manage conversations with potential adopters</p>
        <div className={styles.toolbar} role="tablist" aria-label="Conversation filter">
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'active'}
            className={clsx(styles.filterTab, filter === 'active' && styles.filterTabActive)}
            onClick={() => handleFilterChange('active')}
          >
            Active
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'resolved'}
            className={clsx(styles.filterTab, filter === 'resolved' && styles.filterTabActive)}
            onClick={() => handleFilterChange('resolved')}
          >
            Resolved
          </button>
          {activeConversation && canManageChat && (
            <div className={styles.actionGroup}>
              {isResolved ? (
                <Button variant="secondary" size="sm" onClick={handleReopen} disabled={isUpdating}>
                  Reopen
                </Button>
              ) : (
                <Button
                  variant="warning"
                  size="sm"
                  onClick={handleMarkResolved}
                  disabled={isUpdating}
                >
                  Mark resolved
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.chatContainer}>
        {isMobile ? (
          <div
            className={clsx(
              styles.mobileView,
              showChat ? styles.mobileViewShowChat : styles.mobileViewHideChat
            )}
          >
            <ConversationList filter={conversationListFilter} />
            <ChatWindow />
          </div>
        ) : (
          <>
            <ConversationList filter={conversationListFilter} />
            <ChatWindow />
          </>
        )}
      </div>

      <ConfirmDialog {...confirmProps} data-testid="mark-resolved-confirm" />
    </div>
  );
}

export default Communication;
