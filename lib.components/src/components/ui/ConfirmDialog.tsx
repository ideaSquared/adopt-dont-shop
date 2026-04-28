import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { messageText, buttonGroup } from './ConfirmDialog.css';

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
      size='sm'
      closeOnOverlayClick={false}
      showCloseButton={false}
      data-testid={dataTestId}
    >
      <p className={messageText}>{message}</p>
      <div className={buttonGroup}>
        <Button variant='secondary' onClick={onClose}>
          {cancelText}
        </Button>
        <Button variant={variantStyles.confirmVariant} onClick={handleConfirm}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};

ConfirmDialog.displayName = 'ConfirmDialog';
