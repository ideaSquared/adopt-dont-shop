import React, { useState, useMemo } from 'react';
import { Heading, Text, Input } from '@adopt-dont-shop/lib.components';
import { FiSearch, FiMessageSquare, FiClock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { DataTable, type Column } from '../components/data';
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
import styles from './Support.css';

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

const Support: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'all'>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

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
      page: 1,
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
    if (searchQuery) {
      apiFilters.search = searchQuery;
    }

    return apiFilters;
  }, [statusFilter, priorityFilter, categoryFilter, searchQuery]);

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
  const loading = ticketsLoading;

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

  const columns: Column<SupportTicket>[] = [
    {
      id: 'ticket',
      header: 'Ticket',
      accessor: row => (
        <div className={styles.ticketInfo}>
          <div className={styles.ticketSubject}>
            #{row.ticketId.slice(-6)} - {row.subject}
          </div>
          <div className={styles.ticketMeta}>
            {row.userName || 'Unknown'} ({row.userEmail})
          </div>
        </div>
      ),
      width: '400px',
    },
    {
      id: 'category',
      header: 'Category',
      accessor: row => getCategoryLabel(row.category),
      width: '150px',
    },
    {
      id: 'priority',
      header: 'Priority',
      accessor: row => {
        const icon =
          row.priority === 'urgent' || row.priority === 'critical' || row.priority === 'high' ? (
            <FiAlertCircle />
          ) : (
            <FiClock />
          );
        const level = getPriorityLevel(row.priority);
        return (
          <span className={getPriorityBadgeClass(level)}>
            {icon}
            {getPriorityLabel(row.priority)}
          </span>
        );
      },
      width: '120px',
      sortable: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: row => (
        <span className={getStatusBadgeClass(row.status)}>{getStatusLabel(row.status)}</span>
      ),
      width: '140px',
      sortable: true,
    },
    {
      id: 'messages',
      header: 'Replies',
      accessor: row => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280' }}>
          <FiMessageSquare />
          {row.responses?.length || 0}
        </div>
      ),
      width: '100px',
      align: 'center',
    },
    {
      id: 'updated',
      header: 'Last Updated',
      accessor: row => formatRelativeTime(row.updatedAt),
      width: '120px',
      sortable: true,
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
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#ef444420',
              color: '#ef4444',
              fontSize: '1.5rem',
            }}
          >
            <FiAlertCircle />
          </div>
          <div className={styles.statDetails}>
            <div className={styles.statLabel}>Open Tickets</div>
            <div className={styles.statValue}>{stats.open}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#3b82f620',
              color: '#3b82f6',
              fontSize: '1.5rem',
            }}
          >
            <FiClock />
          </div>
          <div className={styles.statDetails}>
            <div className={styles.statLabel}>In Progress</div>
            <div className={styles.statValue}>{stats.inProgress}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f59e0b20',
              color: '#f59e0b',
              fontSize: '1.5rem',
            }}
          >
            <FiMessageSquare />
          </div>
          <div className={styles.statDetails}>
            <div className={styles.statLabel}>Waiting on User</div>
            <div className={styles.statValue}>{stats.waitingUser}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#10b98120',
              color: '#10b981',
              fontSize: '1.5rem',
            }}
          >
            <FiCheckCircle />
          </div>
          <div className={styles.statDetails}>
            <div className={styles.statLabel}>Resolved Today</div>
            <div className={styles.statValue}>{stats.resolved}</div>
          </div>
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchInputWrapper}>
          <FiSearch />
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
            onChange={e => setStatusFilter(e.target.value as TicketStatus | 'all')}
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
        <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
          Error loading tickets: {ticketsError.message}
        </div>
      )}

      <DataTable
        columns={columns}
        data={tickets}
        loading={loading}
        emptyMessage='No support tickets found matching your criteria'
        onRowClick={ticket => setSelectedTicket(ticket)}
        getRowId={ticket => ticket.ticketId}
      />

      <TicketDetailModal
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        ticket={selectedTicket}
        onReply={handleReply}
      />
    </div>
  );
};

export default Support;
