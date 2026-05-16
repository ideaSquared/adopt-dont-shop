import React, { useState } from 'react';
import * as styles from '../ChatDetailModal.css';
import { Button, toast } from '@adopt-dont-shop/lib.components';
import { useAdminChatMessages, useAdminChatMutations } from '@adopt-dont-shop/lib.chat';
import { FiMessageSquare, FiTrash2, FiAlertTriangle } from 'react-icons/fi';

type MessagesTabProps = {
  chatId: string;
  onMessageDeleted?: () => void;
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

export const MessagesTab: React.FC<MessagesTabProps> = ({ chatId, onMessageDeleted }) => {
  const [page, setPage] = useState(1);
  const [deleteReason, setDeleteReason] = useState('');
  const [showDeleteReasonPrompt, setShowDeleteReasonPrompt] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

  const {
    data: messagesData,
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useAdminChatMessages(chatId, page, 50);
  const { deleteMessage } = useAdminChatMutations();

  const messages = messagesData?.data?.messages || [];

  const handleDeleteMessageClick = (messageId: string) => {
    setMessageToDelete(messageId);
    setShowDeleteReasonPrompt(true);
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;

    try {
      await deleteMessage.mutateAsync({ chatId, messageId: messageToDelete });
      setShowDeleteReasonPrompt(false);
      setMessageToDelete(null);
      setDeleteReason('');
      await refetchMessages();
      onMessageDeleted?.();
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message. Please try again.', {
        action: {
          label: 'Retry',
          onClick: () => {
            void handleDeleteMessage();
          },
        },
      });
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteReasonPrompt(false);
    setMessageToDelete(null);
    setDeleteReason('');
  };

  if (messagesLoading && page === 1) {
    return <div className={styles.loadingState}>Loading messages...</div>;
  }

  if (messages.length === 0 && !messagesLoading) {
    return (
      <div className={styles.emptyState}>
        <FiMessageSquare />
        <div>No messages in this conversation</div>
      </div>
    );
  }

  const hasMorePages =
    messagesData?.data?.pagination &&
    messagesData.data.pagination.page < messagesData.data.pagination.pages;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className={styles.messageTimeline}>
          {messages.map(message => {
            const isDeleted = message.content === '[Message deleted]';
            return (
              <div key={message.id} className={styles.messageBubble({ isOwn: false })}>
                <div className={styles.messageAvatar}>
                  {getInitials(message.senderName || 'Unknown')}
                </div>
                <div className={styles.messageContent}>
                  <div className={styles.messageHeader}>
                    <span className={styles.messageSender}>
                      {message.senderName || 'Unknown User'}
                    </span>
                    <span className={styles.messageTime}>{formatTimestamp(message.timestamp)}</span>
                  </div>
                  <div className={styles.messageBody({ deleted: isDeleted })}>
                    {message.content}
                  </div>
                  {!isDeleted && (
                    <div className={styles.messageActions}>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleDeleteMessageClick(message.id)}
                        title='Delete message'
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {hasMorePages && (
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <Button
              variant='secondary'
              onClick={() => setPage(p => p + 1)}
              disabled={messagesLoading}
            >
              {messagesLoading ? 'Loading...' : 'Load More Messages'}
            </Button>
          </div>
        )}
      </div>

      {showDeleteReasonPrompt && (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div className={styles.deletePrompt} onClick={handleCancelDelete}>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div className={styles.deletePromptContent} onClick={e => e.stopPropagation()}>
            <div className={styles.deletePromptTitle}>
              <FiAlertTriangle />
              Delete Message
            </div>
            <p className={styles.deletePromptText}>
              Are you sure you want to delete this message? This action cannot be undone. You can
              optionally provide a reason for the deletion.
            </p>
            <textarea
              className={styles.textArea}
              placeholder='Reason for deletion (optional)...'
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
            />
            <div className={styles.deletePromptActions}>
              <Button variant='secondary' onClick={handleCancelDelete}>
                Cancel
              </Button>
              <Button
                variant='danger'
                onClick={handleDeleteMessage}
                disabled={deleteMessage.isLoading}
              >
                {deleteMessage.isLoading ? 'Deleting...' : 'Delete Message'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
