import React, { useState, useEffect } from 'react';
import * as styles from './EditUserModal.css';
import { Modal, Button, Input } from '@adopt-dont-shop/lib.components';
import type { AdminUser, UserType, UserStatus } from '@/types';

type EditUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
  onSave: (userId: string, updates: Partial<AdminUser>) => Promise<void>;
};

export const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, onSave }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    userType: 'user' as UserType,
    status: 'active' as UserStatus,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        email: user.email,
        phoneNumber: user.phoneNumber ?? '',
        userType: user.userType,
        status: user.status,
      });
      setError(null);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Only send changed fields
      const updates: Partial<AdminUser> = {};
      if (formData.firstName !== user.firstName) {
        updates.firstName = formData.firstName;
      }
      if (formData.lastName !== user.lastName) {
        updates.lastName = formData.lastName;
      }
      if (formData.email !== user.email) {
        updates.email = formData.email;
      }
      if (formData.phoneNumber !== (user.phoneNumber ?? '')) {
        updates.phoneNumber = formData.phoneNumber;
      }
      if (formData.userType !== user.userType) {
        updates.userType = formData.userType as typeof user.userType;
      }
      if (formData.status !== user.status) {
        updates.status = formData.status;
      }

      if (Object.keys(updates).length === 0) {
        onClose();
        return;
      }

      await onSave(user.userId, updates);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title='Edit User'>
      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor='first_name'>First Name</label>
            <Input
              id='first_name'
              type='text'
              value={formData.firstName}
              onChange={e => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor='last_name'>Last Name</label>
            <Input
              id='last_name'
              type='text'
              value={formData.lastName}
              onChange={e => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor='email'>Email</label>
          <Input
            id='email'
            type='email'
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor='phone_number'>Phone Number</label>
          <Input
            id='phone_number'
            type='tel'
            value={formData.phoneNumber}
            onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor='role'>Role</label>
            <select
              className={styles.select}
              id='role'
              value={formData.userType}
              onChange={e => setFormData({ ...formData, userType: e.target.value as UserType })}
            >
              <option value='user'>User</option>
              <option value='admin'>Admin</option>
              <option value='moderator'>Moderator</option>
              <option value='super_admin'>Super Admin</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor='is_active'>Status</label>
            <select
              className={styles.select}
              id='is_active'
              value={formData.status === 'active' ? 'active' : 'suspended'}
              onChange={e => setFormData({ ...formData, status: e.target.value as UserStatus })}
            >
              <option value='active'>Active</option>
              <option value='suspended'>Suspended</option>
            </select>
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type='submit' variant='primary' disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
