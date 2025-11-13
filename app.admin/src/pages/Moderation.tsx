import React, { useState } from 'react';
import styled from 'styled-components';
import { Heading, Text, Button, Input } from '@adopt-dont-shop/components';
import {
  FiSearch,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiShield,
} from 'react-icons/fi';
import { DataTable, type Column } from '../components/data';
import {
  useReports,
  useModerationMetrics,
  useReportMutations,
  getSeverityLabel,
  getStatusLabel,
  formatRelativeTime,
  type Report,
  type ReportStatus,
  type ReportSeverity,
} from '@adopt-dont-shop/lib-moderation';
import {
  ActionSelectionModal,
  type ActionSelectionData,
} from '../components/moderation/ActionSelectionModal';
import { ReportDetailModal } from '../components/moderation/ReportDetailModal';

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

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
`;

const Select = styled.select`
  padding: 0.625rem 1rem;
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
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const SearchWrapper = styled.div`
  position: relative;
  flex: 2;
  min-width: 250px;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
`;

const SearchInput = styled(Input)`
  padding-left: 2.75rem;
  width: 100%;
`;

const Badge = styled.span<{ $variant: 'success' | 'danger' | 'info' | 'neutral' }>`
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  display: inline-block;

  ${props => {
    switch (props.$variant) {
      case 'success':
        return `
          background: #dcfce7;
          color: #15803d;
        `;
      case 'danger':
        return `
          background: #fee2e2;
          color: #dc2626;
        `;
      case 'info':
        return `
          background: #dbeafe;
          color: #1e40af;
        `;
      case 'neutral':
      default:
        return `
          background: #f3f4f6;
          color: #4b5563;
        `;
    }
  }}
`;

const PriorityIndicator = styled.div<{ $level: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => {
    switch (props.$level) {
      case 'critical':
        return '#dc2626';
      case 'high':
        return '#ea580c';
      case 'medium':
        return '#ca8a04';
      case 'low':
        return '#2563eb';
      default:
        return '#9ca3af';
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
      case 'pet':
        return '#ede9fe';
      case 'message':
        return '#dbeafe';
      case 'user':
        return '#fce7f3';
      case 'rescue':
        return '#fef3c7';
      default:
        return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.$type) {
      case 'pet':
        return '#6b21a8';
      case 'message':
        return '#1e40af';
      case 'user':
        return '#9f1239';
      case 'rescue':
        return '#92400e';
      default:
        return '#374151';
    }
  }};
