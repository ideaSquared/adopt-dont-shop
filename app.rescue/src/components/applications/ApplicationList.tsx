import React from 'react';
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
  selectedApplications: string[];
  onSelectionChange: (selected: string[]) => void;
}

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
  selectedApplications,
  onSelectionChange,
}) => {
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
  // currently accepted but not applied (the rescue list derives those
  // values from application.status; real filtering requires a join on
  // application_references / home_visits and is tracked separately).
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(applications.map(app => app.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectApplication = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedApplications, id]);
    } else {
      onSelectionChange(selectedApplications.filter(appId => appId !== id));
    }
  };

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <div className={styles.errorText}>
            <h3 className={styles.errorTitle}>Error loading applications</h3>
            <p className={styles.errorMessage}>{error}</p>
          </div>
        </div>
      </div>
    );
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
          {selectedApplications.length > 0 && (
            <span className={styles.selectionCount}>{selectedApplications.length} selected</span>
          )}

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
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Loading applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className={styles.emptyContainer}>
            <p className={styles.emptyText}>No applications found matching your criteria.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr>
                  <th className={styles.tableHeader}>
                    <input
                      className={styles.checkbox}
                      type="checkbox"
                      checked={
                        applications.length > 0 &&
                        applications.every(app => selectedApplications.includes(app.id))
                      }
                      onChange={e => handleSelectAll(e.target.checked)}
                    />
                  </th>
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
                {applications.map(application => (
                  <tr
                    key={application.id}
                    className={styles.tableRow}
                    onClick={() => onApplicationSelect(application)}
                  >
                    <td className={styles.checkboxCell} onClick={e => e.stopPropagation()}>
                      <input
                        className={styles.checkbox}
                        type="checkbox"
                        checked={selectedApplications.includes(application.id)}
                        onChange={e => handleSelectApplication(application.id, e.target.checked)}
                      />
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.applicantInfo}>
                        <div className={styles.applicantName}>{application.applicantName}</div>
                        <div className={styles.applicantEmail}>
                          {application.data?.personalInfo?.email || 'No email provided'}
                        </div>
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.petInfo}>
                        <div className={styles.petName}>{application.petName || 'Unknown Pet'}</div>
                        <div className={styles.petDetails}>
                          {application.petType} • {application.petBreed}
                        </div>
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <StatusBadge status={application.status || 'unknown'} />
                    </td>
                    <td className={styles.tableCell}>
                      <span
                        className={styles.priorityBadge({
                          priority: application.priority as
                            | 'urgent'
                            | 'high'
                            | 'medium'
                            | 'low'
                            | 'default',
                        })}
                      >
                        {application.priority}
                      </span>
                    </td>
                    <td className={styles.tableCell}>
                      {application.submittedDaysAgo === 0
                        ? 'Today'
                        : `${application.submittedDaysAgo} days ago`}
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.progressIndicators}>
                        <div className={styles.progressBar}>
                          {[0, 1, 2, 3, 4].map(stepIndex => {
                            const progress = getApplicationProgress(application);
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
                          {getStepLabel(
                            getApplicationProgress(application).current,
                            application.stage,
                            application.finalOutcome
                          )}
                        </span>
                      </div>
                    </td>
                    <td className={styles.tableCell} onClick={e => e.stopPropagation()}>
                      <div className={styles.actionsContainer}>
                        {getActionButtons(application, onApplicationSelect).map(action => (
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationList;
