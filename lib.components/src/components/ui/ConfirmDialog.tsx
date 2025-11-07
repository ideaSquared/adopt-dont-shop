import React from 'react';
import styled from 'styled-components';
import { Modal } from './Modal';
import { Button } from './Button';

export type ConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  'data-testid'?: string;
};

const MessageText = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.base};
  color: ${({ theme }) => theme.text.secondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  justify-content: flex-end;
  margin-top: ${({ theme }) => theme.spacing[6]};
`;

const getVariantStyles = (variant: 'danger' | 'warning' | 'info') => {
  const variants = {
    danger: {
      title: 'Confirm Action',
      confirmVariant: 'danger' as const,
    },
    warning: {
      title: 'Warning',
      confirmVariant: 'warning' as const,
    },
    info: {
      title: 'Confirm',
      confirmVariant: 'primary' as const,
    },
  };
  return variants[variant];
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  'data-testid': dataTestId,
}) => {
  const variantStyles = getVariantStyles(variant);

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || variantStyles.title}
      size="sm"
      closeOnOverlayClick={false}
      showCloseButton={false}
      data-testid={dataTestId}
    >
      <MessageText>{message}</MessageText>
      <ButtonGroup>
        <Button variant="secondary" onClick={onClose}>
          {cancelText}
        </Button>
        <Button variant={variantStyles.confirmVariant} onClick={handleConfirm}>
          {confirmText}
        </Button>
      </ButtonGroup>
    </Modal>
  );
};

ConfirmDialog.displayName = 'ConfirmDialog';
