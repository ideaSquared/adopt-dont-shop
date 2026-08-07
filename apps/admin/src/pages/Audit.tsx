import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  Heading,
  Text,
  Button,
  Input,
  Badge,
  DataTable,
  type DataTableColumn,
} from '@adopt-dont-shop/lib.components';
import { FiSearch, FiUser, FiEdit, FiTrash, FiShield, FiRefreshCw } from 'react-icons/fi';
import {
  PageContainer,
  PageHeader,
  HeaderLeft,
  FilterBar,
  FilterGroup,
  FilterLabel,
  SearchInputWrapper,
  Select,
} from '../components/ui';
import { AuditLogsService, AuditLogStatus, type AuditLog } from '@adopt-dont-shop/lib.audit-logs';
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
      <Badge variant='success'>Success</Badge>
    ) : (
      <Badge variant='error'>Failed</Badge>
    );
  };

  const formatResourceName = (resource: string) => {
    return resource
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Columns use the shared DataTable's key/label/render shape. Server-side sort
  // was never wired for audit logs (the old table's sort only wrote URL params
  // the query ignored), so every column is explicitly non-sortable rather than
  // opting into the shared table's client-side sort of the current page only.
  const columns: DataTableColumn[] = [
    {
      key: 'action',
      label: 'Action',
      width: '280px',
      sortable: false,
      render: (_value, row) => {
        const log = row as AuditLog;
        return (
          <div className={styles.logDetails}>
            <div className={styles.logAction}>
              <div className={getActionIconClass(log.action.toLowerCase())}>
                {getActionIcon(log.action.toLowerCase())}
              </div>
              {log.action} {formatResourceName(log.category)}
            </div>
            {log.metadata?.entityId && (
              <div className={styles.logResource}>ID: {log.metadata.entityId}</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'user',
      label: 'User',
      width: '180px',
      sortable: false,
      render: (_value, row) => {
        const log = row as AuditLog;
        return (
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {log.userName ? getUserInitials(log.userName) : 'NA'}
            </div>
            <div>
              <div className={styles.userName}>{log.userName || 'System'}</div>
              <div className={styles.subUserType}>{log.userType || 'system'}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'changes',
      label: 'Changes',
      width: '100px',
      align: 'center',
      sortable: false,
      render: (_value, row) => {
        const log = row as AuditLog;
        return log.metadata?.details ? (
          <button
            className={styles.changesButton}
            onClick={e => {
              e.stopPropagation();
              setSelectedLog(log);
            }}
          >
            View Details
          </button>
        ) : (
          <span className={styles.subUserType}>—</span>
        );
      },
    },
    {
      key: 'ipAddress',
      label: 'IP Address',
      width: '140px',
      sortable: false,
      render: (_value, row) => {
        const log = row as AuditLog;
        return log.ip_address ? <span className={styles.ipAddress}>{log.ip_address}</span> : '—';
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '100px',
      sortable: false,
      render: (_value, row) => getStatusBadge((row as AuditLog).status || 'success'),
    },
    {
      key: 'timestamp',
      label: 'Time',
      width: '120px',
      sortable: false,
      render: (_value, row) => formatTimestamp((row as AuditLog).timestamp.toString()),
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
        frameless
        surface
        columns={columns}
        rows={filteredLogs as unknown as Record<string, unknown>[]}
        loading={isLoading}
        emptyMessage='No audit logs found matching your criteria'
        page={page}
        total={data?.pagination?.total ?? 0}
        pageSize={50}
        onPageChange={setPage}
        getRowId={row => (row as AuditLog).id.toString()}
        onRowClick={row => setSelectedLog(row as AuditLog)}
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
