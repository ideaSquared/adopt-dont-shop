import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiUser,
  FiCalendar,
  FiFileText,
  FiExternalLink,
  FiShield,
  FiClock,
} from 'react-icons/fi';
import clsx from 'clsx';
import { z } from 'zod';
import { EntityInspector, type EntityInspectorTab, Spinner } from '@adopt-dont-shop/lib.components';
import {
  Report,
  getSeverityLabel,
  getStatusLabel,
  getActionTypeLabel,
  formatRelativeTime,
  useReports,
  useActiveActions,
} from '@adopt-dont-shop/lib.moderation';
import { useEntityActivity } from '../../hooks';
import * as styles from './ReportDetailModal.css';
import { ModalBreadcrumbNav, type BreadcrumbSegment } from '../modals/ModalBreadcrumbNav';

export interface ReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report | null;
  /** Optional list of sibling report IDs (in display order) to enable prev/next navigation. */
  siblingIds?: ReadonlyArray<string>;
  /** Called when prev/next is clicked, passes the target report ID. */
  onNavigate?: (reportId: string) => void;
}

const getStatusBadgeClass = (
  status: string
): 'badgeSuccess' | 'badgeDanger' | 'badgeInfo' | 'badgeNeutral' | 'badgeWarning' => {
  switch (status) {
    case 'pending':
      return 'badgeDanger';
    case 'under_review':
      return 'badgeInfo';
    case 'resolved':
      return 'badgeSuccess';
    case 'dismissed':
      return 'badgeNeutral';
    case 'escalated':
      return 'badgeWarning';
    default:
      return 'badgeNeutral';
  }
};

const getSeverityBadgeClass = (
  severity: string
): 'badgeSuccess' | 'badgeDanger' | 'badgeInfo' | 'badgeNeutral' | 'badgeWarning' => {
  switch (severity) {
    case 'critical':
      return 'badgeDanger';
    case 'high':
      return 'badgeWarning';
    case 'medium':
      return 'badgeInfo';
    case 'low':
      return 'badgeNeutral';
    default:
      return 'badgeNeutral';
  }
};

// Helper to generate in-app routes to view reported content. Returns null when
// the entity type has no corresponding admin detail route.
const getEntityViewUrl = (entityType: string, entityId: string): string | null => {
  switch (entityType) {
    case 'user':
      return `/users/${entityId}`;
    case 'rescue':
      return `/rescues/${entityId}`;
    case 'pet':
      return `/pets/${entityId}`;
    case 'application':
      return `/applications/${entityId}`;
    case 'message':
    case 'conversation':
      // The chat list lives at /messages. The reported entityId is the
      // conversation id for both message and conversation reports.
      return `/messages?chatId=${entityId}`;
    default:
      return null;
  }
};

// Helper to get entity type label
const getEntityTypeLabel = (entityType: string): string => {
  switch (entityType) {
    case 'user':
      return 'User Profile';
    case 'rescue':
      return 'Rescue Organization';
    case 'pet':
      return 'Pet Listing';
    case 'application':
      return 'Application';
    case 'message':
      return 'Message';
    case 'conversation':
      return 'Conversation';
    default:
      return 'Content';
  }
};

// The backend (moderation.service.ts#enrichReportsWithEntityContext) attaches
// an `entityContext` field to each report at the top level. It isn't part of
// the shared Report Zod schema, so we parse it locally to avoid a cross-package
// schema change. Every field is optional because the backend may attach a
// deleted/error fallback or omit fields per entity type.
const EntityContextSchema = z
  .object({
    displayName: z.string().optional(),
    deleted: z.boolean().optional(),
    error: z.boolean().optional(),
    email: z.string().optional(),
    userType: z.string().optional(),
    petType: z.string().optional(),
    breed: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
  })
  .passthrough();

type EntityContext = z.infer<typeof EntityContextSchema>;

const extractEntityContext = (report: Report): EntityContext | undefined => {
  const candidate = (report as { entityContext?: unknown }).entityContext;
  if (candidate === undefined) {
    return undefined;
  }
  const parsed = EntityContextSchema.safeParse(candidate);
  return parsed.success ? parsed.data : undefined;
};

// ── Overview Tab ──────────────────────────────────────────────────

type OverviewTabProps = {
  report: Report;
  entityContext: EntityContext | undefined;
  onClose: () => void;
};

