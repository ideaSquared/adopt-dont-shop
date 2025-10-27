import React, { useState } from 'react';
import styled from 'styled-components';
import { Heading, Text, Button, Input } from '@adopt-dont-shop/components';
import { FiSearch, FiFilter, FiUserPlus, FiEdit2, FiMail, FiShield } from 'react-icons/fi';
import { DataTable } from '../components/data';
import type { Column } from '../components/data';
import { useUsers, useSuspendUser, useUnsuspendUser, useVerifyUser, useDeleteUser } from '../hooks';
import type { AdminUser } from '../services/libraryServices';
import { apiService } from '../services/libraryServices';
import {
  UserDetailModal,
  EditUserModal,
  CreateSupportTicketModal,
  UserActionsMenu,
} from '../components/modals';

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

const UserAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 600;
  font-size: 0.875rem;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const UserName = styled.div`
  font-weight: 600;
  color: #111827;
`;

const UserEmail = styled.div`
  font-size: 0.8125rem;
  color: #6b7280;
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

const Users: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal state
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  const { data, isLoading, error, refetch } = useUsers({
    search: searchQuery,
    userType: userTypeFilter !== 'all' ? userTypeFilter as any : undefined,
    status: statusFilter !== 'all' ? statusFilter as any : undefined,
    page: 1,
    limit: 20,
  });

  const suspendUser = useSuspendUser();
  const unsuspendUser = useUnsuspendUser();
  const verifyUser = useVerifyUser();
  const deleteUser = useDeleteUser();

  // Handler functions
  const handleRowClick = (user: AdminUser) => {
    setSelectedUser(user);
    setIsDetailModalOpen(true);
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
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to suspend user');
    }
  };

  const handleUnsuspendUser = async (userId: string) => {
    try {
      await unsuspendUser.mutateAsync(userId);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to unsuspend user');
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

  if (error) {
    return (
      <PageContainer>
        <PageHeader>
          <HeaderLeft>
            <Heading level="h1">User Management</Heading>
          </HeaderLeft>
        </PageHeader>
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
          color: '#991b1b'
        }}>
          <p style={{ margin: '0 0 1rem 0', fontWeight: 600 }}>
            Failed to load users
          </p>
          <p style={{ margin: '0', fontSize: '0.875rem' }}>
            {(error as Error).message}
          </p>
        </div>
      </PageContainer>
    );
  }

  const users = data?.data || [];

  // Filter users based on search and filters
  const filteredUsers = (users || []).filter((user: AdminUser) => {
    const matchesSearch = searchQuery === '' ||
      user.firstName?.toLowerCase() || "".includes(searchQuery.toLowerCase()) ||
      user.lastName?.toLowerCase() || "".includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesUserType = userTypeFilter === 'all' || user.userType === userTypeFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

    return matchesSearch && matchesUserType && matchesStatus;
  });

  const getUserInitials = (firstName: string | null | undefined, lastName: string | null | undefined) => {
    const firstInitial = firstName?.charAt(0) || '';
    const lastInitial = lastName?.charAt(0) || '';
    return `${firstInitial}${lastInitial}`.toUpperCase() || '??';
  };

  const getUserTypeBadge = (userType: string) => {
    switch (userType) {
      case 'admin':
        return <Badge $variant="danger">Admin</Badge>;
      case 'moderator':
        return <Badge $variant="warning">Moderator</Badge>;
      case 'rescue_staff':
        return <Badge $variant="info">Rescue Staff</Badge>;
      case 'adopter':
        return <Badge $variant="neutral">Adopter</Badge>;
      default:
        return <Badge $variant="neutral">{userType}</Badge>;
    }
  };

  const getStatusBadge = (status: string, emailVerified: boolean) => {
    if (status === 'suspended') {
      return <Badge $variant="danger">Suspended</Badge>;
    }
    if (status === 'pending' || !emailVerified) {
      return <Badge $variant="warning">Pending</Badge>;
    }
    return <Badge $variant="success">Active</Badge>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const columns: Column<AdminUser>[] = [
    {
      id: 'user',
      header: 'User',
      accessor: (row) => (
        <UserInfo>
          <UserAvatar>{getUserInitials(row.firstName, row.lastName)}</UserAvatar>
          <UserDetails>
            <UserName>{row.firstName} {row.lastName}</UserName>
            <UserEmail>{row.email}</UserEmail>
          </UserDetails>
        </UserInfo>
      ),
      width: '300px'
    },
    {
      id: 'userType',
      header: 'Type',
      accessor: (row) => getUserTypeBadge(row.userType),
      width: '140px',
      sortable: true
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => getStatusBadge(row.status, row.emailVerified),
      width: '120px',
      sortable: true
    },
    {
      id: 'rescue',
      header: 'Rescue',
      accessor: (row) => row.rescueName || '-',
      width: '180px'
    },
    {
      id: 'createdAt',
      header: 'Joined',
      accessor: (row) => formatDate(row.createdAt),
      width: '120px',
      sortable: true
    },
    {
      id: 'lastLogin',
      header: 'Last Login',
      accessor: (row) => row.lastLogin ? formatDate(row.lastLogin) : 'Never',
      width: '120px',
      sortable: true
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (row) => (
        <ActionButtons onClick={(e) => e.stopPropagation()}>
          <IconButton
            title="Edit user"
            onClick={() => handleEditUser(row)}
          >
            <FiEdit2 />
          </IconButton>
          <IconButton
            title="Send message"
            onClick={() => handleMessageUser(row)}
          >
            <FiMail />
          </IconButton>
          <UserActionsMenu
            user={row}
            onSuspend={handleSuspendUser}
            onUnsuspend={handleUnsuspendUser}
            onVerify={handleVerifyUser}
            onDelete={handleDeleteUser}
          />
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
          <Heading level="h1">User Management</Heading>
          <Text>Manage all platform users and permissions</Text>
        </HeaderLeft>
        <HeaderActions>
          <Button variant="outline" size="md">
            <FiFilter style={{ marginRight: '0.5rem' }} />
            Export
          </Button>
          <Button variant="primary" size="md">
            <FiUserPlus style={{ marginRight: '0.5rem' }} />
            Add User
          </Button>
        </HeaderActions>
      </PageHeader>

      <FilterBar>
        <SearchInputWrapper>
          <FiSearch />
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchInputWrapper>

        <FilterGroup>
          <FilterLabel>User Type</FilterLabel>
          <Select value={userTypeFilter} onChange={(e) => setUserTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
            <option value="rescue_staff">Rescue Staff</option>
            <option value="adopter">Adopter</option>
          </Select>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Status</FilterLabel>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </Select>
        </FilterGroup>
      </FilterBar>

      <DataTable
        columns={columns}
        data={users}
        loading={isLoading}
        emptyMessage="No users found matching your criteria"
        onRowClick={handleRowClick}
        getRowId={(user) => user.userId}
      />

      {/* Modals */}
      <UserDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
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
    </PageContainer>
  );
};

export default Users;
