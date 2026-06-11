import React from 'react';
import * as styles from '../ChatDetailModal.css';
import {
  Modal,
  Button,
  EntityInspector,
  type EntityInspectorTab,
  useConfirm,
  ConfirmDialog,
  toast,
} from '@adopt-dont-shop/lib.components';
import {
  useAdminChatById,
  useAdminChatMutations,
  type Conversation,
} from '@adopt-dont-shop/lib.chat';
import { FiMessageSquare, FiTrash2, FiArchive, FiX } from 'react-icons/fi';
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
      return <span className={styles.badge({ variant: 'success' })}>Active</span>;
    case 'archived':
      return <span className={styles.badge({ variant: 'neutral' })}>Archived</span>;
    case 'blocked':
      return <span className={styles.badge({ variant: 'danger' })}>Blocked</span>;
    default:
      return <span className={styles.badge({ variant: 'neutral' })}>{status || 'Active'}</span>;
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
      <FiMessageSquare />
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
          <div className={styles.loadingState}>Loading...</div>
        ) : (
          <EntityInspector
            data-testid='chat-detail-panel'
            resetTabsOnKeyChange={chatId}
            tabs={tabs}
            header={header}
          />
        )}

        <div className={styles.actionBar}>
          <Button
            variant='secondary'
            leftIcon={<FiArchive />}
            onClick={handleArchiveChat}
            disabled={conversation?.status === 'archived'}
          >
            Archive
          </Button>
          <Button variant='danger' leftIcon={<FiTrash2 />} onClick={handleDeleteChat}>
            Delete
          </Button>
          <div className={styles.closeButtonWrapper}>
            <Button variant='secondary' leftIcon={<FiX />} onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog {...confirmProps} />
    </Modal>
  );
};
