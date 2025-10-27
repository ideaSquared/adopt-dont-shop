import React, { useState } from 'react';
import styled from 'styled-components';
import { Button, Input, Heading, Text } from '@adopt-dont-shop/components';
import { FiX, FiCheckCircle, FiXCircle, FiAlertCircle } from 'react-icons/fi';
import type { AdminRescue, RescueVerificationPayload } from '@/types/rescue';
import { rescueService } from '@/services/rescueService';

type VerificationAction = 'approve' | 'reject';

type RescueVerificationModalProps = {
  rescue: AdminRescue;
  action: VerificationAction;
  onClose: () => void;
  onSuccess: () => void;
};

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 1rem;
`;

const ModalContainer = styled.div`
  background: #ffffff;
  border-radius: 16px;
  width: 100%;
  max-width: 550px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const ModalHeader = styled.div<{ $variant: 'approve' | 'reject' }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: ${props => props.$variant === 'approve' ? '#d1fae5' : '#fee2e2'};
  border-radius: 16px 16px 0 0;
`;

const IconWrapper = styled.div<{ $variant: 'approve' | 'reject' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #ffffff;
  color: ${props => props.$variant === 'approve' ? '#10b981' : '#ef4444'};

  svg {
    font-size: 1.5rem;
  }
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.25rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-family: inherit;
  color: #111827;
  resize: vertical;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const InfoBox = styled.div`
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.25rem;
`;

const InfoLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.375rem;
`;

const InfoValue = styled.div`
  font-size: 0.9375rem;
  color: #111827;
  font-weight: 500;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
`;

const ErrorMessage = styled.div`
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 0.875rem;
  color: #991b1b;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    flex-shrink: 0;
  }
`;

const RequiredIndicator = styled.span`
  color: #ef4444;
  margin-left: 0.25rem;
`;

export const RescueVerificationModal: React.FC<RescueVerificationModalProps> = ({
  rescue,
  action,
  onClose,
  onSuccess,
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isApproval = action === 'approve';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isApproval && !rejectionReason.trim()) {
      setError('Rejection reason is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: RescueVerificationPayload = {
        status: isApproval ? 'verified' : 'rejected',
        notes: notes.trim() || undefined,
      };

      if (!isApproval) {
        payload.rejectionReason = rejectionReason.trim();
      }

      if (isApproval) {
        await rescueService.verify(rescue.rescueId, payload);
      } else {
        await rescueService.reject(rescue.rescueId, payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} rescue`);
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  return (
    <Overlay onClick={handleOverlayClick}>
      <ModalContainer>
        <form onSubmit={handleSubmit}>
          <ModalHeader $variant={isApproval ? 'approve' : 'reject'}>
            <IconWrapper $variant={isApproval ? 'approve' : 'reject'}>
              {isApproval ? <FiCheckCircle /> : <FiXCircle />}
            </IconWrapper>
            <HeaderContent>
              <Heading level="h3" style={{ margin: 0 }}>
                {isApproval ? 'Approve Rescue' : 'Reject Rescue'}
              </Heading>
              <Text style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                {isApproval
                  ? 'Verify this rescue organization for the platform'
                  : 'Decline this rescue organization application'
                }
              </Text>
            </HeaderContent>
          </ModalHeader>

          <ModalBody>
            {error && (
              <ErrorMessage>
                <FiAlertCircle />
                {error}
              </ErrorMessage>
            )}

            <InfoBox>
              <InfoLabel>Rescue Organization</InfoLabel>
              <InfoValue>{rescue.name}</InfoValue>
            </InfoBox>

            <InfoBox>
              <InfoLabel>Email</InfoLabel>
              <InfoValue>{rescue.email}</InfoValue>
            </InfoBox>

            <InfoBox>
              <InfoLabel>Location</InfoLabel>
              <InfoValue>{rescue.city}, {rescue.state}</InfoValue>
            </InfoBox>

            {!isApproval && (
              <FormGroup>
                <Label>
                  Rejection Reason
                  <RequiredIndicator>*</RequiredIndicator>
                </Label>
                <TextArea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this rescue is being rejected..."
                  required={!isApproval}
                  disabled={loading}
                />
              </FormGroup>
            )}

            <FormGroup>
              <Label>
                Internal Notes
                {!isApproval && ' (Optional)'}
              </Label>
              <TextArea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any internal notes about this decision..."
                disabled={loading}
              />
            </FormGroup>
          </ModalBody>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={isApproval ? 'primary' : 'danger'}
              disabled={loading}
            >
              {loading ? 'Processing...' : isApproval ? 'Approve Rescue' : 'Reject Rescue'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContainer>
    </Overlay>
  );
};
