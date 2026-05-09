import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Heading, Text, Button, Input } from '@adopt-dont-shop/lib.components';
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
} from '@adopt-dont-shop/lib.audit-logs';
import * as styles from './Audit.css';

const getActionIconClass = (action: string): string => {
  switch (action) {
    case 'create':
      return styles.actionIconCreate;
    case 'update':
      return styles.actionIconUpdate;
    case 'delete':
      return styles.actionIconDelete;
    case 'login':
      return styles.actionIconLogin;
    case 'logout':
      return styles.actionIconLogout;
    default:
      return styles.actionIconDefault;
  }
};

const Audit: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    setPage(1);
  }, [actionFilter, resourceFilter, statusFilter]);

  const sevenDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString();
  }, []);

  const now = useMemo(() => new Date().toISOString(), []);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['auditLogs', page, actionFilter, resourceFilter, statusFilter],
    queryFn: () =>
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
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const logs = data?.data || [];
  const totalPages = data?.pagination?.pages ?? 1;

  const filteredLogs = useMemo(() => {
    if (!searchQuery) {
      return logs;
    }

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
        <div className={styles.logDetails}>
          <div className={styles.logAction}>
            <div className={getActionIconClass(row.action.toLowerCase())}>
              {getActionIcon(row.action.toLowerCase())}
            </div>
            {row.action} {formatResourceName(row.category)}
          </div>
          {row.metadata?.entityId && (
            <div className={styles.logResource}>ID: {row.metadata.entityId}</div>
          )}
        </div>
      ),
      width: '280px',
    },
    {
      id: 'user',
      header: 'User',
      accessor: row => (
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {row.userName ? getUserInitials(row.userName) : 'NA'}
          </div>
          <div>
            <div className={styles.userName}>{row.userName || 'System'}</div>
            <div className={styles.subUserType}>{row.userType || 'system'}</div>
          </div>
        </div>
      ),
      width: '180px',
    },
    {
      id: 'changes',
      header: 'Changes',
      accessor: row =>
        row.metadata?.details ? (
          <button
            className={styles.changesButton}
            onClick={e => {
              e.stopPropagation();
              setSelectedLog(row);
            }}
          >
            View Details
          </button>
        ) : (
          <span className={styles.subUserType}>—</span>
        ),
      width: '100px',
      align: 'center',
    },
    {
      id: 'ipAddress',
      header: 'IP Address',
      accessor: row =>
        row.ip_address ? <span className={styles.ipAddress}>{row.ip_address}</span> : '—',
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
        <div className={styles.headerActions}>
          <Button variant='outline' size='md' onClick={() => refetch()} disabled={isLoading}>
            <FiRefreshCw className={styles.buttonIcon} />
            Refresh
          </Button>
        </div>
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
        <div className={styles.errorBanner}>
          Error loading audit logs: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredLogs}
        loading={isLoading}
        emptyMessage='No audit logs found matching your criteria'
        onRowClick={log => setSelectedLog(log)}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        getRowId={log => log.id.toString()}
      />

      {selectedLog && (
        <div
          className={styles.modal}
          onClick={() => setSelectedLog(null)}
          onKeyDown={e => e.key === 'Escape' && setSelectedLog(null)}
          role='presentation'
        >
          <div
            className={styles.modalContent}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
            role='presentation'
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Audit Log Details</h3>
              <button className={styles.closeButton} onClick={() => setSelectedLog(null)}>
                ×
              </button>
            </div>
            <pre className={styles.jsonBlock}>
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
            </pre>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default Audit;
