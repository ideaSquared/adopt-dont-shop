import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import {
  DataTable,
  type DataTableColumn,
  Heading,
  Text,
  Button,
  Input,
  useToast,
  Toast,
  ToastContainer,
  useDebouncedValue,
  QueryBoundary,
  ErrorState,
  type ToastMessage,
} from '@adopt-dont-shop/lib.components';
import { Search, UserPlus } from 'lucide-react';
import {
  useUsers,
  useSuspendUser,
  useUnsuspendUser,
  useVerifyUser,
  useDeleteUser,
  useBulkUpdateUsers,
  useCreateUser,
} from '../hooks';
import { apiService, type AdminUser } from '../services/libraryServices';
import { exportData, type ExportColumn } from '../services/exportService';
import { userManagementService } from '../services/userManagementService';
import { ExportButton, BulkActionToolbar } from '../components/ui';
import {
  AddUserModal,
  CreateSupportTicketModal,
  BulkConfirmationModal,
} from '../components/modals';
import { UserDetailPanel, EntityDetailLayout } from '../components/detail';
import * as styles from './Users.css';

type BulkActionType = 'activate' | 'deactivate' | 'delete';

const getUserTypeBadgeClass = (userType: string): string => {
  switch (userType) {
    case 'admin':
      return styles.badgeDanger;
    case 'moderator':
      return styles.badgeWarning;
    case 'rescue_staff':
      return styles.badgeInfo;
    default:
      return styles.badgeNeutral;
  }
};

const getUserTypeBadgeLabel = (userType: string): string => {
  switch (userType) {
    case 'admin':
      return 'Admin';
    case 'moderator':
      return 'Moderator';
    case 'rescue_staff':
      return 'Rescue Staff';
    case 'adopter':
      return 'Adopter';
    default:
      return userType;
  }
};

const getStatusBadgeClass = (status: string, emailVerified: boolean): string => {
  if (status === 'suspended') {
    return styles.badgeDanger;
  }
  if (status === 'pending' || !emailVerified) {
    return styles.badgeWarning;
  }
  return styles.badgeSuccess;
};

const getStatusBadgeLabel = (status: string, emailVerified: boolean): string => {
  if (status === 'suspended') {
    return 'Suspended';
  }
  if (status === 'pending' || !emailVerified) {
    return 'Pending';
  }
  return 'Active';
};

const VALID_USER_STATUS_FILTERS: ReadonlySet<string> = new Set(['active', 'suspended', 'pending']);

