import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import {
  DataTable,
  type DataTableColumn,
  Heading,
  Text,
  Input,
  useToast,
  Toast,
  ToastContainer,
  useDebouncedValue,
  type ToastMessage,
} from '@adopt-dont-shop/lib.components';
import { CircleAlert, CircleCheck, Clock, MessageSquare, Search } from 'lucide-react';
import {
  useTickets,
  useTicketStats,
  useTicketMutations,
  type SupportTicket,
  type TicketStatus,
  type TicketPriority,
  type TicketCategory,
  getStatusLabel,
  getPriorityLabel,
  getCategoryLabel,
  formatRelativeTime,
} from '@adopt-dont-shop/lib.support-tickets';
import { TicketDetailModal } from '../components/modals/TicketDetailModal';
import * as styles from './Support.css';

const getStatusBadgeClass = (status: TicketStatus): string => {
  switch (status) {
    case 'open':
      return styles.badgeDanger;
    case 'in_progress':
      return styles.badgeInfo;
    case 'waiting_for_user':
      return styles.badgeWarning;
    case 'resolved':
      return styles.badgeSuccess;
    case 'closed':
      return styles.badgeNeutral;
    case 'escalated':
      return styles.badgeDanger;
    default:
      return styles.badgeNeutral;
  }
};

const getPriorityBadgeClass = (level: string): string => {
  switch (level) {
    case 'urgent':
      return styles.priorityBadgeUrgent;
    case 'high':
      return styles.priorityBadgeHigh;
    case 'medium':
      return styles.priorityBadgeMedium;
    case 'low':
      return styles.priorityBadgeLow;
    default:
      return styles.priorityBadgeDefault;
  }
};

const VALID_TICKET_STATUSES: ReadonlySet<string> = new Set([
  'open',
  'in_progress',
  'waiting_for_user',
  'resolved',
  'closed',
  'escalated',
]);

