import React from 'react';
import styled from 'styled-components';
import { PendingInvitation } from '@adopt-dont-shop/lib-invitations';

interface PendingInvitationsProps {
  invitations: PendingInvitation[];
  loading?: boolean;
  onCancel?: (invitationId: number) => void;
  canCancel?: boolean;
}

const Container = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const Header = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;

  h3 {
    margin: 0 0 0.5rem 0;
    color: #333;
    font-weight: 600;
    font-size: 1.1rem;
  }

  p {
    margin: 0;
    color: #666;
    font-size: 0.9rem;
  }
`;

const InvitationsList = styled.div`
  padding: 1rem;
`;

const InvitationCard = styled.div<{ isExpiring?: boolean }>`
  padding: 1.25rem;
  border: 2px solid ${props => (props.isExpiring ? '#ffc107' : '#e9ecef')};
  border-radius: 8px;
  margin-bottom: 1rem;
  background: ${props => (props.isExpiring ? '#fff3cd' : 'white')};
  transition: all 0.2s ease;

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
`;

const InvitationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
  gap: 1rem;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

const InvitationInfo = styled.div`
  flex: 1;
`;

const Email = styled.div`
  font-weight: 600;
  color: #333;
  font-size: 1rem;
  margin-bottom: 0.25rem;
  word-break: break-all;
`;

const Title = styled.div`
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
`;

const MetaInfo = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
`;

const MetaItem = styled.div`
  color: #666;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;

  strong {
    color: #333;
  }
`;

const StatusBadge = styled.span<{ status: 'active' | 'expiring' }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;

  ${props =>
    props.status === 'active' &&
    `
    background: #d1f4e0;
    color: #0a7b3e;
  `}

  ${props =>
    props.status === 'expiring' &&
    `
    background: #fff3cd;
    color: #856404;
  `}
`;

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;

  @media (max-width: 640px) {
    width: 100%;
    justify-content: flex-end;
  }
`;

const ActionButton = styled.button<{ variant?: 'danger' }>`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  ${props =>
    props.variant === 'danger'
      ? `
    background: #dc3545;
    color: white;

    &:hover:not(:disabled) {
      background: #c82333;
    }
  `
      : `
    background: #f8f9fa;
    color: #495057;
    border: 1px solid #dee2e6;

    &:hover:not(:disabled) {
      background: #e9ecef;
    }
  `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  padding: 3rem 2rem;
  text-align: center;
  color: #666;
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const EmptyText = styled.div`
  font-size: 1.1rem;
  color: #666;

  p {
    margin: 0.5rem 0;
  }
`;

const LoadingContainer = styled.div`
  padding: 3rem 2rem;
  text-align: center;
  color: #666;
`;

const LoadingSpinner = styled.div`
  width: 3rem;
  height: 3rem;
  border: 3px solid #e9ecef;
  border-top: 3px solid #1976d2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const PendingInvitations: React.FC<PendingInvitationsProps> = ({
  invitations,
  loading = false,
  onCancel,
  canCancel = false,
}) => {
  const getExpirationStatus = (
    expirationDate: string
  ): {
    isExpiring: boolean;
    daysRemaining: number;
  } => {
    const expiration = new Date(expirationDate);
    const now = new Date();
    const diffTime = expiration.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      isExpiring: daysRemaining <= 2 && daysRemaining > 0,
      daysRemaining: Math.max(0, daysRemaining),
    };
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <Container>
        <Header>
          <h3>Pending Invitations</h3>
          <p>Loading invitations...</p>
        </Header>
        <LoadingContainer>
          <LoadingSpinner />
          <p>Loading...</p>
        </LoadingContainer>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <h3>Pending Invitations</h3>
        <p>
          {invitations.length === 0
            ? 'No pending invitations'
            : `${invitations.length} pending invitation${invitations.length !== 1 ? 's' : ''}`}
        </p>
      </Header>

      {invitations.length === 0 ? (
        <EmptyState>
          <EmptyIcon>📧</EmptyIcon>
          <EmptyText>
            <p>
              <strong>No Pending Invitations</strong>
            </p>
            <p>Invite staff members to join your rescue team!</p>
          </EmptyText>
        </EmptyState>
      ) : (
        <InvitationsList>
          {invitations.map(invitation => {
            const { isExpiring, daysRemaining } = getExpirationStatus(invitation.expiration);

            return (
              <InvitationCard key={invitation.invitation_id} isExpiring={isExpiring}>
                <InvitationHeader>
                  <InvitationInfo>
                    <Email>{invitation.email}</Email>
                    {invitation.title && <Title>Title: {invitation.title}</Title>}

                    <MetaInfo>
                      <MetaItem>
                        <span>📅</span>
                        <span>Sent: {formatDate(invitation.created_at)}</span>
                      </MetaItem>
                      <MetaItem>
                        <span>⏰</span>
                        <span>
                          {daysRemaining === 0
                            ? 'Expires today'
                            : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`}
                        </span>
                      </MetaItem>
                      <MetaItem>
                        <StatusBadge status={isExpiring ? 'expiring' : 'active'}>
                          {isExpiring ? 'Expiring Soon' : 'Active'}
                        </StatusBadge>
                      </MetaItem>
                    </MetaInfo>
                  </InvitationInfo>

                  {canCancel && onCancel && (
                    <Actions>
                      <ActionButton
                        variant="danger"
                        onClick={() => onCancel(invitation.invitation_id)}
                        title="Cancel invitation"
                      >
                        Cancel
                      </ActionButton>
                    </Actions>
                  )}
                </InvitationHeader>
              </InvitationCard>
            );
          })}
        </InvitationsList>
      )}
    </Container>
  );
};

export default PendingInvitations;
