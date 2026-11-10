import React from 'react';
import * as styles from '../ChatDetailModal.css';
import {
  Avatar,
  Button,
  ConfirmDialog,
  Spinner,
  toast,
  useConfirm,
} from '@adopt-dont-shop/lib.components';
import { useAdminChatMessages, useAdminChatMutations } from '@adopt-dont-shop/lib.chat';
import { MessageSquare, Trash2 } from 'lucide-react';
import { formatChatTimestamp } from './format-chat-timestamp';

type MessagesTabProps = {
  chatId: string;
  onMessageDeleted?: () => void;
};

export const MessagesTab: React.FC<MessagesTabProps> = ({ chatId, onMessageDeleted }) => {
  const { confirm, confirmProps } = useConfirm();

  const {
    data: messagesData,
    isLoading: messagesLoading,
    isLoadingMore,
    loadMore,
    refetch: refetchMessages,
  } = useAdminChatMessages(chatId, 50);
  const { deleteMessage } = useAdminChatMutations();

  const messages = messagesData?.data?.messages || [];

  const performDelete = async (messageId: string) => {
    try {
      await deleteMessage.mutateAsync({ chatId, messageId });
      await refetchMessages();
      onMessageDeleted?.();
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message. Please try again.', {
        action: {
          label: 'Retry',
          onClick: () => {
            void performDelete(messageId);
          },
        },
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const confirmed = await confirm({
      title: 'Delete message?',
      message: 'Are you sure you want to delete this message? This action cannot be undone.',
      confirmText: 'Delete Message',
      variant: 'danger',
    });
    if (confirmed) {
      await performDelete(messageId);
    }
  };

  if (messagesLoading) {
    return (
      <div className={styles.loadingState}>
        <Spinner size='sm' label='Loading messages' />
      </div>
    );
  }

  if (messages.length === 0 && !messagesLoading) {
    return (
      <div className={styles.emptyState}>
        <MessageSquare size='1em' />
        <div>No messages in this conversation</div>
      </div>
    );
  }

  const hasMorePages = messagesData?.data?.pagination?.hasNext ?? false;

  return (
    <>
      <div className={styles.messagesContainer}>
        <div className={styles.messageTimeline}>
          {messages.map(message => {
            const isDeleted = message.content === '[Message deleted]';
            return (
              <div key={message.id} className={styles.messageBubble({ isOwn: false })}>
                <Avatar name={message.senderName || 'Unknown'} size='sm' />
                <div className={styles.messageContent}>
                  <div className={styles.messageHeader}>
                    <span className={styles.messageSender}>
                      {message.senderName || 'Unknown User'}
                    </span>
                    <span className={styles.messageTime}>
                      {formatChatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  <div className={styles.messageBody({ deleted: isDeleted })}>
                    {message.content}
                  </div>
                  {!isDeleted && (
                    <div className={styles.messageActions}>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleDeleteMessage(message.id)}
                        title='Delete message'
                        aria-label='Delete message'
                      >
                        <Trash2 size='1em' />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {hasMorePages && (
          <div className={styles.loadMoreWrapper}>
            <Button variant='secondary' onClick={() => void loadMore()} disabled={isLoadingMore}>
              {isLoadingMore ? 'Loading...' : 'Load More Messages'}
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog {...confirmProps} />
    </>
  );
};
