import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import {
  DataTable,
  type DataTableColumn,
  Heading,
  Text,
  Input,
  useToast,
  Toast,
  ToastContainer,
  type ToastMessage,
} from '@adopt-dont-shop/lib.components';
import { FiSearch } from 'react-icons/fi';
import { useApplications, useBulkUpdateApplications, useRescuesList } from '../hooks';
import { BulkActionToolbar } from '../components/ui';
import { BulkConfirmationModal } from '../components/modals';
import { ApplicationDetailPanel, EntityDetailLayout } from '../components/detail';
import type { AdminApplication, ApplicationStatus } from '../services/applicationService';
import * as styles from './Applications.css';

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

const VALID_STATUS_FILTERS: ReadonlySet<string> = new Set([
  'submitted',
  'approved',
  'rejected',
  'withdrawn',
]);

const Applications: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { applicationId } = useParams<{ applicationId?: string }>();
  const navigate = useNavigate();
  const { toasts, showToast, hideToast } = useToast();

  const statusParam = searchParams.get('status');
  const statusFilter = statusParam && VALID_STATUS_FILTERS.has(statusParam) ? statusParam : 'all';

  const setFilterParam = (key: string, value: string) => {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        if (value && value !== 'all') {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        return next;
      },
      { replace: true }
    );
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [rescueFilter, setRescueFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkApplicationActionType | null>(null);
  const [bulkResult, setBulkResult] = useState<{ succeeded: number; failed: number } | null>(null);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, typeFilter, rescueFilter]);

  const { data: rescuesList } = useRescuesList();

  const { data, isLoading, error } = useApplications({
    search: searchQuery || undefined,
    status: statusFilter !== 'all' ? (statusFilter as ApplicationStatus) : undefined,
    petType: typeFilter !== 'all' ? typeFilter : undefined,
    rescueId: rescueFilter !== 'all' ? rescueFilter : undefined,
    page,
    limit: 20,
  });

  const bulkUpdateApplications = useBulkUpdateApplications();

  const applications: AdminApplication[] = data?.data ?? [];

  // Derive selected application from URL param + loaded list.
  const selectedApplication: AdminApplication | null = applicationId
    ? (applications.find(app => app.applicationId === applicationId) ?? null)
    : null;

  // If the param resolves to no application after loading completes,
  // redirect back to the list and surface a toast.
  useEffect(() => {
    if (!applicationId || isLoading) {
      return;
    }
    if (applications.find(app => app.applicationId === applicationId)) {
      return;
    }
    const search = searchParams.toString();
    navigate(search ? `/applications?${search}` : '/applications', { replace: true });
    showToast('Application not found', 'error');
  }, [applicationId, applications, isLoading, navigate, searchParams, showToast]);

  const handleRowClick = (app: AdminApplication): void => {
    const search = searchParams.toString();
    navigate(
      search ? `/applications/${app.applicationId}?${search}` : `/applications/${app.applicationId}`
    );
  };

  const handleCloseDetail = (): void => {
    const search = searchParams.toString();
    navigate(search ? `/applications?${search}` : '/applications');
  };

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

    // Atomic semantics (ADS-666): the service either updates every
    // selected application or throws, so any returned result means
    // the full batch committed. No partial-success branch.
    setBulkResult({ succeeded: result.updatedCount, failed: 0 });
    setSelectedRows(new Set());
  };

  const handleBulkModalClose = () => {
    setBulkAction(null);
    setBulkResult(null);
  };

  // Columns use the shared DataTable's key/label/render shape. Server-side sort
  // was never wired for applications (the old table's sort only wrote URL params
  // the query ignored), so every column is explicitly non-sortable rather than
  // opting into the shared table's client-side sort of the current page only.
  const columns: DataTableColumn[] = [
    {
      key: 'applicant',
      label: 'Applicant',
      width: '240px',
      sortable: false,
      render: (_value, row) => {
        const app = row as AdminApplication;
        return (
          <div className={styles.applicantInfo}>
            <div className={styles.applicantName}>{app.applicantName}</div>
            <div className={styles.applicantEmail}>{app.applicantEmail}</div>
          </div>
        );
      },
    },
    {
      key: 'pet',
      label: 'Pet',
      width: '160px',
      sortable: false,
      render: (_value, row) => (row as AdminApplication).petName,
    },
    {
      key: 'rescue',
      label: 'Rescue',
      width: '200px',
      sortable: false,
      render: (_value, row) => (row as AdminApplication).rescueName,
    },
    {
      key: 'status',
      label: 'Status',
      width: '130px',
      sortable: false,
      render: (_value, row) => getStatusBadge((row as AdminApplication).status),
    },
    {
      key: 'createdAt',
      label: 'Submitted',
      width: '120px',
      sortable: false,
      render: (_value, row) => formatDate((row as AdminApplication).createdAt),
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
        <div className={styles.errorMessage} role='alert'>
          Failed to load applications: {error.message}
        </div>
      )}

      <EntityDetailLayout
        detailOpen={selectedApplication !== null}
        onBack={handleCloseDetail}
        list={
          <>
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
                  onChange={e => setFilterParam('status', e.target.value)}
                >
                  <option value='all'>All Statuses</option>
                  <option value='submitted'>Submitted</option>
                  <option value='approved'>Approved</option>
                  <option value='rejected'>Rejected</option>
                  <option value='withdrawn'>Withdrawn</option>
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel} htmlFor='apps-type-filter'>
                  Pet Type
                </label>
                <select
                  id='apps-type-filter'
                  className={styles.select}
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                >
                  <option value='all'>All Types</option>
                  <option value='dog'>Dog</option>
                  <option value='cat'>Cat</option>
                  <option value='rabbit'>Rabbit</option>
                  <option value='bird'>Bird</option>
                  <option value='reptile'>Reptile</option>
                  <option value='other'>Other</option>
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel} htmlFor='apps-rescue-filter'>
                  Rescue
                </label>
                <select
                  id='apps-rescue-filter'
                  className={styles.select}
                  value={rescueFilter}
                  onChange={e => setRescueFilter(e.target.value)}
                >
                  <option value='all'>All Rescues</option>
                  {rescuesList?.data.map(rescue => (
                    <option key={rescue.rescueId} value={rescue.rescueId}>
                      {rescue.name}
                    </option>
                  ))}
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
              frameless
              surface
              columns={columns}
              rows={applications as unknown as Record<string, unknown>[]}
              loading={isLoading}
              emptyMessage='No applications found matching your criteria'
              page={page}
              total={data?.pagination?.total ?? 0}
              pageSize={20}
              onPageChange={setPage}
              selectable
              selectedIds={selectedRows}
              onSelectionChange={ids => setSelectedRows(new Set(ids))}
              getRowId={row => String((row as AdminApplication).applicationId)}
              onRowClick={row => handleRowClick(row as AdminApplication)}
            />
          </>
        }
        detail={
          selectedApplication && (
            <ApplicationDetailPanel application={selectedApplication} onClose={handleCloseDetail} />
          )
        }
      />

      <BulkConfirmationModal
        isOpen={bulkAction !== null}
        onClose={handleBulkModalClose}
        onConfirm={handleBulkConfirm}
        title={(() => {
          const count = selectedRows.size;
          const noun = `${count} application${count !== 1 ? 's' : ''}`;
          return bulkAction === 'approve' ? `Approve ${noun}?` : `Reject ${noun}?`;
        })()}
        description={(() => {
          const count = selectedRows.size;
          const noun = `${count} adoption application${count !== 1 ? 's' : ''}`;
          if (bulkAction === 'approve') {
            return `This will approve ${noun}. Applicants will be notified of the decision.`;
          }
          return `This will reject ${noun}. Applicants will be notified of the decision.`;
        })()}
        selectedCount={selectedRows.size}
        confirmLabel={bulkAction === 'approve' ? 'Approve Applications' : 'Reject Applications'}
        variant={bulkAction === 'reject' ? 'danger' : 'info'}
        // ADS-651: every bulk state-change records a reason in the audit log.
        requireReason
        reasonLabel={bulkAction === 'approve' ? 'Reason for approval' : 'Reason for rejection'}
        reasonPlaceholder={
          bulkAction === 'approve'
            ? 'Explain why these applications are being approved...'
            : 'Explain why these applications are being rejected...'
        }
        isLoading={bulkUpdateApplications.isPending}
        resultSummary={bulkResult}
      />

      <ToastContainer position='top-right'>
        {toasts.map((toast: ToastMessage) => (
          <Toast key={toast.id} {...toast} onClose={hideToast} position='top-right' />
        ))}
      </ToastContainer>
    </div>
  );
};

export default Applications;
