import { useChat } from '@/contexts/ChatContext';
import { useHasPermission } from '@adopt-dont-shop/lib.auth';
import {
  ChatWindow,
  ConnectionStatusBanner,
  ConversationList,
  type ConversationListFilter,
  type ConversationStatus,
} from '@adopt-dont-shop/lib.chat';
import {
  Alert,
  Button,
  ConfirmDialog,
  PageHeader,
  Spinner,
  Tabs,
  toast,
  useConfirm,
} from '@adopt-dont-shop/lib.components';
import { CHAT_UPDATE } from '@adopt-dont-shop/lib.permissions';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
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
  const {
    activeConversation,
    conversations,
    setActiveConversation,
    updateConversationStatus,
    isLoading,
    error,
  } = useChat();
  // ADS-757: gate on both `allowed` AND `!isLoading` so the action buttons
  // don't flash hidden during the initial permission fetch.
  // The chat service gates updateChatStatus on chats.read plus chats.update within
  // the chat's own rescue (or chat.moderate:any), so gate resolve/reopen on
  // CHAT_UPDATE. chats.read stays the page gate.
  const { allowed: hasChatUpdate, isLoading: permissionsLoading } = useHasPermission(CHAT_UPDATE);
  const canManageChat = hasChatUpdate && !permissionsLoading;
  const { confirm, confirmProps } = useConfirm();
  const [isMobile, setIsMobile] = useState(false);
  const [filter, setFilter] = useState<'active' | 'resolved'>(loadInitialFilter);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

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

  // ADS-643: support deep links from the dashboard (?conversation=<id>). When
  // the target conversation arrives in the list, select it and consume the
  // param so refreshing the page after a manual switch doesn't fight the user.
  useEffect(() => {
    const requestedId = searchParams.get('conversation');
    if (!requestedId) {
      return;
    }
    const target = conversations.find(c => c.id === requestedId);
    if (!target) {
      return;
    }
    setActiveConversation(target);
    const next = new URLSearchParams(searchParams);
    next.delete('conversation');
    setSearchParams(next, { replace: true });
  }, [searchParams, conversations, setActiveConversation, setSearchParams]);

  const showChat = isMobile && activeConversation !== null;

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

  const conversationView = error ? (
    <Alert variant="error">Error loading chat: {error}</Alert>
  ) : isLoading && conversations.length === 0 ? (
    <div className={styles.loadingContainer}>
      <Spinner />
    </div>
  ) : (
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
  );

  // Both tabs show the same view, filtered by `filter`; only the active panel
  // carries content so the chat UI is mounted once.
  const filterTabs = [
    { id: 'active', label: 'Active', content: filter === 'active' ? conversationView : null },
    { id: 'resolved', label: 'Resolved', content: filter === 'resolved' ? conversationView : null },
  ];

  return (
    <div className={styles.pageContainer}>
      <PageHeader
        title="Communication"
        description="Manage conversations with potential adopters"
        actions={
          activeConversation && canManageChat ? (
            isResolved ? (
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
            )
          ) : undefined
        }
      />

      <ConnectionStatusBanner />

      <Tabs
        aria-label="Conversation filter"
        tabs={filterTabs}
        value={filter}
        onChange={id => isFilterValue(id) && handleFilterChange(id)}
      />

      <ConfirmDialog {...confirmProps} data-testid="mark-resolved-confirm" />
    </div>
  );
}

export default Communication;
