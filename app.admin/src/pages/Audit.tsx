import React, { useState } from 'react';
import styled from 'styled-components';
import { Heading, Text, Button, Input } from '@adopt-dont-shop/components';
import { FiSearch, FiDownload, FiUser, FiEdit, FiTrash, FiShield, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import {
  PageContainer,
  PageHeader,
  HeaderLeft,
  FilterBar,
  FilterGroup,
  FilterLabel,
  SearchInputWrapper,
  Select,
  Badge
} from '../components/ui';
import { DataTable } from '../components/data';
import type { Column } from '../components/data';
import type { AuditLog } from '../types/admin';

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const LogDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const LogAction = styled.div`
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    font-size: 0.875rem;
    color: #6b7280;
  }
`;

const LogResource = styled.div`
  font-size: 0.8125rem;
  color: #6b7280;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const UserAvatar = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 600;
  font-size: 0.625rem;
`;

const UserName = styled.div`
  font-size: 0.875rem;
  color: #111827;
  font-weight: 500;
`;

const ActionIcon = styled.div<{ $type: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: ${props => {
    switch (props.$type) {
      case 'create': return '#d1fae5';
      case 'update': return '#dbeafe';
      case 'delete': return '#fee2e2';
      case 'login': return '#fef3c7';
      case 'logout': return '#f3f4f6';
      default: return '#e0e7ff';
    }
  }};
  color: ${props => {
    switch (props.$type) {
      case 'create': return '#065f46';
      case 'update': return '#1e40af';
      case 'delete': return '#991b1b';
      case 'login': return '#92400e';
      case 'logout': return '#374151';
      default: return '#3730a3';
    }
  }};

  svg {
    font-size: 0.875rem;
  }
`;

const ChangesButton = styled.button`
  padding: 0.25rem 0.625rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #ffffff;
  color: #6b7280;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }
`;

const IpAddress = styled.span`
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
`;

// Mock data
const mockAuditLogs: AuditLog[] = [
  {
    logId: '1',
    timestamp: '2024-10-21T10:45:00Z',
    userId: 'admin-1',
    userName: 'Sarah Admin',
    userType: 'admin',
    action: 'update',
    resource: 'feature_flag',
    resourceId: 'video_uploads',
    changes: { enabled: { from: false, to: true }, rolloutPercentage: { from: 0, to: 50 } },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'success'
  },
  {
    logId: '2',
    timestamp: '2024-10-21T10:30:00Z',
    userId: 'admin-2',
    userName: 'Mike Moderator',
    userType: 'moderator',
    action: 'create',
    resource: 'user_sanction',
    resourceId: 'sanction-123',
    changes: { userId: 'user-42', type: 'warning', reason: 'Policy violation' },
    ipAddress: '192.168.1.105',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    status: 'success'
  },
  {
    logId: '3',
    timestamp: '2024-10-21T10:15:00Z',
    userId: 'admin-1',
    userName: 'Sarah Admin',
    userType: 'admin',
    action: 'delete',
    resource: 'user',
    resourceId: 'user-999',
    changes: { email: 'spam@example.com', reason: 'Spam account removal' },
    ipAddress: '192.168.1.100',
    status: 'success'
  },
  {
    logId: '4',
    timestamp: '2024-10-21T09:50:00Z',
    userId: 'admin-3',
    userName: 'John Support',
    userType: 'support',
    action: 'update',
    resource: 'support_ticket',
    resourceId: 'ticket-456',
    changes: { status: { from: 'open', to: 'resolved' } },
    ipAddress: '192.168.1.110',
    status: 'success'
  },
  {
    logId: '5',
    timestamp: '2024-10-21T09:30:00Z',
    userId: 'admin-2',
    userName: 'Mike Moderator',
    userType: 'moderator',
    action: 'update',
    resource: 'rescue',
    resourceId: 'rescue-10',
    changes: { verificationStatus: { from: 'pending', to: 'verified' } },
    ipAddress: '192.168.1.105',
    status: 'success'
  },
  {
    logId: '6',
    timestamp: '2024-10-21T09:00:00Z',
    userId: 'admin-1',
    userName: 'Sarah Admin',
    userType: 'admin',
    action: 'login',
    resource: 'auth',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'success'
  },
  {
    logId: '7',
    timestamp: '2024-10-21T08:45:00Z',
    userId: 'admin-4',
    userName: 'Unknown User',
    userType: 'admin',
    action: 'login',
    resource: 'auth',
    ipAddress: '203.0.113.42',
    userAgent: 'Mozilla/5.0',
    status: 'failure',
    errorMessage: 'Invalid credentials'
  },
  {
    logId: '8',
    timestamp: '2024-10-21T08:30:00Z',
    userId: 'admin-1',
    userName: 'Sarah Admin',
    userType: 'admin',
    action: 'update',
    resource: 'system_setting',
    resourceId: 'session_timeout_minutes',
    changes: { value: { from: 60, to: 120 } },
    ipAddress: '192.168.1.100',
    status: 'success'
  }
];

const Audit: React.FC = () => {
  const [logs] = useState<AuditLog[]>(mockAuditLogs);
  const [loading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchQuery === '' ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesResource = resourceFilter === 'all' || log.resource === resourceFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;

    return matchesSearch && matchesAction && matchesResource && matchesStatus;
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <FiEdit />;
      case 'update':
        return <FiEdit />;
      case 'delete':
        return <FiTrash />;
      case 'login':
        return <FiShield />;
      case 'logout':
        return <FiUser />;
      default:
        return <FiEdit />;
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'success' ? (
      <Badge $variant="success">Success</Badge>
    ) : (
      <Badge $variant="danger">Failed</Badge>
    );
  };

  const formatResourceName = (resource: string) => {
    return resource
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const columns: Column<AuditLog>[] = [
    {
      id: 'action',
      header: 'Action',
      accessor: (row) => (
        <LogDetails>
          <LogAction>
            <ActionIcon $type={row.action}>
              {getActionIcon(row.action)}
            </ActionIcon>
            {row.action.charAt(0).toUpperCase() + row.action.slice(1)} {formatResourceName(row.resource)}
          </LogAction>
          {row.resourceId && (
            <LogResource>ID: {row.resourceId}</LogResource>
          )}
        </LogDetails>
      ),
      width: '280px'
    },
    {
      id: 'user',
      header: 'User',
      accessor: (row) => (
        <UserInfo>
          <UserAvatar>{getUserInitials(row.userName)}</UserAvatar>
          <div>
            <UserName>{row.userName}</UserName>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{row.userType}</div>
          </div>
        </UserInfo>
      ),
      width: '180px'
    },
    {
      id: 'changes',
      header: 'Changes',
      accessor: (row) => (
        row.changes ? (
          <ChangesButton onClick={(e) => {
            e.stopPropagation();
            console.log('Show changes:', row.changes);
          }}>
            View Details
          </ChangesButton>
        ) : (
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>—</span>
        )
      ),
      width: '100px',
      align: 'center'
    },
    {
      id: 'ipAddress',
      header: 'IP Address',
      accessor: (row) => row.ipAddress ? <IpAddress>{row.ipAddress}</IpAddress> : '—',
      width: '140px'
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => getStatusBadge(row.status),
      width: '100px',
      sortable: true
    },
    {
      id: 'timestamp',
      header: 'Time',
      accessor: (row) => formatTimestamp(row.timestamp),
      width: '120px',
      sortable: true
    }
  ];

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <Heading level="h1">Audit Logs</Heading>
          <Text>System activity tracking and security monitoring</Text>
        </HeaderLeft>
        <HeaderActions>
          <Button variant="outline" size="md">
            <FiDownload style={{ marginRight: '0.5rem' }} />
            Export Logs
          </Button>
        </HeaderActions>
      </PageHeader>

      <FilterBar>
        <SearchInputWrapper>
          <FiSearch />
          <Input
            type="text"
            placeholder="Search by user, action, or resource..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchInputWrapper>

        <FilterGroup>
          <FilterLabel>Action</FilterLabel>
          <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
          </Select>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Resource</FilterLabel>
          <Select value={resourceFilter} onChange={(e) => setResourceFilter(e.target.value)}>
            <option value="all">All Resources</option>
            <option value="user">User</option>
            <option value="rescue">Rescue</option>
            <option value="feature_flag">Feature Flag</option>
            <option value="system_setting">System Setting</option>
            <option value="support_ticket">Support Ticket</option>
            <option value="user_sanction">User Sanction</option>
            <option value="auth">Authentication</option>
          </Select>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Status</FilterLabel>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="success">Success</option>
            <option value="failure">Failed</option>
          </Select>
        </FilterGroup>
      </FilterBar>

      <DataTable
        columns={columns}
        data={filteredLogs}
        loading={loading}
        emptyMessage="No audit logs found matching your criteria"
        onRowClick={(log) => console.log('View log details:', log)}
        getRowId={(log) => log.logId}
      />
    </PageContainer>
  );
};

export default Audit;
