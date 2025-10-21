import React, { useState } from 'react';
import styled from 'styled-components';
import { Heading, Text, Button, Input } from '@adopt-dont-shop/components';
import { FiSearch, FiAlertTriangle, FiCheckCircle, FiXCircle, FiEye, FiShield } from 'react-icons/fi';
import { DataTable } from '../components/data';
import type { Column } from '../components/data';
import type { ModerationItem } from '../types/admin';

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

const ReportInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ReportReason = styled.div`
  font-weight: 600;
  color: #111827;
`;

const ReportMeta = styled.div`
  font-size: 0.8125rem;
  color: #6b7280;
`;

const PriorityIndicator = styled.div<{ $level: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => {
    switch (props.$level) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#ca8a04';
      case 'low': return '#2563eb';
      default: return '#9ca3af';
    }
  }};
`;

const PriorityLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const IconButton = styled.button`
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

const ContentTypeTag = styled.span<{ $type: string }>`
  padding: 0.25rem 0.625rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    switch (props.$type) {
      case 'listing': return '#ede9fe';
      case 'message': return '#dbeafe';
      case 'profile': return '#fce7f3';
      case 'photo': return '#fef3c7';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.$type) {
      case 'listing': return '#6b21a8';
      case 'message': return '#1e40af';
      case 'profile': return '#9f1239';
      case 'photo': return '#92400e';
      default: return '#374151';
    }
  }};
`;

// Mock data
const mockReports: ModerationItem[] = [
  {
    reportId: '1',
    contentType: 'listing',
    contentId: 'pet-123',
    reportedBy: 'user-5',
    reportedByName: 'Sarah Wilson',
    reason: 'Suspected scam - asking for money outside platform',
    description: 'User is requesting payment via PayPal before allowing adoption',
    status: 'pending',
    priority: 'critical',
    createdAt: '2024-10-21T10:30:00Z',
    targetUserId: 'user-10',
    targetUserName: 'Suspicious Rescue'
  },
  {
    reportId: '2',
    contentType: 'message',
    contentId: 'msg-456',
    reportedBy: 'user-8',
    reportedByName: 'Michael Chen',
    reason: 'Harassment and inappropriate language',
    description: 'Received threatening messages after declining application',
    status: 'reviewing',
    priority: 'high',
    createdAt: '2024-10-21T09:15:00Z',
    assignedTo: 'admin-1',
    targetUserId: 'user-12',
    targetUserName: 'John Aggressive'
  },
  {
    reportId: '3',
    contentType: 'photo',
    contentId: 'photo-789',
    reportedBy: 'user-15',
    reportedByName: 'Emma Johnson',
    reason: 'Inappropriate or disturbing image',
    description: 'Photo shows animal in poor conditions',
    status: 'reviewing',
    priority: 'high',
    createdAt: '2024-10-21T08:00:00Z',
    assignedTo: 'admin-2',
    targetUserId: 'rescue-5',
    targetUserName: 'Questionable Shelter'
  },
  {
    reportId: '4',
    contentType: 'profile',
    contentId: 'profile-321',
    reportedBy: 'user-20',
    reportedByName: 'David Martinez',
    reason: 'Impersonation',
    description: 'Profile is using our rescue\'s name and photos',
    status: 'pending',
    priority: 'medium',
    createdAt: '2024-10-20T16:00:00Z',
    targetUserId: 'user-25',
    targetUserName: 'Fake Rescue Account'
  },
  {
    reportId: '5',
    contentType: 'listing',
    contentId: 'pet-654',
    reportedBy: 'user-30',
    reportedByName: 'Lisa Anderson',
    reason: 'Incorrect or misleading information',
    description: 'Pet age and breed don\'t match description',
    status: 'resolved',
    priority: 'low',
    createdAt: '2024-10-19T14:00:00Z',
    assignedTo: 'admin-1',
    resolvedAt: '2024-10-20T10:00:00Z',
    resolution: 'Contacted rescue - information updated',
    targetUserId: 'rescue-3',
    targetUserName: 'Happy Paws Rescue'
  },
  {
    reportId: '6',
    contentType: 'message',
    contentId: 'msg-987',
    reportedBy: 'user-35',
    reportedByName: 'Robert Taylor',
    reason: 'Spam or commercial solicitation',
    description: 'Promoting external pet-finding service',
    status: 'dismissed',
    priority: 'low',
    createdAt: '2024-10-18T11:00:00Z',
    assignedTo: 'admin-2',
    resolvedAt: '2024-10-18T15:00:00Z',
    resolution: 'User was providing legitimate advice',
    targetUserId: 'user-40',
    targetUserName: 'Helpful User'
  }
];

