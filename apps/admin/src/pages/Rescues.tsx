import React, { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import {
  DataTable,
  type DataTableColumn,
  Heading,
  Text,
  Input,
  useDebouncedValue,
} from '@adopt-dont-shop/lib.components';
import {
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiMail,
  FiMapPin,
  FiAlertCircle,
} from 'react-icons/fi';
import type { AdminRescue } from '@/types/rescue';
import { rescueService } from '@/services/rescueService';
import { exportData, type ExportColumn } from '@/services/exportService';
import {
  RescueVerificationModal,
  SendEmailModal,
  BulkConfirmationModal,
} from '@/components/modals';
import { RescueDetailPanel, EntityDetailLayout } from '@/components/detail';
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

const VALID_RESCUE_STATUS_FILTERS: ReadonlySet<string> = new Set([
  'pending',
  'verified',
  'suspended',
  'inactive',
]);

const Rescues: React.FC = () => {
  const { rescueId } = useParams<{ rescueId?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatusParam = searchParams.get('status');

  const [rescues, setRescues] = useState<AdminRescue[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<string>(
    initialStatusParam && VALID_RESCUE_STATUS_FILTERS.has(initialStatusParam)
      ? initialStatusParam
      : 'all'
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, statusFilter]);

  // The detail pane is driven by the selected rescue id (synced with the URL).
  const [detailRescueId, setDetailRescueId] = useState<string | null>(rescueId ?? null);
  // selectedRescue is the target for the verification / email modals only.
  const [selectedRescue, setSelectedRescue] = useState<AdminRescue | null>(null);
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
        search: debouncedSearchQuery || undefined,
        status:
          statusFilter !== 'all'
            ? (statusFilter as 'pending' | 'verified' | 'suspended' | 'inactive')
            : undefined,
      });

      setRescues(result.data);
      setTotalPages(result.pagination?.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rescues');
      setRescues([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearchQuery, statusFilter]);

  useEffect(() => {
    fetchRescues();
  }, [fetchRescues]);

  // Keep the detail pane in sync with the URL param for deep-linking.
  useEffect(() => {
    setDetailRescueId(rescueId ?? null);
  }, [rescueId]);

  const handleViewDetails = (rescueIdParam: string): void => {
    setDetailRescueId(rescueIdParam);
    navigate(`/rescues/${rescueIdParam}`, { replace: true });
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

  const handleCloseDetail = (): void => {
    setDetailRescueId(null);
    if (rescueId) {
      navigate('/rescues', { replace: true });
    }
  };

  const handleModalClose = (): void => {
    setShowVerificationModal(false);
    setShowEmailModal(false);
    setSelectedRescue(null);
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

  const handleBulkRescueConfirm = async (reason?: string): Promise<void> => {
    if (!bulkRescueAction) {
      return;
    }
    const rescueIds = Array.from(selectedRows);
    const result = await bulkUpdateRescues.mutateAsync({
      rescueIds,
      action: bulkRescueAction,
      reason,
    });
    setBulkResult({ succeeded: result.successCount, failed: result.failedCount });
    setSelectedRows(new Set());
    fetchRescues();
  };

  const handleBulkModalClose = (): void => {
    setBulkRescueAction(null);
    setBulkResult(null);
  };

  // Columns use the shared DataTable's key/label/render shape. Server-side sort
  // was never wired for rescues (fetchRescues never reads sortBy/sortOrder from
  // the URL nor passes them to rescueService.getAll), so every column is
  // explicitly non-sortable rather than opting into the shared table's
  // client-side sort of the current page only.
  const columns: DataTableColumn[] = [
    {
      key: 'rescue',
      label: 'Rescue Organization',
      width: '350px',
      sortable: false,
      render: (_value, row) => {
        const rescue = row as unknown as AdminRescue;
        return (
          <div className={styles.rescueInfo}>
            <div className={styles.rescueName}>{rescue.name}</div>
            <div className={styles.rescueDetail}>
              <FiMail />
              {rescue.email}
            </div>
            <div className={styles.rescueDetail}>
              <FiMapPin />
              {rescue.city}
              {rescue.county ? `, ${rescue.county}` : ''}
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '140px',
      sortable: false,
      render: (_value, row) => getStatusBadge((row as unknown as AdminRescue).status),
    },
    {
      key: 'createdAt',
      label: 'Registered',
      width: '120px',
      sortable: false,
      render: (_value, row) => formatDate((row as unknown as AdminRescue).createdAt),
    },
    {
      key: 'verified',
      label: 'Verified',
      width: '120px',
      sortable: false,
      render: (_value, row) => {
        const rescue = row as unknown as AdminRescue;
        return rescue.verifiedAt ? formatDate(rescue.verifiedAt) : '-';
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '140px',
      align: 'center',
      sortable: false,
      render: (_value, row) => {
        const rescue = row as unknown as AdminRescue;
        return (
          <div
            className={styles.actionButtons}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
            role='presentation'
          >
            <button
              className={styles.iconButton}
              title='View details'
              aria-label='View details'
              onClick={() => handleViewDetails(rescue.rescueId)}
            >
              <FiEye aria-hidden />
            </button>
            {rescue.status === 'pending' && (
              <>
                <button
                  className={clsx(styles.iconButton, styles.approveButton)}
                  title='Approve'
                  aria-label='Approve'
                  onClick={() => handleApprove(rescue)}
                >
                  <FiCheckCircle aria-hidden />
                </button>
                <button
                  className={clsx(styles.iconButton, styles.rejectButton)}
                  title='Reject'
                  aria-label='Reject'
                  onClick={() => handleReject(rescue)}
                >
                  <FiXCircle aria-hidden />
                </button>
              </>
            )}
            <button
              className={styles.iconButton}
              title='Send email'
              aria-label='Send email'
              onClick={() => handleSendEmail(rescue)}
            >
              <FiMail aria-hidden />
            </button>
          </div>
        );
      },
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
        <div className={styles.errorMessage} role='alert'>
          <FiAlertCircle />
          {error}
        </div>
      )}

      <EntityDetailLayout
        detailOpen={detailRescueId !== null}
        onBack={handleCloseDetail}
        list={
          <>
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
              onSelectAll={() =>
                setSelectedRows(new Set(rescues.map((r: AdminRescue) => r.rescueId)))
              }
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
              frameless
              surface
              columns={columns}
              rows={rescues as unknown as Record<string, unknown>[]}
              loading={loading}
              emptyMessage='No rescue organizations found matching your criteria. Try adjusting your search or filters.'
              onRowClick={row => handleViewDetails((row as unknown as AdminRescue).rescueId)}
              page={currentPage}
              total={totalPages * itemsPerPage}
              pageSize={itemsPerPage}
              onPageChange={setCurrentPage}
              selectable
              selectedIds={selectedRows}
              onSelectionChange={ids => setSelectedRows(new Set(ids))}
              getRowId={row => String((row as unknown as AdminRescue).rescueId)}
            />
          </>
        }
        detail={
          detailRescueId !== null && (
            <RescueDetailPanel
              rescueId={detailRescueId}
              onClose={handleCloseDetail}
              onUpdate={fetchRescues}
              onApprove={handleApprove}
              onReject={handleReject}
              onSendEmail={handleSendEmail}
            />
          )
        }
      />

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
        title={(() => {
          const count = selectedRows.size;
          const noun = `${count} rescue${count !== 1 ? 's' : ''}`;
          return bulkRescueAction === 'approve' ? `Approve ${noun}?` : `Suspend ${noun}?`;
        })()}
        description={(() => {
          const count = selectedRows.size;
          const noun = `${count} rescue organization${count !== 1 ? 's' : ''}`;
          if (bulkRescueAction === 'approve') {
            return `This will verify and approve ${noun}. They will be able to list pets and accept applications.`;
          }
          return `This will suspend ${noun}. They will be unable to operate on the platform until reinstated.`;
        })()}
        selectedCount={selectedRows.size}
        confirmLabel={bulkRescueAction === 'approve' ? 'Approve Rescues' : 'Suspend Rescues'}
        variant={bulkRescueAction === 'suspend' ? 'danger' : 'info'}
        // ADS-651: every bulk state-change records a reason in the audit log.
        requireReason
        reasonLabel={
          bulkRescueAction === 'approve' ? 'Reason for approval' : 'Reason for suspension'
        }
        reasonPlaceholder={
          bulkRescueAction === 'approve'
            ? 'Explain why these rescues are being approved...'
            : 'Explain why these rescues are being suspended...'
        }
        isLoading={bulkUpdateRescues.isPending}
        resultSummary={bulkResult}
      />
    </div>
  );
};

export default Rescues;
