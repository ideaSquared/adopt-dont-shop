import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Modal,
  Button,
  EntityInspector,
  Spinner,
  type EntityInspectorTab,
} from '@adopt-dont-shop/lib.components';
import {
  type SupportTicket,
  type TicketResponse,
  getStatusLabel,
  getPriorityLabel,
  getCategoryLabel,
  formatRelativeTime,
  formatDate,
  formatTicketId,
} from '@adopt-dont-shop/lib.support-tickets';
import {
  FiUser,
  FiClock,
  FiTag,
  FiAlertCircle,
  FiCheckCircle,
  FiMessageSquare,
  FiSend,
} from 'react-icons/fi';
import clsx from 'clsx';
import * as styles from './TicketDetailModal.css';
import { ModalBreadcrumbNav, type BreadcrumbSegment } from './ModalBreadcrumbNav';
import { useEntityActivity } from '../../hooks';

type TicketDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  ticket: SupportTicket | null;
  onReply: (content: string, isInternal: boolean) => Promise<void>;
  onStatusChange?: (status: string) => Promise<void>;
  onPriorityChange?: (priority: string) => Promise<void>;
  /** Optional list of sibling ticket IDs (in display order) to enable prev/next navigation. */
  siblingIds?: ReadonlyArray<string>;
  /** Called when prev/next is clicked, passes the target ticket ID. */
  onNavigate?: (ticketId: string) => void;
};

const STATUS_COLOR_MAP: Record<string, { bg: string; color: string }> = {
  open: { bg: '#dbeafe', color: '#1e40af' },
  in_progress: { bg: '#fef3c7', color: '#92400e' },
  waiting_for_user: { bg: '#e0e7ff', color: '#4338ca' },
  resolved: { bg: '#d1fae5', color: '#065f46' },
  closed: { bg: '#f3f4f6', color: '#374151' },
  escalated: { bg: '#fee2e2', color: '#991b1b' },
};

const PRIORITY_COLOR_MAP: Record<string, { bg: string; color: string }> = {
  low: { bg: '#f3f4f6', color: '#374151' },
  normal: { bg: '#dbeafe', color: '#1e40af' },
  high: { bg: '#fef3c7', color: '#92400e' },
  urgent: { bg: '#fed7aa', color: '#9a3412' },
  critical: { bg: '#fee2e2', color: '#991b1b' },
};

// ── Overview tab ──────────────────────────────────────────────────

const OverviewTab: React.FC<{
  ticket: SupportTicket;
  onClose: () => void;
}> = ({ ticket, onClose }) => {
  const renderCustomer = () => {
    if (!ticket.userName) {
      return <span className={styles.emptyValue}>Not provided</span>;
    }
    if (ticket.userId) {
      return (
        <Link to={`/users/${ticket.userId}`} onClick={onClose} className={styles.userLink}>
          {ticket.userName}
        </Link>
      );
    }
    return ticket.userName;
  };

  return (
    <>
      <div className={styles.detailGrid}>
        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>
            <FiUser />
            Customer
          </div>
          <div className={styles.detailValue}>{renderCustomer()}</div>
          <div className={clsx(styles.detailValue, styles.detailValueSecondary)}>
            {ticket.userEmail}
          </div>
        </div>

        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>
            <FiUser />
            Assigned To
          </div>
          <div className={styles.detailValue}>
            {ticket.assignedTo || <span className={styles.emptyValue}>Unassigned</span>}
          </div>
        </div>

        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>
            <FiClock />
            Created
          </div>
          <div className={styles.detailValue}>
            {formatDate(ticket.createdAt)}
            <div className={styles.detailValueMeta}>({formatRelativeTime(ticket.createdAt)})</div>
          </div>
        </div>

        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>
            <FiClock />
            Last Updated
          </div>
          <div className={styles.detailValue}>
            {formatDate(ticket.updatedAt)}
            <div className={styles.detailValueMeta}>({formatRelativeTime(ticket.updatedAt)})</div>
          </div>
        </div>

        {ticket.firstResponseAt && (
          <div className={styles.detailItem}>
            <div className={styles.detailLabel}>
              <FiMessageSquare />
              First Response
            </div>
            <div className={styles.detailValue}>{formatRelativeTime(ticket.firstResponseAt)}</div>
          </div>
        )}

        {ticket.resolvedAt && (
          <div className={styles.detailItem}>
            <div className={styles.detailLabel}>
              <FiCheckCircle />
              Resolved
            </div>
            <div className={styles.detailValue}>{formatRelativeTime(ticket.resolvedAt)}</div>
          </div>
        )}
      </div>

      <div className={styles.descriptionSection}>
        <div className={styles.descriptionLabel}>Description</div>
        <div className={styles.descriptionText}>{ticket.description}</div>
      </div>

      {ticket.internalNotes && (
        <div className={clsx(styles.descriptionSection, styles.internalNotesSection)}>
          <div className={clsx(styles.descriptionLabel, styles.internalNotesLabel)}>
            Internal Notes
          </div>
          <div className={styles.descriptionText}>{ticket.internalNotes}</div>
        </div>
      )}
    </>
  );
};

// ── Responses tab ────────────────────────────────────────────────

