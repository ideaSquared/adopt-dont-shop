import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heading, Text, Button, Input } from '@adopt-dont-shop/lib.components';
import {
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiMail,
  FiMapPin,
  FiAlertCircle,
} from 'react-icons/fi';
import { DataTable, type Column } from '../components/data';
import type { AdminRescue } from '@/types/rescue';
import { rescueService } from '@/services/rescueService';
import { exportData, type ExportColumn } from '@/services/exportService';
import {
  RescueDetailModal,
  RescueVerificationModal,
  SendEmailModal,
  BulkConfirmationModal,
} from '@/components/modals';
import { ExportButton, BulkActionToolbar } from '@/components/ui';
import { useBulkUpdateRescues } from '@/hooks';
import * as styles from './Rescues.css';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'verified':
      return <span className={styles.badgeSuccess}>Verified</span>;
    case 'pending':
      return <span className={styles.badgeWarning}>Pending Review</span>;
    case 'rejected':
      return <span className={styles.badgeDanger}>Rejected</span>;
    default:
      return <span className={styles.badgeNeutral}>{status}</span>;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const Rescues: React.FC = () => {
  const { rescueId } = useParams<{ rescueId?: string }>();
  const navigate = useNavigate();

  const [rescues, setRescues] = useState<AdminRescue[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const [selectedRescue, setSelectedRescue] = useState<AdminRescue | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationAction, setVerificationAction] = useState<'approve' | 'reject'>('approve');
  const [showEmailModal, setShowEmailModal] = useState(false);

  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [bulkRescueAction, setBulkRescueAction] = useState<'approve' | 'suspend' | null>(null);
  const [bulkResult, setBulkResult] = useState<{ succeeded: number; failed: number } | null>(null);
  const bulkUpdateRescues = useBulkUpdateRescues();

  const fetchRescues = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const result = await rescueService.getAll({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery || undefined,
        status:
          statusFilter !== 'all'
            ? (statusFilter as 'pending' | 'verified' | 'suspended' | 'inactive')
            : undefined,
      });

      setRescues(result.data);
      setTotalPages(result.pagination?.pages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rescues');
      setRescues([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery, statusFilter]);

  useEffect(() => {
    fetchRescues();
  }, [fetchRescues]);

  useEffect(() => {
    if (rescueId && rescues.length > 0) {
      const rescue = rescues.find(r => r.rescueId === rescueId);
      if (rescue) {
        setSelectedRescue(rescue);
        setShowDetailModal(true);
      }
    }
  }, [rescueId, rescues]);

  const handleViewDetails = (rescueIdParam: string): void => {
    const rescue = rescues.find(r => r.rescueId === rescueIdParam);
    if (rescue) {
      setSelectedRescue(rescue);
      setShowDetailModal(true);
      navigate(`/rescues/${rescueIdParam}`, { replace: true });
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
    if (rescueId) {
      navigate('/rescues', { replace: true });
    }
  };

  const handleVerificationSuccess = (): void => {
    fetchRescues();
  };

  const rescueExportColumns: ExportColumn<AdminRescue>[] = [
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'City', accessor: 'city' },
    { header: 'County', accessor: row => row.county ?? '' },
    { header: 'Postcode', accessor: 'postcode' },
    { header: 'Status', accessor: 'status' },
    { header: 'Registered', accessor: 'createdAt' },
    { header: 'Verified', accessor: row => row.verifiedAt ?? '' },
  ];

  const handleExport = (format: 'csv' | 'pdf') => {
    exportData(rescues, rescueExportColumns, 'rescues-export', 'Rescue Management Export', format);
  };

  const handleBulkRescueConfirm = async (): Promise<void> => {
    if (!bulkRescueAction) {
      return;
    }
    const rescueIds = Array.from(selectedRows);
    const result = await bulkUpdateRescues.mutateAsync({ rescueIds, action: bulkRescueAction });
    setBulkResult({ succeeded: result.successCount, failed: result.failedCount });
    setSelectedRows(new Set());
    fetchRescues();
  };

  const handleBulkModalClose = (): void => {
    setBulkRescueAction(null);
    setBulkResult(null);
  };

  const columns: Column<AdminRescue>[] = [
    {
      id: 'rescue',
      header: 'Rescue Organization',
      accessor: row => (
        <div className={styles.rescueInfo}>
          <div className={styles.rescueName}>{row.name}</div>
          <div className={styles.rescueDetail}>
            <FiMail />
            {row.email}
          </div>
          <div className={styles.rescueDetail}>
            <FiMapPin />
            {row.city}
            {row.county ? `, ${row.county}` : ''}
          </div>
        </div>
      ),
      width: '350px',
    },
    {
      id: 'status',
      header: 'Status',
      accessor: row => getStatusBadge(row.status),
      width: '140px',
      sortable: true,
    },
    {
      id: 'createdAt',
      header: 'Registered',
      accessor: row => formatDate(row.createdAt),
      width: '120px',
      sortable: true,
    },
    {
      id: 'verified',
      header: 'Verified',
      accessor: row => (row.verifiedAt ? formatDate(row.verifiedAt) : '-'),
      width: '120px',
      sortable: true,
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: row => (
        <div
          className={styles.actionButtons}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
          role='presentation'
        >
          <button
            className={styles.iconButton}
            title='View details'
            onClick={() => handleViewDetails(row.rescueId)}
          >
            <FiEye />
          </button>
          {row.status === 'pending' && (
            <>
              <button
                className={styles.iconButton}
                title='Approve'
                style={{ color: '#10b981', borderColor: '#10b981' }}
                onClick={() => handleApprove(row)}
              >
                <FiCheckCircle />
              </button>
              <button
                className={styles.iconButton}
                title='Reject'
                style={{ color: '#ef4444', borderColor: '#ef4444' }}
                onClick={() => handleReject(row)}
              >
                <FiXCircle />
              </button>
            </>
          )}
          <button
            className={styles.iconButton}
            title='Send email'
            onClick={() => handleSendEmail(row)}
          >
            <FiMail />
          </button>
        </div>
      ),
      width: '140px',
      align: 'center',
    },
  ];

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <Heading level='h1'>Rescue Management</Heading>
          <Text>Manage rescue organizations and verification status</Text>
        </div>
        <div className={styles.headerActions}>
          <ExportButton onExport={handleExport} disabled={loading || rescues.length === 0} />
        </div>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          <FiAlertCircle />
          {error}
        </div>
      )}

      <div className={styles.filterBar}>
        <div className={styles.searchInputWrapper}>
          <FiSearch />
          <Input
            type='text'
            placeholder='Search by name, city, or email...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor='rescue-status-filter'>
            Verification Status
          </label>
          <select
            id='rescue-status-filter'
            className={styles.select}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value='all'>All Statuses</option>
            <option value='verified'>Verified</option>
            <option value='pending'>Pending Review</option>
            <option value='rejected'>Rejected</option>
          </select>
        </div>
      </div>

      <BulkActionToolbar
        selectedCount={selectedRows.size}
        totalCount={rescues.length}
        onSelectAll={() => setSelectedRows(new Set(rescues.map((r: AdminRescue) => r.rescueId)))}
        onClearSelection={() => setSelectedRows(new Set())}
        actions={[
          {
            label: 'Approve',
            variant: 'primary',
            onClick: () => setBulkRescueAction('approve'),
          },
          {
            label: 'Suspend',
            variant: 'danger',
            onClick: () => setBulkRescueAction('suspend'),
          },
        ]}
      />

      <DataTable
        columns={columns}
        data={rescues}
        loading={loading}
        emptyMessage='No rescue organizations found matching your criteria'
        onRowClick={rescue => handleViewDetails(rescue.rescueId)}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        selectable
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        getRowId={rescue => rescue.rescueId}
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

      <BulkConfirmationModal
        isOpen={bulkRescueAction !== null}
        onClose={handleBulkModalClose}
        onConfirm={handleBulkRescueConfirm}
        title={bulkRescueAction === 'approve' ? 'Approve Rescues' : 'Suspend Rescues'}
        description={
          bulkRescueAction === 'approve'
            ? 'Verify and approve the selected rescue organizations on the platform.'
            : 'Suspend the selected rescue organizations. They will be unable to operate on the platform.'
        }
        selectedCount={selectedRows.size}
        confirmLabel={bulkRescueAction === 'approve' ? 'Approve Rescues' : 'Suspend Rescues'}
        variant={bulkRescueAction === 'suspend' ? 'danger' : 'info'}
        isLoading={bulkUpdateRescues.isPending}
        resultSummary={bulkResult}
      />
    </div>
  );
};

export default Rescues;
