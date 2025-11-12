import React, { useState } from 'react';
import styled from 'styled-components';
import { ActionMenu } from '../ui/ActionMenu';
import type { ActionMenuItem } from '../ui/ActionMenu';
import type { AdminUser } from '@/types';
import {
  FiCheckCircle,
  FiXCircle,
  FiLock,
  FiUnlock,
  FiTrash2,
  FiMail,
  FiShield,
} from 'react-icons/fi';
import { Modal, Button } from '@adopt-dont-shop/components';

type UserActionsMenuProps = {
  user: AdminUser;
  onSuspend: (userId: string, reason?: string) => Promise<void>;
  onUnsuspend: (userId: string) => Promise<void>;
  onVerify: (userId: string) => Promise<void>;
  onDelete: (userId: string, reason?: string) => Promise<void>;
};

const ConfirmationContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ConfirmationMessage = styled.p`
  margin: 0;
  color: #374151;
  line-height: 1.5;
`;

const UserInfoBox = styled.div`
  padding: 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-weight: 500;
  color: #111827;
`;

const ReasonTextArea = styled.textarea`
  padding: 0.625rem 0.875rem;
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

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
`;

const WarningBox = styled.div`
  padding: 0.75rem 1rem;
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 8px;
  color: #92400e;
  font-size: 0.875rem;
  font-weight: 500;
`;

const DangerBox = styled.div`
  padding: 0.75rem 1rem;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  font-size: 0.875rem;
  font-weight: 500;
`;

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
      <ConfirmationContent>
        <ConfirmationMessage>{message}</ConfirmationMessage>

        <UserInfoBox>{userName}</UserInfoBox>

        {isDanger && (
          <DangerBox>
            <strong>Warning:</strong> This action cannot be undone.
          </DangerBox>
        )}

        {requiresReason && (
          <div>
            <label
              htmlFor='reason'
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#374151',
              }}
            >
              Reason {!isDanger && '(Optional)'}
            </label>
            <ReasonTextArea
              id='reason'
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder='Provide a reason for this action...'
              disabled={isSubmitting}
            />
          </div>
        )}

        <ButtonGroup>
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
        </ButtonGroup>
      </ConfirmationContent>
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
