import React, { useState } from 'react';
import { Modal, Button } from '@adopt-dont-shop/lib.components';
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

type TicketDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  ticket: SupportTicket | null;
  onReply: (content: string, isInternal: boolean) => Promise<void>;
  onStatusChange?: (status: string) => Promise<void>;
  onPriorityChange?: (priority: string) => Promise<void>;
};

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  isOpen,
  onClose,
  ticket,
  onReply,
  onStatusChange,
  onPriorityChange,
}) => {
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
      // Clear form after successful submission
      setReplyContent('');
      setIsInternal(false);
    } catch (error) {
      console.error('Failed to submit reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!ticket) {
    return null;
  }

  const statusColorMap: Record<string, { bg: string; color: string }> = {
    open: { bg: '#dbeafe', color: '#1e40af' },
    in_progress: { bg: '#fef3c7', color: '#92400e' },
    waiting_for_user: { bg: '#e0e7ff', color: '#4338ca' },
    resolved: { bg: '#d1fae5', color: '#065f46' },
    closed: { bg: '#f3f4f6', color: '#374151' },
    escalated: { bg: '#fee2e2', color: '#991b1b' },
  };

  const priorityColorMap: Record<string, { bg: string; color: string }> = {
    low: { bg: '#f3f4f6', color: '#374151' },
    normal: { bg: '#dbeafe', color: '#1e40af' },
    high: { bg: '#fef3c7', color: '#92400e' },
    urgent: { bg: '#fed7aa', color: '#9a3412' },
    critical: { bg: '#fee2e2', color: '#991b1b' },
  };

  const statusColors = statusColorMap[ticket.status] || statusColorMap.open;
  const priorityColors = priorityColorMap[ticket.priority] || priorityColorMap.normal;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title='Support Ticket Details'
      size='xl'
      centered
      closeOnOverlayClick={!isSubmitting}
      closeOnEscape={!isSubmitting}
    >
      <div className={styles.detailSection}>
        <div className={styles.ticketHeader}>
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

        <div className={styles.detailGrid}>
          <div className={styles.detailItem}>
            <div className={styles.detailLabel}>
              <FiUser />
              Customer
            </div>
            <div className={styles.detailValue}>
              {ticket.userName || <span className={styles.emptyValue}>Not provided</span>}
            </div>
            <div className={styles.detailValue} style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
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
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                ({formatRelativeTime(ticket.createdAt)})
              </div>
            </div>
          </div>

          <div className={styles.detailItem}>
            <div className={styles.detailLabel}>
              <FiClock />
              Last Updated
            </div>
            <div className={styles.detailValue}>
              {formatDate(ticket.updatedAt)}
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                ({formatRelativeTime(ticket.updatedAt)})
              </div>
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
          <div
            className={styles.descriptionSection}
            style={{ background: '#fef3c7', borderColor: '#fbbf24' }}
          >
            <div className={styles.descriptionLabel} style={{ color: '#92400e' }}>
              Internal Notes
            </div>
            <div className={styles.descriptionText}>{ticket.internalNotes}</div>
          </div>
        )}

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
                        <span className={styles.internalBadge} style={{ marginLeft: '0.5rem' }}>
                          Internal
                        </span>
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
      </div>
    </Modal>
  );
};