const Users: React.FC = () => {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatusParam = searchParams.get('status');

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const [userTypeFilter, setUserTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>(
    initialStatusParam && VALID_USER_STATUS_FILTERS.has(initialStatusParam)
      ? initialStatusParam
      : 'all'
  );
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery, userTypeFilter, statusFilter]);

  // Modal state (only for add user and support ticket - detail/edit moved to panel)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageUser, setMessageUser] = useState<AdminUser | null>(null);

  // Bulk selection state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkActionType | null>(null);
  const [bulkResult, setBulkResult] = useState<{ succeeded: number; failed: number } | null>(null);
  const [bulkFailedIds, setBulkFailedIds] = useState<string[]>([]);
  const [lastBulkSubmission, setLastBulkSubmission] = useState<{
    userIds: string[];
    reason?: string;
  } | null>(null);
  const bulkUpdateUsers = useBulkUpdateUsers();

  const { data, isLoading, error, refetch } = useUsers({
    search: debouncedSearchQuery,
    userType: userTypeFilter !== 'all' ? userTypeFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    limit: 20,
  });

  const suspendUser = useSuspendUser();
  const unsuspendUser = useUnsuspendUser();
  const verifyUser = useVerifyUser();
  const deleteUser = useDeleteUser();
  const createUser = useCreateUser();
  const { toasts, showToast, hideToast } = useToast();

  // Derive selected user from URL param + data
  const selectedUser: AdminUser | null =
    userId && data?.data ? (data.data.find((u: AdminUser) => u.userId === userId) ?? null) : null;

  const handleRowClick = (user: AdminUser) => {
    navigate(`/users/${user.userId}`, { replace: true });
  };

  const handleCloseDetail = () => {
    navigate('/users', { replace: true });
  };

  const handleSaveUser = async (id: string, updates: Partial<AdminUser>) => {
    try {
      await apiService.patch(`/api/v1/admin/users/${id}`, updates);
      await refetch();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleMessageUser = (user: AdminUser) => {
    setMessageUser(user);
    setIsMessageModalOpen(true);
  };

  const handleCreateSupportTicket = async (ticketData: {
    customerId: string;
    customerEmail: string;
    customerName: string;
    subject: string;
    description: string;
    category: string;
    priority: string;
  }) => {
    try {
      const backendTicketData = {
        userId: ticketData.customerId,
        userEmail: ticketData.customerEmail,
        userName: ticketData.customerName,
        subject: ticketData.subject,
        description: ticketData.description,
        category: ticketData.category,
        priority: ticketData.priority,
      };

      await apiService.post('/api/v1/admin/support/tickets', backendTicketData);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create support ticket');
    }
  };

  const handleSuspendUser = async (id: string, reason?: string) => {
    try {
      await suspendUser.mutateAsync({ userId: id, reason });
      showToast('User suspended successfully', 'success');
    } catch (err) {
      const errorReason = err instanceof Error ? err.message : undefined;
      showToast(
        errorReason
          ? `Failed to suspend user — ${errorReason}`
          : 'Failed to suspend user — please try again',
        'error'
      );
    }
  };

  const handleUnsuspendUser = async (id: string) => {
    try {
      await unsuspendUser.mutateAsync(id);
      showToast('User unsuspended successfully', 'success');
    } catch (err) {
      const errorReason = err instanceof Error ? err.message : undefined;
      showToast(
        errorReason
          ? `Failed to unsuspend user — ${errorReason}`
          : 'Failed to unsuspend user — please try again',
        'error'
      );
    }
  };

  const handleVerifyUser = async (id: string) => {
    try {
      await verifyUser.mutateAsync(id);
      showToast('User verified successfully', 'success');
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to verify user');
    }
  };

  const handleDeleteUser = async (id: string, reason?: string) => {
    try {
      await deleteUser.mutateAsync({ userId: id, reason });
      showToast('User deleted', 'success');
      handleCloseDetail();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleResetPassword = async (id: string) => {
    try {
      await userManagementService.resetUserPassword(id);
      showToast('Password reset triggered', 'success');
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to reset password');
    }
  };

  const runBulkAction = async (
    action: BulkActionType,
    userIds: string[],
    reason?: string
  ): Promise<{ succeeded: number; failed: number; failedIds: string[] }> => {
    let result: {
      successCount?: number;
      failedCount?: number;
      success?: number;
      failed?: number;
      failedIds?: string[];
    };

    if (action === 'activate') {
      result = await bulkUpdateUsers.mutateAsync({
        userIds,
        updateData: { status: 'active' },
        reason,
      });
    } else if (action === 'deactivate') {
      result = await bulkUpdateUsers.mutateAsync({
        userIds,
        updateData: { status: 'inactive' },
        reason,
      });
    } else {
      const outcomes = await Promise.all(
        userIds.map(id =>
          deleteUser
            .mutateAsync({ userId: id, reason })
            .then(() => id)
            .catch(() => null)
        )
      );
      const deletedFailedIds = userIds.filter((_, i) => outcomes[i] === null);
      result = {
        successCount: outcomes.filter(r => r !== null).length,
        failedCount: deletedFailedIds.length,
        failedIds: deletedFailedIds,
      };
    }

    return {
      succeeded: result.successCount ?? result.success ?? 0,
      failed: result.failedCount ?? result.failed ?? 0,
      failedIds: result.failedIds ?? [],
    };
  };

  const handleBulkConfirm = async (reason?: string) => {
    if (!bulkAction) {
      return;
    }
    const userIds = Array.from(selectedRows);
    const summary = await runBulkAction(bulkAction, userIds, reason);
    setBulkResult({ succeeded: summary.succeeded, failed: summary.failed });
    setBulkFailedIds(summary.failedIds);
    setLastBulkSubmission({ userIds, reason });
    setSelectedRows(new Set());
  };

  const handleBulkRetry = async () => {
    if (!bulkAction || !lastBulkSubmission) {
      return;
    }
    const summary = await runBulkAction(
      bulkAction,
      lastBulkSubmission.userIds,
      lastBulkSubmission.reason
    );
    setBulkResult({ succeeded: summary.succeeded, failed: summary.failed });
    setBulkFailedIds(summary.failedIds);
  };

  const handleBulkRetryFailed = async () => {
    if (!bulkAction || bulkFailedIds.length === 0) {
      return;
    }
    const reason = lastBulkSubmission?.reason;
    const summary = await runBulkAction(bulkAction, bulkFailedIds, reason);
    setBulkResult({ succeeded: summary.succeeded, failed: summary.failed });
    setBulkFailedIds(summary.failedIds);
  };

  const handleBulkModalClose = () => {
    setBulkAction(null);
    setBulkResult(null);
    setBulkFailedIds([]);
    setLastBulkSubmission(null);
  };

  const users = data?.data || [];

  const userExportColumns: ExportColumn<AdminUser>[] = [
    { header: 'First Name', accessor: 'firstName' },
    { header: 'Last Name', accessor: 'lastName' },
    { header: 'Email', accessor: 'email' },
    { header: 'Type', accessor: 'userType' },
    { header: 'Status', accessor: 'status' },
    { header: 'Rescue', accessor: row => row.rescueName ?? '' },
    { header: 'Email Verified', accessor: row => (row.emailVerified ? 'Yes' : 'No') },
    { header: 'Joined', accessor: 'createdAt' },
    { header: 'Last Login', accessor: row => row.lastLogin ?? 'Never' },
  ];

  const handleExport = (format: 'csv' | 'pdf') => {
    exportData(users, userExportColumns, 'users-export', 'User Management Export', format);
  };

  const getUserInitials = (
    firstName: string | null | undefined,
    lastName: string | null | undefined
  ) => {
    const firstInitial = firstName?.charAt(0) || '';
    const lastInitial = lastName?.charAt(0) || '';
    return `${firstInitial}${lastInitial}`.toUpperCase() || '??';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Columns use the shared DataTable's key/label/render shape. Server-side sort
  // was never wired for users (the old table's sort only wrote URL params the
  // query ignored), so every column is explicitly non-sortable rather than
  // opting into the shared table's client-side sort of the current page only.
  const columns: DataTableColumn[] = [
    {
      key: 'user',
      label: 'User',
      width: '300px',
      sortable: false,
      render: (_value, row) => {
        const user = row as unknown as AdminUser;
        return (
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {getUserInitials(user.firstName, user.lastName)}
            </div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>
                {user.firstName} {user.lastName}
              </div>
              <div className={styles.userEmail}>{user.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'userType',
      label: 'Type',
      width: '140px',
      sortable: false,
      render: (_value, row) => {
        const user = row as unknown as AdminUser;
        return (
          <span className={getUserTypeBadgeClass(user.userType)}>
            {getUserTypeBadgeLabel(user.userType)}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      sortable: false,
      render: (_value, row) => {
        const user = row as unknown as AdminUser;
        return (
          <span className={getStatusBadgeClass(user.status, user.emailVerified)}>
            {getStatusBadgeLabel(user.status, user.emailVerified)}
          </span>
        );
      },
    },
    {
      key: 'rescue',
      label: 'Rescue',
      width: '180px',
      sortable: false,
      render: (_value, row) => (row as unknown as AdminUser).rescueName || '-',
    },
    {
      key: 'createdAt',
      label: 'Joined',
      width: '120px',
      sortable: false,
      render: (_value, row) => formatDate((row as unknown as AdminUser).createdAt),
    },
    {
      key: 'lastLogin',
      label: 'Last Login',
      width: '120px',
      sortable: false,
      render: (_value, row) => {
        const user = row as unknown as AdminUser;
        return user.lastLogin ? formatDate(user.lastLogin) : 'Never';
      },
    },
  ];

  const detailOpen = selectedUser !== null;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <Heading level='h1'>User Management</Heading>
          <Text>Manage all platform users and permissions</Text>
        </div>
        <div className={styles.headerActions}>
          <ExportButton onExport={handleExport} disabled={isLoading || users.length === 0} />
          <Button variant='primary' size='md' onClick={() => setIsAddModalOpen(true)}>
            <UserPlus size='1em' className={styles.addUserIcon} />
            Add User
          </Button>
        </div>
      </div>

      <EntityDetailLayout
        detailOpen={detailOpen}
        onBack={handleCloseDetail}
        list={
          <>
            <div className={styles.filterBar}>
              <div className={styles.searchInputWrapper}>
                <Search size='1em' />
                <Input
                  type='text'
                  placeholder='Search by name or email...'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel} htmlFor='users-type-filter'>
                  User Type
                </label>
                <select
                  id='users-type-filter'
                  className={styles.select}
                  value={userTypeFilter}
                  onChange={e => setUserTypeFilter(e.target.value)}
                >
                  <option value='all'>All Types</option>
                  <option value='admin'>Admin</option>
                  <option value='moderator'>Moderator</option>
                  <option value='rescue_staff'>Rescue Staff</option>
                  <option value='adopter'>Adopter</option>
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel} htmlFor='users-status-filter'>
                  Status
                </label>
                <select
                  id='users-status-filter'
                  className={styles.select}
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value='all'>All Statuses</option>
                  <option value='active'>Active</option>
                  <option value='pending'>Pending</option>
                  <option value='suspended'>Suspended</option>
                </select>
              </div>
            </div>

            <BulkActionToolbar
              selectedCount={selectedRows.size}
              totalCount={users.length}
              onSelectAll={() => setSelectedRows(new Set(users.map((u: AdminUser) => u.userId)))}
              onClearSelection={() => setSelectedRows(new Set())}
              actions={[
                {
                  label: 'Activate',
                  variant: 'primary',
                  onClick: () => setBulkAction('activate'),
                },
                {
                  label: 'Deactivate',
                  variant: 'warning',
                  onClick: () => setBulkAction('deactivate'),
                },
                {
                  label: 'Delete',
                  variant: 'danger',
                  onClick: () => setBulkAction('delete'),
                },
              ]}
            />

            <QueryBoundary
              isLoading={false}
              isError={Boolean(error)}
              error={error}
              onRetry={refetch}
              errorFallback={
                <ErrorState
                  title='Failed to load users'
                  message={error instanceof Error ? error.message : undefined}
                  onRetry={refetch}
                />
              }
            >
              <DataTable
                frameless
                surface
                columns={columns}
                rows={users as unknown as Record<string, unknown>[]}
                loading={isLoading}
                emptyMessage='No users found matching your criteria. Try adjusting your search or filters.'
                onRowClick={row => handleRowClick(row as unknown as AdminUser)}
                page={page}
                total={data?.pagination?.total ?? 0}
                pageSize={20}
                onPageChange={setPage}
                selectable
                selectedIds={selectedRows}
                onSelectionChange={ids => setSelectedRows(new Set(ids))}
                getRowId={row => String((row as unknown as AdminUser).userId)}
              />
            </QueryBoundary>
          </>
        }
        detail={
          selectedUser && (
            <UserDetailPanel
              user={selectedUser}
              onClose={handleCloseDetail}
              onSave={handleSaveUser}
              onSuspend={handleSuspendUser}
              onUnsuspend={handleUnsuspendUser}
              onVerify={handleVerifyUser}
              onDelete={handleDeleteUser}
              onResetPassword={handleResetPassword}
              onMessage={handleMessageUser}
            />
          )
        }
      />

      {/* Modals (only add user, support ticket, and bulk operations remain as modals) */}
      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreate={async payload => {
          await createUser.mutateAsync(payload);
          showToast('User created', 'success');
        }}
      />

      <CreateSupportTicketModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        user={messageUser}
        onCreate={handleCreateSupportTicket}
      />

      <BulkConfirmationModal
        isOpen={bulkAction !== null}
        onClose={handleBulkModalClose}
        onConfirm={handleBulkConfirm}
        title={(() => {
          const count = selectedRows.size;
          const noun = `${count} user${count !== 1 ? 's' : ''}`;
          if (bulkAction === 'delete') {
            return `Delete ${noun}?`;
          }
          if (bulkAction === 'activate') {
            return `Activate ${noun}?`;
          }
          return `Deactivate ${noun}?`;
        })()}
        description={(() => {
          const count = selectedRows.size;
          const noun = `${count} user account${count !== 1 ? 's' : ''}`;
          if (bulkAction === 'delete') {
            return `This will permanently delete ${noun}. This action cannot be undone.`;
          }
          if (bulkAction === 'activate') {
            return `This will activate ${noun}. The affected users will regain access to the platform.`;
          }
          return `This will deactivate ${noun}. The affected users will be unable to log in until reactivated.`;
        })()}
        selectedCount={selectedRows.size}
        confirmLabel={
          bulkAction === 'delete'
            ? 'Delete Users'
            : bulkAction === 'activate'
              ? 'Activate Users'
              : 'Deactivate Users'
        }
        variant={
          bulkAction === 'delete' ? 'danger' : bulkAction === 'deactivate' ? 'warning' : 'info'
        }
        requireReason
        reasonLabel={
          bulkAction === 'delete'
            ? 'Reason for deletion'
            : bulkAction === 'activate'
              ? 'Reason for activation'
              : 'Reason for deactivation'
        }
        reasonPlaceholder={
          bulkAction === 'delete'
            ? 'Explain why these users are being deleted...'
            : bulkAction === 'activate'
              ? 'Explain why these users are being activated...'
              : 'Explain why these users are being deactivated...'
        }
        isLoading={bulkUpdateUsers.isPending || deleteUser.isPending}
        resultSummary={bulkResult}
        failedIds={bulkFailedIds}
        onRetryFailed={handleBulkRetryFailed}
        onRetry={handleBulkRetry}
      />

      <ToastContainer position='top-right'>
        {toasts.map((toast: ToastMessage) => (
          <Toast key={toast.id} {...toast} onClose={hideToast} position='top-right' />
        ))}
      </ToastContainer>
    </div>
  );
};

export default Users;
