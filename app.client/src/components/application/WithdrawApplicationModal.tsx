import { Alert, Button, Modal, Spinner } from '@adopt-dont-shop/lib.components';
import React, { useState } from 'react';
import styled from 'styled-components';

interface WithdrawApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
  petName?: string;
  isLoading?: boolean;
}

const ModalContent = styled.div`
  padding: 1.5rem;
  max-width: 500px;
`;

const Title = styled.h2`
  color: ${props => props.theme.colors.neutral[900]};
  margin-bottom: 1rem;
  font-size: 1.5rem;
`;

const Description = styled.p`
  color: ${props => props.theme.colors.neutral[700]};
  margin-bottom: 1.5rem;
  line-height: 1.6;
`;

const ReasonSection = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  font-weight: 500;
  color: ${props => props.theme.colors.neutral[900]};
  margin-bottom: 0.5rem;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.neutral[300]};
  border-radius: 0.5rem;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const WarningText = styled.div`
  margin-bottom: 1.5rem;
`;

export const WithdrawApplicationModal: React.FC<WithdrawApplicationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  petName,
  isLoading = false,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    try {
      setError(null);
      await onConfirm(reason.trim() || undefined);
      // Reset form on success
      setReason('');
    } catch (err) {
      console.error('Failed to withdraw application:', err);
      setError('Failed to withdraw application. Please try again.');
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setReason('');
      setError(null);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title='Withdraw Application'>
      <ModalContent>
        <Title>Withdraw Application</Title>

        <Description>
          {petName
            ? `Are you sure you want to withdraw your application for ${petName}?`
            : 'Are you sure you want to withdraw your application?'}
        </Description>

        <WarningText>
          <Alert variant='warning' title='Important'>
            This action cannot be undone. Once withdrawn, you will need to submit a new application
            if you change your mind.
          </Alert>
        </WarningText>

        <ReasonSection>
          <Label htmlFor='withdrawal-reason'>Reason for withdrawal (optional)</Label>
          <TextArea
            id='withdrawal-reason'
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Please let us know why you're withdrawing your application. This helps us improve our process."
            disabled={isLoading}
            maxLength={500}
          />
          <div
            style={{
              fontSize: '0.8rem',
              color: '#666',
              textAlign: 'right',
              marginTop: '0.25rem',
            }}
          >
            {reason.length}/500
          </div>
        </ReasonSection>

        {error && (
          <div style={{ marginBottom: '1rem' }}>
            <Alert variant='error' title='Error'>
              {error}
            </Alert>
          </div>
        )}

        <ActionButtons>
          <Button variant='secondary' onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant='primary'
            onClick={handleConfirm}
            disabled={isLoading}
            style={{
              backgroundColor: '#dc2626',
              borderColor: '#dc2626',
              color: 'white',
            }}
          >
            {isLoading ? (
              <>
                <Spinner size='sm' style={{ marginRight: '0.5rem' }} />
                Withdrawing...
              </>
            ) : (
              'Withdraw Application'
            )}
          </Button>
        </ActionButtons>
      </ModalContent>
    </Modal>
  );
};
