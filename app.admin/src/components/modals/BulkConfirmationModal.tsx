import React, { useState } from 'react';
import styled from 'styled-components';
import { Button } from '@adopt-dont-shop/lib.components';
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';

export type BulkConfirmationVariant = 'danger' | 'warning' | 'info';

type BulkConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void | Promise<void>;
  title: string;
  description: string;
  selectedCount: number;
  confirmLabel: string;
  variant?: BulkConfirmationVariant;
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  isLoading?: boolean;
  resultSummary?: { succeeded: number; failed: number } | null;
};

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  padding: 1rem;
`;

const Modal = styled.div`
  background: #ffffff;
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const ModalHeader = styled.div<{ $variant: BulkConfirmationVariant }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: ${({ $variant }) => {
    switch ($variant) {
      case 'danger':
        return '#fee2e2';
      case 'warning':
        return '#fef3c7';
      default:
        return '#dbeafe';
    }
  }};
  border-radius: 16px 16px 0 0;
`;

const IconWrap = styled.div<{ $variant: BulkConfirmationVariant }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #ffffff;
  flex-shrink: 0;
  color: ${({ $variant }) => {
    switch ($variant) {
      case 'danger':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      default:
        return '#3b82f6';
    }
  }};

  svg {
    font-size: 1.25rem;
  }
`;

const HeaderText = styled.div`
  flex: 1;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
`;

const CloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;

  &:hover {
    background: rgba(0, 0, 0, 0.1);
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const Description = styled.p`
  margin: 0 0 1rem 0;
  font-size: 0.9375rem;
  color: #374151;
  line-height: 1.5;
`;

const CountBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.5rem 0.875rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1.25rem;
`;

const FormGroup = styled.div`
  margin-top: 1.25rem;
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
  min-height: 80px;
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  font-family: inherit;
  color: #111827;
  resize: vertical;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const ResultBanner = styled.div<{ $hasFailures: boolean }>`
  background: ${({ $hasFailures }) => ($hasFailures ? '#fef3c7' : '#d1fae5')};
  border: 1px solid ${({ $hasFailures }) => ($hasFailures ? '#fcd34d' : '#6ee7b7')};
  border-radius: 8px;
  padding: 0.875rem 1rem;
  font-size: 0.875rem;
  color: ${({ $hasFailures }) => ($hasFailures ? '#92400e' : '#065f46')};
  margin-bottom: 1rem;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid #e5e7eb;
`;

const variantIcon: Record<BulkConfirmationVariant, React.ReactNode> = {
  danger: <FiAlertTriangle />,
  warning: <FiAlertTriangle />,
  info: <FiInfo />,
};

export const BulkConfirmationModal: React.FC<BulkConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  selectedCount,
  confirmLabel,
  variant = 'danger',
  requireReason = false,
  reasonLabel = 'Reason',
  reasonPlaceholder = 'Enter reason...',
  isLoading = false,
  resultSummary,
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) {
      return;
    }
    await onConfirm(reason.trim() || undefined);
    setReason('');
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const confirmButtonVariant = variant === 'danger' ? 'danger' : variant === 'warning' ? 'primary' : 'primary';

  return (
    <Overlay onClick={handleOverlayClick}>
      <Modal>
        <ModalHeader $variant={variant}>
          <IconWrap $variant={variant}>{variantIcon[variant]}</IconWrap>
          <HeaderText>
            <ModalTitle>{title}</ModalTitle>
          </HeaderText>
          <CloseBtn onClick={onClose} disabled={isLoading} aria-label='Close'>
            <FiX />
          </CloseBtn>
        </ModalHeader>

        <ModalBody>
          {resultSummary ? (
            <ResultBanner $hasFailures={resultSummary.failed > 0}>
              <FiCheckCircle style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
              {resultSummary.succeeded} succeeded
              {resultSummary.failed > 0 && `, ${resultSummary.failed} failed`}
            </ResultBanner>
          ) : (
            <>
              <Description>{description}</Description>
              <CountBadge>{selectedCount} item{selectedCount !== 1 ? 's' : ''} selected</CountBadge>

              {requireReason && (
                <FormGroup>
                  <Label>
                    {reasonLabel}
                    <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>
                  </Label>
                  <TextArea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder={reasonPlaceholder}
                    disabled={isLoading}
                  />
                </FormGroup>
              )}
            </>
          )}
        </ModalBody>

        <ModalFooter>
          {resultSummary ? (
            <Button variant='primary' onClick={onClose}>
              Done
            </Button>
          ) : (
            <>
              <Button variant='outline' onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                variant={confirmButtonVariant}
                onClick={handleConfirm}
                disabled={isLoading || (requireReason && !reason.trim())}
              >
                {isLoading ? 'Processing...' : confirmLabel}
              </Button>
            </>
          )}
        </ModalFooter>
      </Modal>
    </Overlay>
  );
};
