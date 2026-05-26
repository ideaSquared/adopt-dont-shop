import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@adopt-dont-shop/lib.components';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { FiSearch, FiUserPlus } from 'react-icons/fi';
import { DataTable, type Column } from '../components/data';
import { useInbox, useInboxAssign, type InboxItem, type InboxFilters, type InboxSource } from '../hooks/useInbox';
import * as styles from './Inbox.css';

const formatRelativeTime = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const getSourceBadgeClass = (source: InboxSource): string => {
  switch (source) {
    case 'moderation':
      return styles.sourceBadgeModeration;
    case 'support':
      return styles.sourceBadgeSupport;
    case 'message':
      return styles.sourceBadgeMessage;
  }
};

const getSourceLabel = (source: InboxSource): string => {
  switch (source) {
    case 'moderation':
      return 'Moderation';
    case 'support':
      return 'Support';
    case 'message':
      return 'Message';
  }
};

const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'pending':
    case 'open':
      return styles.badgeDanger;
    case 'under_review':
    case 'in_progress':
    case 'active':
      return styles.badgeInfo;
    case 'waiting_for_user':
      return styles.badgeWarning;
    case 'resolved':
    case 'closed':
      return styles.badgeSuccess;
    case 'dismissed':
    case 'archived':
      return styles.badgeNeutral;
    default:
      return styles.badgeNeutral;
  }
};

const getSeverityDotClass = (severity: string): string => {
  switch (severity) {
    case 'critical':
      return styles.severityCritical;
    case 'high':
      return styles.severityHigh;
    case 'medium':
      return styles.severityMedium;
    case 'low':
      return styles.severityLow;
    default:
      return styles.severityMedium;
  }
};

const getDetailPath = (item: InboxItem): string => {
  switch (item.source) {
    case 'moderation':
      return '/moderation';
    case 'support':
      return `/support/${item.id}`;
    case 'message':
      return '/messages';
  }
};

const VALID_SOURCES: ReadonlySet<string> = new Set(['moderation', 'support', 'message']);

const Inbox: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const assignMutation = useInboxAssign();

  const sourceParam = searchParams.get('source');
  const sourceFilter: InboxSource | 'all' =
    sourceParam && VALID_SOURCES.has(sourceParam) ? (sourceParam as InboxSource) : 'all';

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
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, sourceFilter, severityFilter, statusFilter]);

  const filters = useMemo((): InboxFilters => {
    const f: InboxFilters = {
      page,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    if (sourceFilter !== 'all') {
      f.source = sourceFilter;
    }
    if (severityFilter !== 'all') {
      f.severity = severityFilter;
    }
    if (statusFilter !== 'all') {
      f.status = statusFilter;
    }
    if (searchQuery) {
      f.search = searchQuery;
    }
    return f;
  }, [sourceFilter, severityFilter, statusFilter, searchQuery, page]);

  const { data: inboxData, isLoading, error } = useInbox(filters);
  const items = inboxData?.data ?? [];
  const totalPages = inboxData?.pagination?.totalPages ?? 1;

  const handleAssignToMe = (item: InboxItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      return;
    }
    assignMutation.mutate({
      itemId: item.id,
      source: item.source,
      assignedTo: user.userId,
    });
  };

  const handleRowClick = (item: InboxItem) => {
    navigate(getDetailPath(item));
  };

  const columns: Column<InboxItem>[] = [
    {
      id: 'source',
      header: 'Source',
      accessor: (item: InboxItem) => (
        <span className={getSourceBadgeClass(item.source)}>
          {getSourceLabel(item.source)}
        </span>
      ),
      width: '100px',
    },
    {
      id: 'title',
      header: 'Item',
      accessor: (item: InboxItem) => (
        <div>
          <div className={item.assignedTo ? styles.itemTitle : styles.itemTitleUnassigned}>
            {item.title}
          </div>
          <div className={styles.itemSummary}>{item.summary}</div>
          {item.relatedUserEmail && (
            <div className={styles.itemMeta}>{item.relatedUserEmail}</div>
          )}
        </div>
      ),
      width: '350px',
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (item: InboxItem) => (
        <span className={getStatusBadgeClass(item.status)}>
          {item.status.replace(/_/g, ' ')}
        </span>
      ),
      width: '130px',
      sortable: true,
    },
    {
      id: 'severity',
      header: 'Severity',
      accessor: (item: InboxItem) => (
        <div className={styles.severityLabel}>
          <div className={getSeverityDotClass(item.severity)} />
          {item.severity}
        </div>
      ),
      width: '100px',
      sortable: true,
    },
    {
      id: 'assignedTo',
      header: 'Assigned',
      accessor: (item: InboxItem) => (
        item.assignedTo ? (
          <span className={styles.badgeInfo}>Assigned</span>
        ) : (
          <span className={styles.badgeWarning}>Unassigned</span>
        )
      ),
      width: '100px',
    },
    {
      id: 'age',
      header: 'Age',
      accessor: (item: InboxItem) => (
        <span className={styles.timestamp}>{formatRelativeTime(item.createdAt)}</span>
      ),
      width: '100px',
      sortable: true,
    },
    {
      id: 'updated',
      header: 'Updated',
      accessor: (item: InboxItem) => (
        <span className={styles.timestamp}>{formatRelativeTime(item.updatedAt)}</span>
      ),
      width: '100px',
      sortable: true,
    },
    {
      id: 'actions',
      header: '',
      accessor: (item: InboxItem) => (
        !item.assignedTo ? (
          <button
            className={styles.assignButton}
            onClick={e => handleAssignToMe(item, e)}
            title='Assign to me'
            disabled={assignMutation.isPending}
          >
            <FiUserPlus size={14} />
            Assign
          </button>
        ) : null
      ),
      width: '100px',
      align: 'center',
    },
  ];

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.errorBanner}>Error loading inbox: {error.message}</div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1>Triage Inbox</h1>
          <p>Unified view of moderation reports, support tickets, and flagged messages</p>
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <div className={styles.searchIcon}>
            <FiSearch />
          </div>
          <Input
            className={styles.searchInputPadded}
            placeholder='Search across all items...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor='inbox-source-filter'>
            Source
          </label>
          <select
            id='inbox-source-filter'
            className={styles.select}
            value={sourceFilter}
            onChange={e => setFilterParam('source', e.target.value)}
          >
            <option value='all'>All Sources</option>
            <option value='moderation'>Moderation</option>
            <option value='support'>Support</option>
            <option value='message'>Messages</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor='inbox-status-filter'>
            Status
          </label>
          <select
            id='inbox-status-filter'
            className={styles.select}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value='all'>All Statuses</option>
            <option value='pending'>Pending</option>
            <option value='open'>Open</option>
            <option value='under_review'>Under Review</option>
            <option value='in_progress'>In Progress</option>
            <option value='active'>Active</option>
            <option value='resolved'>Resolved</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor='inbox-severity-filter'>
            Severity
          </label>
          <select
            id='inbox-severity-filter'
            className={styles.select}
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
          >
            <option value='all'>All Severities</option>
            <option value='critical'>Critical</option>
            <option value='high'>High</option>
            <option value='medium'>Medium</option>
            <option value='low'>Low</option>
          </select>
        </div>
      </div>

      <DataTable
        data={items as InboxItem[]}
        columns={columns}
        loading={isLoading}
        emptyMessage='No items found matching your criteria. Try adjusting your filters.'
        onRowClick={handleRowClick}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        getRowId={(item: InboxItem) => `${item.source}-${item.id}`}
      />
    </div>
  );
};

export default Inbox;
