import React, { useState } from 'react';
import styled from 'styled-components';
import { Modal, Button } from '@adopt-dont-shop/lib.components';
import {
  type SupportTicket,
  type TicketResponse,
  getStatusLabel,
  getPriorityLabel,
  getCategoryLabel,
  getStatusColor,
  getPriorityColor,
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

type TicketDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  ticket: SupportTicket | null;
  onReply: (content: string, isInternal: boolean) => Promise<void>;
  onStatusChange?: (status: string) => Promise<void>;
  onPriorityChange?: (priority: string) => Promise<void>;
};

const DetailSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-height: 70vh;
  overflow-y: auto;
`;

const TicketHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
`;

const TicketTitle = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
`;

const TicketId = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  font-family: 'Courier New', monospace;
`;

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
`;

const Badge = styled.span<{ $color?: string; $bgColor?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => props.$bgColor || '#f3f4f6'};
  color: ${props => props.$color || '#374151'};
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const DetailLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;

  svg {
    font-size: 0.875rem;
  }
`;

const DetailValue = styled.div`
  font-size: 0.875rem;
  color: #111827;
  font-weight: 500;
`;

const EmptyValue = styled.span`
  color: #9ca3af;
  font-style: italic;
`;

const DescriptionSection = styled.div`
  padding: 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
`;

const DescriptionLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
  margin-bottom: 0.75rem;
`;

const DescriptionText = styled.div`
  font-size: 0.875rem;
  color: #111827;
  line-height: 1.6;
  white-space: pre-wrap;
`;

const ResponsesSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ResponsesHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;

  svg {
    color: #6b7280;
  }
`;

const ResponseCard = styled.div<{ $isInternal?: boolean }>`
  padding: 1rem;
  background: ${props => (props.$isInternal ? '#fef3c7' : '#ffffff')};
  border: 1px solid ${props => (props.$isInternal ? '#fbbf24' : '#e5e7eb')};
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ResponseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ResponseMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ResponderInfo = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
`;

const ResponseTime = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
`;

const ResponseContent = styled.div`
  font-size: 0.875rem;
  color: #374151;
  line-height: 1.6;
  white-space: pre-wrap;
`;

const ReplyForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
`;

const TextArea = styled.textarea`
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #111827;
  background: #ffffff;
  font-family: inherit;
  resize: vertical;
  min-height: 100px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #9ca3af;
  }

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;

  input {
    cursor: pointer;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`;

const EmptyState = styled.div`
  padding: 2rem;
  text-align: center;
  color: #9ca3af;
  font-style: italic;
`;

