import React, { useState } from 'react';
import * as styles from './UserActionsMenu.css';
import { ActionMenu, type ActionMenuItem } from '../ui/ActionMenu';
import type { AdminUser } from '@/types';
import { FiCheckCircle, FiLock, FiUnlock, FiTrash2, FiShield } from 'react-icons/fi';
import { Modal, Button } from '@adopt-dont-shop/lib.components';

type UserActionsMenuProps = {
  user: AdminUser;
  onSuspend: (userId: string, reason?: string) => Promise<void>;
  onUnsuspend: (userId: string) => Promise<void>;
  onVerify: (userId: string) => Promise<void>;
  onDelete: (userId: string, reason?: string) => Promise<void>;
};

type ConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  title: string;
  message: string;
  userName: string;
  isDanger?: boolean;
  requiresReason?: boolean;
  confirmButtonText?: string;
};

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  userName,
  isDanger = false,
  requiresReason = false,
  confirmButtonText = 'Confirm',
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(requiresReason ? reason : undefined);
      setReason('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size='md'
      centered
      closeOnOverlayClick={!isSubmitting}
      closeOnEscape={!isSubmitting}
    >
      <div className={styles.confirmationContent}>
        <p className={styles.confirmationMessage}>{message}</p>

        <div className={styles.userInfoBox}>{userName}</div>

        {isDanger && (
          <div className={styles.dangerBox}>
            <strong>Warning:</strong> This action cannot be undone.
          </div>
        )}

        {requiresReason && (
          <div>
            <label htmlFor='reason' className={styles.reasonLabel}>
              Reason {!isDanger && '(Optional)'}
            </label>
            <textarea
              className={styles.reasonTextArea}
              id='reason'
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder='Provide a reason for this action...'
              disabled={isSubmitting}
            />
          </div>
        )}

        <div className={styles.buttonGroup}>
          <Button
            type='button'
            variant='outline'
            size='md'
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type='button'
            variant={isDanger ? 'danger' : 'primary'}
            size='md'
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : confirmButtonText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export const UserActionsMenu: React.FC<UserActionsMenuProps> = ({
  user,
  onSuspend,
  onUnsuspend,
  onVerify,
  onDelete,
}) => {
  const [confirmationModal, setConfirmationModal] = useState<{
    type: 'suspend' | 'unsuspend' | 'verify' | 'delete' | null;
  }>({ type: null });

  const handleSuspend = async (reason?: string) => {
    await onSuspend(user.userId, reason);
  };

  const handleUnsuspend = async () => {
    await onUnsuspend(user.userId);
  };

  const handleVerify = async () => {
    await onVerify(user.userId);
  };

  const handleDelete = async (reason?: string) => {
    await onDelete(user.userId, reason);
  };

  const menuItems: ActionMenuItem[] = [];

  // Verify email (if not verified)
  if (!(user.emailVerified ?? false)) {
    menuItems.push({
      id: 'verify',
      label: 'Verify Email',
      icon: <FiCheckCircle />,
      onClick: () => setConfirmationModal({ type: 'verify' }),
    });
  }

  // Suspend/Unsuspend
  if (user.status === 'suspended') {
    menuItems.push({
      id: 'unsuspend',
      label: 'Unsuspend User',
      icon: <FiUnlock />,
      onClick: () => setConfirmationModal({ type: 'unsuspend' }),
    });
  } else {
    menuItems.push({
      id: 'suspend',
      label: 'Suspend User',
      icon: <FiLock />,
      danger: true,
      onClick: () => setConfirmationModal({ type: 'suspend' }),
    });
  }

  // Divider
  menuItems.push({
    id: 'divider',
    label: '',
    onClick: () => {},
  });

  // Delete
  menuItems.push({
    id: 'delete',
    label: 'Delete User',
    icon: <FiTrash2 />,
    danger: true,
    onClick: () => setConfirmationModal({ type: 'delete' }),
  });

  return (
    <>
      <ActionMenu items={menuItems} trigger={<FiShield />} />

      <ConfirmationModal
        isOpen={confirmationModal.type === 'verify'}
        onClose={() => setConfirmationModal({ type: null })}
        onConfirm={handleVerify}
        title='Verify User Email'
        message="Are you sure you want to manually verify this user's email address?"
        userName={`${user.firstName} ${user.lastName} (${user.email})`}
        confirmButtonText='Verify Email'
      />

      <ConfirmationModal
        isOpen={confirmationModal.type === 'suspend'}
        onClose={() => setConfirmationModal({ type: null })}
        onConfirm={handleSuspend}
        title='Suspend User'
        message='Are you sure you want to suspend this user? They will not be able to access their account.'
        userName={`${user.firstName} ${user.lastName} (${user.email})`}
        isDanger
        requiresReason
        confirmButtonText='Suspend User'
      />

      <ConfirmationModal
        isOpen={confirmationModal.type === 'unsuspend'}
        onClose={() => setConfirmationModal({ type: null })}
        onConfirm={handleUnsuspend}
        title='Unsuspend User'
        message='Are you sure you want to unsuspend this user? They will regain access to their account.'
        userName={`${user.firstName} ${user.lastName} (${user.email})`}
        confirmButtonText='Unsuspend User'
      />

      <ConfirmationModal
        isOpen={confirmationModal.type === 'delete'}
        onClose={() => setConfirmationModal({ type: null })}
        onConfirm={handleDelete}
        title='Delete User'
        message='Are you sure you want to delete this user? This action cannot be undone and will permanently remove all user data.'
        userName={`${user.firstName} ${user.lastName} (${user.email})`}
        isDanger
        requiresReason
        confirmButtonText='Delete User'
      />
    </>
  );
};
