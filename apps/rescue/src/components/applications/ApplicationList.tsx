import React, { useMemo } from 'react';
import {
  DataTable,
  EmptyState,
  ErrorState,
  type DataTableColumn,
} from '@adopt-dont-shop/lib.components';
import StatusBadge from '../common/StatusBadge';
import type {
  ApplicationListItem,
  ApplicationFilter,
  ApplicationSort,
} from '../../types/applications';
import { ApplicationStatus } from '@adopt-dont-shop/lib.applications';
import ApplicationStats from './ApplicationStats';
import ApplicationFilters from './ApplicationFilters';
import * as styles from './ApplicationList.css';

// Helper functions for progress calculation - Updated for 5-stage workflow
const getApplicationProgress = (application: ApplicationListItem) => {
  // Map the application's stage to progress steps (0-4)
  const stage = application.stage || 'PENDING';

  const stageToStep: Record<string, number> = {
    PENDING: 0,
    REVIEWING: 1,
    VISITING: 2,
    DECIDING: 3,
    RESOLVED: 4,
  };

  return {
    current: stageToStep[stage] || 0,
    total: 4,
    stage,
    finalOutcome: application.finalOutcome,
  };
};

const getStepStatus = (
  stepIndex: number,
  currentProgress: number,
  stage: string,
  finalOutcome?: string
): 'completed' | 'current' | 'pending' => {
  // For resolved applications, check the outcome
  if (stage === 'RESOLVED') {
    if (stepIndex < currentProgress) {
      return 'completed';
    }
    if (stepIndex === currentProgress) {
      // Show completed for approved, current for others
      return finalOutcome === 'APPROVED' ? 'completed' : 'current';
    }
    return 'pending';
  }

  // For in-progress applications
  if (stepIndex < currentProgress) {
    return 'completed';
  }
  if (stepIndex === currentProgress) {
    return 'current';
  }
  return 'pending';
};

const getStepLabel = (stepIndex: number, stage: string, finalOutcome?: string): string => {
  const labels = [
    'Pending', // Step 0 - PENDING
    'Reviewing', // Step 1 - REVIEWING
    'Visiting', // Step 2 - VISITING
    'Deciding', // Step 3 - DECIDING
    'Resolved', // Step 4 - RESOLVED
  ];

  // For resolved stage, show the final outcome
  if (stepIndex === 4 && stage === 'RESOLVED') {
    switch (finalOutcome) {
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'WITHDRAWN':
        return 'Withdrawn';
      default:
        return 'Resolved';
    }
  }

  return labels[stepIndex] || '';
};

const getActionButtons = (
  application: ApplicationListItem,
  onSelect: (application: ApplicationListItem) => void
) => {
  const actions = [];
  const stage = application.stage || 'PENDING';
  const select = () => onSelect(application);

  // Stage-based actions
  switch (stage) {
    case 'PENDING':
      actions.push({ label: 'Start Review', action: select, variant: 'primary' as const });
      break;
    case 'REVIEWING':
      actions.push({ label: 'Schedule Visit', action: select, variant: 'primary' as const });
      break;
    case 'VISITING':
    case 'DECIDING':
      actions.push({ label: 'View Details', action: select, variant: 'secondary' as const });
      break;
    case 'RESOLVED':
      actions.push({ label: 'View Details', action: select, variant: 'secondary' as const });
      break;
    default:
      actions.push({ label: 'View', action: select, variant: 'secondary' as const });
  }

  return actions.slice(0, 2);
};

interface ApplicationListProps {
  applications: ApplicationListItem[];
  loading: boolean;
  error: string | null;
  filter: ApplicationFilter;
  sort: ApplicationSort;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onFilterChange: (filter: ApplicationFilter) => void;
  onSortChange: (sort: ApplicationSort) => void;
  onApplicationSelect: (application: ApplicationListItem) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (next: Set<string>) => void;
  onPageChange?: (page: number) => void;
}

// Column keys that map 1:1 onto server-side sort fields. Used to translate a
// DataTable header-sort click back into an ApplicationSort without a cast.
const sortFieldForKey = (key: string): ApplicationSort['field'] | null => {
  switch (key) {
    case 'submittedAt':
      return 'submittedAt';
    case 'status':
      return 'status';
    case 'petName':
      return 'petName';
    case 'applicantName':
      return 'applicantName';
    case 'priority':
      return 'priority';
    default:
      return null;
  }
};

const priorityVariant = (
  priority: string | undefined
): 'urgent' | 'high' | 'medium' | 'low' | 'default' => {
  switch (priority) {
    case 'urgent':
      return 'urgent';
    case 'high':
      return 'high';
    case 'medium':
      return 'medium';
    case 'low':
      return 'low';
    default:
      return 'default';
  }
};

