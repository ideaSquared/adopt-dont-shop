import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Heading,
  Text,
  Button,
  Input,
  useToast,
  Toast,
  ToastContainer,
  type ToastMessage,
} from '@adopt-dont-shop/lib.components';
import { FiSearch, FiUserPlus, FiEdit2, FiMail } from 'react-icons/fi';
import { DataTable, type Column } from '../components/data';
import {
  useUsers,
  useSuspendUser,
  useUnsuspendUser,
  useVerifyUser,
  useDeleteUser,
  useBulkUpdateUsers,
} from '../hooks';
import { apiService, type AdminUser } from '../services/libraryServices';
import { exportData, type ExportColumn } from '../services/exportService';
import { ExportButton, BulkActionToolbar } from '../components/ui';
import {
  UserDetailModal,
  EditUserModal,
  CreateSupportTicketModal,
  UserActionsMenu,
  BulkConfirmationModal,
} from '../components/modals';
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

const Users: React.FC = () => {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, userTypeFilter, statusFilter]);

  // Modal state
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  // Bulk selection state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkActionType | null>(null);
  const [bulkResult, setBulkResult] = useState<{ succeeded: number; failed: number } | null>(null);
  const bulkUpdateUsers = useBulkUpdateUsers();

  const { data, isLoading, error, refetch } = useUsers({
    search: searchQuery,
    userType: userTypeFilter !== 'all' ? userTypeFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    limit: 20,
  });

  const totalPages = data?.pagination?.pages ?? data?.pagination?.totalPages ?? 1;

  const suspendUser = useSuspendUser();
  const unsuspendUser = useUnsuspendUser();
  const verifyUser = useVerifyUser();
  const deleteUser = useDeleteUser();
  const { toasts, showToast, hideToast } = useToast();

  // Load user from URL parameter
  useEffect(() => {
    if (userId && data?.data) {
      const user = data.data.find((u: AdminUser) => u.userId === userId);
      if (user) {
        setSelectedUser(user);
        setIsDetailModalOpen(true);
      }
    }
  }, [userId, data?.data]);

  // Handler functions
  const handleRowClick = (user: AdminUser) => {
    setSelectedUser(user);
    setIsDetailModalOpen(true);
    // Update URL to reflect selected user
    navigate(`/users/${user.userId}`, { replace: true });
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    // Clear URL parameter when closing modal
    if (userId) {
      navigate('/users', { replace: true });
    }
  };

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleSaveUser = async (userId: string, updates: Partial<AdminUser>) => {
    try {
      await apiService.patch(`/api/v1/admin/users/${userId}`, updates);
      await refetch();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleMessageUser = (user: AdminUser) => {
    setSelectedUser(user);
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
      // Transform field names from frontend to backend
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

  const handleSuspendUser = async (userId: string, reason?: string) => {
    try {
      await suspendUser.mutateAsync({ userId, reason });
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

  const handleUnsuspendUser = async (userId: string) => {
    try {
      await unsuspendUser.mutateAsync(userId);
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

  const handleVerifyUser = async (userId: string) => {
    try {
      await verifyUser.mutateAsync(userId);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to verify user');
    }
  };

  const handleDeleteUser = async (userId: string, reason?: string) => {
    try {
      await deleteUser.mutateAsync({ userId, reason });
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleBulkConfirm = async (reason?: string) => {
    if (!bulkAction) {
      return;
    }

    const userIds = Array.from(selectedRows);
    let result: { successCount?: number; failedCount?: number; success?: number; failed?: number };

    if (bulkAction === 'activate') {
      result = await bulkUpdateUsers.mutateAsync({
        userIds,
        updates: { is_active: true },
      });
    } else if (bulkAction === 'deactivate') {
      result = await bulkUpdateUsers.mutateAsync({
        userIds,
        updates: { is_active: false },
      });
    } else {
      result = await Promise.all(
        userIds.map(id => deleteUser.mutateAsync({ userId: id, reason }).catch(() => null))
      ).then(results => ({
        successCount: results.filter(r => r !== null).length,
        failedCount: results.filter(r => r === null).length,
      }));
    }

    setBulkResult({
      succeeded: result.successCount ?? result.success ?? 0,
      failed: result.failedCount ?? result.failed ?? 0,
    });
    setSelectedRows(new Set());
  };

  const handleBulkModalClose = () => {
    setBulkAction(null);
    setBulkResult(null);
  };

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <Heading level='h1'>User Management</Heading>
          </div>
        </div>
        <div
          style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center',
            color: '#991b1b',
          }}
        >
          <p style={{ margin: '0 0 1rem 0', fontWeight: 600 }}>Failed to load users</p>
          <p style={{ margin: '0', fontSize: '0.875rem' }}>{(error as Error).message}</p>
        </div>
      </div>
    );
  }

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

  const columns: Column<AdminUser>[] = [
    {
      id: 'user',
      header: 'User',
      accessor: row => (
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>{getUserInitials(row.firstName, row.lastName)}</div>
          <div className={styles.userDetails}>
            <div className={styles.userName}>
              {row.firstName} {row.lastName}
            </div>
            <div className={styles.userEmail}>{row.email}</div>
          </div>
        </div>
      ),
      width: '300px',
    },
    {
      id: 'userType',
      header: 'Type',
      accessor: row => (
        <span className={getUserTypeBadgeClass(row.userType)}>
          {getUserTypeBadgeLabel(row.userType)}
        </span>
      ),
      width: '140px',
      sortable: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: row => (
        <span className={getStatusBadgeClass(row.status, row.emailVerified)}>
          {getStatusBadgeLabel(row.status, row.emailVerified)}
        </span>
      ),
      width: '120px',
      sortable: true,
    },
    {
      id: 'rescue',
      header: 'Rescue',
      accessor: row => row.rescueName || '-',
      width: '180px',
    },
    {
      id: 'createdAt',
      header: 'Joined',
      accessor: row => formatDate(row.createdAt),
      width: '120px',
      sortable: true,
    },
    {
      id: 'lastLogin',
      header: 'Last Login',
      accessor: row => (row.lastLogin ? formatDate(row.lastLogin) : 'Never'),
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
            title='Edit user'
            onClick={() => handleEditUser(row)}
          >
            <FiEdit2 />
          </button>
          <button
            className={styles.iconButton}
            title='Send message'
            onClick={() => handleMessageUser(row)}
          >
            <FiMail />
          </button>
          <UserActionsMenu
            user={row}
            onSuspend={handleSuspendUser}
            onUnsuspend={handleUnsuspendUser}
            onVerify={handleVerifyUser}
            onDelete={handleDeleteUser}
          />
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
          <Heading level='h1'>User Management</Heading>
          <Text>Manage all platform users and permissions</Text>
        </div>
        <div className={styles.headerActions}>
          <ExportButton onExport={handleExport} disabled={isLoading || users.length === 0} />
          <Button variant='primary' size='md'>
            <FiUserPlus style={{ marginRight: '0.5rem' }} />
            Add User
          </Button>
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchInputWrapper}>
          <FiSearch />
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

      <DataTable
        columns={columns}
        data={users}
        loading={isLoading}
        emptyMessage='No users found matching your criteria'
        onRowClick={handleRowClick}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        selectable
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        getRowId={user => user.userId}
      />

      {/* Modals */}
      <UserDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        user={selectedUser}
      />

      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={selectedUser}
        onSave={handleSaveUser}
      />

      <CreateSupportTicketModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        user={selectedUser}
        onCreate={handleCreateSupportTicket}
      />

      <BulkConfirmationModal
        isOpen={bulkAction !== null}
        onClose={handleBulkModalClose}
        onConfirm={handleBulkConfirm}
        title={
          bulkAction === 'delete'
            ? 'Delete Users'
            : bulkAction === 'activate'
              ? 'Activate Users'
              : 'Deactivate Users'
        }
        description={
          bulkAction === 'delete'
            ? 'This will permanently delete the selected users. This action cannot be undone.'
            : bulkAction === 'activate'
              ? 'Activate the selected user accounts.'
              : 'Deactivate the selected user accounts. They will be unable to log in.'
        }
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
        requireReason={bulkAction === 'delete'}
        reasonLabel='Reason for deletion'
        reasonPlaceholder='Explain why these users are being deleted...'
        isLoading={bulkUpdateUsers.isLoading || deleteUser.isLoading}
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

export default Users;
