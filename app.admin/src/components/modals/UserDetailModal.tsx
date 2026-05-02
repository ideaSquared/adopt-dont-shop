import React from 'react';
import { Modal } from '@adopt-dont-shop/lib.components';
import type { AdminUser } from '@/types';
import { FiMail, FiPhone, FiCalendar, FiClock, FiUser, FiShield } from 'react-icons/fi';
import styles from './UserDetailModal.css';

type UserDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
};

export const UserDetailModal: React.FC<UserDetailModalProps> = ({ isOpen, onClose, user }) => {
  if (!user) {
    return null;
  }

  const getUserInitials = (firstName: string | null, lastName: string | null) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || '??';
  };

  const getUserTypeBadge = (userType: string) => {
    switch (userType) {
      case 'admin':
      case 'super_admin':
        return <span className={styles.badgeDanger}>Admin</span>;
      case 'moderator':
        return <span className={styles.badgeWarning}>Moderator</span>;
      case 'rescue_staff':
        return <span className={styles.badgeInfo}>Rescue Staff</span>;
      case 'adopter':
        return <span className={styles.badgeNeutral}>Adopter</span>;
      default:
        return <span className={styles.badgeNeutral}>{userType}</span>;
    }
  };

  const getStatusBadge = (status: string, emailVerified: boolean) => {
    if (status === 'suspended') {
      return <span className={styles.badgeDanger}>Suspended</span>;
    }
    if (status === 'pending' || !emailVerified) {
      return <span className={styles.badgeWarning}>Pending</span>;
    }
    return <span className={styles.badgeSuccess}>Active</span>;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title='User Details' size='lg' centered>
      <div className={styles.detailSection}>
        <div className={styles.userHeader}>
          <div className={styles.userAvatar}>{getUserInitials(user.firstName, user.lastName)}</div>
          <div className={styles.userInfo}>
            <h3 className={styles.userName}>
              {user.firstName} {user.lastName}
            </h3>
            <p className={styles.userEmail}>{user.email}</p>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              alignItems: 'flex-end',
            }}
          >
            {getUserTypeBadge(user.userType)}
            {getStatusBadge(user.status, user.emailVerified ?? false)}
          </div>
        </div>

        <div className={styles.detailGrid}>
          <div className={styles.detailItem}>
            <div className={styles.detailLabel}>
              <FiMail />
              Email
            </div>
            <div className={styles.detailValue}>{user.email}</div>
          </div>

          <div className={styles.detailItem}>
            <div className={styles.detailLabel}>
              <FiPhone />
              Phone Number
            </div>
            <div className={styles.detailValue}>
              {(user.phoneNumber ?? '') || <span className={styles.emptyValue}>Not provided</span>}
            </div>
          </div>

          <div className={styles.detailItem}>
            <div className={styles.detailLabel}>
              <FiUser />
              User Type
            </div>
            <div className={styles.detailValue}>
              {user.userType.replace('_', ' ').toUpperCase()}
            </div>
          </div>

          <div className={styles.detailItem}>
            <div className={styles.detailLabel}>
              <FiShield />
              Status
            </div>
            <div className={styles.detailValue}>{user.status.toUpperCase()}</div>
          </div>

          <div className={styles.detailItem}>
            <div className={styles.detailLabel}>
              <FiShield />
              Email Verified
            </div>
            <div className={styles.detailValue}>{(user.emailVerified ?? false) ? 'Yes' : 'No'}</div>
          </div>

          {(user.rescueName ?? '') && (
            <div className={styles.detailItem}>
              <div className={styles.detailLabel}>
                <FiUser />
                Rescue Organization
              </div>
              <div className={styles.detailValue}>{user.rescueName ?? ''}</div>
            </div>
          )}

          <div className={styles.detailItem}>
            <div className={styles.detailLabel}>
              <FiCalendar />
              Joined
            </div>
            <div className={styles.detailValue}>
              {new Date(user.createdAt).toLocaleDateString()}
            </div>
          </div>

          <div className={styles.detailItem}>
            <div className={styles.detailLabel}>
              <FiClock />
              Last Login
            </div>
            <div className={styles.detailValue}>
              {user.lastLogin ? (
                new Date(user.lastLogin).toLocaleDateString()
              ) : (
                <span className={styles.emptyValue}>Never</span>
              )}
            </div>
          </div>

          {user.updatedAt && (
            <div className={styles.detailItem}>
              <div className={styles.detailLabel}>
                <FiClock />
                Last Updated
              </div>
              <div className={styles.detailValue}>
                {new Date(user.updatedAt).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