const ApplicationList: React.FC<ApplicationListProps> = ({
  applications,
  loading,
  error,
  filter,
  sort,
  pagination,
  onFilterChange,
  onSortChange,
  onApplicationSelect,
  selectedIds,
  onSelectionChange,
  onPageChange,
}) => {
  const selectionEnabled = selectedIds !== undefined && onSelectionChange !== undefined;

  // Look up the full application by id from a DataTable row (rows are plain
  // records; the render callbacks resolve the typed item here).
  const byId = useMemo(() => new Map(applications.map(a => [a.id, a])), [applications]);

  const handleSelectionChange = (ids: string[]) => {
    onSelectionChange?.(new Set(ids));
  };

  const handleColumnSort = (key: string, direction: 'asc' | 'desc') => {
    const field = sortFieldForKey(key);
    if (field) {
      onSortChange({ field, direction });
    }
  };

  const handleRowClick = (row: Record<string, unknown>) => {
    const app = byId.get(String(row.id));
    if (app) {
      onApplicationSelect(app);
    }
  };

  const columns: DataTableColumn[] = [
    {
      key: 'applicantName',
      label: 'Applicant',
      render: (_value, row) => {
        const app = byId.get(String(row.id));
        if (!app) {
          return null;
        }
        return (
          <div className={styles.applicantInfo}>
            <div className={styles.applicantName}>{app.applicantName}</div>
            <div className={styles.applicantEmail}>
              {app.data?.personalInfo?.email || 'No email provided'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'petName',
      label: 'Pet',
      sortable: false,
      render: (_value, row) => {
        const app = byId.get(String(row.id));
        if (!app) {
          return null;
        }
        return (
          <div className={styles.petInfo}>
            <div className={styles.petName}>{app.petName || 'Unknown Pet'}</div>
            <div className={styles.petDetails}>
              {app.petType} • {app.petBreed}
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (_value, row) => {
        const app = byId.get(String(row.id));
        if (!app) {
          return null;
        }
        return <StatusBadge status={app.status || 'unknown'} />;
      },
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (_value, row) => {
        const app = byId.get(String(row.id));
        if (!app) {
          return null;
        }
        return (
          <span className={styles.priorityBadge({ priority: priorityVariant(app.priority) })}>
            {app.priority}
          </span>
        );
      },
    },
    {
      key: 'submittedAt',
      label: 'Submitted',
      render: (_value, row) => {
        const app = byId.get(String(row.id));
        if (!app) {
          return null;
        }
        return app.submittedDaysAgo === 0 ? 'Today' : `${app.submittedDaysAgo} days ago`;
      },
    },
    {
      key: 'progress',
      label: 'Progress',
      sortable: false,
      render: (_value, row) => {
        const app = byId.get(String(row.id));
        if (!app) {
          return null;
        }
        const progress = getApplicationProgress(app);
        return (
          <div className={styles.progressIndicators}>
            <div className={styles.progressBar}>
              {[0, 1, 2, 3, 4].map(stepIndex => {
                const stepStatus = getStepStatus(
                  stepIndex,
                  progress.current,
                  progress.stage,
                  progress.finalOutcome
                );
                return (
                  <div
                    key={stepIndex}
                    className={styles.progressStep({
                      status: stepStatus,
                      isLast: stepIndex === 4,
                    })}
                  />
                );
              })}
            </div>
            <span className={styles.progressLabel}>
              {getStepLabel(progress.current, app.stage, app.finalOutcome)}
            </span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_value, row) => {
        const app = byId.get(String(row.id));
        if (!app) {
          return null;
        }
        return (
          <div className={styles.actionsContainer}>
            {getActionButtons(app, onApplicationSelect).map(action => (
              <button
                key={action.label}
                className={styles.actionButton({ variant: action.variant })}
                onClick={e => {
                  e.stopPropagation();
                  action.action();
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        );
      },
    },
  ];

  const tableRows = applications.map(a => ({ id: a.id }));

  // Convert complex ApplicationFilter to simple string-based filters for UI
  const getDateRangeValue = () => {
    if (!filter.dateRange) {
      return '';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const week = new Date();
    week.setDate(week.getDate() - 7);
    const month = new Date();
    month.setMonth(month.getMonth() - 1);

    const filterStart = filter.dateRange.start;

    // Check if it matches predefined ranges
    if (filterStart.getTime() === today.getTime()) {
      return 'today';
    }
    if (Math.abs(filterStart.getTime() - week.getTime()) < 86400000) {
      return 'week';
    } // within 1 day
    if (Math.abs(filterStart.getTime() - month.getTime()) < 86400000 * 2) {
      return 'month';
    } // within 2 days

    return 'custom';
  };

  const uiFilters = {
    search: filter.searchQuery || '',
    status: filter.status?.[0] || '',
    priority: filter.priority?.[0] || '',
    petType: filter.petType || '',
    referencesStatus: filter.referencesStatus || '',
    homeVisitStatus: filter.homeVisitStatus || '',
    dateRange: getDateRangeValue(),
    petBreed: filter.petBreed || '',
  };

  // Convert simple string-based filters back to complex ApplicationFilter.
  // ADS-575: search, status, priority, petType, petBreed, dateRange are
  // all honoured server-side. referencesStatus / homeVisitStatus are
  // still synthetic — the list derives them from application.status (see
  // RescueApplicationService.calculateReferencesStatus /
  // calculateHomeVisitStatus), so filtering on them server-side would
  // require persisting the real reference-check / home-visit records.
  const handleFilterChange = (key: string, value: string) => {
    const newFilter = { ...filter };

    switch (key) {
      case 'search':
        newFilter.searchQuery = value || undefined;
        break;
      case 'status':
        newFilter.status = value ? [value as ApplicationStatus] : undefined;
        break;
      case 'priority':
        newFilter.priority = value ? [value] : undefined;
        break;
      case 'petType':
        newFilter.petType = value || undefined;
        break;
      case 'referencesStatus':
        newFilter.referencesStatus = value || undefined;
        break;
      case 'homeVisitStatus':
        newFilter.homeVisitStatus = value || undefined;
        break;
      case 'dateRange':
        if (value === 'today') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          newFilter.dateRange = { start: today, end: tomorrow };
        } else if (value === 'week') {
          const week = new Date();
          week.setDate(week.getDate() - 7);
          newFilter.dateRange = { start: week, end: new Date() };
        } else if (value === 'month') {
          const month = new Date();
          month.setMonth(month.getMonth() - 1);
          newFilter.dateRange = { start: month, end: new Date() };
        } else {
          newFilter.dateRange = undefined;
        }
        break;
      case 'petBreed':
        newFilter.petBreed = value || undefined;
        break;
    }

    onFilterChange(newFilter);
  };

  // ADS UX P0/P1 #5: loading wins over error so a refetch in progress never
  // flashes an error banner; once the request settles, error renders inside
  // the table area below if it persists. Empty and populated table follow.
  if (!loading && error) {
    return <ErrorState title="Error loading applications" message={error} />;
  }

  return (
    <div className={styles.container}>
      {/* Statistics Section - Always shows full totals */}
      <div className={styles.statsSection}>
        <ApplicationStats />
      </div>

      {/* Filters Section - Always Visible */}
      <div className={styles.filtersSection}>
        <ApplicationFilters
          filters={uiFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={() => onFilterChange({})}
        />
      </div>

      {/* Header and Controls */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Applications ({pagination.total})</h2>
        </div>

        <div className={styles.headerRight}>
          <select
            className={styles.sortSelect}
            value={`${sort.field}-${sort.direction}`}
            onChange={e => {
              const [field, direction] = e.target.value.split('-');
              onSortChange({
                field: field as ApplicationSort['field'],
                direction: direction as 'asc' | 'desc',
              });
            }}
          >
            <option value="submittedAt-desc">Newest First</option>
            <option value="submittedAt-asc">Oldest First</option>
            <option value="status-asc">Status A-Z</option>
            <option value="applicantName-asc">Name A-Z</option>
            <option value="priority-desc">High Priority First</option>
          </select>
        </div>
      </div>

      {/* Application Table */}
      <div className={styles.tableContainer}>
        {loading && applications.length === 0 ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Loading applications...</p>
          </div>
        ) : !loading && applications.length === 0 ? (
          <EmptyState title="No applications found matching your criteria." />
        ) : loading ? (
          // Per-row skeleton loading is a bespoke affordance kept out of the
          // shared DataTable; it mirrors the DataTable column layout below.
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr>
                  {selectionEnabled && <th className={styles.tableHeader} />}
                  <th className={styles.tableHeader}>Applicant</th>
                  <th className={styles.tableHeader}>Pet</th>
                  <th className={styles.tableHeader}>Status</th>
                  <th className={styles.tableHeader}>Priority</th>
                  <th className={styles.tableHeader}>Submitted</th>
                  <th className={styles.tableHeader}>Progress</th>
                  <th className={styles.tableHeader}>Actions</th>
                </tr>
              </thead>
              <tbody className={styles.tableBody}>
                {Array.from({ length: pagination.limit }, (_, i) => (
                  <tr key={`skeleton-${i}`} className={styles.tableRow} aria-hidden="true">
                    {selectionEnabled && (
                      <td className={styles.tableCell}>
                        <div className={styles.skeletonBlock} style={{ width: '1rem' }} />
                      </td>
                    )}
                    <td className={styles.tableCell}>
                      <div className={styles.skeletonBlock} style={{ width: '60%' }} />
                      <div
                        className={styles.skeletonBlock}
                        style={{ width: '40%', marginTop: '0.25rem' }}
                      />
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.skeletonBlock} style={{ width: '50%' }} />
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.skeletonBlock} style={{ width: '4rem' }} />
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.skeletonBlock} style={{ width: '3rem' }} />
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.skeletonBlock} style={{ width: '5rem' }} />
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.skeletonBlock} style={{ width: '80%' }} />
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.skeletonBlock} style={{ width: '5rem' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <DataTable
            frameless
            columns={columns}
            rows={tableRows}
            getRowId={row => String(row.id)}
            onRowClick={handleRowClick}
            rowClassName={() => styles.tableRow}
            selectable={selectionEnabled}
            selectedIds={selectedIds}
            onSelectionChange={handleSelectionChange}
            sortBy={sort.field}
            sortDirection={sort.direction}
            onSortChange={handleColumnSort}
            page={pagination.page}
            pageSize={pagination.limit}
            total={pagination.total}
            onPageChange={onPageChange}
          />
        )}
      </div>
    </div>
  );
};

export default ApplicationList;
