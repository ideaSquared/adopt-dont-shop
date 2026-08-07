import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  DataTable,
  type DataTableColumn,
  Input,
  toast,
  useDebouncedValue,
} from '@adopt-dont-shop/lib.components';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { Search, User, UserPlus } from 'lucide-react';
import {
  useInbox,
  useInboxAssign,
  type InboxItem,
  type InboxFilters,
  type InboxSource,
} from '../hooks/useInbox';
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
      return `/moderation/${item.id}`;
    case 'support':
      return `/support/${item.id}`;
    case 'message':
      return `/messages?chatId=${item.id}`;
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

  const assignedToParam = searchParams.get('assignedTo');
  const myQueueActive = assignedToParam === 'me';

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

  const toggleMyQueue = () => {
    setFilterParam('assignedTo', myQueueActive ? '' : 'me');
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // ADS-697: debounce the search input so we don't fire an API call on every
  // keystroke — only the settled value participates in the query key.
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery, sourceFilter, severityFilter, statusFilter, myQueueActive]);

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
    if (debouncedSearchQuery) {
      f.search = debouncedSearchQuery;
    }
    if (myQueueActive && user) {
      f.assignedTo = user.userId;
    }
    return f;
  }, [sourceFilter, severityFilter, statusFilter, debouncedSearchQuery, page, myQueueActive, user]);

  const { data: inboxData, isLoading, error } = useInbox(filters);
  const items = inboxData?.data ?? [];

  const handleAssignToMe = (item: InboxItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      return;
    }
    assignMutation.mutate(
      {
        itemId: item.id,
        source: item.source,
        assignedTo: user.userId,
      },
      {
        // ADS-697: surface assign success/failure so users get explicit feedback
        // instead of relying on the optimistic table update alone.
        onSuccess: () => {
          toast.success('Item assigned to you');
        },
        onError: () => {
          toast.error('Failed to assign item. Please try again.');
        },
      }
    );
  };

  const handleRowClick = (item: InboxItem) => {
    navigate(getDetailPath(item));
  };

  // Columns use the shared DataTable's key/label/render shape. Server-side sort
  // was never wired for the inbox (the list query hard-codes sortBy/sortOrder and
  // ignores the URL params the old table wrote), so every column is explicitly
  // non-sortable rather than opting into the shared table's client-side sort of
  // the current page only.
  const columns: DataTableColumn[] = [
    {
      key: 'source',
      label: 'Source',
      width: '100px',
      sortable: false,
      render: (_value, row) => {
        const item = row as InboxItem;
        return (
          <span className={getSourceBadgeClass(item.source)}>{getSourceLabel(item.source)}</span>
        );
      },
    },
    {
      key: 'title',
      label: 'Item',
      width: '350px',
      sortable: false,
      render: (_value, row) => {
        const item = row as InboxItem;
        return (
          <div>
            <div className={item.assignedTo ? styles.itemTitle : styles.itemTitleUnassigned}>
              {item.title}
            </div>
            <div className={styles.itemSummary}>{item.summary}</div>
            {item.relatedUserEmail && (
              <div className={styles.itemMeta}>
                {item.relatedUserId ? (
                  <Link
                    to={`/users/${item.relatedUserId}`}
                    className={styles.relatedUserEmailLink}
                    onClick={e => e.stopPropagation()}
                  >
                    {item.relatedUserEmail}
                  </Link>
                ) : (
                  item.relatedUserEmail
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '130px',
      sortable: false,
      render: (_value, row) => {
        const item = row as InboxItem;
        return (
          <span className={getStatusBadgeClass(item.status)}>{item.status.replace(/_/g, ' ')}</span>
        );
      },
    },
    {
      key: 'severity',
      label: 'Severity',
      width: '100px',
      sortable: false,
      render: (_value, row) => {
        const item = row as InboxItem;
        return (
          <div className={styles.severityLabel}>
            <div className={getSeverityDotClass(item.severity)} />
            {item.severity}
          </div>
        );
      },
    },
    {
      key: 'assignedTo',
      label: 'Assigned',
      width: '100px',
      sortable: false,
      render: (_value, row) =>
        (row as InboxItem).assignedTo ? (
          <span className={styles.badgeInfo}>Assigned</span>
        ) : (
          <span className={styles.badgeWarning}>Unassigned</span>
        ),
    },
    {
      key: 'age',
      label: 'Age',
      width: '100px',
      sortable: false,
      render: (_value, row) => (
        <span className={styles.timestamp}>{formatRelativeTime((row as InboxItem).createdAt)}</span>
      ),
    },
    {
      key: 'updated',
      label: 'Updated',
      width: '100px',
      sortable: false,
      render: (_value, row) => (
        <span className={styles.timestamp}>{formatRelativeTime((row as InboxItem).updatedAt)}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '100px',
      align: 'center',
      sortable: false,
      render: (_value, row) => {
        const item = row as InboxItem;
        return !item.assignedTo ? (
          <button
            className={styles.assignButton}
            onClick={e => handleAssignToMe(item, e)}
            title='Assign to me'
            disabled={assignMutation.isPending}
          >
            <UserPlus size={14} />
            Assign
          </button>
        ) : null;
      },
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
            <Search size='1em' />
          </div>
          <Input
            className={styles.searchInputPadded}
            placeholder='Search across all items...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <button
          type='button'
          className={myQueueActive ? styles.myQueueChipActive : styles.myQueueChip}
          onClick={toggleMyQueue}
          aria-pressed={myQueueActive}
          disabled={!user}
          title='Show only items assigned to me'
        >
          <User size={14} />
          My Queue
        </button>

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
        frameless
        surface
        columns={columns}
        rows={items as unknown as Record<string, unknown>[]}
        loading={isLoading}
        emptyMessage='No items found matching your criteria. Try adjusting your filters.'
        page={page}
        total={inboxData?.pagination?.total ?? 0}
        pageSize={20}
        onPageChange={setPage}
        onRowClick={row => handleRowClick(row as InboxItem)}
        getRowId={row => `${(row as InboxItem).source}-${(row as InboxItem).id}`}
      />
    </div>
  );
};

export default Inbox;
