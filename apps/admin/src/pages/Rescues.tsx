import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import {
  Alert,
  Button,
  DataTable,
  type DataTableColumn,
  type FilterConfig,
  PageHeader,
  SearchToolbar,
  Stack,
  StatusBadge,
  useDebouncedValue,
} from '@adopt-dont-shop/lib.components';
import { formatDisplayDate } from '@adopt-dont-shop/lib.utils';
import { CircleCheck, CircleX, Eye, Mail, MapPin } from 'lucide-react';
import type { AdminRescue } from '@/types/rescue';
import { exportData, type ExportColumn } from '@/services/exportService';
import {
  RescueVerificationModal,
  SendEmailModal,
  BulkConfirmationModal,
} from '@/components/modals';
import { RescueDetailPanel, EntityDetailLayout } from '@/components/detail';
import { ExportButton, BulkActionToolbar } from '@/components/ui';
import { useBulkUpdateRescues } from '@/hooks';
import { useRescues } from '@/hooks/useRescues';
import * as styles from './Rescues.css';

// Text users see today; the colour comes from the shared rescue status variant.
const RESCUE_BADGE_LABELS: Record<string, string> = {
  verified: 'Verified',
  pending: 'Pending Review',
  rejected: 'Rejected',
};

const getStatusBadge = (status: string) => (
  <StatusBadge kind='rescue' status={status} label={RESCUE_BADGE_LABELS[status] ?? status} />
);

const filterConfig: FilterConfig[] = [
  {
    name: 'status',
    label: 'Verification Status',
    type: 'select',
    options: [
      { value: 'all', label: 'All Statuses' },
      { value: 'verified', label: 'Verified' },
      { value: 'pending', label: 'Pending Review' },
      { value: 'rejected', label: 'Rejected' },
    ],
  },
];

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

  const rescuesQuery = useRescues({
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearchQuery || undefined,
    status:
      statusFilter !== 'all'
        ? (statusFilter as 'pending' | 'verified' | 'suspended' | 'inactive')
        : undefined,
  });
  const rescues: AdminRescue[] = rescuesQuery.data?.data ?? [];
  const totalPages = rescuesQuery.data?.pagination?.totalPages ?? 1;
  const loading = rescuesQuery.isFetching;
  const error = rescuesQuery.error
    ? rescuesQuery.error instanceof Error
      ? rescuesQuery.error.message
      : 'Failed to fetch rescues'
    : null;
  const fetchRescues = (): void => {
    void rescuesQuery.refetch();
  };

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
              <Mail size='1em' />
              {rescue.email}
            </div>
            <div className={styles.rescueDetail}>
              <MapPin size='1em' />
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
      render: (_value, row) => formatDisplayDate((row as unknown as AdminRescue).createdAt),
    },
    {
      key: 'verified',
      label: 'Verified',
      width: '120px',
      sortable: false,
      render: (_value, row) => {
        const rescue = row as unknown as AdminRescue;
        return rescue.verifiedAt ? formatDisplayDate(rescue.verifiedAt) : '-';
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
            <Button
              variant='ghost'
              size='sm'
              title='View details'
              aria-label='View details'
              onClick={() => handleViewDetails(rescue.rescueId)}
            >
              <Eye size='1em' aria-hidden />
            </Button>
            {rescue.status === 'pending' && (
              <>
                <Button
                  variant='success'
                  size='sm'
                  title='Approve'
                  aria-label='Approve'
                  onClick={() => handleApprove(rescue)}
                >
                  <CircleCheck size='1em' aria-hidden />
                </Button>
                <Button
                  variant='danger'
                  size='sm'
                  title='Reject'
                  aria-label='Reject'
                  onClick={() => handleReject(rescue)}
                >
                  <CircleX size='1em' aria-hidden />
                </Button>
              </>
            )}
            <Button
              variant='ghost'
              size='sm'
              title='Send email'
              aria-label='Send email'
              onClick={() => handleSendEmail(rescue)}
            >
              <Mail size='1em' aria-hidden />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <Stack spacing='lg'>
      <PageHeader
        title='Rescue Management'
        description='Manage rescue organizations and verification status'
        actions={
          <ExportButton onExport={handleExport} disabled={loading || rescues.length === 0} />
        }
      />

      {error && <Alert variant='error'>{error}</Alert>}

      <EntityDetailLayout
        detailOpen={detailRescueId !== null}
        onBack={handleCloseDetail}
        list={
          <>
            <SearchToolbar
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder='Search by name, city, or email...'
              filterConfig={filterConfig}
              filters={{ status: statusFilter }}
              onFilterChange={(_name, value) => setStatusFilter(String(value))}
            />

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
    </Stack>
  );
};

export default Rescues;
