import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  Badge,
  Button,
  DataTable,
  type DataTableColumn,
  ErrorState,
  PageHeader,
  SearchToolbar,
  Stack,
  toast,
  useDebouncedValue,
  useFilterParamSetter,
} from '@adopt-dont-shop/lib.components';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { formatRelativeDate } from '@adopt-dont-shop/lib.utils';
import { User, UserPlus } from 'lucide-react';
import {
  useInbox,
  useInboxAssign,
  type InboxItem,
  type InboxFilters,
  type InboxSource,
} from '../hooks/useInbox';
import * as styles from './Inbox.css';

type BadgeVariant = NonNullable<React.ComponentProps<typeof Badge>['variant']>;

const getSourceVariant = (source: InboxSource): BadgeVariant => {
  switch (source) {
    case 'moderation':
      return 'error';
    case 'support':
      return 'info';
    case 'message':
      return 'secondary';
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

const getStatusVariant = (status: string): BadgeVariant => {
  switch (status) {
    case 'pending':
    case 'open':
      return 'error';
    case 'under_review':
    case 'in_progress':
    case 'active':
      return 'info';
    case 'waiting_for_user':
      return 'warning';
    case 'resolved':
    case 'closed':
      return 'success';
    default:
      return 'neutral';
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

// The admin inbox route only serves moderation + support; `source=message`
// is rejected (400), so it is not offered as a filter option.
const VALID_SOURCES: ReadonlySet<string> = new Set(['moderation', 'support']);

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

  const setFilterParam = useFilterParamSetter(setSearchParams);

  const handleFilterChange = (name: string, value: string | boolean) => {
    const next = String(value);
    if (name === 'source') {
      setFilterParam('source', next);
    } else if (name === 'status') {
      setStatusFilter(next);
    } else if (name === 'severity') {
      setSeverityFilter(next);
    }
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
        return <Badge variant={getSourceVariant(item.source)}>{getSourceLabel(item.source)}</Badge>;
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
          <Badge variant={getStatusVariant(item.status)}>{item.status.replace(/_/g, ' ')}</Badge>
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
          <Badge variant='info'>Assigned</Badge>
        ) : (
          <Badge variant='warning'>Unassigned</Badge>
        ),
    },
    {
      key: 'age',
      label: 'Age',
      width: '100px',
      sortable: false,
      render: (_value, row) => (
        <span className={styles.timestamp}>{formatRelativeDate((row as InboxItem).createdAt)}</span>
      ),
    },
    {
      key: 'updated',
      label: 'Updated',
      width: '100px',
      sortable: false,
      render: (_value, row) => (
        <span className={styles.timestamp}>{formatRelativeDate((row as InboxItem).updatedAt)}</span>
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
          <Button
            variant='outline'
            size='sm'
            onClick={e => handleAssignToMe(item, e)}
            title='Assign to me'
            disabled={assignMutation.isPending}
          >
            <UserPlus size='1em' />
            Assign
          </Button>
        ) : null;
      },
    },
  ];

  if (error) {
    return <ErrorState size='sm' title='Error loading inbox' message={error.message} />;
  }

  return (
    <Stack spacing='lg'>
      <PageHeader
        title='Triage Inbox'
        description='Unified view of moderation reports, support tickets, and flagged messages'
      />

      <SearchToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder='Search across all items...'
        filterConfig={[
          {
            name: 'source',
            label: 'Source',
            type: 'select',
            options: [
              { value: 'all', label: 'All Sources' },
              { value: 'moderation', label: 'Moderation' },
              { value: 'support', label: 'Support' },
            ],
          },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { value: 'all', label: 'All Statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'open', label: 'Open' },
              { value: 'under_review', label: 'Under Review' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'active', label: 'Active' },
              { value: 'resolved', label: 'Resolved' },
            ],
          },
          {
            name: 'severity',
            label: 'Severity',
            type: 'select',
            options: [
              { value: 'all', label: 'All Severities' },
              { value: 'critical', label: 'Critical' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ],
          },
        ]}
        filters={{ source: sourceFilter, status: statusFilter, severity: severityFilter }}
        onFilterChange={handleFilterChange}
      />

      <div>
        <Button
          variant={myQueueActive ? 'primary' : 'outline'}
          size='sm'
          onClick={toggleMyQueue}
          aria-pressed={myQueueActive}
          disabled={!user}
          title='Show only items assigned to me'
        >
          <User size='1em' />
          My Queue
        </Button>
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
    </Stack>
  );
};

export default Inbox;
