import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { Heading, Text, Button, Input } from '@adopt-dont-shop/components';
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
} from '@adopt-dont-shop/lib-support-tickets';
import { TicketDetailModal } from '../components/modals/TicketDetailModal';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
`;

const HeaderLeft = styled.div`
  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 0.5rem 0;
  }

  p {
    font-size: 1rem;
    color: #6b7280;
    margin: 0;
  }
`;

const StatsBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const StatCard = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const StatIcon = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$color}20;
  color: ${props => props.$color};
  font-size: 1.5rem;
`;

const StatDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
`;

const FilterBar = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 180px;
  flex: 1;
`;

const FilterLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
`;

const SearchInputWrapper = styled.div`
  position: relative;
  flex: 2;
  min-width: 300px;

  svg {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    font-size: 1.125rem;
  }

  input {
    padding-left: 2.5rem;
  }
`;

const Select = styled.select`
  padding: 0.625rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #111827;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #9ca3af;
  }

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }
`;

const Badge = styled.span<{ $variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }>`
  display: inline-flex;
  align-items: center;
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
      case 'info':
        return '#dbeafe';
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
      case 'info':
        return '#1e40af';
      default:
        return '#374151';
    }
  }};
`;

const TicketInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const TicketSubject = styled.div`
  font-weight: 600;
  color: #111827;
`;

const TicketMeta = styled.div`
  font-size: 0.8125rem;
  color: #6b7280;
`;

const PriorityBadge = styled.span<{ $level: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    switch (props.$level) {
      case 'urgent':
        return '#fee2e2';
      case 'high':
        return '#fed7aa';
      case 'medium':
        return '#fef3c7';
      case 'low':
        return '#e0e7ff';
      default:
        return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.$level) {
      case 'urgent':
        return '#991b1b';
      case 'high':
        return '#9a3412';
      case 'medium':
        return '#92400e';
      case 'low':
        return '#3730a3';
      default:
        return '#374151';
    }
  }};

  svg {
    font-size: 0.875rem;
  }
`;

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

    if (statusFilter !== 'all') apiFilters.status = statusFilter as TicketStatus;
    if (priorityFilter !== 'all') apiFilters.priority = priorityFilter as TicketPriority;
    if (categoryFilter !== 'all') apiFilters.category = categoryFilter as TicketCategory;
    if (searchQuery) apiFilters.search = searchQuery;

    return apiFilters;
  }, [statusFilter, priorityFilter, categoryFilter, searchQuery]);

  // Fetch tickets and stats using hooks
  const {
    data: ticketsData,
    isLoading: ticketsLoading,
    error: ticketsError,
    refetch,
  } = useTickets(filters);
  const { data: statsData, isLoading: statsLoading } = useTicketStats();
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

  const getStatusBadgeVariant = (
    status: TicketStatus
  ): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    switch (status) {
      case 'open':
        return 'danger';
      case 'in_progress':
        return 'info';
      case 'waiting_for_user':
        return 'warning';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'neutral';
      case 'escalated':
        return 'danger';
      default:
        return 'neutral';
    }
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
    if (!selectedTicket) return;

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
        <TicketInfo>
          <TicketSubject>
            #{row.ticketId.slice(-6)} - {row.subject}
          </TicketSubject>
          <TicketMeta>
            {row.userName || 'Unknown'} ({row.userEmail})
          </TicketMeta>
        </TicketInfo>
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
        return (
          <PriorityBadge $level={getPriorityLevel(row.priority)}>
            {icon}
            {getPriorityLabel(row.priority)}
          </PriorityBadge>
        );
      },
      width: '120px',
      sortable: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: row => (
        <Badge $variant={getStatusBadgeVariant(row.status)}>{getStatusLabel(row.status)}</Badge>
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
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <Heading level='h1'>Support Tickets</Heading>
          <Text>Manage customer support requests and inquiries</Text>
        </HeaderLeft>
      </PageHeader>

      <StatsBar>
        <StatCard>
          <StatIcon $color='#ef4444'>
            <FiAlertCircle />
          </StatIcon>
          <StatDetails>
            <StatLabel>Open Tickets</StatLabel>
            <StatValue>{stats.open}</StatValue>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color='#3b82f6'>
            <FiClock />
          </StatIcon>
          <StatDetails>
            <StatLabel>In Progress</StatLabel>
            <StatValue>{stats.inProgress}</StatValue>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color='#f59e0b'>
            <FiMessageSquare />
          </StatIcon>
          <StatDetails>
            <StatLabel>Waiting on User</StatLabel>
            <StatValue>{stats.waitingUser}</StatValue>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color='#10b981'>
            <FiCheckCircle />
          </StatIcon>
          <StatDetails>
            <StatLabel>Resolved Today</StatLabel>
            <StatValue>{stats.resolved}</StatValue>
          </StatDetails>
        </StatCard>
      </StatsBar>

      <FilterBar>
        <SearchInputWrapper>
          <FiSearch />
          <Input
            type='text'
            placeholder='Search tickets by subject, user, or email...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </SearchInputWrapper>

        <FilterGroup>
          <FilterLabel>Status</FilterLabel>
          <Select
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
          </Select>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Priority</FilterLabel>
          <Select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value as TicketPriority | 'all')}
          >
            <option value='all'>All Priorities</option>
            <option value='critical'>Critical</option>
            <option value='urgent'>Urgent</option>
            <option value='high'>High</option>
            <option value='normal'>Normal</option>
            <option value='low'>Low</option>
          </Select>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Category</FilterLabel>
          <Select
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
          </Select>
        </FilterGroup>
      </FilterBar>

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
    </PageContainer>
  );
};

export default Support;
