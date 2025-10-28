import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Heading, Text, Button, Input } from '@adopt-dont-shop/components';
import { FiSearch, FiCheckCircle, FiXCircle, FiEye, FiMail, FiMapPin, FiAlertCircle } from 'react-icons/fi';
import { DataTable } from '../components/data';
import type { Column } from '../components/data';
import type { AdminRescue } from '@/types/rescue';
import { rescueService } from '@/services/rescueService';
import {
  RescueDetailModal,
  RescueVerificationModal,
  SendEmailModal,
} from '@/components/modals';

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

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
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

const RescueInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const RescueName = styled.div`
  font-weight: 600;
  color: #111827;
`;

const RescueDetail = styled.div`
  font-size: 0.8125rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 0.375rem;

  svg {
    font-size: 0.875rem;
  }
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

const ErrorMessage = styled.div`
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 1rem;
  color: #991b1b;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    flex-shrink: 0;
  }
`;

const Rescues: React.FC = () => {
  const [rescues, setRescues] = useState<AdminRescue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(20);

  // Modal states
  const [selectedRescue, setSelectedRescue] = useState<AdminRescue | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationAction, setVerificationAction] = useState<'approve' | 'reject'>('approve');
  const [showEmailModal, setShowEmailModal] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge $variant="success">Verified</Badge>;
      case 'pending':
        return <Badge $variant="warning">Pending Review</Badge>;
      case 'rejected':
        return <Badge $variant="danger">Rejected</Badge>;
      default:
        return <Badge $variant="neutral">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const fetchRescues = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const result = await rescueService.getAll({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery || undefined,
        status: statusFilter !== 'all' ? (statusFilter as 'pending' | 'verified' | 'suspended' | 'inactive') : undefined,
      });

      setRescues(result.data);
      setTotalPages(result.pagination.pages);
      setTotalItems(result.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rescues');
      setRescues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRescues();
  }, [currentPage, itemsPerPage, searchQuery, statusFilter]);

  const handleViewDetails = (rescueId: string): void => {
    const rescue = rescues.find(r => r.rescueId === rescueId);
    if (rescue) {
      setSelectedRescue(rescue);
      setShowDetailModal(true);
    }
  };

  const handleApprove = (rescue: AdminRescue): void => {
    setSelectedRescue(rescue);
    setVerificationAction('approve');
    setShowVerificationModal(true);
  };

  const handleReject = (rescue: AdminRescue): void => {
    setSelectedRescue(rescue);
    setVerificationAction('reject');
    setShowVerificationModal(true);
  };

  const handleSendEmail = (rescue: AdminRescue): void => {
    setSelectedRescue(rescue);
    setShowEmailModal(true);
  };

  const handleModalClose = (): void => {
    setShowDetailModal(false);
    setShowVerificationModal(false);
    setShowEmailModal(false);
    setSelectedRescue(null);
  };

  const handleVerificationSuccess = (): void => {
    fetchRescues();
  };

  const columns: Column<AdminRescue>[] = [
    {
      id: 'rescue',
      header: 'Rescue Organization',
      accessor: (row) => (
        <RescueInfo>
          <RescueName>{row.name}</RescueName>
          <RescueDetail>
            <FiMail />
            {row.email}
          </RescueDetail>
          <RescueDetail>
            <FiMapPin />
            {row.city}, {row.state}
          </RescueDetail>
        </RescueInfo>
      ),
      width: '350px'
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => getStatusBadge(row.status),
      width: '140px',
      sortable: true
    },
    {
      id: 'createdAt',
      header: 'Registered',
      accessor: (row) => formatDate(row.createdAt),
      width: '120px',
      sortable: true
    },
    {
      id: 'verified',
      header: 'Verified',
      accessor: (row) => row.verifiedAt ? formatDate(row.verifiedAt) : '-',
      width: '120px',
      sortable: true
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (row) => (
        <ActionButtons onClick={(e) => e.stopPropagation()}>
          <IconButton
            title="View details"
            onClick={() => handleViewDetails(row.rescueId)}
          >
            <FiEye />
          </IconButton>
          {row.status === 'pending' && (
            <>
              <IconButton
                title="Approve"
                style={{ color: '#10b981', borderColor: '#10b981' }}
                onClick={() => handleApprove(row)}
              >
                <FiCheckCircle />
              </IconButton>
              <IconButton
                title="Reject"
                style={{ color: '#ef4444', borderColor: '#ef4444' }}
                onClick={() => handleReject(row)}
              >
                <FiXCircle />
              </IconButton>
            </>
          )}
          <IconButton
            title="Send email"
            onClick={() => handleSendEmail(row)}
          >
            <FiMail />
          </IconButton>
        </ActionButtons>
      ),
      width: '140px',
      align: 'center'
    }
  ];

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <Heading level="h1">Rescue Management</Heading>
          <Text>Manage rescue organizations and verification status</Text>
        </HeaderLeft>
        <HeaderActions>
          <Button variant="outline" size="md">
            Export Data
          </Button>
        </HeaderActions>
      </PageHeader>

      {error && (
        <ErrorMessage>
          <FiAlertCircle />
          {error}
        </ErrorMessage>
      )}

      <FilterBar>
        <SearchInputWrapper>
          <FiSearch />
          <Input
            type="text"
            placeholder="Search by name, city, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchInputWrapper>

        <FilterGroup>
          <FilterLabel>Verification Status</FilterLabel>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending Review</option>
            <option value="rejected">Rejected</option>
          </Select>
        </FilterGroup>
      </FilterBar>

      <DataTable
        columns={columns}
        data={rescues}
        loading={loading}
        emptyMessage="No rescue organizations found matching your criteria"
        onRowClick={(rescue) => handleViewDetails(rescue.rescueId)}
        getRowId={(rescue) => rescue.rescueId}
      />

      {showDetailModal && selectedRescue && (
        <RescueDetailModal
          rescueId={selectedRescue.rescueId}
          onClose={handleModalClose}
          onUpdate={fetchRescues}
        />
      )}

      {showVerificationModal && selectedRescue && (
        <RescueVerificationModal
          rescue={selectedRescue}
          action={verificationAction}
          onClose={handleModalClose}
          onSuccess={handleVerificationSuccess}
        />
      )}

      {selectedRescue && (
        <SendEmailModal
          isOpen={showEmailModal}
          rescue={selectedRescue}
          onClose={handleModalClose}
          onSuccess={() => {}}
        />
      )}
    </PageContainer>
  );
};

export default Rescues;
