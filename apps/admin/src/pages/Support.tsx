import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import {
  Alert,
  Badge,
  DataTable,
  type DataTableColumn,
  type FilterConfig,
  MetricCard,
  PageHeader,
  SearchToolbar,
  Stack,
  StatusBadge,
  toast,
  useDebouncedValue,
  useFilterParamSetter,
} from '@adopt-dont-shop/lib.components';
import { CircleAlert, CircleCheck, Clock, MessageSquare } from 'lucide-react';
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

const PRIORITY_BADGE_VARIANTS: Record<string, 'error' | 'warning' | 'info' | 'neutral'> = {
  urgent: 'error',
  high: 'warning',
  medium: 'info',
  low: 'neutral',
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

  const setFilterParam = useFilterParamSetter(setSearchParams);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'all'>('all');
  const [page, setPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

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
    toast.error('Ticket not found');
    navigate(`/support${searchSuffix}`, { replace: true });
  }, [ticketId, ticketsLoading, tickets, navigate, searchSuffix]);

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
  const filterConfig: FilterConfig[] = [
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'open', label: 'Open' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'waiting_for_user', label: 'Waiting for User' },
        { value: 'resolved', label: 'Resolved' },
        { value: 'closed', label: 'Closed' },
        { value: 'escalated', label: 'Escalated' },
      ],
    },
    {
      name: 'priority',
      label: 'Priority',
      type: 'select',
      options: [
        { value: 'all', label: 'All Priorities' },
        { value: 'critical', label: 'Critical' },
        { value: 'urgent', label: 'Urgent' },
        { value: 'high', label: 'High' },
        { value: 'normal', label: 'Normal' },
        { value: 'low', label: 'Low' },
      ],
    },
    {
      name: 'category',
      label: 'Category',
      type: 'select',
      options: [
        { value: 'all', label: 'All Categories' },
        { value: 'technical_issue', label: 'Technical Issue' },
        { value: 'account_problem', label: 'Account Problem' },
        { value: 'adoption_inquiry', label: 'Adoption Inquiry' },
        { value: 'payment_issue', label: 'Payment Issue' },
        { value: 'feature_request', label: 'Feature Request' },
        { value: 'report_bug', label: 'Report Bug' },
        { value: 'general_question', label: 'General Question' },
        { value: 'compliance_concern', label: 'Compliance Concern' },
        { value: 'data_request', label: 'Data Request' },
        { value: 'other', label: 'Other' },
      ],
    },
  ];

  const handleFilterChange = (name: string, value: string | boolean): void => {
    const next = String(value);
    if (name === 'status') {
      setFilterParam('status', next);
    } else if (name === 'priority') {
      setPriorityFilter(next as TicketPriority | 'all');
    } else if (name === 'category') {
      setCategoryFilter(next as TicketCategory | 'all');
    }
  };

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
          <Badge variant={PRIORITY_BADGE_VARIANTS[level] ?? 'neutral'} icon={icon}>
            {getPriorityLabel(ticket.priority)}
          </Badge>
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
          <StatusBadge
            kind='supportTicket'
            status={ticket.status}
            label={getStatusLabel(ticket.status)}
          />
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
    <Stack spacing='lg'>
      <PageHeader
        title='Support Tickets'
        description='Manage customer support requests and inquiries'
      />

      <div className={styles.statsBar}>
        <MetricCard label='Open Tickets' value={stats.open} icon={<CircleAlert size='1em' />} />
        <MetricCard label='In Progress' value={stats.inProgress} icon={<Clock size='1em' />} />
        <MetricCard
          label='Waiting on User'
          value={stats.waitingUser}
          icon={<MessageSquare size='1em' />}
        />
        <MetricCard
          label='Resolved Today'
          value={stats.resolved}
          icon={<CircleCheck size='1em' />}
        />
      </div>

      <SearchToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder='Search tickets by subject, user, or email...'
        filterConfig={filterConfig}
        filters={{ status: statusFilter, priority: priorityFilter, category: categoryFilter }}
        onFilterChange={handleFilterChange}
      />

      {ticketsError && <Alert variant='error'>Error loading tickets: {ticketsError.message}</Alert>}

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
    </Stack>
  );
};

export default Support;
