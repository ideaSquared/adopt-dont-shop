import React, { useState, useEffect } from 'react';
import {
  Alert,
  Avatar,
  Button,
  EntityInspector,
  type EntityInspectorTab,
  FormField,
  Input,
  SelectInput,
  Spinner,
  StatusBadge,
} from '@adopt-dont-shop/lib.components';
import { formatDateTime, formatDisplayDate } from '@adopt-dont-shop/lib.utils';
import {
  Calendar,
  CircleCheck,
  Clock,
  Key,
  Mail,
  Pause,
  Phone,
  Play,
  Shield,
  Trash2,
  User,
} from 'lucide-react';
import type { AdminUser, UserType, UserStatus } from '@/types';
import { useEntityActivity } from '../../hooks';
import { ConfirmationModal } from '../modals/UserActionsMenu';
import * as styles from './UserDetailPanel.css';

type UserDetailPanelProps = {
  user: AdminUser;
  onClose: () => void;
  onSave: (userId: string, updates: Partial<AdminUser>) => Promise<void>;
  onSuspend: (userId: string, reason?: string) => Promise<void>;
  onUnsuspend: (userId: string) => Promise<void>;
  onVerify: (userId: string) => Promise<void>;
  onDelete: (userId: string, reason?: string) => Promise<void>;
  onResetPassword: (userId: string) => Promise<void>;
  onMessage: (user: AdminUser) => void;
};

