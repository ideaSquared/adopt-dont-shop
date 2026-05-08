import React, { useState } from 'react';
import { Heading, Text, Button, Input } from '@adopt-dont-shop/lib.components';
import {
  FiSearch,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiShield,
} from 'react-icons/fi';
import { DataTable, type Column } from '../components/data';
import {
  useReports,
  useModerationMetrics,
  useReportMutations,
  getSeverityLabel,
  getStatusLabel,
  formatRelativeTime,
  type Report,
  type ReportStatus,
  type ReportSeverity,
} from '@adopt-dont-shop/lib.moderation';
import {
  ActionSelectionModal,
  type ActionSelectionData,
} from '../components/moderation/ActionSelectionModal';
import { ReportDetailModal } from '../components/moderation/ReportDetailModal';
import * as styles from './Moderation.css';

const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'pending':
      return styles.badgeDanger;
    case 'under_review':
      return styles.badgeInfo;
    case 'resolved':
      return styles.badgeSuccess;
    case 'dismissed':
      return styles.badgeNeutral;
    default:
      return styles.badgeNeutral;
  }
};

const getStatusBadgeLabel = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'Pending Review';
    case 'under_review':
      return 'Under Review';
    case 'resolved':
      return 'Resolved';
    case 'dismissed':
      return 'Dismissed';
    default:
      return getStatusLabel(status as ReportStatus);
  }
};

const getPriorityIndicatorClass = (level: string): string => {
  switch (level) {
    case 'critical':
      return styles.priorityIndicatorCritical;
    case 'high':
      return styles.priorityIndicatorHigh;
    case 'medium':
      return styles.priorityIndicatorMedium;
    case 'low':
      return styles.priorityIndicatorLow;
    default:
      return styles.priorityIndicatorDefault;
  }
};

const getContentTypeTagClass = (type: string): string => {
  switch (type) {
    case 'pet':
      return styles.contentTypeTagPet;
    case 'message':
      return styles.contentTypeTagMessage;
    case 'user':
      return styles.contentTypeTagUser;
    case 'rescue':
      return styles.contentTypeTagRescue;
    default:
      return styles.contentTypeTagDefault;
  }
};

