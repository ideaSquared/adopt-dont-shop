import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { useQuery } from 'react-query';
import { Heading, Text, Button, Input } from '@adopt-dont-shop/components';
import {
  FiSearch,
  FiDownload,
  FiUser,
  FiEdit,
  FiTrash,
  FiShield,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
} from 'react-icons/fi';
import {
  PageContainer,
  PageHeader,
  HeaderLeft,
  FilterBar,
  FilterGroup,
  FilterLabel,
  SearchInputWrapper,
  Select,
  Badge,
} from '../components/ui';
import { DataTable, type Column } from '../components/data';
import {
  AuditLogsService,
  AuditLogLevel,
  AuditLogStatus,
  type AuditLog,
} from '@adopt-dont-shop/lib-audit-logs';

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
      case 'create':
        return '#d1fae5';
      case 'update':
        return '#dbeafe';
      case 'delete':
        return '#fee2e2';
      case 'login':
        return '#fef3c7';
      case 'logout':
        return '#f3f4f6';
      default:
        return '#e0e7ff';
    }
  }};
  color: ${props => {
    switch (props.$type) {
      case 'create':
        return '#065f46';
      case 'update':
        return '#1e40af';
      case 'delete':
        return '#991b1b';
      case 'login':
        return '#92400e';
      case 'logout':
        return '#374151';
      default:
        return '#3730a3';
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

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 600px;
  max-height: 80vh;
  overflow: auto;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
`;

const ModalTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: #f3f4f6;
    color: #111827;
  }
`;

const JsonBlock = styled.pre`
  background: #1f2937;
  color: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
  overflow: auto;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
`;

const Audit: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Calculate default date range (7 days ago)
  const sevenDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString();
  }, []);

  const now = useMemo(() => new Date().toISOString(), []);

  // Fetch audit logs using React Query
  const { data, isLoading, isError, error, refetch } = useQuery(
    ['auditLogs', page, actionFilter, resourceFilter, statusFilter],
    () =>
      AuditLogsService.getAuditLogs({
        action: actionFilter !== 'all' ? actionFilter : undefined,
        entity: resourceFilter !== 'all' ? resourceFilter : undefined,
        status:
          statusFilter !== 'all'
            ? statusFilter === 'success'
              ? AuditLogStatus.SUCCESS
              : AuditLogStatus.FAILURE
            : undefined,
        page,
        limit: 50,
        startDate: sevenDaysAgo,
        endDate: now,
      }),
    {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );

  const logs = data?.data || [];

  // Filter logs by search query (client-side filtering)
  const filteredLogs = useMemo(() => {
    if (!searchQuery) return logs;

    return logs.filter(log => {
      const searchLower = searchQuery.toLowerCase();
      return (
        (log.userName && log.userName.toLowerCase().includes(searchLower)) ||
        log.action.toLowerCase().includes(searchLower) ||
        log.category.toLowerCase().includes(searchLower)
      );
    });
  }, [logs, searchQuery]);

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
        minute: '2-digit',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'success' ? (
      <Badge $variant='success'>Success</Badge>
    ) : (
      <Badge $variant='danger'>Failed</Badge>
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
      accessor: row => (
        <LogDetails>
          <LogAction>
            <ActionIcon $type={row.action.toLowerCase()}>
              {getActionIcon(row.action.toLowerCase())}
            </ActionIcon>
            {row.action} {formatResourceName(row.category)}
          </LogAction>
          {row.metadata?.entityId && <LogResource>ID: {row.metadata.entityId}</LogResource>}
        </LogDetails>
      ),
      width: '280px',
    },
    {
      id: 'user',
      header: 'User',
      accessor: row => (
        <UserInfo>
          <UserAvatar>{row.userName ? getUserInitials(row.userName) : 'NA'}</UserAvatar>
          <div>
            <UserName>{row.userName || 'System'}</UserName>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{row.userType || 'system'}</div>
          </div>
        </UserInfo>
      ),
      width: '180px',
    },
    {
      id: 'changes',
      header: 'Changes',
      accessor: row =>
        row.metadata?.details ? (
          <ChangesButton
            onClick={e => {
              e.stopPropagation();
              setSelectedLog(row);
            }}
          >
            View Details
          </ChangesButton>
        ) : (
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>—</span>
        ),
      width: '100px',
      align: 'center',
    },
    {
      id: 'ipAddress',
      header: 'IP Address',
      accessor: row => (row.ip_address ? <IpAddress>{row.ip_address}</IpAddress> : '—'),
      width: '140px',
    },
    {
      id: 'status',
      header: 'Status',
      accessor: row => getStatusBadge(row.status || 'success'),
      width: '100px',
      sortable: true,
    },
    {
      id: 'timestamp',
      header: 'Time',
      accessor: row => formatTimestamp(row.timestamp.toString()),
      width: '120px',
      sortable: true,
    },
  ];

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <Heading level='h1'>Audit Logs</Heading>
          <Text>System activity tracking and security monitoring (Last 7 days)</Text>
        </HeaderLeft>
        <HeaderActions>
          <Button variant='outline' size='md' onClick={() => refetch()} disabled={isLoading}>
            <FiRefreshCw style={{ marginRight: '0.5rem' }} />
            Refresh
          </Button>
        </HeaderActions>
      </PageHeader>

      <FilterBar>
        <SearchInputWrapper>
          <FiSearch />
          <Input
            type='text'
            placeholder='Search by user, action, or resource...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </SearchInputWrapper>

        <FilterGroup>
          <FilterLabel>Action</FilterLabel>
          <Select value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
            <option value='all'>All Actions</option>
            <option value='create'>Create</option>
            <option value='update'>Update</option>
            <option value='delete'>Delete</option>
            <option value='login'>Login</option>
            <option value='logout'>Logout</option>
          </Select>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Resource</FilterLabel>
          <Select value={resourceFilter} onChange={e => setResourceFilter(e.target.value)}>
            <option value='all'>All Resources</option>
            <option value='user'>User</option>
            <option value='rescue'>Rescue</option>
            <option value='feature_flag'>Feature Flag</option>
            <option value='system_setting'>System Setting</option>
            <option value='support_ticket'>Support Ticket</option>
            <option value='user_sanction'>User Sanction</option>
            <option value='auth'>Authentication</option>
          </Select>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Status</FilterLabel>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value='all'>All Statuses</option>
            <option value='success'>Success</option>
            <option value='failure'>Failed</option>
          </Select>
        </FilterGroup>
      </FilterBar>

      {isError && (
        <div
          style={{
            padding: '1rem',
            color: '#dc2626',
            background: '#fee2e2',
            borderRadius: '8px',
            margin: '1rem 0',
          }}
        >
          Error loading audit logs: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredLogs}
        loading={isLoading}
        emptyMessage='No audit logs found matching your criteria'
        onRowClick={log => setSelectedLog(log)}
        getRowId={log => log.id.toString()}
      />

      {selectedLog && (
        <Modal onClick={() => setSelectedLog(null)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Audit Log Details</ModalTitle>
              <CloseButton onClick={() => setSelectedLog(null)}>×</CloseButton>
            </ModalHeader>
            <JsonBlock>
              {JSON.stringify(
                {
                  id: selectedLog.id,
                  action: selectedLog.action,
                  level: selectedLog.level,
                  status: selectedLog.status,
                  timestamp: selectedLog.timestamp,
                  user: {
                    id: selectedLog.user,
                    name: selectedLog.userName,
                    email: selectedLog.userEmail,
                    type: selectedLog.userType,
                  },
                  entity: {
                    category: selectedLog.category,
                    entityId: selectedLog.metadata?.entityId,
                  },
                  details: selectedLog.metadata?.details || null,
                  network: {
                    ipAddress: selectedLog.ip_address,
                    userAgent: selectedLog.user_agent,
                  },
                },
                null,
                2
              )}
            </JsonBlock>
          </ModalContent>
        </Modal>
      )}
    </PageContainer>
  );
};

export default Audit;
