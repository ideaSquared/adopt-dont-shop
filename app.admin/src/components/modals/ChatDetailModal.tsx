import React, { useState } from 'react';
import styled from 'styled-components';
import { Modal, Button } from '@adopt-dont-shop/components';
import {
  useAdminChatById,
  useAdminChatMessages,
  useAdminChatMutations,
  type Conversation,
  type Message,
  type Participant,
} from '@adopt-dont-shop/lib-chat';
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
} from 'react-icons/fi';

type ChatDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  chatId: string | null;
  onUpdate?: () => void;
};

type TabType = 'messages' | 'participants' | 'details' | 'moderation';

const ModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-height: 80vh;
  min-height: 600px;
`;

const ChatHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
`;

const ChatTitle = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ChatId = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  font-family: 'Courier New', monospace;
`;

const TabBar = styled.div`
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
`;

const Tab = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  background: ${props => (props.$active ? '#3b82f6' : 'transparent')};
  color: ${props => (props.$active ? '#ffffff' : '#6b7280')};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 6px 6px 0 0;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => (props.$active ? '#3b82f6' : '#f3f4f6')};
  }

  svg {
    font-size: 1rem;
  }
`;

const TabContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0;
`;

const MessageTimeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const MessageBubble = styled.div<{ $isOwn?: boolean }>`
  display: flex;
  gap: 0.75rem;
  align-self: ${props => (props.$isOwn ? 'flex-end' : 'flex-start')};
  max-width: 70%;
`;

const MessageAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  flex-shrink: 0;
`;

const MessageContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const MessageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
`;

const MessageSender = styled.span`
  font-weight: 600;
  color: #111827;
`;

const MessageTime = styled.span`
  color: #9ca3af;
`;

const MessageBody = styled.div<{ $deleted?: boolean }>`
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: ${props => (props.$deleted ? '#fef2f2' : '#f3f4f6')};
  color: ${props => (props.$deleted ? '#991b1b' : '#111827')};
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  position: relative;
`;

const MessageActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f9fafb;
    color: #ef4444;
    border-color: #fecaca;
  }

  svg {
    font-size: 0.875rem;
  }
`;

const ParticipantList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ParticipantCard = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
`;

const ParticipantAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 600;
  color: #6b7280;
  flex-shrink: 0;
`;

const ParticipantInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ParticipantName = styled.div`
  font-weight: 600;
  color: #111827;
  font-size: 0.875rem;
`;

const ParticipantRole = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
`;

const Badge = styled.span<{ $variant?: 'success' | 'warning' | 'danger' | 'neutral' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    switch (props.$variant) {
      case 'success':
        return '#d1fae5';
      case 'warning':
        return '#fef3c7';
      case 'danger':
        return '#fee2e2';
      default:
        return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.$variant) {
      case 'success':
        return '#065f46';
      case 'warning':
        return '#92400e';
      case 'danger':
        return '#991b1b';
      default:
        return '#374151';
    }
  }};
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const DetailLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;

  svg {
    font-size: 1rem;
  }
`;

const DetailValue = styled.div`
  font-size: 0.875rem;
  color: #111827;
  font-weight: 500;
`;

const ActionBar = styled.div`
  display: flex;
  gap: 0.75rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
  flex-wrap: wrap;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  color: #9ca3af;
  text-align: center;

  svg {
    font-size: 3rem;
  }
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #9ca3af;
`;

const DeletePrompt = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
`;

const DeletePromptContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
`;

const DeletePromptTitle = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: #ef4444;
  }
