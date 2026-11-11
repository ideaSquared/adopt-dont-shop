import React from 'react';
import * as styles from '../ChatDetailModal.css';
import {
  Modal,
  Button,
  EntityInspector,
  type EntityInspectorTab,
  useConfirm,
  ConfirmDialog,
  Spinner,
  StatusBadge,
  toast,
} from '@adopt-dont-shop/lib.components';
import {
  useAdminChatById,
  useAdminChatMutations,
  type Conversation,
} from '@adopt-dont-shop/lib.chat';
import { useHasPermission } from '@adopt-dont-shop/lib.auth';
import { CHAT_MODERATE_ANY } from '@adopt-dont-shop/lib.types';
import { Archive, MessageSquare, Trash2, X } from 'lucide-react';
import { MessagesTab } from './MessagesTab';
import { ParticipantsTab } from './ParticipantsTab';
import { DetailsTab } from './DetailsTab';
import { ModerationTab } from './ModerationTab';
import { ActivityTab } from './ActivityTab';
import { ModalBreadcrumbNav, type BreadcrumbSegment } from '../ModalBreadcrumbNav';

type ChatDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  chatId: string | null;
  onUpdate?: () => void;
  /** Optional list of sibling chat IDs (in display order) to enable prev/next navigation. */
  siblingIds?: ReadonlyArray<string>;
  /** Called when prev/next is clicked, passes the target chat ID. */
  onNavigate?: (chatId: string) => void;
};

const getStatusBadge = (status?: string) => {
  switch (status) {
    case 'active':
      return <StatusBadge variant='success' label='Active' />;
    case 'archived':
      return <StatusBadge variant='neutral' label='Archived' />;
    case 'blocked':
      return <StatusBadge variant='error' label='Blocked' />;
    default:
      return <StatusBadge variant='neutral' label={status || 'Active'} />;
  }
};

export const ChatDetailModal: React.FC<ChatDetailModalProps> = ({
  isOpen,
  onClose,
  chatId,
  onUpdate,
  siblingIds,
  onNavigate,
}) => {
  const { confirm, confirmProps } = useConfirm();

  const { data: chat, isLoading: chatLoading } = useAdminChatById(chatId);
  const { deleteChat, updateChatStatus } = useAdminChatMutations();
  // The chat service only lets chat.moderate:any archive or delete another rescue's chat.
  const { allowed: canModerate, isLoading: permissionsLoading } =
    useHasPermission(CHAT_MODERATE_ANY);
  const canManageChat = canModerate && !permissionsLoading;

  if (!chatId) {
    return null;
  }

  const conversation = chat as Conversation | undefined;

  const handleArchiveChat = async () => {
    const confirmed = await confirm({
      title: 'Archive Conversation',
      message: 'Are you sure you want to archive this conversation?',
      confirmText: 'Archive',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (!confirmed) {
      return;
    }

    try {
      await updateChatStatus.mutateAsync({ chatId, status: 'archived' });
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Failed to archive chat:', error);
      toast.error('Failed to archive conversation. Please try again.', {
        action: {
          label: 'Retry',
          onClick: () => {
            void handleArchiveChat();
          },
        },
      });
    }
  };

  const handleDeleteChat = async () => {
    const confirmed = await confirm({
      title: 'Delete Conversation',
      message: 'Are you sure you want to delete this conversation? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }

    try {
      await deleteChat.mutateAsync(chatId);
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Failed to delete chat:', error);
      toast.error('Failed to delete conversation. Please try again.', {
        action: {
          label: 'Retry',
          onClick: () => {
            void handleDeleteChat();
          },
        },
      });
    }
  };

  const statusFilter = conversation?.status ?? 'active';
  const breadcrumbSegments: ReadonlyArray<BreadcrumbSegment> = [
    { label: 'Messages', to: '/messages' },
    {
      label: statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1),
      to: `/messages?status=${statusFilter}`,
    },
    { label: `Chat #${chatId.slice(-8)}` },
  ];

  const header = (
    <div className={styles.chatTitle}>
      <MessageSquare size='1em' />
      Conversation Details
      {conversation && (
        <>
          <span className={styles.chatId}>Chat #{conversation.id.slice(-8)}</span>
          <div className={styles.headerBadgeRow}>{getStatusBadge(conversation.status)}</div>
        </>
      )}
    </div>
  );

  const tabs: EntityInspectorTab[] = [
    {
      id: 'messages',
      label: 'Messages',
      content: <MessagesTab chatId={chatId} onMessageDeleted={onUpdate} />,
    },
    {
      id: 'participants',
      label: 'Participants',
      content: conversation ? (
        <ParticipantsTab participants={conversation.participants} onClose={onClose} />
      ) : null,
    },
    {
      id: 'details',
      label: 'Details',
      content: conversation ? (
        <DetailsTab conversation={conversation} getStatusBadge={getStatusBadge} onClose={onClose} />
      ) : null,
    },
    {
      id: 'moderation',
      label: 'Moderation',
      content: conversation ? <ModerationTab chat={conversation} chatId={chatId} /> : null,
    },
    {
      id: 'activity',
      label: 'Activity',
      content: <ActivityTab chatId={chatId} />,
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size='xl'>
      <div className={styles.modalContent}>
        <ModalBreadcrumbNav
          segments={breadcrumbSegments}
          siblingIds={siblingIds}
          currentId={chatId}
          onNavigate={onNavigate}
        />

        {chatLoading ? (
          <div className={styles.loadingState}>
            <Spinner size='sm' label='Loading conversation' />
          </div>
        ) : (
          <EntityInspector
            data-testid='chat-detail-panel'
            resetTabsOnKeyChange={chatId}
            tabs={tabs}
            header={header}
          />
        )}

        <div className={styles.actionBar}>
          {canManageChat && (
            <>
              <Button
                variant='secondary'
                leftIcon={<Archive size='1em' />}
                onClick={handleArchiveChat}
                disabled={conversation?.status === 'archived'}
              >
                Archive
              </Button>
              <Button variant='danger' leftIcon={<Trash2 size='1em' />} onClick={handleDeleteChat}>
                Delete
              </Button>
            </>
          )}
          <div className={styles.closeButtonWrapper}>
            <Button variant='secondary' leftIcon={<X size='1em' />} onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog {...confirmProps} />
    </Modal>
  );
};
