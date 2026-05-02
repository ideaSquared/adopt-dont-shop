import React, { useState } from 'react';
import { Heading, Text, Input } from '@adopt-dont-shop/lib.components';
import { FiSearch } from 'react-icons/fi';
import { DataTable, type Column } from '../components/data';
import { useApplications, useBulkUpdateApplications } from '../hooks';
import { BulkActionToolbar } from '../components/ui';
import { BulkConfirmationModal } from '../components/modals';
import type { AdminApplication, ApplicationStatus } from '../services/applicationService';
import styles from './Applications.css';

type BulkApplicationActionType = 'approve' | 'reject';

const getStatusBadge = (status: ApplicationStatus) => {
  switch (status) {
    case 'approved':
      return <span className={styles.badgeSuccess}>Approved</span>;
    case 'rejected':
      return <span className={styles.badgeDanger}>Rejected</span>;
    case 'withdrawn':
      return <span className={styles.badgeNeutral}>Withdrawn</span>;
    default:
      return <span className={styles.badgeWarning}>Submitted</span>;
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
        <div className={styles.applicantInfo}>
          <div className={styles.applicantName}>{row.applicantName}</div>
          <div className={styles.applicantEmail}>{row.applicantEmail}</div>
        </div>
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
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <Heading level='h1'>Application Management</Heading>
          <Text>Browse and manage all adoption applications</Text>
        </div>
      </div>

      {error instanceof Error && (
        <div className={styles.errorMessage}>Failed to load applications: {error.message}</div>
      )}

      <div className={styles.filterBar}>
        <div className={styles.searchInputWrapper}>
          <FiSearch />
          <Input
            type='text'
            placeholder='Search by applicant name or email...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor='apps-status-filter'>
            Status
          </label>
          <select
            id='apps-status-filter'
            className={styles.select}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value='all'>All Statuses</option>
            <option value='submitted'>Submitted</option>
            <option value='approved'>Approved</option>
            <option value='rejected'>Rejected</option>
            <option value='withdrawn'>Withdrawn</option>
          </select>
        </div>
      </div>

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
    </div>
  );
};

export default Applications;
