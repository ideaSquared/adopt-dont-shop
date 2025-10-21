import React, { useState } from 'react';
import styled from 'styled-components';
import { Heading, Text, Button, Input } from '@adopt-dont-shop/components';
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
import type { MessageThread } from '../types/admin';

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

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

const MessageCount = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 0.5rem;
  border-radius: 12px;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 600;
`;

const FlagBadge = styled.div<{ $severity: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    switch (props.$severity) {
      case 'high': return '#fee2e2';
      case 'medium': return '#fef3c7';
      case 'low': return '#dbeafe';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.$severity) {
      case 'high': return '#991b1b';
      case 'medium': return '#92400e';
      case 'low': return '#1e40af';
      default: return '#374151';
    }
  }};

  svg {
    font-size: 0.875rem;
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

// Mock data
const mockMessageThreads: MessageThread[] = [
  {
    threadId: '1',
    participants: [
      { userId: 'adopter-1', name: 'Emma Wilson', userType: 'adopter' },
      { userId: 'rescue-staff-1', name: 'Sarah Johnson', userType: 'rescue_staff' }
    ],
    subject: 'Regarding adoption application for Luna',
    lastMessage: 'Thank you for your interest! I\'d be happy to schedule a meet and greet.',
    messageCount: 12,
    unreadCount: 0,
    status: 'active',
    flagged: false,
    createdAt: '2024-10-15T09:30:00Z',
    lastActivity: '2024-10-21T14:20:00Z'
  },
  {
    threadId: '2',
    participants: [
      { userId: 'adopter-2', name: 'James Miller', userType: 'adopter' },
      { userId: 'rescue-staff-2', name: 'Mike Thompson', userType: 'rescue_staff' }
    ],
    subject: 'Question about Max the Golden Retriever',
    lastMessage: 'Is Max good with children? We have two kids aged 5 and 7.',
    messageCount: 5,
    unreadCount: 1,
    status: 'active',
    flagged: false,
    createdAt: '2024-10-20T16:45:00Z',
    lastActivity: '2024-10-21T10:15:00Z'
  },
  {
    threadId: '3',
    participants: [
      { userId: 'adopter-3', name: 'Unknown User', userType: 'adopter' },
      { userId: 'rescue-staff-3', name: 'Lisa Anderson', userType: 'rescue_staff' }
    ],
    subject: 'URGENT: Need to return adopted pet',
    lastMessage: 'This is unacceptable! I demand a full refund immediately!',
    messageCount: 8,
    unreadCount: 2,
    status: 'flagged',
    flagged: true,
    flagReason: 'Aggressive language detected',
    flagSeverity: 'high',
    createdAt: '2024-10-19T11:20:00Z',
    lastActivity: '2024-10-21T09:45:00Z'
  },
  {
    threadId: '4',
    participants: [
      { userId: 'adopter-4', name: 'Sophie Brown', userType: 'adopter' },
      { userId: 'rescue-staff-4', name: 'David Lee', userType: 'rescue_staff' }
    ],
    subject: 'Home visit scheduling',
    lastMessage: 'Perfect! I\'ll see you on Saturday at 2pm.',
    messageCount: 15,
    unreadCount: 0,
    status: 'active',
    flagged: false,
    createdAt: '2024-10-10T13:00:00Z',
    lastActivity: '2024-10-20T18:30:00Z'
  },
  {
    threadId: '5',
    participants: [
      { userId: 'adopter-5', name: 'Oliver Davis', userType: 'adopter' },
      { userId: 'rescue-staff-5', name: 'Rachel Green', userType: 'rescue_staff' }
    ],
    subject: 'Medical records for Bella',
    lastMessage: 'Could you send over Bella\'s vaccination records?',
    messageCount: 6,
    unreadCount: 0,
    status: 'active',
    flagged: true,
    flagReason: 'Request for sensitive information',
    flagSeverity: 'medium',
    createdAt: '2024-10-18T10:15:00Z',
    lastActivity: '2024-10-20T14:00:00Z'
  },
  {
    threadId: '6',
    participants: [
      { userId: 'adopter-6', name: 'Charlotte White', userType: 'adopter' },
      { userId: 'rescue-staff-6', name: 'Tom Harris', userType: 'rescue_staff' }
    ],
    subject: 'Post-adoption check-in',
    lastMessage: 'Charlie is doing wonderfully! He\'s settled in so well.',
    messageCount: 20,
    unreadCount: 0,
    status: 'archived',
    flagged: false,
    createdAt: '2024-09-05T09:00:00Z',
    lastActivity: '2024-10-01T12:00:00Z'
  },
  {
    threadId: '7',
    participants: [
      { userId: 'adopter-7', name: 'Henry Clark', userType: 'adopter' },
      { userId: 'rescue-staff-7', name: 'Anna Martinez', userType: 'rescue_staff' }
    ],
    subject: 'Inquiry about special needs cat',
    lastMessage: 'I have experience with diabetic cats. Can you tell me more about Whiskers?',
    messageCount: 3,
    unreadCount: 1,
    status: 'active',
    flagged: false,
    createdAt: '2024-10-21T08:00:00Z',
    lastActivity: '2024-10-21T08:30:00Z'
  },
  {
    threadId: '8',
    participants: [
      { userId: 'adopter-8', name: 'Isabella Taylor', userType: 'adopter' },
      { userId: 'rescue-staff-8', name: 'Chris Walker', userType: 'rescue_staff' }
    ],
    subject: 'Adoption fee payment question',
    lastMessage: 'Do you accept payment plans for the adoption fee?',
    messageCount: 7,
    unreadCount: 0,
    status: 'active',
    flagged: true,
    flagReason: 'Financial discussion flagged for review',
    flagSeverity: 'low',
    createdAt: '2024-10-17T15:30:00Z',
    lastActivity: '2024-10-19T11:00:00Z'
  }
];

const Messages: React.FC = () => {
  const [threads] = useState<MessageThread[]>(mockMessageThreads);
  const [loading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [flaggedFilter, setFlaggedFilter] = useState<string>('all');

  // Calculate stats
  const activeThreads = threads.filter(t => t.status === 'active').length;
  const flaggedThreads = threads.filter(t => t.flagged).length;
  const totalMessages = threads.reduce((sum, t) => sum + t.messageCount, 0);
  const unreadMessages = threads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);

  // Filter threads
  const filteredThreads = threads.filter(thread => {
    const matchesSearch = searchQuery === '' ||
      thread.participants.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      thread.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || thread.status === statusFilter;
    const matchesFlagged = flaggedFilter === 'all' ||
      (flaggedFilter === 'flagged' && thread.flagged) ||
      (flaggedFilter === 'not_flagged' && !thread.flagged);

    return matchesSearch && matchesStatus && matchesFlagged;
  });

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge $variant="success">Active</Badge>;
      case 'flagged':
        return <Badge $variant="warning">Flagged</Badge>;
      case 'archived':
        return <Badge $variant="neutral">Archived</Badge>;
      default:
        return <Badge $variant="neutral">{status}</Badge>;
    }
  };

  const columns: Column<MessageThread>[] = [
    {
      id: 'status',
      header: '',
      accessor: (row) => <StatusDot $status={row.status} />,
      width: '40px'
    },
    {
      id: 'conversation',
      header: 'Conversation',
      accessor: (row) => (
        <MessagePreview>
          <MessageParticipants>
            {row.participants.map((p, i) => (
              <React.Fragment key={p.userId}>
                {i > 0 && '↔'}
                {p.name}
              </React.Fragment>
            ))}
          </MessageParticipants>
          <MessageSubject>{row.subject}</MessageSubject>
          <MessageMeta>
            <span>{row.messageCount} messages</span>
            {row.unreadCount > 0 && <span>• {row.unreadCount} unread</span>}
            <span>• Last activity: {formatTimestamp(row.lastActivity)}</span>
          </MessageMeta>
        </MessagePreview>
      ),
      width: '420px'
    },
    {
      id: 'participants',
      header: 'Participants',
      accessor: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {row.participants.map(p => (
            <ParticipantInfo key={p.userId}>
              <ParticipantName>{p.name}</ParticipantName>
              <ParticipantRole>{p.userType.replace('_', ' ')}</ParticipantRole>
            </ParticipantInfo>
          ))}
        </div>
      ),
      width: '180px'
    },
    {
      id: 'flags',
      header: 'Flags',
      accessor: (row) => (
        row.flagged ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <FlagBadge $severity={row.flagSeverity || 'low'}>
              <FiAlertCircle />
              {row.flagSeverity?.toUpperCase()}
            </FlagBadge>
            {row.flagReason && (
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {row.flagReason}
              </div>
            )}
          </div>
        ) : (
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>—</span>
        )
      ),
      width: '200px'
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
              console.log('View thread:', row.threadId);
            }}
            title="View thread"
          >
            <FiEye />
          </ActionButton>
          <ActionButton
            onClick={(e) => {
              e.stopPropagation();
              console.log('Flag thread:', row.threadId);
            }}
            title="Flag thread"
          >
            <FiFlag />
          </ActionButton>
          <ActionButton
            onClick={(e) => {
              e.stopPropagation();
              console.log('Delete thread:', row.threadId);
            }}
            title="Delete thread"
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
          <StatIcon $color="#667eea">
            <FiMessageSquare />
          </StatIcon>
          <StatDetails>
            <StatLabel>Active Threads</StatLabel>
            <StatValue>{activeThreads}</StatValue>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color="#f59e0b">
            <FiAlertCircle />
          </StatIcon>
          <StatDetails>
            <StatLabel>Flagged Threads</StatLabel>
            <StatValue>{flaggedThreads}</StatValue>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color="#10b981">
            <FiCheckCircle />
          </StatIcon>
          <StatDetails>
            <StatLabel>Total Messages</StatLabel>
            <StatValue>{totalMessages}</StatValue>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color="#ec4899">
            <FiMessageSquare />
          </StatIcon>
          <StatDetails>
            <StatLabel>Unread Messages</StatLabel>
            <StatValue>{unreadMessages}</StatValue>
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
            <option value="flagged">Flagged</option>
            <option value="archived">Archived</option>
          </Select>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Flagged</FilterLabel>
          <Select value={flaggedFilter} onChange={(e) => setFlaggedFilter(e.target.value)}>
            <option value="all">All Messages</option>
            <option value="flagged">Flagged Only</option>
            <option value="not_flagged">Not Flagged</option>
          </Select>
        </FilterGroup>
      </FilterBar>

      <DataTable
        columns={columns}
        data={filteredThreads}
        loading={loading}
        emptyMessage="No message threads found matching your criteria"
        onRowClick={(thread) => console.log('View thread details:', thread)}
        getRowId={(thread) => thread.threadId}
      />
    </PageContainer>
  );
};

export default Messages;
