import React, { useState } from 'react';
import styled from 'styled-components';
import { Heading, Text, Button, Input } from '@adopt-dont-shop/components';
import { FiSearch, FiMessageSquare, FiClock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { DataTable } from '../components/data';
import type { Column } from '../components/data';
import type { SupportTicket } from '../types/admin';

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
      case 'success': return '#d1fae5';
      case 'warning': return '#fef3c7';
      case 'danger': return '#fee2e2';
      case 'info': return '#dbeafe';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.$variant) {
      case 'success': return '#065f46';
      case 'warning': return '#92400e';
      case 'danger': return '#991b1b';
      case 'info': return '#1e40af';
      default: return '#374151';
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
      case 'urgent': return '#fee2e2';
      case 'high': return '#fed7aa';
      case 'medium': return '#fef3c7';
      case 'low': return '#e0e7ff';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.$level) {
      case 'urgent': return '#991b1b';
      case 'high': return '#9a3412';
      case 'medium': return '#92400e';
      case 'low': return '#3730a3';
      default: return '#374151';
    }
  }};

  svg {
    font-size: 0.875rem;
  }
`;

// Mock data
const mockTickets: SupportTicket[] = [
  {
    ticketId: '1',
    userId: 'user-1',
    userName: 'Sarah Johnson',
    userEmail: 'sarah.j@example.com',
    subject: 'Unable to complete adoption application',
    category: 'technical',
    priority: 'high',
    status: 'in_progress',
    description: 'Getting error when trying to submit application form',
    assignedTo: 'admin-1',
    createdAt: '2024-10-21T09:00:00Z',
    updatedAt: '2024-10-21T10:30:00Z',
    messagesCount: 3
  },
  {
    ticketId: '2',
    userId: 'user-2',
    userName: 'Michael Chen',
    userEmail: 'mchen@example.com',
    subject: 'Account verification not working',
    category: 'account',
    priority: 'urgent',
    status: 'open',
    description: 'Email verification link expired',
    createdAt: '2024-10-21T11:15:00Z',
    updatedAt: '2024-10-21T11:15:00Z',
    messagesCount: 1
  },
  {
    ticketId: '3',
    userId: 'user-3',
    userName: 'Emma Wilson',
    userEmail: 'emma.w@example.com',
    subject: 'Question about adoption fees',
    category: 'other',
    priority: 'low',
    status: 'waiting_user',
    description: 'Wondering about payment options',
    assignedTo: 'admin-2',
    createdAt: '2024-10-20T14:00:00Z',
    updatedAt: '2024-10-21T08:00:00Z',
    messagesCount: 5
  },
  {
    ticketId: '4',
    userId: 'user-4',
    userName: 'David Martinez',
    userEmail: 'dmartinez@example.com',
    subject: 'Reported inappropriate listing',
    category: 'abuse',
    priority: 'high',
    status: 'in_progress',
    description: 'Found a suspicious pet listing',
    assignedTo: 'admin-1',
    createdAt: '2024-10-21T07:30:00Z',
    updatedAt: '2024-10-21T09:00:00Z',
    messagesCount: 2
  },
  {
    ticketId: '5',
    userId: 'user-5',
    userName: 'Lisa Anderson',
    userEmail: 'l.anderson@example.com',
    subject: 'Great experience - thank you!',
    category: 'other',
    priority: 'low',
    status: 'resolved',
    description: 'Just wanted to say thanks for the smooth process',
    assignedTo: 'admin-2',
    createdAt: '2024-10-19T10:00:00Z',
    updatedAt: '2024-10-19T11:00:00Z',
    resolvedAt: '2024-10-19T11:00:00Z',
    messagesCount: 2
  }
];

const Support: React.FC = () => {
  const [tickets] = useState<SupportTicket[]>(mockTickets);
  const [loading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Calculate stats
  const stats = {
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    waitingUser: tickets.filter(t => t.status === 'waiting_user').length,
    resolved: tickets.filter(t => t.status === 'resolved').length
  };

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = searchQuery === '' ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.userEmail.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge $variant="danger">Open</Badge>;
      case 'in_progress':
        return <Badge $variant="info">In Progress</Badge>;
      case 'waiting_user':
        return <Badge $variant="warning">Waiting on User</Badge>;
      case 'resolved':
        return <Badge $variant="success">Resolved</Badge>;
      case 'closed':
        return <Badge $variant="neutral">Closed</Badge>;
      default:
        return <Badge $variant="neutral">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const icon = priority === 'urgent' || priority === 'high' ? <FiAlertCircle /> : <FiClock />;
    return (
      <PriorityBadge $level={priority}>
        {icon}
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </PriorityBadge>
    );
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      technical: 'Technical',
      account: 'Account',
      billing: 'Billing',
      abuse: 'Abuse Report',
      other: 'Other'
    };
    return labels[category] || category;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const columns: Column<SupportTicket>[] = [
    {
      id: 'ticket',
      header: 'Ticket',
      accessor: (row) => (
        <TicketInfo>
          <TicketSubject>#{row.ticketId} - {row.subject}</TicketSubject>
          <TicketMeta>
            {row.userName} ({row.userEmail})
          </TicketMeta>
        </TicketInfo>
      ),
      width: '400px'
    },
    {
      id: 'category',
      header: 'Category',
      accessor: (row) => getCategoryLabel(row.category),
      width: '120px'
    },
    {
      id: 'priority',
      header: 'Priority',
      accessor: (row) => getPriorityBadge(row.priority),
      width: '120px',
      sortable: true
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => getStatusBadge(row.status),
      width: '140px',
      sortable: true
    },
    {
      id: 'messages',
      header: 'Replies',
      accessor: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280' }}>
          <FiMessageSquare />
          {row.messagesCount}
        </div>
      ),
      width: '100px',
      align: 'center'
    },
    {
      id: 'updated',
      header: 'Last Updated',
      accessor: (row) => formatDate(row.updatedAt),
      width: '120px',
      sortable: true
    }
  ];

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <Heading level="h1">Support Tickets</Heading>
          <Text>Manage customer support requests and inquiries</Text>
        </HeaderLeft>
      </PageHeader>

      <StatsBar>
        <StatCard>
          <StatIcon $color="#ef4444">
            <FiAlertCircle />
          </StatIcon>
          <StatDetails>
            <StatLabel>Open Tickets</StatLabel>
            <StatValue>{stats.open}</StatValue>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color="#3b82f6">
            <FiClock />
          </StatIcon>
          <StatDetails>
            <StatLabel>In Progress</StatLabel>
            <StatValue>{stats.inProgress}</StatValue>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color="#f59e0b">
            <FiMessageSquare />
          </StatIcon>
          <StatDetails>
            <StatLabel>Waiting on User</StatLabel>
            <StatValue>{stats.waitingUser}</StatValue>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color="#10b981">
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
            type="text"
            placeholder="Search tickets by subject, user, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchInputWrapper>

        <FilterGroup>
          <FilterLabel>Status</FilterLabel>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_user">Waiting on User</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </Select>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Priority</FilterLabel>
          <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Category</FilterLabel>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All Categories</option>
            <option value="technical">Technical</option>
            <option value="account">Account</option>
            <option value="billing">Billing</option>
            <option value="abuse">Abuse Report</option>
            <option value="other">Other</option>
          </Select>
        </FilterGroup>
      </FilterBar>

      <DataTable
        columns={columns}
        data={filteredTickets}
        loading={loading}
        emptyMessage="No support tickets found matching your criteria"
        onRowClick={(ticket) => console.log('View ticket:', ticket)}
        getRowId={(ticket) => ticket.ticketId}
      />
    </PageContainer>
  );
};

export default Support;
