import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  Badge,
  Button,
  CheckboxInput,
  EntityInspector,
  FormField,
  Modal,
  Spinner,
  StatusBadge,
  TextArea,
  type EntityInspectorTab,
} from '@adopt-dont-shop/lib.components';
import type { StatusBadgeVariant } from '@adopt-dont-shop/lib.types';
import { formatDateTime } from '@adopt-dont-shop/lib.utils';
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
import { CircleCheck, Clock, MessageSquare, Send, User } from 'lucide-react';
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

const PRIORITY_VARIANTS: Readonly<Record<string, StatusBadgeVariant>> = {
  low: 'neutral',
  normal: 'info',
  high: 'warning',
  urgent: 'warning',
  critical: 'error',
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
            <User size='1em' />
            Customer
          </div>
          <div className={styles.detailValue}>{renderCustomer()}</div>
          <div className={clsx(styles.detailValue, styles.detailValueSecondary)}>
            {ticket.userEmail}
          </div>
        </div>

        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>
            <User size='1em' />
            Assigned To
          </div>
          <div className={styles.detailValue}>
            {ticket.assignedTo || <span className={styles.emptyValue}>Unassigned</span>}
          </div>
        </div>

        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>
            <Clock size='1em' />
            Created
          </div>
          <div className={styles.detailValue}>
            {formatDate(ticket.createdAt)}
            <div className={styles.detailValueMeta}>({formatRelativeTime(ticket.createdAt)})</div>
          </div>
        </div>

        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>
            <Clock size='1em' />
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
              <MessageSquare size='1em' />
              First Response
            </div>
            <div className={styles.detailValue}>{formatRelativeTime(ticket.firstResponseAt)}</div>
          </div>
        )}

        {ticket.resolvedAt && (
          <div className={styles.detailItem}>
            <div className={styles.detailLabel}>
              <CircleCheck size='1em' />
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

  // Reset the reply form whenever the user navigates to a different ticket so
  // draft text and the internal-reply toggle never leak across tickets (ADS-704).
  useEffect(() => {
    setReplyContent('');
    setIsInternal(false);
    setIsSubmitting(false);
  }, [ticket.ticketId]);

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
          <MessageSquare size='1em' />
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
                      <Badge variant='warning' className={styles.internalBadgeSpacing}>
                        Internal
                      </Badge>
                    )}
                  </div>
                  <div className={styles.responseTime}>
                    {formatRelativeTime(response.createdAt)}
                  </div>
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
          <Send size='1em' />
          Add Response
        </div>
        <FormField label='Response' htmlFor='ticket-reply'>
          <TextArea
            id='ticket-reply'
            value={replyContent}
            onChange={e => setReplyContent(e.target.value)}
            placeholder='Type your response here...'
            disabled={isSubmitting}
            required
            minLength={1}
            maxLength={10000}
            fullWidth
          />
        </FormField>
        <CheckboxInput
          id='ticket-reply-internal'
          label='Internal note (not visible to customer)'
          checked={isInternal}
          onChange={e => setIsInternal(e.target.checked)}
          disabled={isSubmitting}
        />
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
              {activity.activityType} &middot; {formatDateTime(activity.createdAt)}
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
        <StatusBadge
          kind='supportTicket'
          status={ticket.status}
          label={getStatusLabel(ticket.status)}
        />
        <StatusBadge
          variant={PRIORITY_VARIANTS[ticket.priority] ?? 'info'}
          label={getPriorityLabel(ticket.priority)}
        />
        <StatusBadge variant='neutral' label={getCategoryLabel(ticket.category)} />
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