`;

const DeletePromptText = styled.p`
  margin: 0 0 1.5rem 0;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 1.5rem;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const DeletePromptActions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`;

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

  const { data: chat, isLoading: chatLoading } = useAdminChatById(chatId);
  const { data: messagesData, isLoading: messagesLoading } = useAdminChatMessages(chatId, page, 50);
  const { deleteChat, updateChatStatus, deleteMessage } = useAdminChatMutations();

  if (!chatId) {
    return null;
  }

  const conversation = chat?.data;
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

      // Refresh messages
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Failed to delete message. Please try again.');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteReasonPrompt(false);
    setMessageToDelete(null);
    setDeleteReason('');
  };

  const handleArchiveChat = async () => {
    if (!window.confirm('Are you sure you want to archive this conversation?')) {
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
      alert('Failed to archive conversation. Please try again.');
    }
  };

  const handleDeleteChat = async () => {
    if (!window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
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
      alert('Failed to delete conversation. Please try again.');
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
        return <Badge $variant="success">Active</Badge>;
      case 'archived':
        return <Badge $variant="neutral">Archived</Badge>;
      case 'blocked':
        return <Badge $variant="danger">Blocked</Badge>;
      default:
        return <Badge $variant="neutral">{status || 'Active'}</Badge>;
    }
  };

  const renderMessages = () => {
    if (messagesLoading && page === 1) {
      return <LoadingState>Loading messages...</LoadingState>;
    }

    if (messages.length === 0 && !messagesLoading) {
      return (
        <EmptyState>
          <FiMessageSquare />
          <div>No messages in this conversation</div>
        </EmptyState>
      );
    }

    const hasMorePages =
      messagesData?.data?.pagination &&
      messagesData.data.pagination.page < messagesData.data.pagination.pages;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <MessageTimeline>
          {messages.map(message => {
            const isDeleted = message.content === '[Message deleted]';
            return (
              <MessageBubble key={message.id}>
                <MessageAvatar>{getInitials(message.senderName || 'Unknown')}</MessageAvatar>
                <MessageContent>
                  <MessageHeader>
                    <MessageSender>{message.senderName || 'Unknown User'}</MessageSender>
                    <MessageTime>{formatTimestamp(message.timestamp)}</MessageTime>
                  </MessageHeader>
                  <MessageBody $deleted={isDeleted}>{message.content}</MessageBody>
                  {!isDeleted && (
                    <MessageActions>
                      <ActionButton
                        onClick={() => handleDeleteMessageClick(message.id)}
                        title="Delete message"
                      >
                        <FiTrash2 />
                      </ActionButton>
                    </MessageActions>
                  )}
                </MessageContent>
              </MessageBubble>
            );
          })}
        </MessageTimeline>

        {hasMorePages && (
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <Button
              variant="secondary"
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
        <EmptyState>
          <FiUsers />
          <div>No participants found</div>
        </EmptyState>
      );
    }

    return (
      <ParticipantList>
        {conversation.participants.map(participant => (
          <ParticipantCard key={participant.id}>
            <ParticipantAvatar>{getInitials(participant.name)}</ParticipantAvatar>
            <ParticipantInfo>
              <ParticipantName>{participant.name}</ParticipantName>
              <ParticipantRole>{participant.type}</ParticipantRole>
            </ParticipantInfo>
            {/* Future: Add remove button */}
          </ParticipantCard>
        ))}
      </ParticipantList>
    );
  };

  const renderDetails = () => {
    if (!conversation) {
      return <LoadingState>Loading details...</LoadingState>;
    }

    return (
      <DetailGrid>
        <DetailItem>
          <DetailLabel>
            <FiInfo />
            Chat ID
          </DetailLabel>
          <DetailValue>{conversation.id}</DetailValue>
        </DetailItem>

        <DetailItem>
          <DetailLabel>Status</DetailLabel>
          <DetailValue>{getStatusBadge(conversation.status)}</DetailValue>
        </DetailItem>

        {conversation.rescueName && (
          <DetailItem>
            <DetailLabel>Rescue</DetailLabel>
            <DetailValue>{conversation.rescueName}</DetailValue>
          </DetailItem>
        )}

        {conversation.petId && (
          <DetailItem>
            <DetailLabel>Pet ID</DetailLabel>
            <DetailValue>{conversation.petId}</DetailValue>
          </DetailItem>
        )}

        <DetailItem>
          <DetailLabel>
            <FiClock />
            Created
          </DetailLabel>
          <DetailValue>{formatTimestamp(conversation.createdAt)}</DetailValue>
        </DetailItem>

        <DetailItem>
          <DetailLabel>
            <FiClock />
            Last Updated
          </DetailLabel>
          <DetailValue>{formatTimestamp(conversation.updatedAt)}</DetailValue>
        </DetailItem>

        <DetailItem>
          <DetailLabel>
            <FiUsers />
            Participants
          </DetailLabel>
          <DetailValue>{conversation.participants.length}</DetailValue>
        </DetailItem>

        {conversation.lastMessage && (
          <DetailItem>
            <DetailLabel>
              <FiMessageSquare />
              Last Message
            </DetailLabel>
            <DetailValue>{formatTimestamp(conversation.lastMessage.createdAt || '')}</DetailValue>
          </DetailItem>
        )}
      </DetailGrid>
    );
  };

  const renderModeration = () => {
    return (
      <DetailGrid>
        <DetailItem>
          <DetailLabel>
            <FiAlertTriangle />
            Moderation Tools
          </DetailLabel>
          <DetailValue>
            Moderation features coming soon. This will include:
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
              <li>Flag conversation</li>
              <li>Add internal notes</li>
              <li>View moderation history</li>
              <li>Block users</li>
            </ul>
          </DetailValue>
        </DetailItem>
      </DetailGrid>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalContent>
        <ChatHeader>
          <ChatTitle>
            <FiMessageSquare />
            Conversation Details
          </ChatTitle>
          {conversation && (
            <>
              <ChatId>Chat #{conversation.id.slice(-8)}</ChatId>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {getStatusBadge(conversation.status)}
                <Badge $variant="neutral">{conversation.type}</Badge>
              </div>
            </>
          )}
        </ChatHeader>

        <TabBar>
          <Tab $active={activeTab === 'messages'} onClick={() => setActiveTab('messages')}>
            <FiMessageSquare />
            Messages
          </Tab>
          <Tab $active={activeTab === 'participants'} onClick={() => setActiveTab('participants')}>
            <FiUsers />
            Participants
          </Tab>
          <Tab $active={activeTab === 'details'} onClick={() => setActiveTab('details')}>
            <FiInfo />
            Details
          </Tab>
          <Tab $active={activeTab === 'moderation'} onClick={() => setActiveTab('moderation')}>
            <FiAlertTriangle />
            Moderation
          </Tab>
        </TabBar>

        <TabContent>
          {chatLoading ? (
            <LoadingState>Loading...</LoadingState>
          ) : (
            <>
              {activeTab === 'messages' && renderMessages()}
              {activeTab === 'participants' && renderParticipants()}
              {activeTab === 'details' && renderDetails()}
              {activeTab === 'moderation' && renderModeration()}
            </>
          )}
        </TabContent>

        <ActionBar>
          <Button
            variant="secondary"
            icon={<FiArchive />}
            onClick={handleArchiveChat}
            disabled={conversation?.status === 'archived'}
          >
            Archive
          </Button>
          <Button variant="danger" icon={<FiTrash2 />} onClick={handleDeleteChat}>
            Delete
          </Button>
          <div style={{ marginLeft: 'auto' }}>
            <Button variant="secondary" icon={<FiX />} onClick={onClose}>
              Close
            </Button>
          </div>
        </ActionBar>
      </ModalContent>

      {showDeleteReasonPrompt && (
        <DeletePrompt onClick={handleCancelDelete}>
          <DeletePromptContent onClick={(e) => e.stopPropagation()}>
            <DeletePromptTitle>
              <FiAlertTriangle />
              Delete Message
            </DeletePromptTitle>
            <DeletePromptText>
              Are you sure you want to delete this message? This action cannot be undone. You can
              optionally provide a reason for the deletion.
            </DeletePromptText>
            <TextArea
              placeholder="Reason for deletion (optional)..."
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            />
            <DeletePromptActions>
              <Button variant="secondary" onClick={handleCancelDelete}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteMessage}
                disabled={deleteMessage.isLoading}
              >
                {deleteMessage.isLoading ? 'Deleting...' : 'Delete Message'}
              </Button>
            </DeletePromptActions>
          </DeletePromptContent>
        </DeletePrompt>
      )}
    </Modal>
  );
};