const Moderation: React.FC = () => {
  const [reports] = useState<ModerationItem[]>(mockReports);
  const [loading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');

  // Calculate stats
  const stats = {
    pending: reports.filter(r => r.status === 'pending').length,
    reviewing: reports.filter(r => r.status === 'reviewing').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    critical: reports.filter(r => r.priority === 'critical' && r.status !== 'resolved').length
  };

  // Filter reports
  const filteredReports = reports.filter(report => {
    const matchesSearch = searchQuery === '' ||
      report.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.reportedByName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.targetUserName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || report.priority === priorityFilter;
    const matchesContentType = contentTypeFilter === 'all' || report.contentType === contentTypeFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesContentType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge $variant="danger">Pending Review</Badge>;
      case 'reviewing':
        return <Badge $variant="info">Under Review</Badge>;
      case 'resolved':
        return <Badge $variant="success">Resolved</Badge>;
      case 'dismissed':
        return <Badge $variant="neutral">Dismissed</Badge>;
      default:
        return <Badge $variant="neutral">{status}</Badge>;
    }
  };

  const getPriorityDisplay = (priority: string) => {
    const labels: Record<string, string> = {
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      low: 'Low'
    };

    return (
      <PriorityLabel>
        <PriorityIndicator $level={priority} />
        {labels[priority] || priority}
      </PriorityLabel>
    );
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
      month: 'short'
    });
  };

  const columns: Column<ModerationItem>[] = [
    {
      id: 'report',
      header: 'Report',
      accessor: (row) => (
        <ReportInfo>
          <ReportReason>{row.reason}</ReportReason>
          <ReportMeta>
            Reported by {row.reportedByName} • Target: {row.targetUserName}
          </ReportMeta>
        </ReportInfo>
      ),
      width: '350px'
    },
    {
      id: 'contentType',
      header: 'Content Type',
      accessor: (row) => (
        <ContentTypeTag $type={row.contentType}>
          {row.contentType.charAt(0).toUpperCase() + row.contentType.slice(1)}
        </ContentTypeTag>
      ),
      width: '120px'
    },
    {
      id: 'priority',
      header: 'Priority',
      accessor: (row) => getPriorityDisplay(row.priority),
      width: '110px',
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
      id: 'created',
      header: 'Reported',
      accessor: (row) => formatDate(row.createdAt),
      width: '100px',
      sortable: true
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (row) => (
        <ActionButtons onClick={(e) => e.stopPropagation()}>
          <IconButton title="View details">
            <FiEye />
          </IconButton>
          {(row.status === 'pending' || row.status === 'reviewing') && (
            <>
              <IconButton title="Take action" style={{ color: '#10b981', borderColor: '#10b981' }}>
                <FiShield />
              </IconButton>
              <IconButton title="Resolve" style={{ color: '#3b82f6', borderColor: '#3b82f6' }}>
                <FiCheckCircle />
              </IconButton>
              <IconButton title="Dismiss" style={{ color: '#6b7280', borderColor: '#d1d5db' }}>
                <FiXCircle />
              </IconButton>
            </>
          )}
        </ActionButtons>
      ),
      width: '150px',
      align: 'center'
    }
  ];

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <Heading level="h1">Content Moderation</Heading>
          <Text>Review and manage reported content and user violations</Text>
        </HeaderLeft>
      </PageHeader>

      <StatsBar>
        <StatCard>
          <StatIcon $color="#ef4444">
            <FiAlertTriangle />
          </StatIcon>
          <StatDetails>
            <StatLabel>Pending Review</StatLabel>
            <StatValue>{stats.pending}</StatValue>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color="#3b82f6">
            <FiEye />
          </StatIcon>
          <StatDetails>
            <StatLabel>Under Review</StatLabel>
            <StatValue>{stats.reviewing}</StatValue>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color="#dc2626">
            <FiShield />
          </StatIcon>
          <StatDetails>
            <StatLabel>Critical Priority</StatLabel>
            <StatValue>{stats.critical}</StatValue>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color="#10b981">
            <FiCheckCircle />
          </StatIcon>
          <StatDetails>
            <StatLabel>Resolved</StatLabel>
            <StatValue>{stats.resolved}</StatValue>
          </StatDetails>
        </StatCard>
      </StatsBar>

      <FilterBar>
        <SearchInputWrapper>
          <FiSearch />
          <Input
            type="text"
            placeholder="Search by reason, reporter, or target..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchInputWrapper>

        <FilterGroup>
          <FilterLabel>Status</FilterLabel>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="reviewing">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </Select>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Priority</FilterLabel>
          <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Content Type</FilterLabel>
          <Select value={contentTypeFilter} onChange={(e) => setContentTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="listing">Listing</option>
            <option value="message">Message</option>
            <option value="profile">Profile</option>
            <option value="photo">Photo</option>
          </Select>
        </FilterGroup>
      </FilterBar>

      <DataTable
        columns={columns}
        data={filteredReports}
        loading={loading}
        emptyMessage="No moderation reports found matching your criteria"
        onRowClick={(report) => console.log('View report:', report)}
        getRowId={(report) => report.reportId}
      />
    </PageContainer>
  );
};

export default Moderation;
