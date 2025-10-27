import React from 'react';
import styled from 'styled-components';
import { Modal } from '@adopt-dont-shop/components';
import type { AdminUser } from '../../services/libraryServices';
import { FiMail, FiPhone, FiCalendar, FiClock, FiUser, FiShield } from 'react-icons/fi';

type UserDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
};

const DetailSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const UserHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
`;

const UserAvatar = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 600;
  font-size: 1.5rem;
`;

const UserInfo = styled.div`
  flex: 1;
`;

const UserName = styled.h3`
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
`;

const UserEmail = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
`;

const Badge = styled.span<{ $variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    switch (props.$variant) {
      case 'success': return '#d1fae5';
      case 'warning': return '#fef3c7';
      case 'danger': return '#fee2e2';
      case 'info': return '#dbeafe';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.$variant) {
      case 'success': return '#065f46';
      case 'warning': return '#92400e';
      case 'danger': return '#991b1b';
      case 'info': return '#1e40af';
      default: return '#374151';
    }
  }};
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

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  if (!user) return null;

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getUserTypeBadge = (userType: string) => {
    switch (userType) {
      case 'admin':
      case 'super_admin':
        return <Badge $variant="danger">Admin</Badge>;
      case 'moderator':
        return <Badge $variant="warning">Moderator</Badge>;
      case 'rescue_staff':
        return <Badge $variant="info">Rescue Staff</Badge>;
      case 'adopter':
        return <Badge $variant="neutral">Adopter</Badge>;
      default:
        return <Badge $variant="neutral">{userType}</Badge>;
    }
  };

  const getStatusBadge = (status: string, emailVerified: boolean) => {
    if (status === 'suspended') {
      return <Badge $variant="danger">Suspended</Badge>;
    }
    if (status === 'pending' || !emailVerified) {
      return <Badge $variant="warning">Pending</Badge>;
    }
    return <Badge $variant="success">Active</Badge>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Details"
      size="lg"
      centered
    >
      <DetailSection>
        <UserHeader>
          <UserAvatar>{getUserInitials(user.firstName, user.lastName)}</UserAvatar>
          <UserInfo>
            <UserName>{user.firstName} {user.lastName}</UserName>
            <UserEmail>{user.email}</UserEmail>
          </UserInfo>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
            {getUserTypeBadge(user.userType)}
            {getStatusBadge(user.status, user.emailVerified)}
          </div>
        </UserHeader>

        <DetailGrid>
          <DetailItem>
            <DetailLabel>
              <FiMail />
              Email
            </DetailLabel>
            <DetailValue>{user.email}</DetailValue>
          </DetailItem>

          <DetailItem>
            <DetailLabel>
              <FiPhone />
              Phone Number
            </DetailLabel>
            <DetailValue>
              {user.phoneNumber || <EmptyValue>Not provided</EmptyValue>}
            </DetailValue>
          </DetailItem>

          <DetailItem>
            <DetailLabel>
              <FiUser />
              User Type
            </DetailLabel>
            <DetailValue>{user.userType.replace('_', ' ').toUpperCase()}</DetailValue>
          </DetailItem>

          <DetailItem>
            <DetailLabel>
              <FiShield />
              Status
            </DetailLabel>
            <DetailValue>{user.status.toUpperCase()}</DetailValue>
          </DetailItem>

          <DetailItem>
            <DetailLabel>
              <FiShield />
              Email Verified
            </DetailLabel>
            <DetailValue>{user.emailVerified ? 'Yes' : 'No'}</DetailValue>
          </DetailItem>

          {user.rescueName && (
            <DetailItem>
              <DetailLabel>
                <FiUser />
                Rescue Organization
              </DetailLabel>
              <DetailValue>{user.rescueName}</DetailValue>
            </DetailItem>
          )}

          <DetailItem>
            <DetailLabel>
              <FiCalendar />
              Joined
            </DetailLabel>
            <DetailValue>{formatDate(user.createdAt)}</DetailValue>
          </DetailItem>

          <DetailItem>
            <DetailLabel>
              <FiClock />
              Last Login
            </DetailLabel>
            <DetailValue>
              {user.lastLogin ? formatDate(user.lastLogin) : <EmptyValue>Never</EmptyValue>}
            </DetailValue>
          </DetailItem>

          {user.updatedAt && (
            <DetailItem>
              <DetailLabel>
                <FiClock />
                Last Updated
              </DetailLabel>
              <DetailValue>{formatDate(user.updatedAt)}</DetailValue>
            </DetailItem>
          )}
        </DetailGrid>
      </DetailSection>
    </Modal>
  );
};