const getUserInitials = (
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string => {
  const first = firstName?.charAt(0) ?? '';
  const last = lastName?.charAt(0) ?? '';
  return `${first}${last}`.toUpperCase() || '??';
};

const getUserTypeBadge = (userType: string): React.ReactElement => {
  switch (userType) {
    case 'admin':
    case 'super_admin':
      return <StatusBadge variant='error' label='Admin' />;
    case 'moderator':
      return <StatusBadge variant='warning' label='Moderator' />;
    case 'rescue_staff':
      return <StatusBadge variant='info' label='Rescue Staff' />;
    default:
      return <StatusBadge variant='neutral' label='Adopter' />;
  }
};

const getStatusBadge = (status: string, emailVerified: boolean): React.ReactElement => {
  if (status === 'suspended') {
    return <StatusBadge variant='error' label='Suspended' />;
  }
  if (status === 'pending' || !emailVerified) {
    return <StatusBadge variant='warning' label='Pending' />;
  }
  return <StatusBadge variant='success' label='Active' />;
};

const USER_TYPE_OPTIONS: ReadonlyArray<{ value: UserType; label: string }> = [
  { value: 'adopter', label: 'Adopter' },
  { value: 'rescue_staff', label: 'Rescue Staff' },
  { value: 'support_agent', label: 'Support Agent' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

const USER_STATUS_OPTIONS: ReadonlyArray<{ value: UserStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending_verification', label: 'Pending Verification' },
  { value: 'deactivated', label: 'Deactivated' },
];

const toUserType = (value: string | string[], fallback: UserType): UserType =>
  USER_TYPE_OPTIONS.find(option => option.value === value)?.value ?? fallback;

const toUserStatus = (value: string | string[], fallback: UserStatus): UserStatus =>
  USER_STATUS_OPTIONS.find(option => option.value === value)?.value ?? fallback;

// ── Overview Tab ──────────────────────────────────────────────────

const OverviewTab: React.FC<{ user: AdminUser }> = ({ user }) => (
  <div className={styles.detailGrid}>
    <DetailField icon={<Mail size='1em' />} label='Email' value={user.email} />
    <DetailField
      icon={<Phone size='1em' />}
      label='Phone'
      value={user.phoneNumber}
      emptyText='Not provided'
    />
    <DetailField
      icon={<User size='1em' />}
      label='User Type'
      value={user.userType.replace('_', ' ').toUpperCase()}
    />
    <DetailField icon={<Shield size='1em' />} label='Status' value={user.status.toUpperCase()} />
    <DetailField
      icon={<Shield size='1em' />}
      label='Email Verified'
      value={(user.emailVerified ?? false) ? 'Yes' : 'No'}
    />
    {(user.rescueName ?? '') !== '' && (
      <DetailField
        icon={<User size='1em' />}
        label='Rescue Organization'
        value={user.rescueName ?? ''}
      />
    )}
    <DetailField
      icon={<Calendar size='1em' />}
      label='Joined'
      value={formatDisplayDate(user.createdAt)}
    />
    <DetailField
      icon={<Clock size='1em' />}
      label='Last Login'
      value={user.lastLogin ? formatDisplayDate(user.lastLogin) : null}
      emptyText='Never'
    />
    {user.updatedAt && (
      <DetailField
        icon={<Clock size='1em' />}
        label='Last Updated'
        value={formatDisplayDate(user.updatedAt)}
      />
    )}
  </div>
);

const DetailField: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  emptyText?: string;
}> = ({ icon, label, value, emptyText = 'Not provided' }) => (
  <div className={styles.detailItem}>
    <div className={styles.detailLabel}>
      {icon}
      {label}
    </div>
    <div className={styles.detailValue}>
      {value ? value : <span className={styles.emptyValue}>{emptyText}</span>}
    </div>
  </div>
);

// ── Edit Tab ──────────────────────────────────────────────────────

const EditTab: React.FC<{
  user: AdminUser;
  onSave: (userId: string, updates: Partial<AdminUser>) => Promise<void>;
}> = ({ user, onSave }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    userType: 'adopter' as UserType,
    status: 'active' as UserStatus,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFormData({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email,
      phoneNumber: user.phoneNumber ?? '',
      userType: user.userType,
      status: user.status,
    });
    setError(null);
    setSaved(false);
  }, [
    user.userId,
    user.firstName,
    user.lastName,
    user.email,
    user.phoneNumber,
    user.userType,
    user.status,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSaved(false);

    try {
      const updates: Partial<AdminUser> = {};
      if (formData.firstName !== (user.firstName ?? '')) {
        updates.firstName = formData.firstName;
      }
      if (formData.lastName !== (user.lastName ?? '')) {
        updates.lastName = formData.lastName;
      }
      if (formData.email !== user.email) {
        updates.email = formData.email;
      }
      if (formData.phoneNumber !== (user.phoneNumber ?? '')) {
        updates.phoneNumber = formData.phoneNumber;
      }
      if (formData.userType !== user.userType) {
        updates.userType = formData.userType;
      }
      if (formData.status !== user.status) {
        updates.status = formData.status;
      }

      if (Object.keys(updates).length === 0) {
        setSaved(true);
        return;
      }

      await onSave(user.userId, updates);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <Alert variant='error'>{error}</Alert>}

      <div className={styles.formRow}>
        <FormField label='First Name' htmlFor='edit-first-name' required>
          <Input
            id='edit-first-name'
            type='text'
            value={formData.firstName}
            onChange={e => setFormData({ ...formData, firstName: e.target.value })}
            required
          />
        </FormField>
        <FormField label='Last Name' htmlFor='edit-last-name' required>
          <Input
            id='edit-last-name'
            type='text'
            value={formData.lastName}
            onChange={e => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </FormField>
      </div>

      <FormField label='Email' htmlFor='edit-email' required>
        <Input
          id='edit-email'
          type='email'
          value={formData.email}
          onChange={e => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </FormField>

      <FormField label='Phone Number' htmlFor='edit-phone'>
        <Input
          id='edit-phone'
          type='tel'
          value={formData.phoneNumber}
          onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
        />
      </FormField>

      <div className={styles.formRow}>
        <SelectInput
          label='Role'
          data-testid='edit-role'
          value={formData.userType}
          onChange={value =>
            setFormData({ ...formData, userType: toUserType(value, formData.userType) })
          }
          options={[...USER_TYPE_OPTIONS]}
          fullWidth
        />
        <SelectInput
          label='Status'
          data-testid='edit-status'
          value={formData.status}
          onChange={value =>
            setFormData({ ...formData, status: toUserStatus(value, formData.status) })
          }
          options={[...USER_STATUS_OPTIONS]}
          fullWidth
        />
      </div>

      <div className={styles.formActions}>
        {saved && <StatusBadge variant='success' label='Saved' />}
        <Button type='submit' variant='primary' size='sm' disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
};

// ── Actions Tab ──────────────────────────────────────────────────

const ActionsTab: React.FC<{
  user: AdminUser;
  onSuspend: (userId: string, reason?: string) => Promise<void>;
  onUnsuspend: (userId: string) => Promise<void>;
  onVerify: (userId: string) => Promise<void>;
  onDelete: (userId: string, reason?: string) => Promise<void>;
  onResetPassword: (userId: string) => Promise<void>;
  onMessage: (user: AdminUser) => void;
}> = ({ user, onSuspend, onUnsuspend, onVerify, onDelete, onResetPassword, onMessage }) => {
  const [confirmType, setConfirmType] = useState<'suspend' | 'delete' | null>(null);
  const userName = `${user.firstName ?? ''} ${user.lastName ?? ''} (${user.email})`.trim();

  return (
    <div className={styles.actionsSection}>
      <div className={styles.actionGroup}>
        <span className={styles.actionGroupLabel}>Communication</span>
        <Button
          variant='outline'
          size='sm'
          startIcon={<Mail size='1em' />}
          onClick={() => onMessage(user)}
        >
          Send Message
        </Button>
      </div>

      <div className={styles.actionGroup}>
        <span className={styles.actionGroupLabel}>Account</span>
        {user.status === 'suspended' ? (
          <Button
            variant='outline'
            size='sm'
            startIcon={<Play size='1em' />}
            onClick={() => onUnsuspend(user.userId)}
          >
            Unsuspend User
          </Button>
        ) : (
          <Button
            variant='outline'
            size='sm'
            startIcon={<Pause size='1em' />}
            onClick={() => setConfirmType('suspend')}
          >
            Suspend User
          </Button>
        )}
        {!user.emailVerified && (
          <Button
            variant='outline'
            size='sm'
            startIcon={<CircleCheck size='1em' />}
            onClick={() => onVerify(user.userId)}
          >
            Verify Email
          </Button>
        )}
        <Button
          variant='outline'
          size='sm'
          startIcon={<Key size='1em' />}
          onClick={() => onResetPassword(user.userId)}
        >
          Reset Password
        </Button>
      </div>

      <div className={styles.actionGroup}>
        <span className={styles.actionGroupLabel}>Danger Zone</span>
        <Button
          variant='danger'
          size='sm'
          startIcon={<Trash2 size='1em' />}
          onClick={() => setConfirmType('delete')}
        >
          Delete User
        </Button>
      </div>

      <ConfirmationModal
        isOpen={confirmType === 'suspend'}
        onClose={() => setConfirmType(null)}
        onConfirm={reason => onSuspend(user.userId, reason)}
        title='Suspend User'
        message='Are you sure you want to suspend this user? They will not be able to access their account.'
        userName={userName}
        isDanger
        requiresReason
        confirmButtonText='Suspend User'
      />

      <ConfirmationModal
        isOpen={confirmType === 'delete'}
        onClose={() => setConfirmType(null)}
        onConfirm={reason => onDelete(user.userId, reason)}
        title='Delete User'
        message='Are you sure you want to delete this user? This action cannot be undone and will permanently remove all user data.'
        userName={userName}
        isDanger
        requiresReason
        confirmButtonText='Delete User'
      />
    </div>
  );
};

// ── Activity Tab ──────────────────────────────────────────────────

const ActivityTab: React.FC<{ userId: string }> = ({ userId }) => {
  const { data, isLoading, error } = useEntityActivity('user', userId);

  if (isLoading) {
    return (
      <div className={styles.activityEmpty}>
        <Spinner size='sm' label='Loading activity' />
      </div>
    );
  }

  if (error) {
    return <div className={styles.activityEmpty}>Failed to load activity history.</div>;
  }

  const activities = data ?? [];

  if (activities.length === 0) {
    return <div className={styles.activityEmpty}>No activity recorded for this user.</div>;
  }

  return (
    <div className={styles.activityList}>
      {activities.map(activity => (
        <div key={activity.activityId} className={styles.activityItem}>
          <div className={styles.activityDot} />
          <div className={styles.activityContent}>
            <p className={styles.activityDescription}>{activity.description}</p>
            <p className={styles.activityMeta}>
              {activity.activityType} &middot; {formatDateTime(activity.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Main Panel ──────────────────────────────────────────────────

export const UserDetailPanel: React.FC<UserDetailPanelProps> = ({
  user,
  onClose,
  onSave,
  onSuspend,
  onUnsuspend,
  onVerify,
  onDelete,
  onResetPassword,
  onMessage,
}) => {
  const tabs: EntityInspectorTab[] = [
    { id: 'overview', label: 'Overview', content: <OverviewTab user={user} /> },
    { id: 'edit', label: 'Edit', content: <EditTab user={user} onSave={onSave} /> },
    {
      id: 'actions',
      label: 'Actions',
      content: (
        <ActionsTab
          user={user}
          onSuspend={onSuspend}
          onUnsuspend={onUnsuspend}
          onVerify={onVerify}
          onDelete={onDelete}
          onResetPassword={onResetPassword}
          onMessage={onMessage}
        />
      ),
    },
    { id: 'activity', label: 'Activity', content: <ActivityTab userId={user.userId} /> },
  ];

  return (
    <EntityInspector
      data-testid='user-detail-panel'
      resetTabsOnKeyChange={user.userId}
      onClose={onClose}
      closeLabel='Close detail panel'
      tabs={tabs}
      header={
        <>
          <Avatar initials={getUserInitials(user.firstName, user.lastName)} size='lg' />
          <div className={styles.headerInfo}>
            <h3 className={styles.headerName}>
              {user.firstName} {user.lastName}
            </h3>
            <p className={styles.headerEmail}>{user.email}</p>
          </div>
          <div className={styles.headerBadges}>
            {getUserTypeBadge(user.userType)}
            {getStatusBadge(user.status, user.emailVerified ?? false)}
          </div>
        </>
      }
    />
  );
};
