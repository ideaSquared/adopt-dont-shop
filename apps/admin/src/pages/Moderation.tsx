import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import {
  Badge,
  Button,
  DataTable,
  type DataTableColumn,
  ErrorState,
  MetricCard,
  PageHeader,
  SearchToolbar,
  Stack,
  StatusBadge,
  toast,
  useDebouncedValue,
  useFilterParamSetter,
} from '@adopt-dont-shop/lib.components';
import { CircleCheck, Eye, Shield, TriangleAlert } from 'lucide-react';
import { BulkActionToolbar } from '../components/ui';
import {
  useReports,
  useModerationMetrics,
  useReportMutations,
  moderationService,
  getSeverityLabel,
  getStatusLabel,
  formatRelativeTime,
  type Report,
  type ReportStatus,
  type ReportSeverity,
  type ReportedEntityType,
} from '@adopt-dont-shop/lib.moderation';
import {
  ActionSelectionModal,
  type ActionSelectionData,
} from '../components/moderation/ActionSelectionModal';
import { ReportDetailModal } from '../components/moderation/ReportDetailModal';
import {
  BulkModerationModal,
  type BulkModerationActionKind,
  type BulkModerationSubmitData,
} from '../components/moderation/BulkModerationModal';
import * as styles from './Moderation.css';

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

const getContentTypeVariant = (type: string): React.ComponentProps<typeof Badge>['variant'] => {
  switch (type) {
    case 'pet':
      return 'success';
    case 'message':
      return 'info';
    case 'user':
      return 'primary';
    case 'rescue':
      return 'warning';
    default:
      return 'neutral';
  }
};

const VALID_REPORT_STATUSES: ReadonlySet<string> = new Set([
  'pending',
  'under_review',
  'resolved',
  'dismissed',
  'escalated',
]);

const VALID_REPORT_SEVERITIES: ReadonlySet<string> = new Set(['critical', 'high', 'medium', 'low']);

const VALID_ENTITY_TYPES: ReadonlySet<string> = new Set([
  'user',
  'rescue',
  'pet',
  'message',
  'application',
  'conversation',
]);

