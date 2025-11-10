import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { Heading, Text, Input, useConfirm, ConfirmDialog } from '@adopt-dont-shop/components';
import { FiSearch, FiMessageSquare, FiAlertCircle, FiCheckCircle, FiEye, FiFlag, FiTrash } from 'react-icons/fi';
import {
  PageContainer,
  PageHeader,
  HeaderLeft,
  FilterBar,
  FilterGroup,
  FilterLabel,
  SearchInputWrapper,
  Select,
  Badge,
  StatsBar,
  StatCard,
  StatIcon,
  StatDetails,
  StatLabel,
  StatValue
} from '../components/ui';
import { DataTable } from '../components/data';
import type { Column } from '../components/data';
import {
  useAdminChats,
  useAdminChatStats,
  useAdminChatMutations,
  type Conversation,
} from '@adopt-dont-shop/lib-chat';
import { ChatDetailModal } from '../components/modals';

const MessagePreview = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  max-width: 400px;
`;

const MessageParticipants = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #111827;
  font-weight: 600;

  svg {
    font-size: 0.875rem;
    color: #9ca3af;
  }
`;

const MessageSubject = styled.div`
  font-size: 0.8125rem;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MessageMeta = styled.div`
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: #9ca3af;
`;

const ParticipantInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ParticipantName = styled.div`
  font-size: 0.875rem;
  color: #111827;
  font-weight: 500;
`;

const ParticipantRole = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f9fafb;
    color: #111827;
    border-color: #d1d5db;
  }

  &:active {
    transform: scale(0.95);
  }
`;

const StatusDot = styled.div<{ $status: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => {
    switch (props.$status) {
      case 'active': return '#10b981';
      case 'flagged': return '#f59e0b';
      case 'archived': return '#9ca3af';
      default: return '#6b7280';
    }
  }};