const Support: React.FC = () => {
  const { ticketId } = useParams<{ ticketId?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusParam = searchParams.get('status');
  const statusFilter: TicketStatus | 'all' =
    statusParam && VALID_TICKET_STATUSES.has(statusParam) ? (statusParam as TicketStatus) : 'all';

  const setFilterParam = (key: string, value: string) => {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        if (value && value !== 'all') {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        return next;
      },
      { replace: true }
    );
  };

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'all'>('all');
  const [page, setPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const { toasts, showToast, hideToast } = useToast();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery, statusFilter, priorityFilter, categoryFilter]);

  // Build filters for API
  const filters = useMemo(() => {
    const apiFilters: {
      status?: TicketStatus;
      priority?: TicketPriority;
      category?: TicketCategory;
      search?: string;
      page: number;
      limit: number;
      sortBy: 'createdAt' | 'updatedAt' | 'priority' | 'dueDate';
      sortOrder: 'asc' | 'desc';
    } = {
      page,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    if (statusFilter !== 'all') {
      apiFilters.status = statusFilter as TicketStatus;
    }
    if (priorityFilter !== 'all') {
      apiFilters.priority = priorityFilter as TicketPriority;
    }
    if (categoryFilter !== 'all') {
      apiFilters.category = categoryFilter as TicketCategory;
    }
    if (debouncedSearchQuery) {
      apiFilters.search = debouncedSearchQuery;
    }

    return apiFilters;
  }, [statusFilter, priorityFilter, categoryFilter, debouncedSearchQuery, page]);

  // Fetch tickets and stats using hooks
  const {
    data: ticketsData,
    isLoading: ticketsLoading,
    error: ticketsError,
    refetch,
  } = useTickets(filters);
  const { data: statsData } = useTicketStats();
  const { addResponse } = useTicketMutations();

  const tickets = ticketsData?.data || [];
  const totalPages = ticketsData?.pagination?.totalPages ?? 1;
  const loading = ticketsLoading;

  const ticketSiblingIds = useMemo(() => tickets.map(t => t.ticketId), [tickets]);

  // Preserve current filter query params (e.g. ?status=open) when navigating
  // between the list and a ticket detail.
  const searchSuffix = searchParams.toString() ? `?${searchParams.toString()}` : '';

  // Sync the URL :ticketId param with the modal's selected ticket.
  // When the list has loaded and the id is unknown, redirect to /support
  // with a toast so the user understands why nothing opened.
  useEffect(() => {
    if (!ticketId) {
      setSelectedTicket(null);
      return;
    }
    if (ticketsLoading) {
      return;
    }
    const match = tickets.find(t => t.ticketId === ticketId);
    if (match) {
      setSelectedTicket(match);
      return;
    }
    showToast('Ticket not found', 'error');
    navigate(`/support${searchSuffix}`, { replace: true });
  }, [ticketId, ticketsLoading, tickets, navigate, searchSuffix, showToast]);

  const handleRowClick = (ticket: SupportTicket) => {
    navigate(`/support/${ticket.ticketId}${searchSuffix}`);
  };

  const handleCloseModal = () => {
    setSelectedTicket(null);
    navigate(`/support${searchSuffix}`);
  };

  const handleNavigateTicket = (nextTicketId: string) => {
    navigate(`/support/${nextTicketId}${searchSuffix}`);
  };

  // Stats from API
  const stats = {
    open: statsData?.open || 0,
    inProgress: statsData?.inProgress || 0,
    waitingUser: statsData?.waitingForUser || 0,
    resolved: statsData?.resolved || 0,
  };

  const getPriorityLevel = (priority: TicketPriority): string => {
    const mapping: Record<TicketPriority, string> = {
      low: 'low',
      normal: 'medium',
      high: 'high',
      urgent: 'urgent',
      critical: 'urgent',
    };
    return mapping[priority];
  };

  const handleReply = async (content: string, isInternal: boolean) => {
    if (!selectedTicket) {
      return;
    }

    // addResponse returns the updated ticket with the new response
    const updatedTicket = await addResponse(selectedTicket.ticketId, { content, isInternal });

    // Create a new object reference to force React to re-render
    // This is necessary because the modal might not detect the change otherwise
    setSelectedTicket({ ...updatedTicket, responses: [...(updatedTicket.responses || [])] });

    // Refresh the tickets list in the background
    await refetch();
  };

  // Columns use the shared DataTable's key/label/render shape. Server-side sort
  // was never wired for support tickets (the list query hard-codes
  // sortBy/sortOrder and ignores the URL params the old table wrote), so every
  // column is explicitly non-sortable rather than opting into the shared table's
  // client-side sort of the current page only.
  const columns: DataTableColumn[] = [
    {
      key: 'ticket',
      label: 'Ticket',
      width: '400px',
      sortable: false,
      render: (_value, row) => {
        const ticket = row as SupportTicket;
        return (
          <div className={styles.ticketInfo}>
            <div className={styles.ticketSubject}>
              #{ticket.ticketId.slice(-6)} - {ticket.subject}
            </div>
            <div className={styles.ticketMeta}>
              {ticket.userName || 'Unknown'} ({ticket.userEmail})
            </div>
          </div>
        );
      },
    },
    {
      key: 'category',
      label: 'Category',
      width: '150px',
      sortable: false,
      render: (_value, row) => getCategoryLabel((row as SupportTicket).category),
    },
    {
      key: 'priority',
      label: 'Priority',
      width: '120px',
      sortable: false,
      render: (_value, row) => {
        const ticket = row as SupportTicket;
        const icon =
          ticket.priority === 'urgent' ||
          ticket.priority === 'critical' ||
          ticket.priority === 'high' ? (
            <CircleAlert size='1em' />
          ) : (
            <Clock size='1em' />
          );
        const level = getPriorityLevel(ticket.priority);
        return (
          <span className={getPriorityBadgeClass(level)}>
            {icon}
            {getPriorityLabel(ticket.priority)}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '140px',
      sortable: false,
      render: (_value, row) => {
        const ticket = row as SupportTicket;
        return (
          <span className={getStatusBadgeClass(ticket.status)}>
            {getStatusLabel(ticket.status)}
          </span>
        );
      },
    },
    {
      key: 'messages',
      label: 'Replies',
      width: '100px',
      align: 'center',
      sortable: false,
      render: (_value, row) => (
        <div className={styles.replyCount}>
          <MessageSquare size='1em' />
          {(row as SupportTicket).responses?.length || 0}
        </div>
      ),
    },
    {
      key: 'updated',
      label: 'Last Updated',
      width: '120px',
      sortable: false,
      render: (_value, row) => formatRelativeTime((row as SupportTicket).updatedAt),
    },
  ];

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <Heading level='h1'>Support Tickets</Heading>
          <Text>Manage customer support requests and inquiries</Text>
        </div>
      </div>

      <div className={styles.statsBar}>
        <div className={styles.statCard}>
          <div className={styles.statIconRed}>
            <CircleAlert size='1em' />
          </div>
          <div className={styles.statDetails}>
            <div className={styles.statLabel}>Open Tickets</div>
            <div className={styles.statValue}>{stats.open}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconBlue}>
            <Clock size='1em' />
          </div>
          <div className={styles.statDetails}>
            <div className={styles.statLabel}>In Progress</div>
            <div className={styles.statValue}>{stats.inProgress}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconAmber}>
            <MessageSquare size='1em' />
          </div>
          <div className={styles.statDetails}>
            <div className={styles.statLabel}>Waiting on User</div>
            <div className={styles.statValue}>{stats.waitingUser}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconGreen}>
            <CircleCheck size='1em' />
          </div>
          <div className={styles.statDetails}>
            <div className={styles.statLabel}>Resolved Today</div>
            <div className={styles.statValue}>{stats.resolved}</div>
          </div>
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchInputWrapper}>
          <Search size='1em' />
          <Input
            type='text'
            placeholder='Search tickets by subject, user, or email...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor='support-status-filter'>
            Status
          </label>
          <select
            id='support-status-filter'
            className={styles.select}
            value={statusFilter}
            onChange={e => setFilterParam('status', e.target.value)}
          >
            <option value='all'>All Statuses</option>
            <option value='open'>Open</option>
            <option value='in_progress'>In Progress</option>
            <option value='waiting_for_user'>Waiting for User</option>
            <option value='resolved'>Resolved</option>
            <option value='closed'>Closed</option>
            <option value='escalated'>Escalated</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor='support-priority-filter'>
            Priority
          </label>
          <select
            id='support-priority-filter'
            className={styles.select}
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value as TicketPriority | 'all')}
          >
            <option value='all'>All Priorities</option>
            <option value='critical'>Critical</option>
            <option value='urgent'>Urgent</option>
            <option value='high'>High</option>
            <option value='normal'>Normal</option>
            <option value='low'>Low</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor='support-category-filter'>
            Category
          </label>
          <select
            id='support-category-filter'
            className={styles.select}
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as TicketCategory | 'all')}
          >
            <option value='all'>All Categories</option>
            <option value='technical_issue'>Technical Issue</option>
            <option value='account_problem'>Account Problem</option>
            <option value='adoption_inquiry'>Adoption Inquiry</option>
            <option value='payment_issue'>Payment Issue</option>
            <option value='feature_request'>Feature Request</option>
            <option value='report_bug'>Report Bug</option>
            <option value='general_question'>General Question</option>
            <option value='compliance_concern'>Compliance Concern</option>
            <option value='data_request'>Data Request</option>
            <option value='other'>Other</option>
          </select>
        </div>
      </div>

      {ticketsError && (
        <div className={styles.errorState}>Error loading tickets: {ticketsError.message}</div>
      )}

      <DataTable
        frameless
        surface
        columns={columns}
        rows={tickets as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage='No support tickets found matching your criteria'
        page={page}
        total={totalPages * 20}
        pageSize={20}
        onPageChange={setPage}
        onRowClick={row => handleRowClick(row as SupportTicket)}
        getRowId={row => (row as SupportTicket).ticketId}
      />

      <TicketDetailModal
        isOpen={!!selectedTicket}
        onClose={handleCloseModal}
        ticket={selectedTicket}
        onReply={handleReply}
        siblingIds={ticketSiblingIds}
        onNavigate={handleNavigateTicket}
      />

      <ToastContainer position='top-right'>
        {toasts.map((toast: ToastMessage) => (
          <Toast key={toast.id} {...toast} onClose={hideToast} position='top-right' />
        ))}
      </ToastContainer>
    </div>
  );
};

export default Support;