const Moderation: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const statusParam = searchParams.get('status');
  const severityParam = searchParams.get('severity');
  const statusFilter: ReportStatus | 'all' =
    statusParam && VALID_REPORT_STATUSES.has(statusParam) ? (statusParam as ReportStatus) : 'all';
  const severityFilter: ReportSeverity | 'all' =
    severityParam && VALID_REPORT_SEVERITIES.has(severityParam)
      ? (severityParam as ReportSeverity)
      : 'all';
  const entityTypeParam = searchParams.get('entityType');
  const entityTypeFilter: ReportedEntityType | 'all' =
    entityTypeParam && VALID_ENTITY_TYPES.has(entityTypeParam)
      ? (entityTypeParam as ReportedEntityType)
      : 'all';
  // Set by deep links (e.g. a chat's "View in Moderation Dashboard") to show
  // the reports about one entity.
  const entityIdFilter = searchParams.get('entityId') || undefined;

  const clearEntityId = () => {
    setCurrentPage(1);
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        next.delete('entityId');
        return next;
      },
      { replace: true }
    );
  };

  const setEntityTypeParam = (value: string) => {
    setCurrentPage(1);
    // An entity id only makes sense with the type it came with.
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        next.delete('entityId');
        if (value && value !== 'all') {
          next.set('entityType', value);
        } else {
          next.delete('entityType');
        }
        return next;
      },
      { replace: true }
    );
  };

  const setFilterParam = useFilterParamSetter(setSearchParams);

  const handleFilterChange = (name: string, value: string | boolean) => {
    const next = String(value);
    if (name === 'entityType') {
      setEntityTypeParam(next);
      return;
    }
    setFilterParam(name, next);
  };

  const { reportId } = useParams<{ reportId?: string }>();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  const [pageSize] = useState(20);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Bulk selection state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [bulkKind, setBulkKind] = useState<BulkModerationActionKind | null>(null);
  const [bulkResult, setBulkResult] = useState<{ succeeded: number; failed: number } | null>(null);

  const {
    data: reportsData,
    isLoading,
    error,
    refetch,
  } = useReports({
    status: statusFilter === 'all' ? undefined : statusFilter,
    severity: severityFilter === 'all' ? undefined : severityFilter,
    reportedEntityType: entityTypeFilter === 'all' ? undefined : entityTypeFilter,
    reportedEntityId: entityIdFilter,
    search: debouncedSearchQuery || undefined,
    page: currentPage,
    limit: pageSize,
    sortBy: 'createdAt' as const,
    sortOrder: 'desc' as const,
  });

  const { data: metricsData } = useModerationMetrics();
  const { resolveReport, dismissReport, isLoading: isActionLoading } = useReportMutations();

  const reports = useMemo(() => reportsData?.data ?? [], [reportsData?.data]);
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

  // ADS deep-link: the detail modal is driven by the URL :reportId param.
  // Look up the report once the list has loaded; if the id doesn't match
  // any loaded report (e.g. deleted/invalid), bounce back to /moderation
  // and surface a soft toast. While reports are still loading we wait.
  const detailReport = useMemo<Report | null>(
    () => (reportId ? (reports.find((r: Report) => r.reportId === reportId) ?? null) : null),
    [reportId, reports]
  );
  const isDetailModalOpen = Boolean(reportId) && detailReport !== null;

  useEffect(() => {
    if (!reportId || isLoading) {
      return;
    }
    if (!reports.some((r: Report) => r.reportId === reportId)) {
      toast.error('Report not found');
      navigate({ pathname: '/moderation', search: searchParams.toString() }, { replace: true });
    }
  }, [reportId, isLoading, reports, navigate, searchParams]);

  const handleOpenDetailModal = (report: Report) => {
    navigate({
      pathname: `/moderation/${report.reportId}`,
      search: searchParams.toString(),
    });
  };

  const handleCloseDetailModal = () => {
    navigate({ pathname: '/moderation', search: searchParams.toString() });
  };

  const handleOpenActionModal = (report: Report) => {
    setSelectedReport(report);
    setActionError(null);
    setIsActionModalOpen(true);
  };

  const handleCloseActionModal = () => {
    setIsActionModalOpen(false);
    setSelectedReport(null);
    setActionError(null);
  };

  const handleActionSubmit = async (actionData: ActionSelectionData) => {
    if (!selectedReport) {
      return;
    }

    try {
      if (actionData.actionType === 'no_action') {
        await dismissReport(selectedReport.reportId, actionData.reason);
      } else {
        // Send the chosen action so the backend applies it (e.g. suspends the
        // user) and the report is resolved with the matching resolution.
        await resolveReport(selectedReport.reportId, actionData.reason, {
          reportId: selectedReport.reportId,
          targetEntityType: selectedReport.reportedEntityType,
          targetEntityId: selectedReport.reportedEntityId,
          // For a user report the reported entity IS the user; reportedUserId is
          // reporter-supplied and unvalidated, so it is only a fallback for
          // other entity types.
          targetUserId:
            selectedReport.reportedEntityType === 'user'
              ? selectedReport.reportedEntityId
              : (selectedReport.reportedUserId ?? undefined),
          actionType: actionData.actionType,
          severity: selectedReport.severity,
          reason: actionData.reason,
          internalNotes: actionData.internalNotes,
          duration: actionData.duration,
        });
      }

      handleCloseActionModal();
      await refetch();
    } catch (err) {
      console.error('Failed to take moderation action:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setActionError(`Failed to take moderation action: ${message}`);
    }
  };

  const selectedReports = useMemo(
    () => reports.filter(r => selectedRows.has(r.reportId)),
    [reports, selectedRows]
  );
  const selectedSeverities = useMemo<ReportSeverity[]>(
    () => selectedReports.map(r => r.severity),
    [selectedReports]
  );

  const handleOpenBulk = (kind: BulkModerationActionKind) => {
    setBulkKind(kind);
    setBulkResult(null);
  };

  const handleCloseBulk = () => {
    setBulkKind(null);
    setBulkResult(null);
  };

  const bulkMutation = useMutation({
    mutationFn: async (data: BulkModerationSubmitData) => {
      const reportIds = Array.from(selectedRows);
      if (data.kind === 'dismiss') {
        // Backend writes one audit log row per dismissed report.
        const result = await moderationService.bulkUpdateReports({
          reportIds,
          action: 'dismiss',
          resolutionNotes: data.reason,
        });
        return { succeeded: result.updated, failed: reportIds.length - result.updated };
      }
      if (data.kind === 'sanction' && data.sanction) {
        // Bulk sanctions: iterate per report so each action creates its own
        // moderation action + audit-log entry (MODERATION_ACTION_TAKEN).
        const outcomes = await Promise.all(
          selectedReports.map(async report => {
            try {
              await moderationService.takeAction(
                report.reportId,
                {
                  reportId: report.reportId,
                  targetEntityType: report.reportedEntityType,
                  targetEntityId: report.reportedEntityId,
                  targetUserId: report.reportedUserId ?? undefined,
                  actionType: data.sanction!.actionType,
                  severity: data.sanction!.severity,
                  reason: data.reason,
                },
                data.reason
              );
              return true;
            } catch (err) {
              console.error('Bulk sanction failed for report', report.reportId, err);
              return false;
            }
          })
        );
        return {
          succeeded: outcomes.filter(Boolean).length,
          failed: outcomes.filter(o => !o).length,
        };
      }
      return null;
    },
    onSuccess: summary => {
      if (summary) {
        setBulkResult(summary);
      }
      setSelectedRows(new Set());
    },
    onSettled: () => refetch(),
  });

  const handleBulkSubmit = async (data: BulkModerationSubmitData) => {
    if (selectedRows.size === 0) {
      return;
    }
    await bulkMutation.mutateAsync(data);
  };

  // Columns use the shared DataTable's key/label/render shape. Server-side sort
  // was never wired for moderation (useReports receives a hard-coded
  // sortBy/sortOrder, never one derived from a column header), so every column
  // is explicitly non-sortable rather than opting into the shared table's
  // client-side sort of the current page only.
  const columns: DataTableColumn[] = [
    {
      key: 'title',
      label: 'Report',
      sortable: false,
      render: (_value, row) => {
        const report = row as Report;
        return (
          <div>
            <div className={styles.reportTitle}>{report.title}</div>
            <div className={styles.reportSummary}>{report.description.substring(0, 80)}...</div>

            <div className={styles.reportTagRow}>
              <Badge variant={getContentTypeVariant(report.reportedEntityType)}>
                {report.reportedEntityType}
              </Badge>
            </div>
          </div>
        );
      },
    },
    {
      key: 'severity',
      label: 'Severity',
      sortable: false,
      render: (_value, row) => getPriorityDisplay((row as Report).severity),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: false,
      render: (_value, row) => {
        const report = row as Report;
        return (
          <StatusBadge
            kind='report'
            status={report.status}
            label={getStatusBadgeLabel(report.status)}
          />
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Reported',
      sortable: false,
      render: (_value, row) => (
        <div className={styles.reportedAt}>{formatRelativeTime((row as Report).createdAt)}</div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_value, row) => {
        const report = row as Report;
        return (
          <div
            className={styles.actionButtons}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
            role='presentation'
          >
            <Button
              variant='outline'
              size='sm'
              title='View Details'
              aria-label='View Details'
              onClick={() => handleOpenDetailModal(report)}
            >
              <Eye size='1em' aria-hidden />
            </Button>
            {report.status === 'pending' || report.status === 'under_review' ? (
              <Button
                variant='outline'
                size='sm'
                title='Take Action'
                aria-label='Take Action'
                onClick={() => handleOpenActionModal(report)}
                disabled={isActionLoading}
              >
                <Shield size='1em' aria-hidden />
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  if (error) {
    return <ErrorState size='sm' title={`Error loading reports: ${error.message}`} />;
  }

  return (
    <Stack spacing='lg'>
      <PageHeader
        title='Content Moderation'
        description='Review and manage reported content across the platform'
      />

      <div className={styles.statsBar}>
        <MetricCard
          icon={<TriangleAlert size='1em' />}
          iconColor='#ef4444'
          label='Pending Reviews'
          value={metrics.pendingReports}
        />
        <MetricCard
          icon={<Shield size='1em' />}
          iconColor='#3b82f6'
          label='Under Review'
          value={metrics.underReviewReports}
        />
        <MetricCard
          icon={<TriangleAlert size='1em' />}
          iconColor='#ea580c'
          label='Critical Priority'
          value={metrics.criticalReports}
        />
        <MetricCard
          icon={<CircleCheck size='1em' />}
          iconColor='#10b981'
          label='Resolved'
          value={metrics.resolvedReports}
        />
      </div>

      <SearchToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder='Search reports...'
        filterConfig={[
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { value: 'all', label: 'All Statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'under_review', label: 'Under Review' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'dismissed', label: 'Dismissed' },
              { value: 'escalated', label: 'Escalated' },
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
          {
            name: 'entityType',
            label: 'Content Type',
            type: 'select',
            options: [
              { value: 'all', label: 'All Types' },
              { value: 'user', label: 'User' },
              { value: 'rescue', label: 'Rescue' },
              { value: 'pet', label: 'Pet' },
              { value: 'message', label: 'Message' },
              { value: 'application', label: 'Application' },
              { value: 'conversation', label: 'Conversation' },
            ],
          },
        ]}
        filters={{
          status: statusFilter,
          severity: severityFilter,
          entityType: entityTypeFilter,
        }}
        onFilterChange={handleFilterChange}
      />

      {entityIdFilter ? (
        <div className={styles.entityFilterBanner} role='status'>
          <span>
            Showing reports for one {entityTypeFilter === 'all' ? 'item' : entityTypeFilter}
          </span>
          <Button variant='ghost' size='sm' onClick={clearEntityId}>
            Show all reports
          </Button>
        </div>
      ) : null}

      <BulkActionToolbar
        selectedCount={selectedRows.size}
        totalCount={reports.length}
        onSelectAll={() => setSelectedRows(new Set(reports.map(r => r.reportId)))}
        onClearSelection={() => setSelectedRows(new Set())}
        actions={[
          {
            label: 'Dismiss',
            variant: 'neutral',
            onClick: () => handleOpenBulk('dismiss'),
          },
          {
            label: 'Sanction',
            variant: 'danger',
            onClick: () => handleOpenBulk('sanction'),
          },
        ]}
      />

      <DataTable
        frameless
        surface
        columns={columns}
        rows={reports as unknown as Record<string, unknown>[]}
        loading={isLoading}
        emptyMessage='No reports found matching your criteria. Try adjusting your filters or search query.'
        onRowClick={row => handleOpenDetailModal(row as Report)}
        page={pagination?.page ?? 1}
        total={pagination?.total ?? 0}
        pageSize={pageSize}
        onPageChange={page => setCurrentPage(page)}
        selectable
        selectedIds={selectedRows}
        onSelectionChange={ids => setSelectedRows(new Set(ids))}
        getRowId={row => String((row as Report).reportId)}
      />

      <ReportDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        report={detailReport}
      />

      <ActionSelectionModal
        isOpen={isActionModalOpen}
        onClose={handleCloseActionModal}
        onSubmit={handleActionSubmit}
        reportTitle={selectedReport?.title || ''}
        isLoading={isActionLoading}
        error={actionError}
      />

      <BulkModerationModal
        isOpen={bulkKind !== null}
        onClose={handleCloseBulk}
        onSubmit={handleBulkSubmit}
        kind={bulkKind ?? 'dismiss'}
        selectedCount={selectedRows.size}
        selectedSeverities={selectedSeverities}
        isLoading={bulkMutation.isPending}
        resultSummary={bulkResult}
      />
    </Stack>
  );
};

export default Moderation;