`;

const Messages: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const { confirm, confirmProps } = useConfirm();

  // Build filters for API
  const filters = useMemo(() => {
    const apiFilters: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {};

    if (statusFilter !== 'all') apiFilters.status = statusFilter;
    if (searchQuery) apiFilters.search = searchQuery;

    return apiFilters;
  }, [statusFilter, searchQuery]);

  // Fetch chats and stats using hooks
  const { data: chatsData, isLoading, error: chatsError, refetch } = useAdminChats(filters);
  const { data: statsData } = useAdminChatStats();
  const { deleteChat, updateChatStatus } = useAdminChatMutations();

  const chats = chatsData?.data || [];
  const loading = isLoading;

  // Stats from API
  const stats = {
    total: statsData?.totalChats || 0,
    active: statsData?.activeChats || 0,
    messages: statsData?.totalMessages || 0,
    avgMessages: Math.round(statsData?.averageMessagesPerChat || 0),
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short'
      });
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge $variant="success">Active</Badge>;
      case 'blocked':
        return <Badge $variant="danger">Blocked</Badge>;
      case 'closed':
        return <Badge $variant="warning">Closed</Badge>;
      case 'archived':
        return <Badge $variant="neutral">Archived</Badge>;
      default:
        return <Badge $variant="neutral">{status || 'active'}</Badge>;
    }
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const confirmed = await confirm({
      title: 'Delete Conversation',
      message: 'Are you sure you want to delete this conversation? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (confirmed) {
      try {
        await deleteChat.mutateAsync(chatId);
        // Refetch the chat list to update the UI
        await refetch();
      } catch (error) {
        console.error('Failed to delete chat:', error);
        alert(`Failed to delete chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handleUpdateStatus = async (chatId: string, status: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Show confirmation for archiving
    if (status === 'archived') {
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
    }

    try {
      await updateChatStatus.mutateAsync({ chatId, status });
      // Refetch the chat list to update the UI
      await refetch();
    } catch (error) {
      console.error('Failed to update chat status:', error);
    }
  };

  const columns: Column<Conversation>[] = [
    {
      id: 'status',
      header: '',
      accessor: (row) => <StatusDot $status={row.status || 'active'} />,
      width: '40px'
    },
    {
      id: 'conversation',
      header: 'Conversation',
      accessor: (row) => (
        <MessagePreview>
          <MessageParticipants>
            {row.participants.map((p, i) => (
              <React.Fragment key={p.id}>
                {i > 0 && ' ↔ '}
                {p.name}
              </React.Fragment>
            ))}
          </MessageParticipants>
          <MessageSubject>
            Chat #{row.id.slice(-6)}
            {row.rescueName && ` - ${row.rescueName}`}
            {row.petId && ` (Pet: ${row.petId.slice(-6)})`}
          </MessageSubject>
          <MessageMeta>
            <span>{row.participants.length} participants</span>
            {row.unreadCount > 0 && <span>• {row.unreadCount} unread</span>}
            <span>• Last activity: {formatTimestamp(row.updatedAt)}</span>
          </MessageMeta>
        </MessagePreview>
      ),
      width: '420px'
    },
    {
      id: 'lastMessage',
      header: 'Last Message',
      accessor: (row) => (
        <div style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.lastMessage?.content || (
            <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No messages</span>
          )}
        </div>
      ),
      width: '250px'
    },
    {
      id: 'participants',
      header: 'Participants',
      accessor: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {row.participants.slice(0, 2).map(p => (
            <ParticipantInfo key={p.id}>
              <ParticipantName>{p.name}</ParticipantName>
              <ParticipantRole>{p.type}</ParticipantRole>
            </ParticipantInfo>
          ))}
          {row.participants.length > 2 && (
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              +{row.participants.length - 2} more
            </div>
          )}
        </div>
      ),
      width: '180px'
    },
    {
      id: 'status_badge',
      header: 'Status',
      accessor: (row) => getStatusBadge(row.status),
      width: '100px',
      sortable: true
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (row) => (
        <ActionButtons>
          <ActionButton
            onClick={(e) => {
              e.stopPropagation();
              setSelectedChatId(row.id);
            }}
            title="View chat"
          >
            <FiEye />
          </ActionButton>
          <ActionButton
            onClick={(e) => handleUpdateStatus(row.id, 'archived', e)}
            title="Archive chat"
          >
            <FiFlag />
          </ActionButton>
          <ActionButton
            onClick={(e) => handleDeleteChat(row.id, e)}
            title="Delete chat"
          >
            <FiTrash />
          </ActionButton>
        </ActionButtons>
      ),
      width: '120px',
      align: 'center'
    }
  ];

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <Heading level="h1">Message Monitoring</Heading>
          <Text>Platform messaging activity and oversight</Text>
        </HeaderLeft>
      </PageHeader>

      <StatsBar>
        <StatCard>
          <StatIcon $color="#3b82f6">
            <FiMessageSquare />
          </StatIcon>
          <StatDetails>
            <StatLabel>Total Chats</StatLabel>
            <StatValue>{stats.total}</StatValue>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color="#10b981">
            <FiCheckCircle />
          </StatIcon>
          <StatDetails>
            <StatLabel>Active Chats</StatLabel>
            <StatValue>{stats.active}</StatValue>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color="#8b5cf6">
            <FiMessageSquare />
          </StatIcon>
          <StatDetails>
            <StatLabel>Total Messages</StatLabel>
            <StatValue>{stats.messages}</StatValue>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color="#f59e0b">
            <FiAlertCircle />
          </StatIcon>
          <StatDetails>
            <StatLabel>Avg Messages/Chat</StatLabel>
            <StatValue>{stats.avgMessages}</StatValue>
          </StatDetails>
        </StatCard>
      </StatsBar>

      <FilterBar>
        <SearchInputWrapper>
          <FiSearch />
          <Input
            type="text"
            placeholder="Search conversations, participants, or messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchInputWrapper>

        <FilterGroup>
          <FilterLabel>Status</FilterLabel>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="blocked">Blocked</option>
            <option value="closed">Closed</option>
          </Select>
        </FilterGroup>
      </FilterBar>

      {chatsError && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
          Error loading chats: {chatsError instanceof Error ? chatsError.message : 'Unknown error'}
        </div>
      )}

      <DataTable
        columns={columns}
        data={chats}
        loading={loading}
        emptyMessage="No conversations found matching your criteria"
        onRowClick={(chat) => setSelectedChatId(chat.id)}
        getRowId={(chat) => chat.id}
      />

      <ChatDetailModal
        isOpen={!!selectedChatId}
        onClose={() => setSelectedChatId(null)}
        chatId={selectedChatId}
        onUpdate={refetch}
      />

      <ConfirmDialog {...confirmProps} />
    </PageContainer>
  );
};

export default Messages;
