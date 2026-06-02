import React, { useState, useEffect } from 'react';
import {
  Button,
  EntityInspector,
  type EntityInspectorTab,
  Input,
  Spinner,
} from '@adopt-dont-shop/lib.components';
import { formatDisplayDate } from '@adopt-dont-shop/lib.utils';
import {
  FiMail,
  FiPhone,
  FiCalendar,
  FiClock,
  FiUser,
  FiShield,
  FiPause,
  FiPlay,
  FiCheckCircle,
  FiTrash2,
  FiKey,
} from 'react-icons/fi';
import clsx from 'clsx';
import type { AdminUser, UserType, UserStatus } from '@/types';
import { useEntityActivity } from '../../hooks';
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
      return <span className={styles.badgeDanger}>Admin</span>;
    case 'moderator':
      return <span className={styles.badgeWarning}>Moderator</span>;
    case 'rescue_staff':
      return <span className={styles.badgeInfo}>Rescue Staff</span>;
    default:
      return <span className={styles.badgeNeutral}>Adopter</span>;
  }
};

const getStatusBadge = (status: string, emailVerified: boolean): React.ReactElement => {
  if (status === 'suspended') {
    return <span className={styles.badgeDanger}>Suspended</span>;
  }
  if (status === 'pending' || !emailVerified) {
    return <span className={styles.badgeWarning}>Pending</span>;
  }
  return <span className={styles.badgeSuccess}>Active</span>;
};

// ── Overview Tab ──────────────────────────────────────────────────

const OverviewTab: React.FC<{ user: AdminUser }> = ({ user }) => (
  <div className={styles.detailGrid}>
    <DetailField icon={<FiMail />} label='Email' value={user.email} />
    <DetailField
      icon={<FiPhone />}
      label='Phone'
      value={user.phoneNumber}
      emptyText='Not provided'
    />
    <DetailField
      icon={<FiUser />}
      label='User Type'
      value={user.userType.replace('_', ' ').toUpperCase()}
    />
    <DetailField icon={<FiShield />} label='Status' value={user.status.toUpperCase()} />
    <DetailField
      icon={<FiShield />}
      label='Email Verified'
      value={(user.emailVerified ?? false) ? 'Yes' : 'No'}
    />
    {(user.rescueName ?? '') !== '' && (
      <DetailField icon={<FiUser />} label='Rescue Organization' value={user.rescueName ?? ''} />
    )}
    <DetailField icon={<FiCalendar />} label='Joined' value={formatDisplayDate(user.createdAt)} />
    <DetailField
      icon={<FiClock />}
      label='Last Login'
      value={user.lastLogin ? formatDisplayDate(user.lastLogin) : null}
      emptyText='Never'
    />
    {user.updatedAt && (
      <DetailField
        icon={<FiClock />}
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
      {error && <div className={styles.formError}>{error}</div>}

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor='edit-first-name'>
            First Name
          </label>
          <Input
            id='edit-first-name'
            type='text'
            value={formData.firstName}
            onChange={e => setFormData({ ...formData, firstName: e.target.value })}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor='edit-last-name'>
            Last Name
          </label>
          <Input
            id='edit-last-name'
            type='text'
            value={formData.lastName}
            onChange={e => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor='edit-email'>
          Email
        </label>
        <Input
          id='edit-email'
          type='email'
          value={formData.email}
          onChange={e => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor='edit-phone'>
          Phone Number
        </label>
        <Input
          id='edit-phone'
          type='tel'
          value={formData.phoneNumber}
          onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
        />
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor='edit-role'>
            Role
          </label>
          <select
            className={styles.formSelect}
            id='edit-role'
            value={formData.userType}
            onChange={e => setFormData({ ...formData, userType: e.target.value as UserType })}
          >
            <option value='adopter'>Adopter</option>
            <option value='rescue_staff'>Rescue Staff</option>
            <option value='support_agent'>Support Agent</option>
            <option value='moderator'>Moderator</option>
            <option value='admin'>Admin</option>
            <option value='super_admin'>Super Admin</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor='edit-status'>
            Status
          </label>
          <select
            className={styles.formSelect}
            id='edit-status'
            value={formData.status}
            onChange={e => setFormData({ ...formData, status: e.target.value as UserStatus })}
          >
            <option value='active'>Active</option>
            <option value='inactive'>Inactive</option>
            <option value='suspended'>Suspended</option>
            <option value='pending_verification'>Pending Verification</option>
            <option value='deactivated'>Deactivated</option>
          </select>
        </div>
      </div>

      <div className={styles.formActions}>
        {saved && <span className={styles.badgeSuccess}>Saved</span>}
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
}> = ({ user, onSuspend, onUnsuspend, onVerify, onDelete, onResetPassword, onMessage }) => (
  <div className={styles.actionsSection}>
    <div className={styles.actionGroup}>
      <span className={styles.actionGroupLabel}>Communication</span>
      <button type='button' className={styles.actionButton} onClick={() => onMessage(user)}>
        <FiMail /> Send Message
      </button>
    </div>

    <div className={styles.actionGroup}>
      <span className={styles.actionGroupLabel}>Account</span>
      {user.status === 'suspended' ? (
        <button
          type='button'
          className={styles.actionButton}
          onClick={() => onUnsuspend(user.userId)}
        >
          <FiPlay /> Unsuspend User
        </button>
      ) : (
        <button
          type='button'
          className={styles.actionButton}
          onClick={() => onSuspend(user.userId)}
        >
          <FiPause /> Suspend User
        </button>
      )}
      {!user.emailVerified && (
        <button type='button' className={styles.actionButton} onClick={() => onVerify(user.userId)}>
          <FiCheckCircle /> Verify Email
        </button>
      )}
      <button
        type='button'
        className={styles.actionButton}
        onClick={() => onResetPassword(user.userId)}
      >
        <FiKey /> Reset Password
      </button>
    </div>

    <div className={styles.actionGroup}>
      <span className={styles.actionGroupLabel}>Danger Zone</span>
      <button
        type='button'
        className={clsx(styles.actionButton, styles.actionButtonDanger)}
        onClick={() => onDelete(user.userId)}
      >
        <FiTrash2 /> Delete User
      </button>
    </div>
  </div>
);

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
              {activity.activityType} &middot;{' '}
              {new Date(activity.createdAt).toLocaleString('en-GB')}
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
          <div className={styles.avatar}>{getUserInitials(user.firstName, user.lastName)}</div>
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
