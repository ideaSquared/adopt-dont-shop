import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  Heading,
  Text,
  useConfirm,
  ConfirmDialog,
  toast,
  MetricCard,
  Badge,
  DataTable,
  SearchToolbar,
  type DataTableColumn,
} from '@adopt-dont-shop/lib.components';
import { CircleAlert, CircleCheck, Eye, Flag, MessageSquare, Trash } from 'lucide-react';
import { PageContainer, PageHeader, HeaderLeft } from '../components/ui';
import {
  useAdminChats,
  useAdminChatStats,
  useAdminChatMutations,
  type Conversation,
} from '@adopt-dont-shop/lib.chat';
import { ChatDetailModal } from '../components/modals';
import * as styles from './Messages.css';

const getStatusDotClass = (status: string): string => {
  switch (status) {
    case 'active':
      return styles.statusDotActive;
    case 'flagged':
      return styles.statusDotFlagged;
    case 'archived':
      return styles.statusDotArchived;
    default:
      return styles.statusDotDefault;
  }
};

const Messages: React.FC = () => {
  // ADS: deep-link support — initialise from ?chatId= so the triage inbox
  // can navigate users straight to a specific chat thread.
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(() =>
    searchParams.get('chatId')
  );
  const { confirm, confirmProps } = useConfirm();

  const handleCloseChatModal = () => {
    setSelectedChatId(null);
    if (searchParams.has('chatId')) {
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          next.delete('chatId');
          return next;
        },
        { replace: true }
      );
    }
  };

  const chatFilters = useMemo(() => {
    const apiFilters: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {};

    if (statusFilter !== 'all') {
      apiFilters.status = statusFilter;
    }
    if (searchQuery) {
      apiFilters.search = searchQuery;
    }

    return apiFilters;
  }, [statusFilter, searchQuery]);

  const { data: chatsData, isLoading, error: chatsError, refetch } = useAdminChats(chatFilters);
  const { data: statsData } = useAdminChatStats();
  const { deleteChat, updateChatStatus } = useAdminChatMutations();

  const chats = chatsData?.data || [];
  const loading = isLoading;

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
        month: 'short',
      });
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge variant='success'>Active</Badge>;
      case 'blocked':
        return <Badge variant='error'>Blocked</Badge>;
      case 'closed':
        return <Badge variant='warning'>Closed</Badge>;
      case 'archived':
        return <Badge variant='neutral'>Archived</Badge>;
      default:
        return <Badge variant='neutral'>{status || 'active'}</Badge>;
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
        await refetch();
      } catch (error) {
        console.error('Failed to delete chat:', error);
        toast.error(
          `Failed to delete chat: ${error instanceof Error ? error.message : 'Unknown error'}`,
          {
            action: {
              label: 'Retry',
              onClick: () => {
                void handleDeleteChat(chatId, e);
              },
            },
          }
        );
      }
    }
  };

  const handleUpdateStatus = async (chatId: string, status: string, e: React.MouseEvent) => {
    e.stopPropagation();

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
      await refetch();
    } catch (error) {
      console.error('Failed to update chat status:', error);
      toast.error('Failed to update conversation status. Please try again.', {
        action: {
          label: 'Retry',
          onClick: () => {
            void handleUpdateStatus(chatId, status, e);
          },
        },
      });
    }
  };

  // Columns use the shared DataTable's key/label/render shape. This table is
  // client-side (no server pagination or server sort was ever wired — the old
  // table's sort only wrote URL params the query ignored, and the 'status_badge'
  // key does not map to a data field), so every column is explicitly
  // non-sortable rather than opting into the shared table's client-side sort.
  const columns: DataTableColumn[] = [
    {
      key: 'status',
      label: '',
      width: '40px',
      sortable: false,
      render: (_value, row) => (
        <div className={getStatusDotClass((row as Conversation).status || 'active')} />
      ),
    },
    {
      key: 'conversation',
      label: 'Conversation',
      width: '420px',
      sortable: false,
      render: (_value, row) => {
        const chat = row as Conversation;
        return (
          <div className={styles.messagePreview}>
            <div className={styles.messageParticipants}>
              {chat.participants.map((p, i) => (
                <React.Fragment key={p.id}>
                  {i > 0 && ' ↔ '}
                  {p.name}
                </React.Fragment>
              ))}
            </div>
            <div className={styles.messageSubject}>
              Chat #{chat.id.slice(-6)}
              {chat.rescueName && ` - ${chat.rescueName}`}
              {chat.petId && ` (Pet: ${chat.petId.slice(-6)})`}
            </div>
            <div className={styles.messageMeta}>
              <span>{chat.participants.length} participants</span>
              {chat.unreadCount > 0 && <span>• {chat.unreadCount} unread</span>}
              <span>• Last activity: {formatTimestamp(chat.updatedAt)}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'lastMessage',
      label: 'Last Message',
      width: '250px',
      sortable: false,
      render: (_value, row) => {
        const chat = row as Conversation;
        return (
          <div className={styles.lastMessageCell}>
            {chat.lastMessage?.content || (
              <span className={styles.noMessagesPlaceholder}>No messages</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'participants',
      label: 'Participants',
      width: '180px',
      sortable: false,
      render: (_value, row) => {
        const chat = row as Conversation;
        return (
          <div className={styles.participantsList}>
            {chat.participants.slice(0, 2).map(p => (
              <div key={p.id} className={styles.participantInfo}>
                <div className={styles.participantName}>{p.name}</div>
                <div className={styles.participantRole}>{p.type}</div>
              </div>
            ))}
            {chat.participants.length > 2 && (
              <div className={styles.participantMore}>+{chat.participants.length - 2} more</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'status_badge',
      label: 'Status',
      width: '100px',
      sortable: false,
      render: (_value, row) => getStatusBadge((row as Conversation).status),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '120px',
      align: 'center',
      sortable: false,
      render: (_value, row) => {
        const chat = row as Conversation;
        return (
          <div className={styles.actionButtons}>
            <button
              className={styles.actionButton}
              onClick={e => {
                e.stopPropagation();
                setSelectedChatId(chat.id);
              }}
              title='View chat'
              aria-label='View chat'
            >
              <Eye size='1em' aria-hidden />
            </button>
            <button
              className={styles.actionButton}
              onClick={e => handleUpdateStatus(chat.id, 'archived', e)}
              title='Archive chat'
              aria-label='Archive chat'
            >
              <Flag size='1em' aria-hidden />
            </button>
            <button
              className={styles.actionButton}
              onClick={e => handleDeleteChat(chat.id, e)}
              title='Delete chat'
              aria-label='Delete chat'
            >
              <Trash size='1em' aria-hidden />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <Heading level='h1'>Message Monitoring</Heading>
          <Text>Platform messaging activity and oversight</Text>
        </HeaderLeft>
      </PageHeader>

      <div className={styles.statsGrid}>
        <MetricCard
          icon={<MessageSquare size='1em' />}
          iconColor='#3b82f6'
          label='Total Chats'
          value={stats.total}
          loading={loading}
        />
        <MetricCard
          icon={<CircleCheck size='1em' />}
          iconColor='#10b981'
          label='Active Chats'
          value={stats.active}
          loading={loading}
        />
        <MetricCard
          icon={<MessageSquare size='1em' />}
          iconColor='#8b5cf6'
          label='Total Messages'
          value={stats.messages}
          loading={loading}
        />
        <MetricCard
          icon={<CircleAlert size='1em' />}
          iconColor='#f59e0b'
          label='Avg Messages/Chat'
          value={stats.avgMessages}
          loading={loading}
        />
      </div>

      <SearchToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder='Search conversations, participants, or messages...'
        filterConfig={[
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'archived', label: 'Archived' },
              { value: 'blocked', label: 'Blocked' },
              { value: 'closed', label: 'Closed' },
            ],
          },
        ]}
        filters={{ status: statusFilter }}
        onFilterChange={(_name, value) => setStatusFilter(String(value))}
      />

      {chatsError && (
        <div className={styles.errorBanner}>
          Error loading chats: {chatsError instanceof Error ? chatsError.message : 'Unknown error'}
        </div>
      )}

      <DataTable
        frameless
        surface
        columns={columns}
        rows={chats as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage='No conversations found matching your criteria'
        // No server pagination for chats; keep every returned row on one page
        // rather than letting the shared table client-paginate at its default.
        pageSize={Math.max(chats.length, 1)}
        getRowId={row => (row as Conversation).id}
        onRowClick={row => setSelectedChatId((row as Conversation).id)}
      />

      <ChatDetailModal
        isOpen={!!selectedChatId}
        onClose={handleCloseChatModal}
        chatId={selectedChatId}
        onUpdate={refetch}
      />

      <ConfirmDialog {...confirmProps} />
    </PageContainer>
  );
};

export default Messages;