const OverviewTab: React.FC<OverviewTabProps> = ({ report, entityContext, onClose }) => {
  const navigate = useNavigate();
  const viewUrl = getEntityViewUrl(report.reportedEntityType, report.reportedEntityId);

  const handleViewContent = () => {
    if (viewUrl) {
      onClose();
      navigate(viewUrl);
    }
  };

  return (
    <>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <FiAlertTriangle size={16} />
          Report Status
        </h3>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>Status</div>
            <div className={styles.infoValue}>
              <span className={styles[getStatusBadgeClass(report.status)]}>
                {getStatusLabel(report.status)}
              </span>
            </div>
          </div>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>Severity</div>
            <div className={styles.infoValue}>
              <span className={styles[getSeverityBadgeClass(report.severity)]}>
                {getSeverityLabel(report.severity)}
              </span>
            </div>
          </div>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>Category</div>
            <div className={styles.infoValue}>{report.category}</div>
          </div>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>Report ID</div>
            <div className={clsx(styles.infoValue, styles.monospaceId)}>
              {report.reportId.substring(0, 8)}...
            </div>
          </div>
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <FiFileText size={16} />
          Description
        </h3>
        <div className={styles.description}>{report.description}</div>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <FiUser size={16} />
          Reported Entity
        </h3>
        <div className={styles.entityCard}>
          <div className={styles.entityType}>{report.reportedEntityType}</div>
          {entityContext ? (
            <>
              <div className={styles.entityName}>
                {entityContext.displayName}
                {entityContext.deleted && ' (Deleted)'}
                {entityContext.error && ' (Error Loading)'}
              </div>
              {entityContext.email && (
                <div className={styles.entityDetail}>{entityContext.email}</div>
              )}
              {entityContext.userType && (
                <div className={styles.entityDetail}>Type: {entityContext.userType}</div>
              )}
              {entityContext.petType && (
                <div className={styles.entityDetail}>
                  {entityContext.petType}
                  {entityContext.breed && ` • ${entityContext.breed}`}
                </div>
              )}
              {entityContext.city && entityContext.country && (
                <div className={styles.entityDetail}>
                  {entityContext.city}, {entityContext.country}
                </div>
              )}
              <div className={styles.entityId}>
                <strong>ID:</strong> {report.reportedEntityId}
              </div>
            </>
          ) : (
            <>
              <div className={styles.entityName}>Entity ID: {report.reportedEntityId}</div>
              <div className={styles.entityDetail}>No additional context available</div>
              <div className={styles.entityId}>
                <strong>Full ID:</strong> {report.reportedEntityId}
              </div>
            </>
          )}

          {viewUrl && (
            <>
              <button
                className={styles.viewContentButton}
                onClick={handleViewContent}
                data-testid='view-entity-button'
                data-view-url={viewUrl}
              >
                <FiExternalLink size={16} />
                View {getEntityTypeLabel(report.reportedEntityType)}
              </button>
              {(entityContext?.deleted || entityContext?.error) && (
                <div className={styles.warningBox}>
                  <FiAlertTriangle size={16} />
                  <div>
                    {entityContext.deleted
                      ? 'This entity was deleted. The link may not work.'
                      : 'There was an error loading this entity. The link may not work.'}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <FiUser size={16} />
          Reporter Information
        </h3>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>Reporter ID</div>
            <div className={clsx(styles.infoValue, styles.monospaceId)}>
              {report.reporterId.substring(0, 8)}...
            </div>
          </div>
          {report.reportedUserId && (
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Reported User ID</div>
              <div className={clsx(styles.infoValue, styles.monospaceId)}>
                {report.reportedUserId.substring(0, 8)}...
              </div>
            </div>
          )}
        </div>
        <button
          className={clsx(styles.viewContentButton, styles.viewContentButtonSpacing)}
          onClick={() => {
            onClose();
            navigate(`/users/${report.reporterId}`);
          }}
        >
          <FiExternalLink size={16} />
          View Reporter Profile
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <FiCalendar size={16} />
          Timeline
        </h3>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>Reported</div>
            <div className={styles.infoValue}>{new Date(report.createdAt).toLocaleString()}</div>
            <div className={styles.entityDetail}>{formatRelativeTime(report.createdAt)}</div>
          </div>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>Last Updated</div>
            <div className={styles.infoValue}>{new Date(report.updatedAt).toLocaleString()}</div>
            <div className={styles.entityDetail}>{formatRelativeTime(report.updatedAt)}</div>
          </div>
        </div>
      </div>
    </>
  );
};

// ── Context Tab (prior history + active sanctions) ───────────────

type PriorHistorySectionProps = {
  reportedUserId: string;
  currentReportId: string;
};

const PriorHistorySection: React.FC<PriorHistorySectionProps> = ({
  reportedUserId,
  currentReportId,
}) => {
  const { data, isLoading } = useReports({
    reportedUserId,
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const priorReports = (data?.data ?? []).filter(r => r.reportId !== currentReportId);

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>
        <FiClock size={16} />
        Prior Report History
      </h3>
      {isLoading ? (
        <div className={styles.historyEmpty}>Loading prior reports...</div>
      ) : priorReports.length === 0 ? (
        <div className={styles.historyEmpty} data-testid='no-prior-history'>
          No prior reports for this user
        </div>
      ) : (
        <div className={styles.historyList} data-testid='prior-history-list'>
          {priorReports.map(priorReport => (
            <div key={priorReport.reportId} className={styles.historyItem}>
              <div className={styles.historyItemHeader}>
                <span className={styles.historyItemTitle}>{priorReport.title}</span>
                <span className={styles.historyItemMeta}>
                  {getStatusLabel(priorReport.status)} • {getSeverityLabel(priorReport.severity)}
                </span>
              </div>
              <span className={styles.historyItemMeta}>
                {formatRelativeTime(priorReport.createdAt)} • {priorReport.category}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

type ActiveSanctionsSectionProps = {
  reportedUserId: string;
};

const ActiveSanctionsSection: React.FC<ActiveSanctionsSectionProps> = ({ reportedUserId }) => {
  const { data, isLoading } = useActiveActions(reportedUserId);
  const sanctions = data ?? [];

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>
        <FiShield size={16} />
        Active Sanctions
      </h3>
      {isLoading ? (
        <div className={styles.historyEmpty}>Loading active sanctions...</div>
      ) : sanctions.length === 0 ? (
        <div className={styles.historyEmpty} data-testid='no-active-sanctions'>
          No active sanctions on this user
        </div>
      ) : (
        <div className={styles.sanctionList} data-testid='active-sanctions-list'>
          {sanctions.map(action => (
            <div key={action.actionId} className={styles.sanctionItem}>
              <div className={styles.sanctionItemHeader}>
                <span className={styles.sanctionItemType}>
                  {getActionTypeLabel(action.actionType)}
                </span>
                <span className={styles.historyItemMeta}>
                  {getSeverityLabel(action.severity)} •{' '}
                  {action.expiresAt
                    ? `expires ${formatRelativeTime(action.expiresAt)}`
                    : 'no expiry'}
                </span>
              </div>
              <span className={styles.sanctionItemReason}>{action.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ContextTab: React.FC<{ reportedUserId: string; reportId: string }> = ({
  reportedUserId,
  reportId,
}) => (
  <>
    <PriorHistorySection reportedUserId={reportedUserId} currentReportId={reportId} />
    <div className={styles.divider} />
    <ActiveSanctionsSection reportedUserId={reportedUserId} />
  </>
);

// ── Activity Tab ──────────────────────────────────────────────────

const ActivityTab: React.FC<{ reportId: string }> = ({ reportId }) => {
  const { data, isLoading, error } = useEntityActivity('report', reportId);

  if (isLoading) {
    return (
      <div className={styles.activityEmpty}>
        <Spinner size='sm' label='Loading activity' />
      </div>
    );
  }

  if (error) {
    return <div className={styles.activityEmpty}>Failed to load activity history.</div>;
  }

  const activities = data ?? [];

  if (activities.length === 0) {
    return <div className={styles.activityEmpty}>No activity recorded for this report.</div>;
  }

  return (
    <div className={styles.activityList}>
      {activities.map(activity => (
        <div key={activity.activityId} className={styles.activityItem}>
          <div className={styles.activityDot} />
          <div className={styles.activityContent}>
            <p className={styles.activityDescription}>{activity.description}</p>
            <p className={styles.activityMeta}>
              {activity.activityType} &middot;{' '}
              {new Date(activity.createdAt).toLocaleString('en-GB')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Main Modal ──────────────────────────────────────────────────

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  isOpen,
  onClose,
  report,
  siblingIds,
  onNavigate,
}) => {
  if (!isOpen) {
    return null;
  }

  if (!report) {
    return null;
  }

  const entityContext = extractEntityContext(report);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const breadcrumbSegments: ReadonlyArray<BreadcrumbSegment> = [
    { label: 'Moderation', to: '/moderation' },
    { label: getStatusLabel(report.status), to: `/moderation?status=${report.status}` },
    { label: `Report #${report.reportId.substring(0, 8)}` },
  ];

  const tabs: EntityInspectorTab[] = [
    {
      id: 'overview',
      label: 'Overview',
      content: <OverviewTab report={report} entityContext={entityContext} onClose={onClose} />,
    },
  ];

  if (report.reportedUserId) {
    tabs.push({
      id: 'context',
      label: 'Context',
      content: <ContextTab reportedUserId={report.reportedUserId} reportId={report.reportId} />,
    });
  }

  tabs.push({
    id: 'activity',
    label: 'Activity',
    content: <ActivityTab reportId={report.reportId} />,
  });

  return (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      onKeyDown={e => e.key === 'Escape' && onClose()}
      role='presentation'
    >
      <div className={styles.modalContainer}>
        <div className={styles.breadcrumbWrap}>
          <ModalBreadcrumbNav
            segments={breadcrumbSegments}
            siblingIds={siblingIds}
            currentId={report.reportId}
            onNavigate={onNavigate}
          />
        </div>
        <EntityInspector
          data-testid='report-detail-inspector'
          resetTabsOnKeyChange={report.reportId}
          onClose={onClose}
          closeLabel='Close report detail'
          tabs={tabs}
          header={
            <>
              <div className={styles.headerInfo}>
                <h2 className={styles.title}>{report.title}</h2>
                <div className={styles.subtitle}>
                  <FiCalendar size={14} />
                  Reported {formatRelativeTime(report.createdAt)}
                </div>
              </div>
              <div className={styles.headerBadges}>
                <span className={styles[getStatusBadgeClass(report.status)]}>
                  {getStatusLabel(report.status)}
                </span>
                <span className={styles[getSeverityBadgeClass(report.severity)]}>
                  {getSeverityLabel(report.severity)}
                </span>
              </div>
            </>
          }
        />
      </div>
    </div>
  );
};
