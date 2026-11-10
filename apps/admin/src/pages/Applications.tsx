import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import {
  DataTable,
  type DataTableColumn,
  ErrorState,
  PageHeader,
  SearchToolbar,
  Stack,
  StatusBadge,
  toast,
  useFilterParamSetter,
} from '@adopt-dont-shop/lib.components';
import { formatDisplayDate } from '@adopt-dont-shop/lib.utils';
import {
  useApplications,
  useApplicationById,
  useBulkUpdateApplications,
  useRescuesList,
} from '../hooks';
import { BulkActionToolbar } from '../components/ui';
import { BulkConfirmationModal } from '../components/modals';
import { ApplicationDetailPanel, EntityDetailLayout } from '../components/detail';
import type { AdminApplication, ApplicationStatus } from '../services/applicationService';
import * as styles from './Applications.css';

type BulkApplicationActionType = 'approve' | 'reject';

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

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

  const statusParam = searchParams.get('status');
  const statusFilter = statusParam && VALID_STATUS_FILTERS.has(statusParam) ? statusParam : 'all';

  const setFilterParam = useFilterParamSetter(setSearchParams);

  const [rescueFilter, setRescueFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkApplicationActionType | null>(null);
  const [bulkResult, setBulkResult] = useState<{ succeeded: number; failed: number } | null>(null);
  const [bulkFailedIds, setBulkFailedIds] = useState<string[]>([]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, rescueFilter]);

  const { data: rescuesList } = useRescuesList();

  const { data, isLoading, error } = useApplications({
    status: statusFilter !== 'all' ? (statusFilter as ApplicationStatus) : undefined,
    rescueId: rescueFilter !== 'all' ? rescueFilter : undefined,
    page,
    limit: 20,
  });

  const bulkUpdateApplications = useBulkUpdateApplications();

  const applications: AdminApplication[] = data?.data ?? [];

  // Derive the selected application from the URL param: the loaded list's row
  // when it is there, otherwise fetched by id so links from elsewhere open
  // applications on any page.
  const listedApplication = applicationId
    ? applications.find(app => app.applicationId === applicationId)
    : undefined;
  const applicationById = useApplicationById(
    applicationId && !isLoading && !listedApplication ? applicationId : undefined
  );
  const selectedApplication: AdminApplication | null =
    listedApplication ?? applicationById.data ?? null;

  // If the id fetch fails (unknown id), redirect back to the list and toast.
  useEffect(() => {
    if (!applicationId || !applicationById.isError) {
      return;
    }
    const search = searchParams.toString();
    navigate(search ? `/applications?${search}` : '/applications', { replace: true });
    toast.error('Application not found');
  }, [applicationId, applicationById.isError, navigate, searchParams]);

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

    // The gateway fans out per application, so a successful response can
    // still report per-item failures. Surface them and keep those rows selected.
    const failedIds = result.failures.map(failure => failure.applicationId);
    setBulkResult({ succeeded: result.successCount, failed: result.failureCount });
    setBulkFailedIds(failedIds);
    setSelectedRows(new Set(failedIds));
  };

  const handleBulkModalClose = () => {
    setBulkAction(null);
    setBulkResult(null);
    setBulkFailedIds([]);
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
      render: (_value, row) => {
        const { status } = row as AdminApplication;
        // Anything other than the three terminal states reads as "Submitted".
        return <StatusBadge kind='application' status={status} label={STATUS_LABELS[status]} />;
      },
    },
    {
      key: 'createdAt',
      label: 'Submitted',
      width: '120px',
      sortable: false,
      render: (_value, row) => formatDisplayDate((row as AdminApplication).createdAt),
    },
  ];

  return (
    <Stack spacing='lg'>
      <PageHeader
        title='Application Management'
        description='Browse and manage all adoption applications'
      />

      {error instanceof Error && (
        <ErrorState size='sm' title='Failed to load applications' message={error.message} />
      )}

      <EntityDetailLayout
        detailOpen={selectedApplication !== null}
        onBack={handleCloseDetail}
        list={
          <>
            <SearchToolbar
              filterConfig={[
                {
                  name: 'status',
                  label: 'Status',
                  type: 'select',
                  options: [
                    { value: 'all', label: 'All Statuses' },
                    { value: 'submitted', label: 'Submitted' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'rejected', label: 'Rejected' },
                    { value: 'withdrawn', label: 'Withdrawn' },
                  ],
                },
                {
                  name: 'rescue',
                  label: 'Rescue',
                  type: 'select',
                  options: [
                    { value: 'all', label: 'All Rescues' },
                    ...(rescuesList?.data.map(rescue => ({
                      value: rescue.rescueId,
                      label: rescue.name,
                    })) ?? []),
                  ],
                },
              ]}
              filters={{ status: statusFilter, rescue: rescueFilter }}
              onFilterChange={(name, value) =>
                name === 'status'
                  ? setFilterParam('status', String(value))
                  : setRescueFilter(String(value))
              }
            />

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
        failedIds={bulkFailedIds}
      />
    </Stack>
  );
};

export default Applications;