const InternalBadge = styled(Badge)`
  font-size: 0.625rem;
`;

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
    if (!replyContent.trim()) return;

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

  if (!ticket) return null;

  // Use responses length as key to force re-render when responses change
  const responsesKey = ticket.responses?.length || 0;

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
      <DetailSection>
        <TicketHeader>
          <div>
            <TicketId>{formatTicketId(ticket.ticketId)}</TicketId>
            <TicketTitle>{ticket.subject}</TicketTitle>
          </div>
          <BadgeRow>
            <Badge $bgColor={statusColors.bg} $color={statusColors.color}>
              <FiCheckCircle />
              {getStatusLabel(ticket.status)}
            </Badge>
            <Badge $bgColor={priorityColors.bg} $color={priorityColors.color}>
              <FiAlertCircle />
              {getPriorityLabel(ticket.priority)}
            </Badge>
            <Badge>
              <FiTag />
              {getCategoryLabel(ticket.category)}
            </Badge>
          </BadgeRow>
        </TicketHeader>

        <DetailGrid>
          <DetailItem>
            <DetailLabel>
              <FiUser />
              Customer
            </DetailLabel>
            <DetailValue>{ticket.userName || <EmptyValue>Not provided</EmptyValue>}</DetailValue>
            <DetailValue style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
              {ticket.userEmail}
            </DetailValue>
          </DetailItem>

          <DetailItem>
            <DetailLabel>
              <FiUser />
              Assigned To
            </DetailLabel>
            <DetailValue>{ticket.assignedTo || <EmptyValue>Unassigned</EmptyValue>}</DetailValue>
          </DetailItem>

          <DetailItem>
            <DetailLabel>
              <FiClock />
              Created
            </DetailLabel>
            <DetailValue>
              {formatDate(ticket.createdAt)}
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                ({formatRelativeTime(ticket.createdAt)})
              </div>
            </DetailValue>
          </DetailItem>

          <DetailItem>
            <DetailLabel>
              <FiClock />
              Last Updated
            </DetailLabel>
            <DetailValue>
              {formatDate(ticket.updatedAt)}
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                ({formatRelativeTime(ticket.updatedAt)})
              </div>
            </DetailValue>
          </DetailItem>

          {ticket.firstResponseAt && (
            <DetailItem>
              <DetailLabel>
                <FiMessageSquare />
                First Response
              </DetailLabel>
              <DetailValue>{formatRelativeTime(ticket.firstResponseAt)}</DetailValue>
            </DetailItem>
          )}

          {ticket.resolvedAt && (
            <DetailItem>
              <DetailLabel>
                <FiCheckCircle />
                Resolved
              </DetailLabel>
              <DetailValue>{formatRelativeTime(ticket.resolvedAt)}</DetailValue>
            </DetailItem>
          )}
        </DetailGrid>

        <DescriptionSection>
          <DescriptionLabel>Description</DescriptionLabel>
          <DescriptionText>{ticket.description}</DescriptionText>
        </DescriptionSection>

        {ticket.internalNotes && (
          <DescriptionSection style={{ background: '#fef3c7', borderColor: '#fbbf24' }}>
            <DescriptionLabel style={{ color: '#92400e' }}>Internal Notes</DescriptionLabel>
            <DescriptionText>{ticket.internalNotes}</DescriptionText>
          </DescriptionSection>
        )}

        <ResponsesSection>
          <ResponsesHeader>
            <FiMessageSquare />
            Responses ({ticket.responses?.length || 0})
          </ResponsesHeader>

          {ticket.responses && ticket.responses.length > 0 ? (
            ticket.responses.map((response: TicketResponse) => (
              <ResponseCard key={response.responseId} $isInternal={response.isInternal}>
                <ResponseHeader>
                  <ResponseMeta>
                    <ResponderInfo>
                      {response.responderType === 'staff' ? 'Staff' : 'Customer'} Response
                      {response.isInternal && (
                        <InternalBadge
                          $bgColor='#92400e'
                          $color='#ffffff'
                          style={{ marginLeft: '0.5rem' }}
                        >
                          Internal
                        </InternalBadge>
                      )}
                    </ResponderInfo>
                    <ResponseTime>{formatRelativeTime(response.createdAt)}</ResponseTime>
                  </ResponseMeta>
                </ResponseHeader>
                <ResponseContent>{response.content}</ResponseContent>
              </ResponseCard>
            ))
          ) : (
            <EmptyState>No responses yet</EmptyState>
          )}
        </ResponsesSection>

        <ReplyForm onSubmit={handleSubmitReply}>
          <DetailLabel>
            <FiSend />
            Add Response
          </DetailLabel>
          <TextArea
            value={replyContent}
            onChange={e => setReplyContent(e.target.value)}
            placeholder='Type your response here...'
            disabled={isSubmitting}
            required
            minLength={1}
            maxLength={10000}
          />
          <CheckboxLabel>
            <input
              type='checkbox'
              checked={isInternal}
              onChange={e => setIsInternal(e.target.checked)}
              disabled={isSubmitting}
            />
            Internal note (not visible to customer)
          </CheckboxLabel>
          <ButtonGroup>
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
          </ButtonGroup>
        </ReplyForm>
      </DetailSection>
    </Modal>
  );
};
