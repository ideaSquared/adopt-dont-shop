import React, { useState } from 'react';
import styled from 'styled-components';
import { Heading, Text, Input } from '@adopt-dont-shop/lib.components';
import { FiSearch } from 'react-icons/fi';
import { DataTable, type Column } from '../components/data';
import { useApplications, useBulkUpdateApplications } from '../hooks';
import { BulkActionToolbar } from '../components/ui';
import { BulkConfirmationModal } from '../components/modals';
import type { AdminApplication, ApplicationStatus } from '../services/applicationService';

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
  min-width: 200px;
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

const ApplicantInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const ApplicantName = styled.div`
  font-weight: 600;
  color: #111827;
`;

const ApplicantEmail = styled.div`
  font-size: 0.8125rem;
  color: #6b7280;
`;

const ErrorMessage = styled.div`
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 1rem;
  color: #991b1b;
  font-size: 0.875rem;
`;

type BulkApplicationActionType = 'approve' | 'reject';

const getStatusBadge = (status: ApplicationStatus) => {
  switch (status) {
    case 'approved':
      return <Badge $variant='success'>Approved</Badge>;
    case 'rejected':
      return <Badge $variant='danger'>Rejected</Badge>;
    case 'withdrawn':
      return <Badge $variant='neutral'>Withdrawn</Badge>;
    default:
      return <Badge $variant='warning'>Submitted</Badge>;
  }
};

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const Applications: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkApplicationActionType | null>(null);
  const [bulkResult, setBulkResult] = useState<{ succeeded: number; failed: number } | null>(null);

  const { data, isLoading, error } = useApplications({
    search: searchQuery || undefined,
    status: statusFilter !== 'all' ? (statusFilter as ApplicationStatus) : undefined,
    limit: 20,
  });

  const bulkUpdateApplications = useBulkUpdateApplications();

  const applications: AdminApplication[] = data?.data ?? [];

  const handleBulkConfirm = async (reason?: string): Promise<void> => {
    if (!bulkAction) {
      return;
    }

    const applicationIds = Array.from(selectedRows);
    const result = await bulkUpdateApplications.mutateAsync({
      applicationIds,
      updates: { status: bulkAction === 'approve' ? 'approved' : 'rejected' },
      reason,
    });

    setBulkResult({ succeeded: result.successCount, failed: result.failureCount });
    setSelectedRows(new Set());
  };

  const handleBulkModalClose = () => {
    setBulkAction(null);
    setBulkResult(null);
  };

  const columns: Column<AdminApplication>[] = [
    {
      id: 'applicant',
      header: 'Applicant',
      accessor: row => (
        <ApplicantInfo>
          <ApplicantName>{row.applicantName}</ApplicantName>
          <ApplicantEmail>{row.applicantEmail}</ApplicantEmail>
        </ApplicantInfo>
      ),
      width: '240px',
    },
    {
      id: 'pet',
      header: 'Pet',
      accessor: row => row.petName,
      width: '160px',
    },
    {
      id: 'rescue',
      header: 'Rescue',
      accessor: row => row.rescueName,
      width: '200px',
    },
    {
      id: 'status',
      header: 'Status',
      accessor: row => getStatusBadge(row.status),
      width: '130px',
      sortable: true,
    },
    {
      id: 'createdAt',
      header: 'Submitted',
      accessor: row => formatDate(row.createdAt),
      width: '120px',
      sortable: true,
    },
  ];

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <Heading level='h1'>Application Management</Heading>
          <Text>Browse and manage all adoption applications</Text>
        </HeaderLeft>
      </PageHeader>

      {error && (
        <ErrorMessage>Failed to load applications: {(error as Error).message}</ErrorMessage>
      )}

      <FilterBar>
        <SearchInputWrapper>
          <FiSearch />
          <Input
            type='text'
            placeholder='Search by applicant name or email...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </SearchInputWrapper>

        <FilterGroup>
          <FilterLabel>Status</FilterLabel>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value='all'>All Statuses</option>
            <option value='submitted'>Submitted</option>
            <option value='approved'>Approved</option>
            <option value='rejected'>Rejected</option>
            <option value='withdrawn'>Withdrawn</option>
          </Select>
        </FilterGroup>
      </FilterBar>

      <BulkActionToolbar
        selectedCount={selectedRows.size}
        totalCount={applications.length}
        onSelectAll={() =>
          setSelectedRows(new Set(applications.map((a: AdminApplication) => a.applicationId)))
        }
        onClearSelection={() => setSelectedRows(new Set())}
        actions={[
          {
            label: 'Approve',
            variant: 'primary',
            onClick: () => setBulkAction('approve'),
          },
          {
            label: 'Reject',
            variant: 'danger',
            onClick: () => setBulkAction('reject'),
          },
        ]}
      />

      <DataTable
        columns={columns}
        data={applications}
        loading={isLoading}
        emptyMessage='No applications found matching your criteria'
        selectable
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        getRowId={app => app.applicationId}
      />

      <BulkConfirmationModal
        isOpen={bulkAction !== null}
        onClose={handleBulkModalClose}
        onConfirm={handleBulkConfirm}
        title={bulkAction === 'approve' ? 'Approve Applications' : 'Reject Applications'}
        description={
          bulkAction === 'approve'
            ? 'Approve the selected adoption applications.'
            : 'Reject the selected adoption applications. Applicants will be notified.'
        }
        selectedCount={selectedRows.size}
        confirmLabel={bulkAction === 'approve' ? 'Approve Applications' : 'Reject Applications'}
        variant={bulkAction === 'reject' ? 'danger' : 'info'}
        requireReason={bulkAction === 'reject'}
        reasonLabel='Rejection reason'
        reasonPlaceholder='Explain why these applications are being rejected...'
        isLoading={bulkUpdateApplications.isLoading}
        resultSummary={bulkResult}
      />
    </PageContainer>
  );
};

export default Applications;
