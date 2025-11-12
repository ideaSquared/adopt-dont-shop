import React from 'react';
import styled from 'styled-components';
import { StaffMember } from '../../types/staff';
import StatusBadge from '../common/StatusBadge';

interface StaffCardProps {
  staffMember: StaffMember;
  onEdit?: (staffMember: StaffMember) => void;
  onRemove?: (staffMember: StaffMember) => void;
  canEdit?: boolean;
  canRemove?: boolean;
}

const CardContainer = styled.div`
  background: #f8fafc;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: #1976d2;
    box-shadow: 0 4px 16px rgba(25, 118, 210, 0.1);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const StaffAvatar = styled.div`
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.125rem;
  flex-shrink: 0;
`;

const StaffInfo = styled.div`
  flex: 1;
`;

const StaffName = styled.h3`
  margin: 0 0 0.25rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #333;
`;

const StaffTitle = styled.p`
  margin: 0 0 0.25rem 0;
  color: #666;
  font-weight: 500;
`;

const StaffEmail = styled.p`
  margin: 0;
  color: #888;
  font-size: 0.875rem;
`;

const StaffStatus = styled.div`
  flex-shrink: 0;
`;

const CardBody = styled.div`
  margin-bottom: 1rem;
`;

const StaffDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const DetailItem = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
`;

const DetailLabel = styled.span`
  color: #666;
  font-weight: 500;
`;

const DetailValue = styled.span`
  color: #333;
  font-family: monospace;
`;

const CardActions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
`;

const ActionButton = styled.button<{ variant: 'edit' | 'danger' }>`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  ${props =>
    props.variant === 'edit' &&
    `
    background: #f8f9fa;
    color: #495057;
    border: 1px solid #dee2e6;

    &:hover {
      background: #e9ecef;
      color: #212529;
    }
  `}

  ${props =>
    props.variant === 'danger' &&
    `
    background: #dc3545;
    color: white;

    &:hover {
      background: #c82333;
    }
  `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const StaffCard: React.FC<StaffCardProps> = ({
  staffMember,
  onEdit,
  onRemove,
  canEdit = false,
  canRemove = false,
}) => {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Unknown date';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <CardContainer>
      <CardHeader>
        <StaffAvatar>{getInitials(staffMember.firstName, staffMember.lastName)}</StaffAvatar>
        <StaffInfo>
          <StaffName>
            {staffMember.firstName} {staffMember.lastName}
          </StaffName>
          <StaffTitle>{staffMember.title}</StaffTitle>
          <StaffEmail>{staffMember.email}</StaffEmail>
        </StaffInfo>
        <StaffStatus>
          <StatusBadge status={staffMember.isVerified ? 'verified' : 'pending'} />
        </StaffStatus>
      </CardHeader>

      <CardBody>
        <StaffDetails>
          <DetailItem>
            <DetailLabel>Added:</DetailLabel>
            <DetailValue>{formatDate(staffMember.addedAt)}</DetailValue>
          </DetailItem>
          <DetailItem>
            <DetailLabel>User ID:</DetailLabel>
            <DetailValue>{staffMember.userId}</DetailValue>
          </DetailItem>
        </StaffDetails>
      </CardBody>

      {(canEdit || canRemove) && (
        <CardActions>
          {canEdit && (
            <ActionButton variant="edit" onClick={() => onEdit?.(staffMember)}>
              Edit
            </ActionButton>
          )}
          {canRemove && (
            <ActionButton variant="danger" onClick={() => onRemove?.(staffMember)}>
              Remove
            </ActionButton>
          )}
        </CardActions>
      )}
    </CardContainer>
  );
};

export default StaffCard;
