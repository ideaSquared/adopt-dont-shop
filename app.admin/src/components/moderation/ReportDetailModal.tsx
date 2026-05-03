import React from 'react';
import {
  FiX,
  FiAlertTriangle,
  FiUser,
  FiCalendar,
  FiFileText,
  FiExternalLink,
} from 'react-icons/fi';
import clsx from 'clsx';
import {
  Report,
  getSeverityLabel,
  getStatusLabel,
  formatRelativeTime,
} from '@adopt-dont-shop/lib.moderation';
import * as styles from './ReportDetailModal.css';

export interface ReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report | null;
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

// Helper to generate URLs to view reported content
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
      return `/chats?messageId=${entityId}`;
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

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  if (!report) {
    return null;
  }

  const entityContext = (report as Record<string, unknown>).entityContext as
    | {
        displayName?: string;
        deleted?: boolean;
        error?: boolean;
        email?: string;
        userType?: string;
        petType?: string;
        breed?: string;
        city?: string;
        country?: string;
      }
    | undefined;
  const viewUrl = getEntityViewUrl(report.reportedEntityType, report.reportedEntityId);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleViewContent = () => {
    if (viewUrl) {
      window.open(viewUrl, '_blank');
    }
  };

  return (
    <div
      className={clsx(styles.overlay, !isOpen && styles.overlayHidden)}
      onClick={handleOverlayClick}
      onKeyDown={e => e.key === 'Escape' && onClose()}
      role='presentation'
    >
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <h2 className={styles.title}>{report.title}</h2>
            <div className={styles.subtitle}>
              <FiCalendar size={14} />
              Reported {formatRelativeTime(report.createdAt)}
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label='Close'>
            <FiX size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
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
                <div
                  className={styles.infoValue}
                  style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                >
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
                  <button className={styles.viewContentButton} onClick={handleViewContent}>
                    <FiExternalLink size={16} />
                    View {getEntityTypeLabel(report.reportedEntityType)}
                  </button>
                  {(entityContext?.deleted || entityContext?.error) && (
                    <div className={styles.warningBox}>
                      <FiAlertTriangle size={16} />
                      <div>
                        {entityContext.deleted
                          ? 'This entity has been deleted. The link may not work.'
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
                <div
                  className={styles.infoValue}
                  style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                >
                  {report.reporterId.substring(0, 8)}...
                </div>
              </div>
              {report.reportedUserId && (
                <div className={styles.infoItem}>
                  <div className={styles.infoLabel}>Reported User ID</div>
                  <div
                    className={styles.infoValue}
                    style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                  >
                    {report.reportedUserId.substring(0, 8)}...
                  </div>
                </div>
              )}
            </div>
            <button
              className={styles.viewContentButton}
              onClick={() => window.open(`/users/${report.reporterId}`, '_blank')}
              style={{ marginTop: '1rem' }}
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
                <div className={styles.infoValue}>
                  {new Date(report.createdAt).toLocaleString()}
                </div>
                <div className={styles.entityDetail}>{formatRelativeTime(report.createdAt)}</div>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.infoLabel}>Last Updated</div>
                <div className={styles.infoValue}>
                  {new Date(report.updatedAt).toLocaleString()}
                </div>
                <div className={styles.entityDetail}>{formatRelativeTime(report.updatedAt)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
