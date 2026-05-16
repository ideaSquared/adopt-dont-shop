import React, { useState } from 'react';
import * as styles from '../ChatDetailModal.css';
import { Modal, Button, useConfirm, ConfirmDialog, toast } from '@adopt-dont-shop/lib.components';
import {
  useAdminChatById,
  useAdminChatMutations,
  type Conversation,
} from '@adopt-dont-shop/lib.chat';
import {
  FiMessageSquare,
  FiUsers,
  FiInfo,
  FiAlertTriangle,
  FiTrash2,
  FiArchive,
  FiX,
} from 'react-icons/fi';
import { MessagesTab } from './MessagesTab';
import { ParticipantsTab } from './ParticipantsTab';
import { DetailsTab } from './DetailsTab';
import { ModerationTab } from './ModerationTab';

type ChatDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  chatId: string | null;
  onUpdate?: () => void;
};

type TabType = 'messages' | 'participants' | 'details' | 'moderation';

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
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('messages');
  const { confirm, confirmProps } = useConfirm();

  const { data: chat, isLoading: chatLoading } = useAdminChatById(chatId);
  const { deleteChat, updateChatStatus } = useAdminChatMutations();

  if (!chatId) return null;

  const conversation = chat as Conversation | undefined;

  const handleArchiveChat = async () => {
    const confirmed = await confirm({
      title: 'Archive Conversation',
      message: 'Are you sure you want to archive this conversation?',
      confirmText: 'Archive',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (!confirmed) return;

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
    if (!confirmed) return;

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} size='xl'>
      <div className={styles.modalContent}>
        <div className={styles.chatHeader}>
          <div className={styles.chatTitle}>
            <FiMessageSquare />
            Conversation Details
          </div>
          {conversation && (
            <>
              <span className={styles.chatId}>Chat #{conversation.id.slice(-8)}</span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {getStatusBadge(conversation.status)}
              </div>
            </>
          )}
        </div>

        <div className={styles.tabBar}>
          <button
            className={styles.tab({ active: activeTab === 'messages' })}
            onClick={() => setActiveTab('messages')}
          >
            <FiMessageSquare />
            Messages
          </button>
          <button
            className={styles.tab({ active: activeTab === 'participants' })}
            onClick={() => setActiveTab('participants')}
          >
            <FiUsers />
            Participants
          </button>
          <button
            className={styles.tab({ active: activeTab === 'details' })}
            onClick={() => setActiveTab('details')}
          >
            <FiInfo />
            Details
          </button>
          <button
            className={styles.tab({ active: activeTab === 'moderation' })}
            onClick={() => setActiveTab('moderation')}
          >
            <FiAlertTriangle />
            Moderation
          </button>
        </div>

        <div className={styles.tabContent}>
          {chatLoading ? (
            <div className={styles.loadingState}>Loading...</div>
          ) : (
            <>
              {activeTab === 'messages' && (
                <MessagesTab chatId={chatId} onMessageDeleted={onUpdate} />
              )}
              {activeTab === 'participants' && conversation && (
                <ParticipantsTab participants={conversation.participants} />
              )}
              {activeTab === 'details' && conversation && (
                <DetailsTab conversation={conversation} getStatusBadge={getStatusBadge} />
              )}
              {activeTab === 'moderation' && conversation && (
                <ModerationTab chat={conversation} chatId={chatId} />
              )}
            </>
          )}
        </div>

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
          <div style={{ marginLeft: 'auto' }}>
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