const Moderation: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<ReportSeverity | 'all'>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const {
    data: reportsData,
    isLoading,
    error,
    refetch,
  } = useReports({
    status: statusFilter === 'all' ? undefined : statusFilter,
    severity: severityFilter === 'all' ? undefined : severityFilter,
    reportedEntityType: entityTypeFilter === 'all' ? undefined : (entityTypeFilter as any),
    search: searchQuery || undefined,
    page: currentPage,
    limit: pageSize,
    sortBy: 'createdAt' as const,
    sortOrder: 'desc' as const,
  });

  const { data: metricsData } = useModerationMetrics();
  const { resolveReport, dismissReport, isLoading: isActionLoading } = useReportMutations();

  const reports = reportsData?.data || [];
  const pagination = reportsData?.pagination;
  const metrics = metricsData || {
    pendingReports: 0,
    underReviewReports: 0,
    criticalReports: 0,
    resolvedReports: 0,
  };

  const getPriorityDisplay = (severity: ReportSeverity) => {
    return (
      <div className={styles.priorityLabel}>
        <div className={getPriorityIndicatorClass(severity)} />
        {getSeverityLabel(severity)}
      </div>
    );
  };

  const handleOpenDetailModal = (report: Report) => {
    setSelectedReport(report);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedReport(null);
  };

  const handleOpenActionModal = (report: Report) => {
    setSelectedReport(report);
    setIsActionModalOpen(true);
  };

  const handleCloseActionModal = () => {
    setIsActionModalOpen(false);
    setSelectedReport(null);
  };

  const handleActionSubmit = async (actionData: ActionSelectionData) => {
    if (!selectedReport) {
      return;
    }

    try {
      if (actionData.actionType === 'no_action') {
        await dismissReport(selectedReport.reportId, actionData.reason);
      } else {
        await resolveReport(selectedReport.reportId, actionData.reason);
      }

      handleCloseActionModal();
      await refetch();
    } catch (err) {
      console.error('Failed to take moderation action:', err);
    }
  };

  const columns: Column<Report>[] = [
    {
      id: 'title',
      header: 'Report',
      sortable: true,
      accessor: (report: Report) => (
        <div>
          <div className={styles.reportTitle}>{report.title}</div>
          <div className={styles.reportSummary}>{report.description.substring(0, 80)}...</div>

          <div className={styles.reportTagRow}>
            <span className={getContentTypeTagClass(report.reportedEntityType)}>
              {report.reportedEntityType}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: 'severity',
      header: 'Severity',
      sortable: true,
      accessor: (report: Report) => getPriorityDisplay(report.severity),
    },
    {
      id: 'status',
      header: 'Status',
      sortable: true,
      accessor: (report: Report) => (
        <span className={getStatusBadgeClass(report.status)}>
          {getStatusBadgeLabel(report.status)}
        </span>
      ),
    },
    {
      id: 'createdAt',
      header: 'Reported',
      sortable: true,
      accessor: (report: Report) => (
        <div className={styles.reportedAt}>{formatRelativeTime(report.createdAt)}</div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (report: Report) => (
        <div className={styles.actionButtons}>
          <button
            className={styles.iconButton}
            title='View Details'
            onClick={() => handleOpenDetailModal(report)}
          >
            <FiEye />
          </button>
          {report.status === 'pending' || report.status === 'under_review' ? (
            <button
              className={styles.iconButton}
              title='Take Action'
              onClick={() => handleOpenActionModal(report)}
              disabled={isActionLoading}
            >
              <FiShield />
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.errorBanner}>Error loading reports: {error.message}</div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1>Content Moderation</h1>
          <p>Review and manage reported content across the platform</p>
        </div>
      </div>

      <div className={styles.statsBar}>
        <div className={styles.statCard}>
          <div className={styles.statIconRed}>
            <FiAlertTriangle />
          </div>
          <div className={styles.statDetails}>
            <div className={styles.statLabel}>Pending Reviews</div>
            <div className={styles.statValue}>{metrics.pendingReports}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconBlue}>
            <FiShield />
          </div>
          <div className={styles.statDetails}>
            <div className={styles.statLabel}>Under Review</div>
            <div className={styles.statValue}>{metrics.underReviewReports}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconOrange}>
            <FiAlertTriangle />
          </div>
          <div className={styles.statDetails}>
            <div className={styles.statLabel}>Critical Priority</div>
            <div className={styles.statValue}>{metrics.criticalReports}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconGreen}>
            <FiCheckCircle />
          </div>
          <div className={styles.statDetails}>
            <div className={styles.statLabel}>Resolved</div>
            <div className={styles.statValue}>{metrics.resolvedReports}</div>
          </div>
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <div className={styles.searchIcon}>
            <FiSearch />
          </div>
          <Input
            className={styles.searchInputPadded}
            placeholder='Search reports...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor='mod-status-filter'>
            Status
          </label>
          <select
            id='mod-status-filter'
            className={styles.select}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
          >
            <option value='all'>All Statuses</option>
            <option value='pending'>Pending</option>
            <option value='under_review'>Under Review</option>
            <option value='resolved'>Resolved</option>
            <option value='dismissed'>Dismissed</option>
            <option value='escalated'>Escalated</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor='mod-severity-filter'>
            Severity
          </label>
          <select
            id='mod-severity-filter'
            className={styles.select}
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value as any)}
          >
            <option value='all'>All Severities</option>
            <option value='critical'>Critical</option>
            <option value='high'>High</option>
            <option value='medium'>Medium</option>
            <option value='low'>Low</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor='mod-type-filter'>
            Content Type
          </label>
          <select
            id='mod-type-filter'
            className={styles.select}
            value={entityTypeFilter}
            onChange={e => setEntityTypeFilter(e.target.value)}
          >
            <option value='all'>All Types</option>
            <option value='user'>User</option>
            <option value='rescue'>Rescue</option>
            <option value='pet'>Pet</option>
            <option value='message'>Message</option>
            <option value='application'>Application</option>
          </select>
        </div>
      </div>

      <DataTable
        data={reports}
        columns={columns}
        loading={isLoading}
        onRowClick={handleOpenDetailModal}
        currentPage={pagination?.page || 1}
        totalPages={pagination?.totalPages || 1}
        onPageChange={page => setCurrentPage(page)}
      />

      <ReportDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        report={selectedReport}
      />

      <ActionSelectionModal
        isOpen={isActionModalOpen}
        onClose={handleCloseActionModal}
        onSubmit={handleActionSubmit}
        reportTitle={selectedReport?.title || ''}
        isLoading={isActionLoading}
      />
    </div>
  );
};

export default Moderation;