`;

const Moderation: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<ReportSeverity | 'all'>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Use real hooks from lib.moderation
  const {
    data: reportsData,
    isLoading,
    error,
    refetch,
  } = useReports({
    status: statusFilter === 'all' ? undefined : statusFilter,
    severity: severityFilter === 'all' ? undefined : severityFilter,
    reportedEntityType: entityTypeFilter === 'all' ? undefined : (entityTypeFilter as any),
    search: searchQuery || undefined,
    page: currentPage,
    limit: pageSize,
    sortBy: 'createdAt' as const,
    sortOrder: 'desc' as const,
  });

  const { data: metricsData } = useModerationMetrics();
  const { resolveReport, dismissReport, isLoading: isActionLoading } = useReportMutations();

  const reports = reportsData?.data || [];
  const pagination = reportsData?.pagination;
  const metrics = metricsData || {
    pendingReports: 0,
    underReviewReports: 0,
    criticalReports: 0,
    resolvedReports: 0,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge $variant='danger'>Pending Review</Badge>;
      case 'under_review':
        return <Badge $variant='info'>Under Review</Badge>;
      case 'resolved':
        return <Badge $variant='success'>Resolved</Badge>;
      case 'dismissed':
        return <Badge $variant='neutral'>Dismissed</Badge>;
      default:
        return <Badge $variant='neutral'>{getStatusLabel(status as ReportStatus)}</Badge>;
    }
  };

  const getPriorityDisplay = (severity: ReportSeverity) => {
    return (
      <PriorityLabel>
        <PriorityIndicator $level={severity} />
        {getSeverityLabel(severity)}
      </PriorityLabel>
    );
  };

  const handleOpenDetailModal = (report: Report) => {
    setSelectedReport(report);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedReport(null);
  };

  const handleOpenActionModal = (report: Report) => {
    setSelectedReport(report);
    setIsActionModalOpen(true);
  };

  const handleCloseActionModal = () => {
    setIsActionModalOpen(false);
    setSelectedReport(null);
  };

  const handleActionSubmit = async (actionData: ActionSelectionData) => {
    if (!selectedReport) return;

    try {
      // Map action types to the appropriate mutations
      if (actionData.actionType === 'no_action') {
        await dismissReport(selectedReport.reportId, actionData.reason);
      } else {
        // For any action that resolves the report
        await resolveReport(selectedReport.reportId, actionData.reason);
      }

      // Close modal and refetch data
      handleCloseActionModal();
      await refetch();
    } catch (err) {
      console.error('Failed to take moderation action:', err);
      // TODO: Show error toast notification
    }
  };

  const columns: Column<Report>[] = [
    {
      id: 'title',
      header: 'Report',
      sortable: true,
      accessor: (report: Report) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{report.title}</div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
            {report.description.substring(0, 80)}...
          </div>
          {(report as any).entityContext && (
            <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem' }}>
              <strong>Reported Entity:</strong> {(report as any).entityContext.displayName}
              {(report as any).entityContext.email && ` (${(report as any).entityContext.email})`}
            </div>
          )}
          <div style={{ marginTop: '0.5rem' }}>
            <ContentTypeTag $type={report.reportedEntityType}>
              {report.reportedEntityType}
            </ContentTypeTag>
          </div>
        </div>
      ),
    },
    {
      id: 'severity',
      header: 'Severity',
      sortable: true,
      accessor: (report: Report) => getPriorityDisplay(report.severity),
    },
    {
      id: 'status',
      header: 'Status',
      sortable: true,
      accessor: (report: Report) => getStatusBadge(report.status),
    },
    {
      id: 'createdAt',
      header: 'Reported',
      sortable: true,
      accessor: (report: Report) => (
        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          {formatRelativeTime(report.createdAt)}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (report: Report) => (
        <ActionButtons>
          <IconButton title='View Details' onClick={() => handleOpenDetailModal(report)}>
            <FiEye />
          </IconButton>
          {report.status === 'pending' || report.status === 'under_review' ? (
            <IconButton
              title='Take Action'
              onClick={() => handleOpenActionModal(report)}
              disabled={isActionLoading}
            >
              <FiShield />
            </IconButton>
          ) : null}
        </ActionButtons>
      ),
    },
  ];

  if (error) {
    return (
      <PageContainer>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
          Error loading reports: {error.message}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <h1>Content Moderation</h1>
          <p>Review and manage reported content across the platform</p>
        </HeaderLeft>
      </PageHeader>

      <StatsBar>
        <StatCard>
          <StatIcon $color='#dc2626'>
            <FiAlertTriangle />
          </StatIcon>
          <StatDetails>
            <StatLabel>Pending Reviews</StatLabel>
            <StatValue>{metrics.pendingReports}</StatValue>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color='#3b82f6'>
            <FiShield />
          </StatIcon>
          <StatDetails>
            <StatLabel>Under Review</StatLabel>
            <StatValue>{metrics.underReviewReports}</StatValue>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color='#ea580c'>
            <FiAlertTriangle />
          </StatIcon>
          <StatDetails>
            <StatLabel>Critical Priority</StatLabel>
            <StatValue>{metrics.criticalReports}</StatValue>
          </StatDetails>
        </StatCard>

        <StatCard>
          <StatIcon $color='#16a34a'>
            <FiCheckCircle />
          </StatIcon>
          <StatDetails>
            <StatLabel>Resolved</StatLabel>
            <StatValue>{metrics.resolvedReports}</StatValue>
          </StatDetails>
        </StatCard>
      </StatsBar>

      <FilterBar>
        <SearchWrapper>
          <SearchIcon>
            <FiSearch />
          </SearchIcon>
          <SearchInput
            placeholder='Search reports...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </SearchWrapper>

        <FilterGroup>
          <Label>Status</Label>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
            <option value='all'>All Statuses</option>
            <option value='pending'>Pending</option>
            <option value='under_review'>Under Review</option>
            <option value='resolved'>Resolved</option>
            <option value='dismissed'>Dismissed</option>
            <option value='escalated'>Escalated</option>
          </Select>
        </FilterGroup>

        <FilterGroup>
          <Label>Severity</Label>
          <Select value={severityFilter} onChange={e => setSeverityFilter(e.target.value as any)}>
            <option value='all'>All Severities</option>
            <option value='critical'>Critical</option>
            <option value='high'>High</option>
            <option value='medium'>Medium</option>
            <option value='low'>Low</option>
          </Select>
        </FilterGroup>

        <FilterGroup>
          <Label>Content Type</Label>
          <Select value={entityTypeFilter} onChange={e => setEntityTypeFilter(e.target.value)}>
            <option value='all'>All Types</option>
            <option value='user'>User</option>
            <option value='rescue'>Rescue</option>
            <option value='pet'>Pet</option>
            <option value='message'>Message</option>
            <option value='application'>Application</option>
          </Select>
        </FilterGroup>
      </FilterBar>

      <DataTable
        data={reports}
        columns={columns}
        loading={isLoading}
        onRowClick={handleOpenDetailModal}
        currentPage={pagination?.page || 1}
        totalPages={pagination?.totalPages || 1}
        onPageChange={page => setCurrentPage(page)}
      />

      <ReportDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        report={selectedReport}
      />

      <ActionSelectionModal
        isOpen={isActionModalOpen}
        onClose={handleCloseActionModal}
        onSubmit={handleActionSubmit}
        reportTitle={selectedReport?.title || ''}
        isLoading={isActionLoading}
      />
    </PageContainer>
  );
};

export default Moderation;
