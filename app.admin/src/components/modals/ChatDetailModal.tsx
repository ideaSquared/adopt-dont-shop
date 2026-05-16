import React, { useState, useEffect } from 'react';
import * as styles from './ChatDetailModal.css';
import { Modal, Button, useConfirm, ConfirmDialog, toast } from '@adopt-dont-shop/lib.components';
import {
  useAdminChatById,
  useAdminChatMessages,
  useAdminChatMutations,
  type Conversation,
  type Message,
  type Participant,
} from '@adopt-dont-shop/lib.chat';
import { moderationService, type Report } from '@adopt-dont-shop/lib.moderation';
import {
  FiMessageSquare,
  FiUsers,
  FiInfo,
  FiAlertTriangle,
  FiTrash2,
  FiArchive,
  FiX,
  FiMoreVertical,
  FiClock,
  FiFlag,
  FiFileText,
} from 'react-icons/fi';

type ChatDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  chatId: string | null;
  onUpdate?: () => void;
};

type TabType = 'messages' | 'participants' | 'details' | 'moderation';

export const ChatDetailModal: React.FC<ChatDetailModalProps> = ({
  isOpen,
  onClose,
  chatId,
  onUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('messages');
  const [page, setPage] = useState(1);
  const [deleteReason, setDeleteReason] = useState('');
  const [showDeleteReasonPrompt, setShowDeleteReasonPrompt] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [flaggingConversation, setFlaggingConversation] = useState(false);
  const { confirm, confirmProps } = useConfirm();

  const { data: chat, isLoading: chatLoading } = useAdminChatById(chatId);
  const {
    data: messagesData,
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useAdminChatMessages(chatId, page, 50);
  const { deleteChat, updateChatStatus, deleteMessage } = useAdminChatMutations();

  const fetchReports = async () => {
    if (!chat) {
      return;
    }

    setLoadingReports(true);
    try {
      const result = await moderationService.getReports({
        reportedEntityType: 'conversation',
        page: 1,
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setReports(result.data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleFlagConversation = async () => {
    if (!chat || !chatId) {
      return;
    }

    setFlaggingConversation(true);
    try {
      await moderationService.createReport({
        reportedEntityType: 'conversation',
        reportedEntityId: chatId,
        category: 'inappropriate_content',
        title: 'Flagged conversation',
        description: 'Flagged from admin chat management interface for moderator review',
      });
      await fetchReports();
      toast.success('Conversation flagged successfully');
    } catch (error) {
      console.error('Failed to flag conversation:', error);
      toast.error('Failed to flag conversation. Please try again.', {
        action: {
          label: 'Retry',
          onClick: () => {
            void handleFlagConversation();
          },
        },
      });
    } finally {
      setFlaggingConversation(false);
    }
  };

  useEffect(() => {
    if (chat && activeTab === 'moderation') {
      fetchReports();
    }
  }, [chatId, activeTab]);

  if (!chatId) {
    return null;
  }

  const conversation = chat;
  const messages = messagesData?.data?.messages || [];

  const handleDeleteMessageClick = (messageId: string) => {
    setMessageToDelete(messageId);
    setShowDeleteReasonPrompt(true);
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete || !chatId) {
      return;
    }

    try {
      await deleteMessage.mutateAsync({
        chatId,
        messageId: messageToDelete,
      });

      setShowDeleteReasonPrompt(false);
      setMessageToDelete(null);
      setDeleteReason('');

      // Refresh messages to show the updated content
      await refetchMessages();

      // Also call the parent update callback if provided
      if (onUpdate) {
        onUpdate();
      }
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
      if (onUpdate) {
        onUpdate();
      }
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
      if (onUpdate) {
        onUpdate();
      }
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

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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

  const renderMessages = () => {
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
    );
  };

  const renderParticipants = () => {
    if (!conversation?.participants || conversation.participants.length === 0) {
      return (
        <div className={styles.emptyState}>
          <FiUsers />
          <div>No participants found</div>
        </div>
      );
    }

    return (
      <div className={styles.participantList}>
        {conversation.participants.map(participant => (
          <div key={participant.id} className={styles.participantCard}>
            <div className={styles.participantAvatar}>{getInitials(participant.name)}</div>
            <div className={styles.participantInfo}>
              <div className={styles.participantName}>{participant.name}</div>
              <div className={styles.participantRole}>{participant.type}</div>
            </div>
            {/* Future: Add remove button */}
          </div>
        ))}
      </div>
    );
  };

  const renderDetails = () => {
    if (!conversation) {
      return <div className={styles.loadingState}>Loading details...</div>;
    }

    return (
      <div className={styles.detailGrid}>
        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>
            <FiInfo />
            Chat ID
          </div>
          <div className={styles.detailValue}>{conversation.id}</div>
        </div>

        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>Status</div>
          <div className={styles.detailValue}>{getStatusBadge(conversation.status)}</div>
        </div>

        {conversation.rescueName && (
          <div className={styles.detailItem}>
            <div className={styles.detailLabel}>Rescue</div>
            <div className={styles.detailValue}>{conversation.rescueName}</div>
          </div>
        )}

        {conversation.petId && (
          <div className={styles.detailItem}>
            <div className={styles.detailLabel}>Pet ID</div>
            <div className={styles.detailValue}>{conversation.petId}</div>
          </div>
        )}

        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>
            <FiClock />
            Created
          </div>
          <div className={styles.detailValue}>{formatTimestamp(conversation.createdAt)}</div>
        </div>

        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>
            <FiClock />
            Last Updated
          </div>
          <div className={styles.detailValue}>{formatTimestamp(conversation.updatedAt)}</div>
        </div>

        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>
            <FiUsers />
            Participants
          </div>
          <div className={styles.detailValue}>{conversation.participants.length}</div>
        </div>

        {conversation.lastMessage && (
          <div className={styles.detailItem}>
            <div className={styles.detailLabel}>
              <FiMessageSquare />
              Last Message
            </div>
            <div className={styles.detailValue}>
              {formatTimestamp(conversation.lastMessage.timestamp || '')}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderModeration = () => {
    if (!chat) {
      return <div className={styles.loadingState}>Loading moderation info...</div>;
    }

    return (
      <div className={styles.detailGrid}>
        {/* Flag Conversation Section */}
        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>
            <FiFlag />
            Flag Conversation
          </div>
          <div className={styles.detailValue}>
            <Button
              onClick={handleFlagConversation}
              variant='warning'
              disabled={flaggingConversation}
            >
              {flaggingConversation ? 'Flagging...' : 'Report This Conversation'}
            </Button>
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
              Flag this conversation for moderator review if it contains inappropriate content,
              spam, harassment, or policy violations.
            </p>
          </div>
        </div>

        {/* Existing Reports Section */}
        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>
            <FiFileText />
            Existing Reports ({reports.length})
          </div>
          <div className={styles.detailValue}>
            {loadingReports ? (
              'Loading reports...'
            ) : reports.length > 0 ? (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {reports.map(report => (
                  <div
                    key={report.reportId}
                    style={{
                      padding: '0.75rem',
                      marginBottom: '0.5rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '0.375rem',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '0.25rem',
                      }}
                    >
                      <strong style={{ textTransform: 'capitalize' }}>
                        {report.category.replace('_', ' ')}
                      </strong>
                      <span
                        style={{
                          padding: '0.125rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          backgroundColor:
                            report.status === 'resolved'
                              ? '#d1fae5'
                              : report.status === 'under_review'
                                ? '#fef3c7'
                                : '#fee2e2',
                          color:
                            report.status === 'resolved'
                              ? '#065f46'
                              : report.status === 'under_review'
                                ? '#92400e'
                                : '#991b1b',
                        }}
                      >
                        {report.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {report.description || 'No description provided'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                      Reported: {new Date(report.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                No reports filed for this conversation
              </div>
            )}
          </div>
        </div>

        {/* Full Moderation History Link */}
        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>
            <FiInfo />
            Full Moderation History
          </div>
          <div className={styles.detailValue}>
            <a
              href={`/moderation?entity=conversation&id=${chatId}`}
              style={{
                color: '#2563eb',
                textDecoration: 'none',
                fontWeight: '500',
              }}
              onMouseOver={e => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseOut={e => (e.currentTarget.style.textDecoration = 'none')}
            >
              View in Moderation Dashboard →
            </a>
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
              View complete moderation history, take actions, and manage reports in the dedicated
              moderation interface.
            </p>
          </div>
        </div>

        {/* Participant Moderation Actions */}
        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>
            <FiAlertTriangle />
            Participant Actions
          </div>
          <div className={styles.detailValue}>
            {chat && chat.participants && chat.participants.length > 0 ? (
              <div>
                <p style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                  Moderate individual participants:
                </p>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {chat.participants.map((participant: Participant) => (
                    <li
                      key={participant.id}
                      style={{
                        padding: '0.5rem',
                        marginBottom: '0.25rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '0.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>
                        {participant.name} ({participant.type})
                      </span>
                      <a
                        href={`/moderation?user=${participant.id}`}
                        style={{ fontSize: '0.875rem', color: '#2563eb' }}
                      >
                        View User
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              'No participants to moderate'
            )}
          </div>
        </div>
      </div>
    );
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
              {activeTab === 'messages' && renderMessages()}
              {activeTab === 'participants' && renderParticipants()}
              {activeTab === 'details' && renderDetails()}
              {activeTab === 'moderation' && renderModeration()}
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

      <ConfirmDialog {...confirmProps} />
    </Modal>
  );
};