const ResponsesTab: React.FC<{
  ticket: SupportTicket;
  onClose: () => void;
  onReply: (content: string, isInternal: boolean) => Promise<void>;
}> = ({ ticket, onClose, onReply }) => {
  const [replyContent, setReplyContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onReply(replyContent, isInternal);
      setReplyContent('');
      setIsInternal(false);
    } catch (error) {
      console.error('Failed to submit reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className={styles.responsesSection}>
        <div className={styles.responsesHeader}>
          <FiMessageSquare />
          Responses ({ticket.responses?.length || 0})
        </div>

        {ticket.responses && ticket.responses.length > 0 ? (
          ticket.responses.map((response: TicketResponse) => (
            <div
              key={response.responseId}
              className={clsx(
                styles.responseCard,
                response.isInternal && styles.responseCardInternal
              )}
            >
              <div className={styles.responseHeader}>
                <div className={styles.responseMeta}>
                  <div className={styles.responderInfo}>
                    {response.responderType === 'staff' ? 'Staff' : 'Customer'} Response
                    {response.isInternal && (
                      <span className={clsx(styles.internalBadge, styles.internalBadgeSpacing)}>
                        Internal
                      </span>
                    )}
                  </div>
                  <div className={styles.responseTime}>{formatRelativeTime(response.createdAt)}</div>
                </div>
              </div>
              <div className={styles.responseContent}>{response.content}</div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>No responses yet</div>
        )}
      </div>

      <form className={styles.replyForm} onSubmit={handleSubmitReply}>
        <div className={styles.detailLabel}>
          <FiSend />
          Add Response
        </div>
        <textarea
          className={styles.textArea}
          value={replyContent}
          onChange={e => setReplyContent(e.target.value)}
          placeholder='Type your response here...'
          disabled={isSubmitting}
          required
          aria-required={true}
          minLength={1}
          maxLength={10000}
        />
        <label className={styles.checkboxLabel}>
          <input
            type='checkbox'
            checked={isInternal}
            onChange={e => setIsInternal(e.target.checked)}
            disabled={isSubmitting}
          />
          Internal note (not visible to customer)
        </label>
        <div className={styles.buttonGroup}>
          <Button
            type='button'
            variant='outline'
            size='md'
            onClick={onClose}
            disabled={isSubmitting}
          >
            Close
          </Button>
          <Button
            type='submit'
            variant='primary'
            size='md'
            disabled={isSubmitting || !replyContent.trim()}
          >
            {isSubmitting ? 'Sending...' : 'Send Response'}
          </Button>
        </div>
      </form>
    </>
  );
};

// ── Activity tab ─────────────────────────────────────────────────

const ActivityTab: React.FC<{ ticketId: string }> = ({ ticketId }) => {
  const { data, isLoading, error } = useEntityActivity('support_ticket', ticketId);

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
    return <div className={styles.activityEmpty}>No activity recorded for this ticket.</div>;
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

// ── Modal shell ─────────────────────────────────────────────────

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  isOpen,
  onClose,
  ticket,
  onReply,
  siblingIds,
  onNavigate,
}) => {
  if (!ticket) {
    return null;
  }

  const statusColors = STATUS_COLOR_MAP[ticket.status] || STATUS_COLOR_MAP.open;
  const priorityColors = PRIORITY_COLOR_MAP[ticket.priority] || PRIORITY_COLOR_MAP.normal;

  const breadcrumbSegments: ReadonlyArray<BreadcrumbSegment> = [
    { label: 'Tickets', to: '/support' },
    { label: getStatusLabel(ticket.status), to: `/support?status=${ticket.status}` },
    { label: formatTicketId(ticket.ticketId) },
  ];

  const tabs: EntityInspectorTab[] = [
    {
      id: 'overview',
      label: 'Overview',
      content: <OverviewTab ticket={ticket} onClose={onClose} />,
    },
    {
      id: 'responses',
      label: `Responses (${ticket.responses?.length || 0})`,
      content: <ResponsesTab ticket={ticket} onClose={onClose} onReply={onReply} />,
    },
    {
      id: 'activity',
      label: 'Activity',
      content: <ActivityTab ticketId={ticket.ticketId} />,
    },
  ];

  const inspectorHeader = (
    <div className={styles.inspectorHeader}>
      <div>
        <div className={styles.ticketId}>{formatTicketId(ticket.ticketId)}</div>
        <h3 className={styles.ticketTitle}>{ticket.subject}</h3>
      </div>
      <div className={styles.badgeRow}>
        <span
          className={styles.badge}
          style={{ background: statusColors.bg, color: statusColors.color }}
        >
          <FiCheckCircle />
          {getStatusLabel(ticket.status)}
        </span>
        <span
          className={styles.badge}
          style={{ background: priorityColors.bg, color: priorityColors.color }}
        >
          <FiAlertCircle />
          {getPriorityLabel(ticket.priority)}
        </span>
        <span className={styles.badge}>
          <FiTag />
          {getCategoryLabel(ticket.category)}
        </span>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title='Support Ticket Details'
      size='xl'
      centered
      closeOnOverlayClick
      closeOnEscape
    >
      <div className={styles.detailSection}>
        <ModalBreadcrumbNav
          segments={breadcrumbSegments}
          siblingIds={siblingIds}
          currentId={ticket.ticketId}
          onNavigate={onNavigate}
        />

        <EntityInspector
          data-testid='ticket-detail-inspector'
          className={styles.inspectorEmbed}
          resetTabsOnKeyChange={ticket.ticketId}
          tabs={tabs}
          header={inspectorHeader}
        />
      </div>
    </Modal>
  );
};
